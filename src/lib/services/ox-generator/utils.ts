/**
 * OX 생성기 유틸 — 셔플, 샘플링, O/X 균형 분배, ID·메타 무결성 검증, 입력→정규화
 */

import type {
  OxBankMeta,
  OxStatement,
  OxStatementInput,
  OxQuizCategory,
} from './types';
import { CATEGORY_ID_PREFIX } from './types';

/** [min, max] 범위의 정수 (양 끝 포함) */
export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Fisher-Yates 셔플 (불변) */
export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 배열에서 무작위로 n개 샘플링 (중복 없이) */
export function sample<T>(arr: readonly T[], n: number): T[] {
  if (n >= arr.length) return shuffle(arr);
  return shuffle(arr).slice(0, n);
}

/**
 * O/X 비율을 가능한 한 균등 분배.
 * - count 짝수: 정확히 50:50
 * - count 홀수: floor/ceil 무작위 선택 (예: 15 → 7:8 또는 8:7)
 * - 풀 부족 시 부족한 쪽 전부 + 남은 쪽으로 채움
 */
export function balanceAnswers(
  pool: readonly OxStatement[],
  count: number,
): OxStatement[] {
  const oPool = pool.filter((s) => s.answer === 'O');
  const xPool = pool.filter((s) => s.answer === 'X');

  const half = count / 2;
  const oTarget = count % 2 === 0
    ? half
    : (Math.random() < 0.5 ? Math.floor(half) : Math.ceil(half));
  const xTarget = count - oTarget;

  const oTake = Math.min(oTarget, oPool.length);
  const xTake = Math.min(xTarget, xPool.length);
  const remaining = count - oTake - xTake;

  const picked: OxStatement[] = [
    ...sample(oPool, oTake),
    ...sample(xPool, xTake),
  ];

  if (remaining > 0) {
    const pickedIds = new Set(picked.map((p) => p.id));
    const rest = pool.filter((s) => !pickedIds.has(s.id));
    picked.push(...sample(rest, Math.min(remaining, rest.length)));
  }

  return shuffle(picked);
}

/**
 * 뱅크 메타 + 진술 입력 → 정규화된 OxStatement 변환.
 * 메타데이터(학년/학기/대단원/영역)를 statement에 합성.
 */
export function expandBank(
  meta: OxBankMeta,
  inputs: readonly OxStatementInput[],
): OxStatement[] {
  return inputs.map((s) => ({
    id: s.id,
    content: s.content,
    answer: s.answer,
    explanation: s.explanation,
    level: s.level,
    source: s.source ?? 'curated',
    questionType: s.questionType,
    section: s.section,
    sectionSub: s.sectionSub,
    conceptId: s.conceptId,
    // 메타에서 상속
    schoolLevel: meta.schoolLevel,
    grade: meta.grade,
    semester: meta.semester,
    part: meta.part,
    chapter: meta.chapter,
    category: meta.category,
  }));
}

/**
 * 정적 뱅크 ID 무결성 + 메타 일관성 검증.
 * 빌드/런타임 시 호출, 위반 시 throw.
 */
export function validateBank(
  meta: OxBankMeta,
  inputs: readonly OxStatementInput[],
): void {
  const prefix = CATEGORY_ID_PREFIX[meta.category];
  const seen = new Set<string>();
  const errors: string[] = [];
  const validTypes = ['definition', 'property', 'computation', 'application', 'misconception'];
  const validLevels = ['easy', 'medium', 'hard'];

  for (const s of inputs) {
    if (!s.id) {
      errors.push(`[${meta.category}] 진술 "${s.content.slice(0, 30)}..." 에 id 누락`);
      continue;
    }
    if (!s.id.startsWith(prefix)) {
      errors.push(`[${meta.category}] id "${s.id}" 가 prefix "${prefix}" 와 불일치`);
    }
    if (seen.has(s.id)) errors.push(`[${meta.category}] 중복 id "${s.id}"`);
    seen.add(s.id);
    if (!validLevels.includes(s.level)) {
      errors.push(`[${meta.category}] id "${s.id}" 의 level "${s.level}" 가 유효하지 않음`);
    }
    if (!validTypes.includes(s.questionType)) {
      errors.push(`[${meta.category}] id "${s.id}" 의 questionType "${s.questionType}" 가 유효하지 않음`);
    }
    if (s.answer !== 'O' && s.answer !== 'X') {
      errors.push(`[${meta.category}] id "${s.id}" 의 answer 가 O/X가 아님`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`OX bank validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

/** [legacy] Phase 2와의 호환을 위한 별칭 */
export const validateBankIds = (
  inputs: readonly OxStatement[],
  category: OxQuizCategory,
): void => {
  // 호환성 유지 — 이미 expandBank 거친 OxStatement[]에 대한 검증
  const prefix = CATEGORY_ID_PREFIX[category];
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const s of inputs) {
    if (!s.id) errors.push(`[${category}] 진술 "${s.content.slice(0, 30)}..." 에 id 누락`);
    else if (!s.id.startsWith(prefix)) errors.push(`[${category}] id "${s.id}" prefix 불일치`);
    if (seen.has(s.id)) errors.push(`[${category}] 중복 id "${s.id}"`);
    seen.add(s.id);
  }
  if (errors.length > 0) throw new Error(`OX bank validation failed:\n  - ${errors.join('\n  - ')}`);
};

/** OxStatement → GeneratedOxProblem 변환 */
export function toGenerated(s: OxStatement) {
  return {
    id: s.id,
    content: s.content,
    answer: s.answer,
    choices: ['O', 'X'] as const,
    explanation: s.explanation,
    category: s.category,
    level: s.level,
    questionType: s.questionType,
    chapter: s.chapter,
  };
}
