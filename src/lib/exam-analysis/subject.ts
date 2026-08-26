/**
 * 기출 분석 과목 키 단일화 + 유형/능력 정규화.
 *
 * API·프롬프트·엔진은 'MATH' | 'ENGLISH' 만 사용한다.
 * 한글('수학'/'영어')은 레거시 입력 흡수용.
 */
import type { ExamSubjectKey } from './constants';
import {
  ABILITY_DOMAIN_LABELS,
  CURRENT_PROMPT_VERSION,
  ENGLISH_ABILITY_DOMAIN_LABELS,
  ENGLISH_ABILITY_KEYS,
  ENGLISH_QUESTION_TYPE_LABELS,
  ENGLISH_TYPE_TO_DOMAIN,
  ENGLISH_TYPE_TO_STANDARD,
  QUESTION_TYPE_KEYS,
  QUESTION_TYPE_LABELS,
  TYPE_TO_DOMAIN,
  TYPE_TO_STANDARD,
} from './constants';

export function toExamSubjectKey(raw: string | null | undefined): ExamSubjectKey {
  const s = String(raw ?? '').trim();
  const upper = s.toUpperCase();
  if (s === '영어' || upper === 'ENGLISH' || upper === 'ENG') return 'ENGLISH';
  return 'MATH';
}

export function isMathSubject(raw: string | null | undefined): boolean {
  return toExamSubjectKey(raw) === 'MATH';
}

/** AI enum 변형(CALCULATION / problem-solving / Grammar)을 소문자+언더스코어로. */
export function normalizeEnumKey(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase().replace(/-/g, '_');
}

export function normalizeQuestionType(
  subject: string | null | undefined,
  raw: unknown,
): string | null {
  const key = normalizeEnumKey(raw);
  if (!key) return null;
  if (toExamSubjectKey(subject) === 'ENGLISH') {
    return ENGLISH_TYPE_TO_STANDARD[key] ?? null;
  }
  if (TYPE_TO_STANDARD[key]) return TYPE_TO_STANDARD[key];
  if ((QUESTION_TYPE_KEYS as readonly string[]).includes(key)) return key;
  return 'change_relation';
}

export function normalizeAbilityDomain(
  subject: string | null | undefined,
  raw: unknown,
  questionType?: string | null,
): string | null {
  const key = normalizeEnumKey(raw);
  if (toExamSubjectKey(subject) === 'ENGLISH') {
    if (key && (ENGLISH_ABILITY_KEYS as readonly string[]).includes(key)) return key;
    if (key === 'calculation') return 'accuracy';
    if (key === 'problem_solving') return 'expression';
    if (key === 'understanding' || key === 'reasoning') return key;
    const fromType = questionType ? ENGLISH_TYPE_TO_DOMAIN[questionType] : undefined;
    return fromType ?? null;
  }
  if (key === 'calculation' || key === 'understanding' || key === 'problem_solving' || key === 'reasoning') {
    return key;
  }
  if (questionType && TYPE_TO_DOMAIN[questionType]) return TYPE_TO_DOMAIN[questionType];
  if (key && TYPE_TO_DOMAIN[key]) return TYPE_TO_DOMAIN[key];
  return 'calculation';
}

export function emptyTypeDistribution(subject: string | null | undefined): Record<string, number> {
  if (toExamSubjectKey(subject) === 'ENGLISH') {
    return { grammar: 0, vocabulary: 0, reading: 0, listening: 0, writing: 0, communication: 0 };
  }
  return { number: 0, change_relation: 0, shape_measure: 0, data_possibility: 0 };
}

export function defaultQuestionType(subject: string | null | undefined): string {
  return toExamSubjectKey(subject) === 'ENGLISH' ? 'reading' : 'change_relation';
}

export function questionTypeLabel(type: string | null | undefined, subject?: string | null): string {
  if (!type) return '미분류';
  const key = normalizeEnumKey(type);
  if (toExamSubjectKey(subject) === 'ENGLISH') {
    return ENGLISH_QUESTION_TYPE_LABELS[key] || QUESTION_TYPE_LABELS[key] || type;
  }
  return QUESTION_TYPE_LABELS[key] || ENGLISH_QUESTION_TYPE_LABELS[key] || type;
}

export function abilityDomainLabel(domain: string | null | undefined, subject?: string | null): string {
  if (!domain) return toExamSubjectKey(subject) === 'ENGLISH' ? '정확성' : '계산력';
  const key = normalizeEnumKey(domain);
  if (toExamSubjectKey(subject) === 'ENGLISH') {
    return ENGLISH_ABILITY_DOMAIN_LABELS[key] || ABILITY_DOMAIN_LABELS[key] || domain;
  }
  return ABILITY_DOMAIN_LABELS[key] || ENGLISH_ABILITY_DOMAIN_LABELS[key] || domain;
}

export function currentPromptVersion(subject: string | null | undefined): string {
  return CURRENT_PROMPT_VERSION[toExamSubjectKey(subject)];
}
