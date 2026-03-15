/**
 * 레벨테스트 결과 멘트 (피드백 텍스트) 생성
 * 10% 단위 세분화 + 학생이름 개인화
 */

// ===== 전체 정답률 기반 종합 멘트 (10% 단위) =====
export function getOverallFeedback(accuracy: number, _level: string): string {
  if (accuracy >= 96)
    return '최상위 수준의 탁월한 수학 실력을 갖추고 있습니다. 거의 모든 문제를 정확하게 풀어냈으며, 심화 과정과 경시대회 수준의 문제에 도전하여 수학적 사고력을 더욱 발전시킬 수 있습니다. 현재 실력을 유지하면서 창의적 문제 해결 능력을 키워보세요.';
  if (accuracy >= 89)
    return '상위권의 우수한 수학 실력을 보유하고 있습니다. 대부분의 개념을 정확히 이해하고 있으며, 일부 고난도 문제에서만 실수가 나타납니다. 틀린 문제의 유형을 분석하여 집중 보완하면 최상위 수준에 도달할 수 있습니다.';
  if (accuracy >= 77)
    return '안정적인 학습 수준을 보이고 있습니다. 기본 개념과 중급 문제를 잘 소화하고 있으나, 고난도 응용 문제에서 다소 어려움이 있습니다. 취약 영역의 심화 학습과 다양한 문제 풀이 경험이 도움이 됩니다.';
  if (accuracy >= 60)
    return '기본 개념은 이해하고 있으나 응용력 강화가 필요한 단계입니다. 중간 난이도 이상의 문제에서 정답률이 낮아지는 경향이 있어, 개념의 깊이 있는 이해와 함께 다양한 유형의 연습이 필요합니다.';
  if (accuracy >= 50)
    return '핵심 개념의 기초는 갖추고 있으나 전반적인 보강이 필요합니다. 기본 문제는 풀 수 있지만 조금만 변형되면 어려움을 느끼는 단계입니다. 교과서 기본 개념을 다시 정리하고, 단계별로 난이도를 높여가며 연습하세요.';
  if (accuracy >= 40)
    return '기초 개념의 이해를 다지는 것이 가장 중요한 시기입니다. 기본적인 문제에서도 실수가 나타나고 있어, 핵심 개념을 처음부터 차근차근 복습하는 것이 필요합니다. 꾸준한 학습을 통해 충분히 향상할 수 있습니다.';
  if (accuracy >= 30)
    return '여러 단원에서 기초 개념 이해가 부족한 상태입니다. 현재 학년의 내용을 따라가기 위해서는 이전 단원의 핵심 개념부터 체계적으로 복습하는 것이 필요합니다. 기초부터 탄탄히 다지면 빠르게 향상할 수 있습니다.';
  if (accuracy >= 20)
    return '기본 개념부터 체계적인 학습이 시급합니다. 선수학습 개념에서 결손이 있어 현재 학년의 내용을 이해하는 데 어려움이 큽니다. 이전 학년의 기초 개념부터 순서대로 복습하는 것을 강력히 권장합니다.';
  if (accuracy >= 10)
    return '수학 기초가 매우 부족한 상태로, 집중적인 기초 학습이 반드시 필요합니다. 현재 학년보다 1~2학년 아래의 내용부터 시작하여 단계적으로 학습하는 것이 효과적입니다. 포기하지 않고 꾸준히 노력하면 반드시 나아질 수 있습니다.';
  return '수학 학습의 기초부터 새롭게 시작해야 합니다. 수와 연산의 기본 개념부터 차근차근 익혀나가는 것이 중요합니다. 학습 습관을 먼저 잡고, 매일 조금씩 기초 문제를 풀어보는 것부터 시작하세요.';
}

