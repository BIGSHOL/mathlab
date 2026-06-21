// 🚧 Lab P5 — 서술형 채점(AI), 주입형
//   서술형(DESCRIPTIVE) 학생 답안을 루브릭 대비 Lab 자체 AI(Gemini)로 채점.
//   genMode=AUTO. autoGrader가 DESCRIPTIVE 분기에서 gradeDescriptive를 호출.
//
//   ⚠️ 격리(CLAUDE.md): 기출분석/AI 에이전트 무import. AI는 ../ai-client(Lab 복제).
//   ⚠️ CLAUDE.md #0: 모델명 사용자 UI 비노출(여긴 내부 채점, 서버 로그만).
//   주입형(DI): 기본 = AI. 테스트는 setDescriptiveGrader로 결정적 스텁 주입(실 API 비용 0).
//   폴백: 빈 답/루브릭·AI 실패(키 부재·타임아웃·파싱) → confidence 0 → needsReview(채점 차단 안 함).
import type { LabErrorType } from '@prisma/client';
import type { GradeVerdict } from '../answer-compare';
import { gradeWithGemini } from '../ai-client';

// 서술형은 단답보다 모호 → 검수 임계를 약간 높게(< 0.6 → 사람 검수).
export const DESCRIPTIVE_REVIEW_THRESHOLD = 0.6;
// 부분점수 ≥ 0.5 → 개념 숙련에 기여(정답으로 간주, BKT는 correct만 사용).
export const DESCRIPTIVE_CORRECT_THRESHOLD = 0.5;

export interface DescriptiveInput {
  rubric: unknown; // LabProblem.answer (루브릭 Json)
  studentAnswer: unknown; // LabSubmissionItem.answer (학생 서술 Json)
  conceptName?: string;
}
export type DescriptiveGradeFn = (input: DescriptiveInput) => Promise<GradeVerdict>;

const VALID_ERR: LabErrorType[] = ['NONE', 'CALCULATION', 'CONCEPT', 'INCOMPLETE', 'MISREAD', 'OTHER'];

function clamp01(n: unknown): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.min(1, Math.max(0, x));
}
function normalizeErrorType(raw: unknown): LabErrorType {
  const s = String(raw ?? '').toUpperCase();
  if ((VALID_ERR as string[]).includes(s)) return s as LabErrorType;
  // 예상 밖 errorType(AI typo·스펙 위반) → CONCEPT 폴백. 데이터 품질 추적용 서버 로그.
  console.warn('[lab/descriptive-grader] 예상 밖 errorType → CONCEPT 폴백:', raw);
  return 'CONCEPT';
}

/** 루브릭/학생답에서 텍스트 추출 (Json? 안전 정규화, CLAUDE.md #11 — 캐스팅 금지). */
export function asText(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    for (const k of ['rubric', 'value', 'modelAnswer', 'text', 'answer']) {
      if (typeof o[k] === 'string') return o[k];
    }
    return JSON.stringify(raw);
  }
  return String(raw);
}

/**
 * AI 원시 출력(부분점수·신뢰도·오류유형) → GradeVerdict 매핑 (순수 함수, 결정적).
 *   correct = partialScore ≥ 0.5, needsReview = confidence < 0.6.
 */
export function descriptiveVerdict(partialScore: number, confidence: number, errorType: unknown): GradeVerdict {
  const ps = clamp01(partialScore);
  const conf = clamp01(confidence);
  const correct = ps >= DESCRIPTIVE_CORRECT_THRESHOLD;
  return {
    correct,
    partialScore: ps,
    errorType: correct ? 'NONE' : normalizeErrorType(errorType),
    confidence: conf,
    needsReview: conf < DESCRIPTIVE_REVIEW_THRESHOLD,
  };
}

/** AI(Gemini) 기반 서술형 채점 — 기본 구현. */
const aiGradeDescriptive: DescriptiveGradeFn = async ({ rubric, studentAnswer, conceptName }) => {
  const rubricText = asText(rubric);
  const answerText = asText(studentAnswer);
  // 빈 답/루브릭 → 채점 불가 → 사람 검수 (AI 호출 안 함).
  if (answerText.trim() === '' || rubricText.trim() === '') {
    return { correct: false, partialScore: 0, errorType: 'INCOMPLETE', confidence: 0, needsReview: true };
  }
  try {
    const r = await gradeWithGemini({ rubric: rubricText, answer: answerText, conceptName });
    return descriptiveVerdict(r.partialScore, r.confidence, r.errorType);
  } catch (e) {
    // AI 실패(키 부재·타임아웃·파싱) → 채점 보류, 사람 검수로 폴백(파이프라인 차단 안 함).
    console.warn('[lab/descriptive-grader] AI 채점 실패 → needsReview:', e instanceof Error ? e.message : e);
    return { correct: false, partialScore: 0, errorType: 'OTHER', confidence: 0, needsReview: true };
  }
};

let activeGrader: DescriptiveGradeFn = aiGradeDescriptive;

/** 서술형 채점 진입점 — autoGrader가 호출. */
export function gradeDescriptive(input: DescriptiveInput): Promise<GradeVerdict> {
  return activeGrader(input);
}
/** 테스트/DI용 — 결정적 스텁 주입(실 API 비용 0). */
export function setDescriptiveGrader(fn: DescriptiveGradeFn): void {
  activeGrader = fn;
}
/** 기본(AI) 구현으로 복원. */
export function resetDescriptiveGrader(): void {
  activeGrader = aiGradeDescriptive;
}
