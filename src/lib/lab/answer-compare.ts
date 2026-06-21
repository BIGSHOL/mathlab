// 🚧 Lab P1 — 답안 비교/정규화 (순수 함수, 자기완결)
//   ⚠️ 격리 규칙(CLAUDE.md): 기출분석/공유 코드를 일절 import하지 않는다.
//      비교 로직은 Lab 네임스페이스 안에 자체 보유(트림 커밋으로 기존 grading.ts 삭제됨).
//
//   채점 대상:
//     - MULTIPLE_CHOICE: 보기 번호 정확 일치 ({choice:N})
//     - SHORT_ANSWER:    정규화 후 문자열 일치 ({value:'s'})
//     - DESCRIPTIVE:     P1 범위 밖 → needsReview(사람 검수 큐)
import type { LabProblemType, LabErrorType } from '@prisma/client';

/** confidence가 이 값 미만이면 사람 검수 큐로 라우팅 */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.5;

export interface GradeVerdict {
  correct: boolean;
  errorType: LabErrorType;
  confidence: number; // 0..1 (결정적 비교라 1.0 또는 명시 하향값)
  needsReview: boolean;
  partialScore?: number;
}

/** 객관식 보기 번호 정규화 → 정수 또는 null. {choice:N} / N / "N" / "①" 모두 허용. */
export function normalizeChoice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if ('choice' in obj) return normalizeChoice(obj.choice);
    if ('value' in obj) return normalizeChoice(obj.value);
    return null;
  }
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.trunc(raw) : null;
  const s = String(raw).trim();
  if (s === '') return null;
  const circled = '①②③④⑤⑥⑦⑧⑨⑩';
  const ci = circled.indexOf(s);
  if (ci >= 0) return ci + 1;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

/** 단답 raw 값 추출 — {value:'s'} 래핑을 벗긴다. */
function extractValue(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).value;
  }
  return raw;
}

/**
 * 단답 정규화: 공백 제거 · 소문자 · KaTeX `$`/따옴표 제거 · 분수표기 통일.
 * ⚠️ 수학 동치(1/2 == 0.5, $\frac{1}{2}$ == 0.5)는 P1에서 처리하지 않는다.
 *    표기 변형은 흡수하되, 값 동치 판정은 향후(P3+) CAS/정규화 확장 과제.
 */
export function normalizeShortAnswer(raw: unknown): string {
  const v = extractValue(raw);
  if (v == null) return '';
  let s = String(v).trim().toLowerCase();
  s = s.replace(/\s+/g, ''); // 모든 공백 제거
  s = s.replace(/\$/g, ''); // KaTeX 달러 제거
  s = s.replace(/\\dfrac/g, '\\frac'); // 분수 표기 통일 (CLAUDE.md \dfrac 금지)
  s = s.replace(/[“”"'`]/g, ''); // 따옴표 제거
  return s;
}

/**
 * 객관식/단답 자동 채점. 정답(problemAnswer)과 학생답(studentAnswer)을 비교한다.
 * 서술형(DESCRIPTIVE)은 채점하지 않고 needsReview=true로 표시한다.
 */
export function gradeObjective(
  type: LabProblemType,
  problemAnswer: unknown,
  studentAnswer: unknown,
): GradeVerdict {
  // 서술형 — P1 범위 밖. 사람 검수로.
  if (type === 'DESCRIPTIVE') {
    return { correct: false, errorType: 'NONE', confidence: 0, needsReview: true };
  }

  // 객관식 — 보기 번호 정확 일치.
  if (type === 'MULTIPLE_CHOICE') {
    const a = normalizeChoice(problemAnswer);
    const b = normalizeChoice(studentAnswer);
    if (a == null || b == null) {
      // 정답/학생답을 보기번호로 파싱 불가 → 사람 검수.
      return { correct: false, errorType: 'OTHER', confidence: 0, needsReview: true };
    }
    const correct = a === b;
    return {
      correct,
      errorType: correct ? 'NONE' : 'CONCEPT',
      confidence: 1,
      needsReview: false,
    };
  }

  // 단답 — 정규화 후 문자열 일치.
  const a = normalizeShortAnswer(problemAnswer);
  const b = normalizeShortAnswer(studentAnswer);
  if (a === '') {
    // 정답이 비어 비교 불가 → 사람 검수.
    return { correct: false, errorType: 'OTHER', confidence: 0, needsReview: true };
  }
  const correct = a === b;
  // 불일치는 표기 동치(1/2=0.5) 가능성이 남아 confidence를 약간 낮춘다(검수 임계 위).
  const confidence = correct ? 1 : 0.85;
  return {
    correct,
    errorType: correct ? 'NONE' : 'CALCULATION',
    confidence,
    needsReview: confidence < REVIEW_CONFIDENCE_THRESHOLD,
  };
}
