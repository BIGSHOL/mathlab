/**
 * 학습 대책 상수 정의
 * Math Report study-strategy/constants.ts에서 이식
 */

// ── 난이도 가중치 (평균 난이도 계산용) ──
export const DIFFICULTY_WEIGHT: Record<string, number> = {
  concept: 1, pattern: 2, reasoning: 3, creative: 4,
  low: 1, medium: 2, high: 3,
};

// ── 난이도 라벨 ──
export const DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념', pattern: '유형', reasoning: '심화', creative: '최상위',
  low: '하', medium: '중', high: '상',
};

// ── 난이도 색상 ──
export const DIFFICULTY_COLORS: Record<string, string> = {
  concept: '#22c55e', pattern: '#3b82f6', reasoning: '#f59e0b', creative: '#ef4444',
  low: '#22c55e', medium: '#3b82f6', high: '#f59e0b',
};

// ── 유형별 학습 전략 ──
export const TYPE_STRATEGIES: Record<string, string[]> = {
  calculation: [
    '기본 연산 속도와 정확성을 높이기 위해 매일 10문제씩 시간을 재며 풀기',
    '부호 실수, 약분 오류 등 반복되는 계산 실수 패턴을 정리하여 체크리스트 작성',
    '복잡한 계산은 중간 과정을 반드시 적고, 검산 습관 들이기',
  ],
  geometry: [
    '도형의 정의와 성질을 정확히 암기하고, 조건을 그림에 직접 표시하는 습관',
    '증명 문제는 조건 → 결론의 논리적 흐름을 연습하기',
    '좌표기하 문제는 공식 암기 + 그래프 그리기를 병행',
  ],
  application: [
    '문제를 읽고 핵심 조건을 밑줄 치는 습관 기르기',
    '실생활 문제는 수학적 모델로 변환하는 연습 (문자로 놓기 → 식 세우기)',
    '다양한 응용 유형을 분류별로 정리하여 패턴 학습',
  ],
  proof: [
    '증명의 기본 구조(가정 → 근거 → 결론) 연습',
    '교과서 증명을 직접 따라 써보고, 빠진 단계를 찾는 훈련',
    '역, 이, 대우 관계를 활용한 간접 증명 연습',
  ],
  graph: [
    '함수의 그래프를 직접 그려보는 연습 (점 찍기 → 연결하기)',
    '그래프의 이동(평행이동, 대칭이동) 원리를 시각적으로 이해',
    '그래프에서 정보를 읽어내는 문제 유형 집중 훈련',
  ],
  statistics: [
    '평균, 분산, 표준편차 공식을 완벽히 암기하고 빠르게 계산하는 연습',
    '도수분포표, 히스토그램, 상자그림 등 자료 해석 능력 강화',
    '확률 문제는 경우의 수를 체계적으로 세는 방법(수형도, 표) 연습',
  ],
};

// ── 난이도별 조언 ──
export const DIFFICULTY_ADVICE: Record<string, string> = {
  concept: '기초 개념 이해에 집중하세요. 교과서의 정의와 공식을 정확히 암기하고, 기본 예제를 반복 풀이하면 빠르게 향상됩니다.',
  pattern: '유형별 풀이 패턴을 익히는 것이 핵심입니다. 교과서 유제와 기출문제를 분류별로 정리하여 반복 학습하세요.',
  reasoning: '복합적인 사고력이 필요합니다. 2개 이상의 개념을 결합하는 연습과, 문제 해결 전략을 스스로 수립하는 훈련이 필요합니다.',
  creative: '최상위 문제는 정해진 패턴이 없습니다. 다양한 접근법을 시도하고, 문제의 구조를 분석하는 능력을 키우세요.',
};

// ── 서술형 감점 방지 체크리스트 ──
export const ESSAY_CHECKLIST = [
  {
    category: '풀이 과정',
    checkPoints: [
      '모든 계산 단계를 명시했는가?',
      '사용한 공식/정리를 기재했는가?',
      '논리적 비약 없이 전개했는가?',
    ],
    commonErrors: ['중간 단계 생략', '풀이 순서 오류', '공식 적용 근거 누락'],
  },
  {
    category: '조건 확인',
    checkPoints: [
      '문제의 모든 조건을 사용했는가?',
      '변수의 범위 조건을 확인했는가?',
      '특수한 경우(0, 음수 등)를 검토했는가?',
    ],
    commonErrors: ['조건 누락', '범위 조건 무시', '특수값 미검토'],
  },
  {
    category: '형식 요건',
    checkPoints: [
      '등호를 연속으로 사용하지 않았는가?',
      '단위를 표기했는가?',
      '최종 답을 명확히 표기했는가?',
    ],
    commonErrors: ['등호 연속 사용', '단위 누락', '최종답 미표기'],
  },
  {
    category: '계산 정확성',
    checkPoints: [
      '부호 처리가 정확한가?',
      '괄호 처리가 올바른가?',
      '약분/통분이 정확한가?',
    ],
    commonErrors: ['부호 실수', '괄호 처리 오류', '약분/통분 실수'],
  },
];