// ===== 4대 영역별 멘트 (10% 단위) =====
const DOMAIN_FEEDBACK_10: Record<string, string[]> = {
  // index 0 = 0~9%, 1 = 10~19%, ... 9 = 90~99%, 10 = 100%
  CALCULATION: [
    '기초 연산에 심각한 어려움이 있습니다. 수의 개념과 기본 사칙연산부터 체계적으로 학습해야 합니다.',
    '연산의 기본 원리 이해가 필요합니다. 받아올림, 받아내림 등 기초 연산 과정을 다시 익혀야 합니다.',
    '기초 연산력이 많이 부족합니다. 매일 꾸준한 연산 연습으로 기본기를 다져야 합니다.',
    '연산 실수가 빈번하게 발생합니다. 기본 연산의 정확도를 높이는 반복 연습이 필요합니다.',
    '기본 사칙연산은 가능하나 다단계 계산에서 오류가 잦습니다. 풀이 과정을 꼼꼼히 점검하는 습관을 기르세요.',
    '연산 능력에 보강이 필요합니다. 분수, 소수 등 복잡한 연산의 정확도를 높이는 연습이 필요합니다.',
    '기본 연산은 안정적이나 복합 연산이나 다단계 계산에서 간혹 오류가 발생합니다. 연산 연습을 통해 정확도를 높이세요.',
    '계산력이 양호합니다. 대부분의 연산을 정확하게 수행하나, 복잡한 계산에서 간헐적 실수가 나타납니다.',
    '계산 정확도가 매우 우수합니다. 빠르고 정확한 연산 능력을 갖추고 있습니다.',
    '계산 정확도가 매우 우수합니다. 빠르고 정확한 연산 능력을 갖추고 있으며, 복합 연산도 능숙하게 처리합니다.',
    '계산력이 완벽합니다. 모든 유형의 연산을 빠르고 정확하게 수행하고 있습니다.',
  ],
  UNDERSTANDING: [
    '수학적 개념 이해가 매우 부족합니다. 기본 정의와 성질부터 차근차근 학습이 필요합니다.',
    '개념 이해에 큰 어려움을 보입니다. 교과서의 정의와 예시를 반복해서 읽어보세요.',
    '개념 이해가 부족합니다. 핵심 용어의 뜻과 기본 성질을 다시 정리하는 것이 필요합니다.',
    '일부 기초 개념은 알고 있으나 전반적인 이해가 부족합니다. 교과서 예제를 통해 개념을 다져야 합니다.',
    '개념의 기본은 알지만 정확한 이해가 부족하여 응용에 어려움이 있습니다. 개념 노트 정리를 추천합니다.',
    '기본 개념은 이해하나 세부 성질을 혼동하는 경우가 있습니다. 유사 개념 간 차이점을 정리해보세요.',
    '대부분의 개념을 이해하고 있으나 일부 심화 개념에서 혼동이 있습니다. 약한 부분의 집중 복습이 필요합니다.',
    '개념 이해력이 양호합니다. 기본 개념과 성질을 잘 파악하고 있으며, 심화 개념 학습을 시작할 수 있습니다.',
    '수학 개념을 깊이 이해하고 있습니다. 정의와 성질을 정확히 파악하고 있습니다.',
    '수학 개념을 깊이 이해하고 있습니다. 정의와 성질을 정확히 파악하고 응용할 수 있습니다.',
    '개념 이해가 완벽합니다. 모든 개념을 정확히 이해하고 유연하게 활용할 수 있습니다.',
  ],
  PROBLEM_SOLVING: [
    '문제 해결 능력이 매우 부족합니다. 문제의 조건을 파악하는 연습부터 시작해야 합니다.',
    '문제 해결에 큰 어려움을 겪고 있습니다. 기본 유형의 문제 풀이 방법을 익히는 것이 급선무입니다.',
    '문제 해결 전략이 부족합니다. 유형별 풀이 방법을 익히고 단계별로 접근하는 연습이 필요합니다.',
    '기본적인 문제는 풀 수 있으나 조금만 변형되면 어려움을 느낍니다. 다양한 유형을 접하는 것이 중요합니다.',
    '익숙한 유형은 풀지만 새로운 유형에서 어려움을 느낍니다. 다양한 문제를 접하는 것이 도움됩니다.',
    '중간 수준의 문제 해결 능력을 보입니다. 문제 분석 능력을 키우면 빠르게 향상할 수 있습니다.',
    '문제 해결 능력이 양호합니다. 대부분의 유형에 대응할 수 있으나, 고난도 문제에서 시간이 걸립니다.',
    '문제 해결 능력이 우수합니다. 다양한 유형의 문제에 잘 대응하고 있으며, 풀이 전략도 적절합니다.',
    '문제 해결 능력이 뛰어납니다. 다양한 유형의 문제에 효과적으로 대응하고 있습니다.',
    '문제 해결 능력이 뛰어납니다. 고난도 문제에서도 창의적인 풀이 접근을 보여줍니다.',
    '문제 해결 능력이 탁월합니다. 어떤 유형의 문제도 논리적이고 효율적으로 풀어냅니다.',
  ],
  REASONING: [
    '추론력이 매우 부족합니다. 논리적 사고의 기초부터 훈련이 필요합니다.',
    '추론 능력에 큰 어려움을 보입니다. "왜?"라는 질문을 던지며 생각하는 습관을 기르세요.',
    '추론력 강화가 필요합니다. 풀이 과정을 논리적으로 정리하는 습관을 기르세요.',
    '기본적인 추론은 시도하나 논리적 전개가 미흡합니다. 풀이 과정을 글로 정리하는 연습이 도움됩니다.',
    '기본적인 추론은 가능하나 복합적인 논리 전개에서 약점을 보입니다.',
    '중간 수준의 추론력을 보입니다. 단순 추론은 가능하나 다단계 추론에서 보강이 필요합니다.',
    '추론력이 양호합니다. 대부분의 추론 과정을 올바르게 수행하며, 심화 문제에서 더 연습이 필요합니다.',
    '추론력이 우수합니다. 논리적 사고가 잘 발달되어 있으며, 수학적 증명의 기초를 갖추고 있습니다.',
    '논리적 사고력이 우수합니다. 수학적 추론과 증명 능력이 잘 발달되어 있습니다.',
    '논리적 사고력이 매우 우수합니다. 복합적인 추론과 엄밀한 논리 전개가 가능합니다.',
    '추론력이 탁월합니다. 완벽한 논리적 사고와 수학적 증명 능력을 갖추고 있습니다.',
  ],
};

