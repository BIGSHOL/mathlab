/**
 * 레벨테스트 결과 멘트 (피드백 텍스트) 생성
 * wordlvtest의 10-tier 시스템을 수학에 맞게 적용
 */

// 전체 정답률 기반 종합 멘트
export function getOverallFeedback(accuracy: number, level: string): string {
  if (accuracy >= 90) {
    return '탁월한 수학 실력을 갖추고 있습니다. 심화 문제에 도전하여 더 높은 수준으로 발전할 수 있습니다.';
  }
  if (accuracy >= 75) {
    return '대부분의 개념을 안정적으로 이해하고 있습니다. 틀린 유형을 집중 복습하면 심화 수준까지 도달할 수 있습니다.';
  }
  if (accuracy >= 60) {
    return '기본 개념은 이해하고 있으나 응용에서 어려움이 있습니다. 취약 단원을 중심으로 개념 복습이 필요합니다.';
  }
  if (accuracy >= 40) {
    return '핵심 개념의 이해가 부족합니다. 기초부터 차근차근 다지면 충분히 향상할 수 있습니다.';
  }
  return '기본 개념부터 체계적인 학습이 필요합니다. 선수학습 개념을 먼저 복습하는 것을 권장합니다.';
}

// 4대 영역별 멘트
const DOMAIN_FEEDBACK: Record<string, { high: string; mid: string; low: string }> = {
  CALCULATION: {
    high: '계산 정확도가 매우 우수합니다. 빠르고 정확한 연산 능력을 갖추고 있습니다.',
    mid: '기본 연산은 가능하나 복잡한 계산에서 실수가 발생합니다. 연산 연습을 통해 정확도를 높이세요.',
    low: '기초 연산력이 부족합니다. 연산 연습을 매일 꾸준히 하는 것이 중요합니다.',
  },
  UNDERSTANDING: {
    high: '수학 개념을 깊이 이해하고 있습니다. 정의와 성질을 정확히 파악하고 있습니다.',
    mid: '개념의 기본은 알지만 세부 성질을 혼동하는 경우가 있습니다. 개념 노트 정리를 추천합니다.',
    low: '개념 이해가 부족합니다. 교과서의 정의와 예시를 다시 한번 꼼꼼히 읽어보세요.',
  },
  PROBLEM_SOLVING: {
    high: '문제 해결 능력이 뛰어납니다. 다양한 유형의 문제에 잘 대응하고 있습니다.',
    mid: '익숙한 유형은 풀지만 새로운 유형에서 어려움을 느낍니다. 다양한 문제를 접하는 것이 도움됩니다.',
    low: '문제 해결 전략이 부족합니다. 유형별 풀이 방법을 익히고 단계별로 접근하는 연습이 필요합니다.',
  },
  REASONING: {
    high: '논리적 사고력이 우수합니다. 수학적 추론과 증명 능력이 잘 발달되어 있습니다.',
    mid: '기본적인 추론은 가능하나 복합적인 논리 전개에서 약점을 보입니다.',
    low: '추론력 강화가 필요합니다. "왜?"라는 질문을 던지며 풀이 과정을 논리적으로 정리하는 습관을 기르세요.',
  },
};

export function getDomainFeedback(domain: string, accuracy: number): string {
  const fb = DOMAIN_FEEDBACK[domain];
  if (!fb) return '';
  if (accuracy >= 80) return fb.high;
  if (accuracy >= 50) return fb.mid;
  return fb.low;
}

// 취약 단원 멘트
export function getWeakAreaFeedback(weakCount: number, totalChapters: number): string {
  if (weakCount === 0) return '모든 단원에서 안정적인 성취를 보이고 있습니다.';
  const ratio = weakCount / totalChapters;
  if (ratio >= 0.5) return '여러 단원에서 취약점이 발견됩니다. 기초부터 단계적으로 복습을 시작하세요.';
  return `${weakCount}개 단원에서 보충이 필요합니다. 해당 단원의 핵심 개념부터 다시 학습하세요.`;
}

// 계통도 멘트
export function getPrerequisiteFeedback(chainCount: number): string {
  if (chainCount === 0) return '';
  if (chainCount >= 3) {
    return '여러 영역에서 선수학습 결손이 발견됩니다. 아래 개념들을 우선적으로 복습하면 현재 학년 내용의 이해도가 크게 향상됩니다.';
  }
  return '일부 선수학습 개념에서 보충이 필요합니다. 아래 개념을 복습하면 관련 단원의 이해가 쉬워집니다.';
}