// ── 주요 감점 사례 ──
export const ESSAY_DEDUCTION_CASES = [
  { type: '논리적 비약', example: '중간 단계 생략' },
  { type: '형식 오류', example: '등호 연속 사용' },
  { type: '단위 누락', example: '최종답 단위 미표기' },
  { type: '부호 실수', example: '음수 계산 오류' },
];

// ── 4주 전 학습 타임라인 ──
export const FOUR_WEEK_TIMELINE = [
  {
    week: '4주 전',
    title: '계획 및 개념 점검',
    tasks: [
      '시험 범위 확인 및 학습 계획표 수립',
      '개념 전체 훑기 (빠르게 1회독)',
      '부족한 단원 파악',
    ],
  },
  {
    week: '3주 전',
    title: '개념 완성',
    tasks: [
      '교과서 2~3회독으로 개념 완벽 이해',
      '기본 유형 문제집 1회독',
      '공식 정리 노트 작성',
    ],
  },
  {
    week: '2주 전',
    title: '유형 및 기출',
    tasks: [
      '기출문제 분석 및 풀이',
      '응용/심화 문제 도전',
      '오답노트 본격 작성',
    ],
  },
  {
    week: '1주 전',
    title: '마무리 및 실전',
    tasks: [
      '오답노트 총복습',
      '실전 모의 시험 (시간 제한)',
      '컨디션 조절 및 자신감 유지',
    ],
  },
];

// ── 수준별 학습 전략 ──
export const LEVEL_STRATEGIES = [
  {
    level: '하위권',
    targetGrade: '5등급 이하 → 3~4등급 목표',
    description: '기초 개념 재정립이 최우선',
    coreStrategies: [
      '중학교 수학 개념 점검 필수 (연계 단원 복습)',
      '문제집보다 교과서 기본 개념을 먼저 완벽히',
      '쉬운 문제 위주로 자신감 회복',
      '하루 30분, 기본 계산 15문제씩 매일 풀기',
      '틀린 문제는 3번 이상 반복 (같은 유형 추가 연습)',
    ],
    studyHours: '하루 최소 2시간 이상 수학 투자',
    recommendedBooks: ['교과서', '개념쎈'],
    keyPrinciple: '어설픈 선행보다 확실한 복습이 훨씬 중요합니다.',
  },
  {
    level: '중위권',
    targetGrade: '3~4등급 → 1~2등급 목표',
    description: '개념의 "왜"를 이해하는 것이 핵심',
    coreStrategies: [
      '공식 암기가 아닌 유도 과정을 이해하기',
      '유형별 문제 풀이 패턴 정리 (오답노트 필수)',
      '기출문제 5~10회분 시간 재며 풀기',
      '실수 유형 체크리스트 만들어 매 문제 확인',
      '심화 문제에 도전하되, 30분 이상 못 풀면 해설 참고',
    ],
    studyHours: '하루 2~3시간, 주말 4시간 이상',
    recommendedBooks: ['쎈', '기출문제집', 'RPM'],
    keyPrinciple: '유형을 많이 풀기보다 틀린 유형을 완벽히 이해하는 것이 중요합니다.',
  },
  {
    level: '상위권',
    targetGrade: '1~2등급 → 1등급 사수/만점',
    description: '실수 없이 전 문항을 완벽하게 맞추는 것이 필요',
    coreStrategies: [
      '고난도 문제(심화, 최상위) 집중 훈련',
      '다양한 풀이법 습득 (특히 시간 절약 풀이)',
      '실수 방지 체크리스트 매 문제마다 확인',
      '서술형 답안 작성 연습 (채점 기준 역설계)',
      '타이머 활용 실전 연습 (시간 배분 최적화)',
    ],
    studyHours: '하루 1~2시간 (집중도 높게)',
    recommendedBooks: ['최상위 수학', '블랙라벨', '일품'],
    keyPrinciple: '이미 잘하고 있습니다. 실수를 줄이는 것이 곧 점수 향상입니다.',
  },
];

// ── 오답 유형 라벨 ──
export const ERROR_TYPE_LABELS: Record<string, string> = {
  calculation_error: '계산 실수',
  concept_error: '개념 오해',
  concept_gap: '개념 부족',
  careless_mistake: '단순 실수',
  careless: '단순 실수',
  process_error: '풀이 과정 오류',
  incomplete: '미완성',
  time_pressure: '시간 부족',
  misread: '문제 오독',
  unknown: '기타',
};