export function getDomainFeedback(domain: string, accuracy: number): string {
  const fb = DOMAIN_FEEDBACK_10[domain];
  if (!fb) return '';
  const tier = Math.min(10, Math.max(0, Math.floor(accuracy / 10)));
  return fb[tier] ?? fb[0];
}

// ===== 난이도별 분석 멘트 =====
interface DiffStatInput {
  difficulty: string;
  accuracy: number;
  total: number;
}

export function getDifficultyComment(studentName: string, stats: DiffStatInput[]): string {
  const basic = stats.find(d => d.difficulty === 'BASIC');
  const medium = stats.find(d => d.difficulty === 'MEDIUM');
  const high = stats.find(d => d.difficulty === 'HIGH');
  const highest = stats.find(d => d.difficulty === 'HIGHEST');

  let comment = `${studentName} 학생의 시험 결과를 보아 본 시험범위 내의 `;

  // 패턴 분석
  const basicAcc = basic?.accuracy ?? 0;
  const mediumAcc = medium?.accuracy ?? 0;
  const highAcc = high?.accuracy ?? 0;
  const highestAcc = highest?.accuracy ?? 0;

  if (basicAcc >= 80 && mediumAcc >= 80 && highAcc >= 70) {
    comment += '모든 난이도의 문제를 안정적으로 풀고 있습니다. ';
    if (highestAcc < 60 && highest) {
      comment += '최상위 난이도 문제에서 다소 어려움을 보이나, 전반적으로 실력이 우수합니다. 심화 문제 연습을 추가하면 최고 수준에 도달할 수 있습니다.';
    } else {
      comment += '고난도 문제까지 잘 소화하고 있어 현재 학습 수준이 매우 높다고 판단됩니다.';
    }
  } else if (basicAcc >= 70 && mediumAcc >= 50 && highAcc < 50) {
    comment += '기본 문제는 잘 풀고 있으나 상위 난이도에서 급격한 하락이 나타납니다. ';
    comment += '기본기는 갖추고 있으므로 중간 난이도 문제를 집중 연습하면 상위 문제도 풀 수 있게 됩니다.';
  } else if (basicAcc >= 70 && mediumAcc < 60) {
    comment += '필수예제나 정형화된 유형문제들과 심화 응용문제들에 대한 공부가 모두 부족해 보입니다. ';
    comment += '이를 보완하는 학습을 먼저 진행할 것을 추천합니다. 유형서학습과 관심에서 학습을 동시에 할 것을 추천합니다.';
  } else if (basicAcc < 60) {
    comment += '기본 난이도 문제부터 어려움을 겪고 있어 핵심 개념 복습이 최우선입니다. ';
    comment += '교과서 예제와 기본 문제를 먼저 완벽히 소화한 후 점진적으로 난이도를 높여가세요.';
  } else {
    comment += '난이도별로 고른 학습이 필요합니다. ';
    const weakDiffs = stats.filter(d => d.accuracy < 60);
    if (weakDiffs.length > 0) {
      const labels: Record<string, string> = { BASIC: '하', MEDIUM: '중', HIGH: '상', HIGHEST: '최상' };
      comment += `특히 ${weakDiffs.map(d => `'${labels[d.difficulty] ?? d.difficulty}' 난이도`).join(', ')} 문제에서 보충이 필요합니다.`;
    }
  }

  return comment;
}

