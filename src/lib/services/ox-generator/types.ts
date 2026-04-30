/**
 * OX 퀴즈 (참/거짓 진술) — 타입 및 메타 정의
 *
 * Phase 3: 학년·학기·영역·대단원·중단원·소단원·유형 분류 체계.
 *  - 단원 명칭은 src/lib/constants/curriculum.ts 표준 명칭과 일치
 *  - 학교급/학년/학기는 5단계 빈칸 학습 시스템과 동일 키
 */

export type OxLevel = 'easy' | 'medium' | 'hard';

export type SchoolLevel = 'elementary' | 'middle' | 'high';

/** 학년 키 (Concept.grade와 동일 형식) */
export type Grade =
  | 'elementary_3' | 'elementary_4' | 'elementary_5' | 'elementary_6'
  | 'middle_1' | 'middle_2' | 'middle_3'
  | 'high_1' | 'high_2'
  | 'high_algebra' | 'high_calculus1' | 'high_prob' | 'high_calculus2' | 'high_geo';

/** 6대 영역 (curriculum 시스템 part) */
export type OxPart = 'calc' | 'algebra' | 'func' | 'geo' | 'data';

/** OX 진술 유형 — OX 특화 분류 */
export type OxQuestionType =
  | 'definition'    // 정의 확인 ("소수의 약수는 2개이다")
  | 'property'      // 성질·정리 ("두 음수의 곱은 양수이다")
  | 'computation'   // 계산값 진술 ("$2^3 \\times 3^2 = 72$")
  | 'application'   // 활용·응용 ("...일 때 ...이다")
  | 'misconception'; // 흔한 오개념 ("모든 소수는 홀수이다")

/** [legacy] 압축 카테고리 — 호환용으로 유지, 신규는 분류 필드로 식별 */
export type OxQuizCategory =
  | 'm1_pf_misconception'
  | 'm1_int_rational'
  | 'm1_equation'
  | 'm1_geometry'
  | 'm1_statistics';

/** 그룹(대단원) 메타데이터 — 뱅크 파일 단위로 공유 */
export interface OxBankMeta {
  schoolLevel: SchoolLevel;
  grade: Grade;
  semester: number;
  part: OxPart;
  chapter: string;       // curriculum.ts 표준 명칭
  category: OxQuizCategory; // legacy 호환용
}

/** 단일 진술 — 뱅크 파일에서 정의 시 사용 */
export interface OxStatementInput {
  id: string;
  content: string;
  answer: 'O' | 'X';
  level: OxLevel;
  questionType: OxQuestionType;
  section?: string;       // 중단원 (선택, curriculum.ts 표준)
  sectionSub?: string;    // 소단원 (선택)
  explanation?: string;
  conceptId?: string | null;
  source?: 'curated' | 'algorithm' | 'ai';  // 미지정 시 'curated'
}

/** 풀에 적재된 정규화된 진술 (메타 + 입력 합성) */
export interface OxStatement {
  id: string;
  content: string;
  answer: 'O' | 'X';
  explanation?: string;
  level: OxLevel;
  source: OxSource;
  // 분류 (Phase 3)
  schoolLevel: SchoolLevel;
  grade: Grade;
  semester: number;
  part: OxPart;
  chapter: string;
  section?: string;
  sectionSub?: string;
  questionType: OxQuestionType;
  conceptId?: string | null;
  // legacy 호환
  category: OxQuizCategory;
}

/** 응시·인쇄용으로 변환된 형식 */
export interface GeneratedOxProblem {
  id: string;
  content: string;
  answer: 'O' | 'X';
  choices: readonly ['O', 'X'];
  explanation?: string;
  category: OxQuizCategory;
  level: OxLevel;
  questionType: OxQuestionType;
  chapter: string;
}

// ── 라벨 매핑 ──

export const CATEGORY_LABELS: Record<OxQuizCategory, string> = {
  m1_pf_misconception: '소인수분해',
  m1_int_rational: '정수와 유리수',
  m1_equation: '일차방정식',
  m1_geometry: '기본 도형',
  m1_statistics: '자료의 정리와 해석',
};

export const CATEGORY_GRADE: Record<OxQuizCategory, string> = {
  m1_pf_misconception: '중1',
  m1_int_rational: '중1',
  m1_equation: '중1',
  m1_geometry: '중1',
  m1_statistics: '중1',
};

/** 카테고리 → 정적 ID prefix 매핑 (validateBankIds용) */
export const CATEGORY_ID_PREFIX: Record<OxQuizCategory, string> = {
  m1_pf_misconception: 'curated-m1-pf-',
  m1_int_rational: 'curated-m1-int-',
  m1_equation: 'curated-m1-eq-',
  m1_geometry: 'curated-m1-geo-',
  m1_statistics: 'curated-m1-stats-',
};

export const IMPLEMENTED_CATEGORIES: Set<OxQuizCategory> = new Set([
  'm1_pf_misconception',
  'm1_int_rational',
  'm1_equation',
  'm1_geometry',
  'm1_statistics',
]);

export const LEVEL_LABELS: Record<OxLevel, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

/** 점수 룰 — easy 5점 / medium 10점 / hard 15점 */
export const POINTS_BY_LEVEL: Record<OxLevel, number> = {
  easy: 5,
  medium: 10,
  hard: 15,
};

/** 출처 한글 라벨 (admin/통계 표시용) */
export type OxSource = 'curated' | 'algorithm' | 'ai';

export const SOURCE_LABELS: Record<OxSource, string> = {
  curated: '수기',
  algorithm: '알고리즘',
  ai: 'AI 자동',
};

/** OX 유형 한글 라벨 */
export const QUESTION_TYPE_LABELS: Record<OxQuestionType, string> = {
  definition: '정의',
  property: '성질·정리',
  computation: '계산값',
  application: '활용·응용',
  misconception: '오개념',
};

/** 영역 한글 라벨 */
export const PART_LABELS: Record<OxPart, string> = {
  calc: '수와 연산',
  algebra: '문자와 식',
  func: '함수',
  geo: '기하',
  data: '확률과 통계',
};

/** 학년 한글 라벨 */
export const GRADE_LABELS: Partial<Record<Grade, string>> = {
  elementary_3: '초3',
  elementary_4: '초4',
  elementary_5: '초5',
  elementary_6: '초6',
  middle_1: '중1',
  middle_2: '중2',
  middle_3: '중3',
};

/** 학교급 한글 라벨 */
export const SCHOOL_LEVEL_LABELS: Record<SchoolLevel, string> = {
  elementary: '초등',
  middle: '중등',
  high: '고등',
};
