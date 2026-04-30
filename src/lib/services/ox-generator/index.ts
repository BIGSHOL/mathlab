/**
 * OX 퀴즈 생성기 — 진입점 (Phase 3)
 *
 * - DB OxStatement 우선 조회 + 정적 큐레이션 뱅크 폴백 (장애 격벽)
 * - 풍부한 필터: schoolLevel/grade/semester/chapter/section/questionType/level
 * - tenantId 주어지면 글로벌(null) + 해당 지점 진술 합집합
 */

import { prisma } from '@/lib/db';
import type {
  GeneratedOxProblem,
  Grade,
  OxLevel,
  OxQuizCategory,
  OxQuestionType,
  OxStatement,
  SchoolLevel,
} from './types';
import { IMPLEMENTED_CATEGORIES } from './types';
import { balanceAnswers, sample, toGenerated } from './utils';

import { M1_PF_MISCONCEPTION } from './banks/m1-pf-misconception';
import { M1_INT_RATIONAL } from './banks/m1-int-rational';
import { M1_EQUATION } from './banks/m1-equation';
import { M1_GEOMETRY } from './banks/m1-geometry';
import { M1_STATISTICS } from './banks/m1-statistics';

export * from './types';
export { balanceAnswers, validateBank, validateBankIds, toGenerated, expandBank } from './utils';

// ── 카테고리 → 뱅크 매핑 (정적 폴백) ──
const BANKS: Record<OxQuizCategory, OxStatement[]> = {
  m1_pf_misconception: M1_PF_MISCONCEPTION,
  m1_int_rational: M1_INT_RATIONAL,
  m1_equation: M1_EQUATION,
  m1_geometry: M1_GEOMETRY,
  m1_statistics: M1_STATISTICS,
};

// 모든 정적 뱅크 평탄화 (정적 폴백 풀 SSOT)
const ALL_STATIC: OxStatement[] = Object.values(BANKS).flat();

// ── 필터 유형 ──
export interface GenerateOxOptions {
  /** 지점별 진술 포함 (글로벌 tenantId=null + 해당 지점 진술 합집합) */
  tenantId?: string | null;
  /** O/X 비율 균등 분배 여부 (기본 true) */
  balanceAnswers?: boolean;
}

/** 풀 조회 쿼리 — 모든 필드 선택적, 다중 매칭 */
export interface OxPoolQuery {
  category?: OxQuizCategory | OxQuizCategory[];   // legacy 호환
  schoolLevel?: SchoolLevel | SchoolLevel[];
  grade?: Grade | Grade[];
  semester?: number | number[];
  chapter?: string | string[];
  section?: string | string[];
  questionType?: OxQuestionType | OxQuestionType[];
  level?: OxLevel | OxLevel[];
  tenantId?: string | null;
}

type DbOxStatement = {
  id: string;
  categoryId: string;
  level: string;
  content: string;
  answer: string;
  explanation: string | null;
  source: string;
  schoolLevel: string | null;
  grade: string | null;
  semester: number | null;
  part: string | null;
  chapter: string | null;
  section: string | null;
  sectionSub: string | null;
  questionType: string | null;
};

const VALID_PARTS = ['calc', 'algebra', 'func', 'geo', 'data'];
const VALID_TYPES = ['definition', 'property', 'computation', 'application', 'misconception'];

function dbToService(db: DbOxStatement): OxStatement | null {
  if (!IMPLEMENTED_CATEGORIES.has(db.categoryId as OxQuizCategory)) return null;
  if (db.answer !== 'O' && db.answer !== 'X') return null;
  if (db.level !== 'easy' && db.level !== 'medium' && db.level !== 'hard') return null;
  // 분류 필드는 fallback 허용 (legacy 데이터 호환)
  const schoolLevel = (db.schoolLevel ?? 'middle') as SchoolLevel;
  const grade = (db.grade ?? 'middle_1') as Grade;
  const semester = db.semester ?? 1;
  const part = (VALID_PARTS.includes(db.part ?? '') ? db.part : 'calc') as OxStatement['part'];
  const chapter = db.chapter ?? '';
  const questionType = (VALID_TYPES.includes(db.questionType ?? '')
    ? db.questionType
    : 'misconception') as OxQuestionType;
  return {
    id: db.id,
    content: db.content,
    answer: db.answer,
    explanation: db.explanation ?? undefined,
    level: db.level,
    source: (db.source === 'algorithm' || db.source === 'ai') ? db.source : 'curated',
    category: db.categoryId as OxQuizCategory,
    schoolLevel,
    grade,
    semester,
    part,
    chapter,
    section: db.section ?? undefined,
    sectionSub: db.sectionSub ?? undefined,
    questionType,
  };
}