// ===== 단원별 성취도 멘트 =====
interface ChapterStatInput {
  name: string;
  accuracy: number;
  total: number;
}

export function getChapterComment(studentName: string, stats: ChapterStatInput[]): string {
  const sorted = [...stats].sort((a, b) => a.accuracy - b.accuracy);
  const strong = sorted.filter(c => c.accuracy >= 80);
  const mid = sorted.filter(c => c.accuracy >= 50 && c.accuracy < 80);
  const weak = sorted.filter(c => c.accuracy < 50);

  let comment = `${studentName} 학생의 이번 평가의 단원별 성취도는 아래와 같습니다. `;

  if (weak.length === 0 && mid.length === 0) {
    comment += '모든 단원에서 우수한 성취를 보이고 있습니다. 현재 학습 상태가 매우 양호합니다.';
  } else if (weak.length === 0) {
    comment += `전반적으로 양호하며, ${mid.slice(0, 2).map(c => `'${c.name}'`).join(', ')} 단원에서 추가 연습이 필요합니다. 해당 단원의 유형별 문제를 집중 풀이하면 빠르게 향상할 수 있습니다.`;
  } else if (strong.length > 0) {
    comment += `${strong.slice(0, 2).map(c => `'${c.name}'`).join(', ')} 단원은 우수하나, `;
    comment += `${weak.slice(0, 2).map(c => `'${c.name}'(${c.accuracy}%)`).join(', ')} 단원은 기초 개념부터 다시 학습이 필요합니다. `;
    comment += '강점 단원의 자신감을 바탕으로 취약 단원을 집중 보완하세요.';
  } else {
    comment += `대부분의 단원에서 보충이 필요합니다. 특히 ${weak.slice(0, 2).map(c => `'${c.name}'(${c.accuracy}%)`).join(', ')} 단원의 기본 개념부터 복습을 시작하세요. `;
    comment += '기초를 다지는 마음가짐으로 해당 과정을 밟아 재학습 하시고, 수학 공부에 조금 더 매진하시기 바랍니다.';
  }

  return comment;
}

// ===== 취약 단원 멘트 =====
export function getWeakAreaFeedback(weakCount: number, totalChapters: number): string {
  if (weakCount === 0) return '모든 단원에서 안정적인 성취를 보이고 있습니다.';
  const ratio = weakCount / totalChapters;
  if (ratio >= 0.5) return '여러 단원에서 취약점이 발견됩니다. 기초부터 단계적으로 복습을 시작하세요.';
  return `${weakCount}개 단원에서 보충이 필요합니다. 해당 단원의 핵심 개념부터 다시 학습하세요.`;
}

// ===== 계통도 멘트 =====
export function getPrerequisiteFeedback(chainCount: number): string {
  if (chainCount === 0) return '';
  if (chainCount >= 3) {
    return '여러 영역에서 선수학습 결손이 발견됩니다. 아래 개념들을 우선적으로 복습하면 현재 학년 내용의 이해도가 크게 향상됩니다.';
  }
  return '일부 선수학습 개념에서 보충이 필요합니다. 아래 개념을 복습하면 관련 단원의 이해가 쉬워집니다.';
}
