export type AnswerStatus = 'correct' | 'partial' | 'calcError' | 'conceptWeak';

export interface AnswerStatusInfo {
  status: AnswerStatus;
  symbol: string;
  label: string;
  description: string;
}

const STATUS_MAP: Record<AnswerStatus, Omit<AnswerStatusInfo, 'status'>> = {
  correct: { symbol: '○', label: '정답', description: '정확하게 풀었습니다' },
  partial: { symbol: '△', label: '풀이 미흡', description: '시도했으나 정답에 이르지 못함' },
  calcError: { symbol: '●', label: '계산 실수', description: '개념은 이해하나 계산에서 실수' },
  conceptWeak: { symbol: '★', label: '개념 부족', description: '해당 개념에 대한 학습이 필요' },
};

export function classifyAnswer(params: {
  isCorrect: boolean;
  timeSpentSeconds: number;
  difficulty: string;
}): AnswerStatusInfo {
  const { isCorrect, timeSpentSeconds, difficulty } = params;

  if (isCorrect) {
    return { status: 'correct', ...STATUS_MAP.correct };
  }

  // 10초 미만으로 매우 빠르게 오답 → 개념 부족 (이해 없이 찍은 것으로 추정)
  if (timeSpentSeconds < 10) {
    return { status: 'conceptWeak', ...STATUS_MAP.conceptWeak };
  }

  // 기본 난이도에서 충분한 시간을 들이고도 오답 → 계산 실수 가능성
  if (difficulty === 'BASIC' && timeSpentSeconds >= 15) {
    return { status: 'calcError', ...STATUS_MAP.calcError };
  }

  // 중간 난이도 이상에서 빠르게(10~20초) 오답 → 개념 부족
  if (['MEDIUM', 'HIGH', 'HIGHEST'].includes(difficulty) && timeSpentSeconds < 20) {
    return { status: 'conceptWeak', ...STATUS_MAP.conceptWeak };
  }

  // 그 외 (충분히 시도했으나 오답) → 풀이 미흡
  return { status: 'partial', ...STATUS_MAP.partial };
}

export function getStatusInfo(status: AnswerStatus): AnswerStatusInfo {
  return { status, ...STATUS_MAP[status] };
}

export function getStatusSummary(statuses: AnswerStatus[]): Record<AnswerStatus, number> {
  return statuses.reduce(
    (acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }),
    { correct: 0, partial: 0, calcError: 0, conceptWeak: 0 } as Record<AnswerStatus, number>,
  );
}
