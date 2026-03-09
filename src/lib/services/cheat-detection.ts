/**
 * 부정행위 감지 서비스
 * - 비정상적으로 빠른 응답 감지
 * - 탭 전환/포커스 이탈 횟수 체크
 * - 동일 패턴 반복 감지
 */

interface AnswerContext {
  timeSpentSeconds: number;
  difficulty: string;
  questionType: string;
  tabSwitchCount?: number;
}

interface FlagResult {
  flagged: boolean;
  reason: string | null;
}

/** 난이도별 최소 예상 풀이 시간 (초) */
const MIN_TIME_BY_DIFFICULTY: Record<string, number> = {
  BASIC: 3,
  MEDIUM: 5,
  HIGH: 8,
  HIGHEST: 10,
};

/** 문제 유형별 최소 풀이 시간 보정 */
const TYPE_TIME_FACTOR: Record<string, number> = {
  MULTIPLE_CHOICE: 1.0,
  SHORT_ANSWER: 1.2,
  ESSAY: 2.0,
};

/**
 * 개별 답안 부정행위 검사
 */
export function checkAnswer(ctx: AnswerContext): FlagResult {
  const minTime = (MIN_TIME_BY_DIFFICULTY[ctx.difficulty] ?? 5) *
    (TYPE_TIME_FACTOR[ctx.questionType] ?? 1.0);

  // 1. 비정상적으로 빠른 응답
  if (ctx.timeSpentSeconds < minTime) {
    return {
      flagged: true,
      reason: `응답시간 ${ctx.timeSpentSeconds}초 (최소 ${Math.round(minTime)}초 예상)`,
    };
  }

  // 2. 과도한 탭 전환
  if (ctx.tabSwitchCount && ctx.tabSwitchCount >= 3) {
    return {
      flagged: true,
      reason: `탭 전환 ${ctx.tabSwitchCount}회 감지`,
    };
  }

  return { flagged: false, reason: null };
}

/**
 * 시험 전체에 대한 패턴 기반 부정행위 분석
 * - 전체 평균 풀이 시간이 비정상적으로 빠른 경우
 * - 동일 선택지 반복 패턴 (예: 모든 답이 같은 번호)
 */
export function analyzeAttemptPattern(answers: {
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}[]): { suspicious: boolean; reasons: string[] } {
  if (answers.length < 3) return { suspicious: false, reasons: [] };

  const reasons: string[] = [];

  // 1. 전체 평균 풀이 시간이 5초 미만
  const avgTime = answers.reduce((s, a) => s + a.timeSpentSeconds, 0) / answers.length;
  if (avgTime < 5) {
    reasons.push(`평균 풀이시간 ${avgTime.toFixed(1)}초 (비정상)`);
  }

  // 2. 동일 선택지 80% 이상 반복
  const answerCounts: Record<string, number> = {};
  for (const a of answers) {
    answerCounts[a.selectedAnswer] = (answerCounts[a.selectedAnswer] || 0) + 1;
  }
  const maxSameAnswer = Math.max(...Object.values(answerCounts));
  if (maxSameAnswer / answers.length >= 0.8 && answers.length >= 5) {
    reasons.push(`동일 답안 ${maxSameAnswer}/${answers.length}회 반복`);
  }

  // 3. 정답률 100%인데 전체 평균 풀이시간 8초 미만
  const allCorrect = answers.every((a) => a.isCorrect);
  if (allCorrect && avgTime < 8 && answers.length >= 5) {
    reasons.push(`전원 정답 + 평균 ${avgTime.toFixed(1)}초`);
  }

  return { suspicious: reasons.length > 0, reasons };
}