/** 배열 또는 단일 → IN 매처 */
function inMatcher<T extends string | number>(v: T | T[] | undefined): { in: T[] } | undefined {
  if (v === undefined) return undefined;
  return { in: Array.isArray(v) ? v : [v] };
}

/** 정적 풀에 쿼리 필터 적용 (DB 폴백 시 사용) */
function filterStaticPool(query: OxPoolQuery): OxStatement[] {
  return ALL_STATIC.filter((s) => {
    if (query.category) {
      const cats = Array.isArray(query.category) ? query.category : [query.category];
      if (!cats.includes(s.category)) return false;
    }
    if (query.schoolLevel) {
      const arr = Array.isArray(query.schoolLevel) ? query.schoolLevel : [query.schoolLevel];
      if (!arr.includes(s.schoolLevel)) return false;
    }
    if (query.grade) {
      const arr = Array.isArray(query.grade) ? query.grade : [query.grade];
      if (!arr.includes(s.grade)) return false;
    }
    if (query.semester !== undefined) {
      const arr = Array.isArray(query.semester) ? query.semester : [query.semester];
      if (!arr.includes(s.semester)) return false;
    }
    if (query.chapter) {
      const arr = Array.isArray(query.chapter) ? query.chapter : [query.chapter];
      if (!arr.includes(s.chapter)) return false;
    }
    if (query.section) {
      const arr = Array.isArray(query.section) ? query.section : [query.section];
      if (!s.section || !arr.includes(s.section)) return false;
    }
    if (query.questionType) {
      const arr = Array.isArray(query.questionType) ? query.questionType : [query.questionType];
      if (!arr.includes(s.questionType)) return false;
    }
    if (query.level) {
      const arr = Array.isArray(query.level) ? query.level : [query.level];
      if (!arr.includes(s.level)) return false;
    }
    return true;
  });
}

/**
 * 카테고리·필터에 맞는 풀 조회 (DB 우선 + 정적 폴백).
 */
async function fetchPool(query: OxPoolQuery): Promise<OxStatement[]> {
  try {
    const tenantFilter = query.tenantId
      ? { OR: [{ tenantId: null }, { tenantId: query.tenantId }] }
      : { tenantId: null };

    const where: Record<string, unknown> = {
      isActive: true,
      ...tenantFilter,
    };
    if (query.category) where.categoryId = inMatcher(query.category);
    if (query.schoolLevel) where.schoolLevel = inMatcher(query.schoolLevel);
    if (query.grade) where.grade = inMatcher(query.grade);
    if (query.semester !== undefined) where.semester = inMatcher(query.semester);
    if (query.chapter) where.chapter = inMatcher(query.chapter);
    if (query.section) where.section = inMatcher(query.section);
    if (query.questionType) where.questionType = inMatcher(query.questionType);
    if (query.level) where.level = inMatcher(query.level);

    const dbRows = await prisma.oxStatement.findMany({ where });
    const dbStatements = dbRows
      .map(dbToService)
      .filter((s): s is OxStatement => s !== null);

    if (dbStatements.length === 0) return filterStaticPool(query);
    return dbStatements;
  } catch (err) {
    console.error('[ox-generator] DB 조회 실패, 정적 폴백 사용:', err);
    return filterStaticPool(query);
  }
}

// ── Public API ──

/**
 * [Phase 3] 다중 필터 기반 진술 생성 — 본격 사용 권장.
 */
export async function generateOxFromQuery(
  query: OxPoolQuery,
  count: number,
  opts: GenerateOxOptions = {},
): Promise<GeneratedOxProblem[]> {
  const pool = await fetchPool({ ...query, tenantId: opts.tenantId ?? query.tenantId });
  if (pool.length === 0) return [];
  const safeCount = Math.max(1, Math.min(count, pool.length));
  const picked = opts.balanceAnswers !== false
    ? balanceAnswers(pool, safeCount)
    : sample(pool, safeCount);
  return picked.map(toGenerated);
}

/**
 * [Phase 1/2 호환] 카테고리·난이도 기반 단순 생성.
 */
export async function generateOxProblems(
  category: OxQuizCategory,
  level: OxLevel,
  count: number,
  opts: GenerateOxOptions = {},
): Promise<GeneratedOxProblem[]> {
  if (!IMPLEMENTED_CATEGORIES.has(category)) {
    throw new Error(`구현되지 않은 OX 카테고리: ${category}`);
  }
  return generateOxFromQuery({ category, level }, count, opts);
}

/**
 * 학교/학년 기반 카테고리 목록 (선생님 출제 페이지용).
 */
export const CATEGORIES_BY_GRADE: Record<string, OxQuizCategory[]> = {
  'middle-1': [
    'm1_pf_misconception',
    'm1_int_rational',
    'm1_equation',
    'm1_geometry',
    'm1_statistics',
  ],
};
