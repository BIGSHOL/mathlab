/**
 * 성적대별 학습 전략 및 시험 시간 배분 전략
 *
 * curriculumStrategies.ts에서 분리됨
 * - 성적대별 학습 전략 (LEVEL_STRATEGIES)
 * - 시험 시간 배분 전략 (TIME_STRATEGIES, generateTimeStrategies)
 * - 서술형 감점 방지 체크리스트 (ESSAY_CHECKLIST)
 * - 4주 전 학습 타임라인 (FOUR_WEEK_TIMELINE, generateFourWeekTimeline)
 */

// ============================================
// 타입 정의
// ============================================

export interface LevelStrategy {
  level: string;
  targetGrade: string;
  description: string;
  coreStrategies: string[];
  studyHours: string;
  recommendedBooks: string[];
  keyPrinciple: string;
}

export interface TimeStrategy {
  phase: string;
  questionRange: string;
  timeAllocation: string;
  perQuestion: string;
  tips: string[];
}

export interface EssayCheckItem {
  category: string;
  checkPoints: string[];
  commonErrors: string[];
}

export interface StudyTimeline {
  week: string;
  title: string;
  tasks: string[];
}

// ============================================
// 성적대별 학습 전략
// ============================================

export const LEVEL_STRATEGIES: LevelStrategy[] = [
  {
    level: '하위권',
    targetGrade: '5등급 이하 → 3~4등급 목표',
    description: '기초 개념 재정립이 최우선',
    coreStrategies: [
      '중학교 수학 개념 점검 필수 - 빈 개념이 발견되면 해당 학년으로 돌아가 복습',
      '문제집보다 교과서 기본 개념과 예제 문제에 집중',
      '본인 수준보다 약간 쉬운 문제집 선택으로 자신감 구축',
      '양치기보다 한 문제를 완벽히 이해하는 것이 중요',
      '모르는 문제는 5분 고민 후 해설 확인 → 다시 풀기',
    ],
    studyHours: '하루 최소 2시간 이상 수학 투자',
    recommendedBooks: ['풍산자 (개념 쉽게)', '베이직쎈 (기초)', '라이트쎈 (기본)'],
    keyPrinciple: '어설픈 선행보다 확실한 복습이 훨씬 중요합니다.',
  },
  {
    level: '중위권',
    targetGrade: '3~4등급 → 2등급 안정화 목표',
    description: '개념의 "왜"를 이해하는 것이 핵심',
    coreStrategies: [
      '1주일 내 기본 개념 완벽 이해',
      '공식을 마인드맵으로 정리하여 머릿속 구조화',
      '기출문제 10회분 풀이 (유형 파악)',
      '같은 문제 25분 내 재풀이 (속도 훈련)',
      '오답노트 작성 후 주기적 복습 (당일 → 3일 후 → 1주일 후)',
    ],
    studyHours: '하루 3~4시간 수학 집중 투자',
    recommendedBooks: ['개념원리', '개념원리 RPM', '쎈 A~B단계'],
    keyPrinciple: '공식 암기만으로는 한계가 있습니다. "왜 이 공식이 성립하는가?"를 이해해야 응용력이 향상됩니다.',
  },
  {
    level: '상위권',
    targetGrade: '1~2등급 → 1등급 안정화 및 만점 목표',
    description: '실수 없이 전부 맞추는 완벽함이 필요',
    coreStrategies: [
      '두 개 이상의 개념이 결합된 복합 문제 연습',
      '시험과 동일한 조건(50분, OMR 카드)으로 실전 모의',
      '객관식도 풀이 과정 완벽히 작성하는 습관',
      '킬러문항 대비 심화 문제집 병행',
      '실수 패턴 분석 및 체크리스트화',
    ],
    studyHours: '하루 2~3시간 (효율 중심)',
    recommendedBooks: ['쎈 B~C단계', '일품', '블랙라벨'],
    keyPrinciple: '"아는 것을 맞고, 모르는 것은 틀리는" 수준을 넘어 "실수 없이 전부 맞추는" 완벽함이 필요합니다.',
  },
];

// ============================================
// 시험 시간 배분 전략
// ============================================

export const TIME_STRATEGIES: TimeStrategy[] = [
  {
    phase: '1단계',
    questionRange: '기본 유형 (1~10번)',
    timeAllocation: '15~20분',
    perQuestion: '문제당 1~2분',
    tips: [
      '빠르게 풀되 계산 실수 주의',
      '확실한 문제로 기본 점수 확보',
    ],
  },
  {
    phase: '2단계',
    questionRange: '중간 난이도 (11~18번)',
    timeAllocation: '20~25분',
    perQuestion: '문제당 2~3분',
    tips: [
      '풀이 방향이 바로 안 보이면 별표 표시 후 넘기기',
      '시간 소모가 큰 문제는 나중에',
    ],
  },
  {
    phase: '3단계',
    questionRange: '고난도 (19~25번)',
    timeAllocation: '15~20분',
    perQuestion: '문제당 3~5분',
    tips: [
      '배점 높은 문제 우선 공략',
      '부분점수 노리는 전략 사용',
    ],
  },
  {
    phase: '검토',
    questionRange: '전체',
    timeAllocation: '10~15분',
    perQuestion: '-',
    tips: [
      'OMR 마킹 확인',
      '계산 실수 점검 (특히 부호)',
      '조건 누락 여부 재확인',
    ],
  },
];

/**
 * 분석된 문항수와 학교급에 맞는 동적 시간 배분 전략 생성
 *
 * @param totalQuestions - 실제 분석된 문항 수
 * @param isMiddleSchool - 중학교 여부 (true: 45분, false: 50분)
 */
export function generateTimeStrategies(totalQuestions: number, isMiddleSchool: boolean): TimeStrategy[] {
  const totalMinutes = isMiddleSchool ? 45 : 50;

  // 문항 수 기반 단계별 분배 (약 40% / 35% / 25%)
  const phase1End = Math.round(totalQuestions * 0.4);
  const phase2End = Math.round(totalQuestions * 0.75);
  const phase3End = totalQuestions;

  // 시간 분배: 검토 5분 고정, 나머지를 비율로 분배
  const reviewMinutes = 5;
  const solvingMinutes = totalMinutes - reviewMinutes;
  const phase1Min = Math.round(solvingMinutes * 0.35);
  const phase2Min = Math.round(solvingMinutes * 0.35);
  const phase3Min = solvingMinutes - phase1Min - phase2Min;

  // 문제당 시간 계산
  const phase1Count = phase1End;
  const phase2Count = phase2End - phase1End;
  const phase3Count = phase3End - phase2End;

  const perQ1 = phase1Count > 0 ? Math.round(phase1Min / phase1Count * 10) / 10 : 0;
  const perQ2 = phase2Count > 0 ? Math.round(phase2Min / phase2Count * 10) / 10 : 0;
  const perQ3 = phase3Count > 0 ? Math.round(phase3Min / phase3Count * 10) / 10 : 0;

  return [
    {
      phase: '1단계',
      questionRange: `기본 유형 (1~${phase1End}번)`,
      timeAllocation: `${phase1Min}분`,
      perQuestion: `문제당 약 ${perQ1}분`,
      tips: [
        '빠르게 풀되 계산 실수 주의',
        '확실한 문제로 기본 점수 확보',
      ],
    },
    {
      phase: '2단계',
      questionRange: `중간 난이도 (${phase1End + 1}~${phase2End}번)`,
      timeAllocation: `${phase2Min}분`,
      perQuestion: `문제당 약 ${perQ2}분`,
      tips: [
        '풀이 방향이 바로 안 보이면 별표 표시 후 넘기기',
        '시간 소모가 큰 문제는 나중에',
      ],
    },
    {
      phase: '3단계',
      questionRange: `고난도 (${phase2End + 1}~${phase3End}번)`,
      timeAllocation: `${phase3Min}분`,
      perQuestion: `문제당 약 ${perQ3}분`,
      tips: [
        '배점 높은 문제 우선 공략',
        '부분점수 노리는 전략 사용',
      ],
    },
    {
      phase: '검토',
      questionRange: '전체',
      timeAllocation: `${reviewMinutes}분`,
      perQuestion: '-',
      tips: [
        'OMR 마킹 확인',
        '계산 실수 점검 (특히 부호)',
        '조건 누락 여부 재확인',
      ],
    },
  ];
}

// ============================================
// 서술형 감점 방지 체크리스트
// ============================================

export const ESSAY_CHECKLIST: EssayCheckItem[] = [
  {
    category: '풀이 과정',
    checkPoints: [
      '모든 계산 단계를 명시했는가?',
      '사용한 공식/정리를 기재했는가?',
      '논리적 비약 없이 전개했는가?',
    ],
    commonErrors: [
      '중간 단계 생략',
      '풀이 순서 오류',
      '공식 적용 근거 누락',
    ],
  },
  {
    category: '조건 확인',
    checkPoints: [
      '문제의 모든 조건을 사용했는가?',
      '변수의 범위 조건을 확인했는가?',
      '특수한 경우(0, 음수 등)를 검토했는가?',
    ],
    commonErrors: [
      '조건 일부 누락',
      '정의역/치역 범위 무시',
      '분모≠0 조건 미확인',
    ],
  },
  {
    category: '형식 요건',
    checkPoints: [
      '등호를 연속으로 사용하지 않았는가?',
      '단위를 표기했는가?',
      '최종 답을 명확히 표기했는가?',
    ],
    commonErrors: [
      'a = b = c 형태의 연속 등호',
      '단위 미표기',
      '최종답 불명확',
    ],
  },
  {
    category: '계산 정확성',
    checkPoints: [
      '부호 처리가 정확한가?',
      '괄호 처리가 올바른가?',
      '약분/통분이 정확한가?',
    ],
    commonErrors: [
      '음수 부호 실수',
      '괄호 전개 오류',
      '약분 누락',
    ],
  },
];

// ============================================
// 4주 전 학습 타임라인
// ============================================

export const FOUR_WEEK_TIMELINE: StudyTimeline[] = [
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

/**
 * 분석 결과의 취약 단원을 반영한 동적 4주 학습 타임라인 생성
 *
 * @param weakTopics - 취약 단원명 목록 (배점 비중 높은 순)
 * @param examMinutes - 시험 시간 (45분 또는 50분)
 */
export function generateFourWeekTimeline(weakTopics: string[], examMinutes: number): StudyTimeline[] {
  const weakStr = weakTopics.length > 0
    ? weakTopics.slice(0, 3).join(', ')
    : '전체 단원';

  return [
    {
      week: '4주 전',
      title: '계획 및 개념 점검',
      tasks: [
        '시험 범위 확인 및 학습 계획표 수립',
        '개념 전체 훑기 (빠르게 1회독)',
        weakTopics.length > 0
          ? `취약 단원 집중 파악: ${weakStr}`
          : '부족한 단원 파악',
      ],
    },
    {
      week: '3주 전',
      title: '개념 완성',
      tasks: [
        '교과서 2~3회독으로 개념 완벽 이해',
        '기본 유형 문제집 1회독',
        weakTopics.length > 0
          ? `취약 단원 개념 노트 작성: ${weakStr}`
          : '공식 정리 노트 작성',
      ],
    },
    {
      week: '2주 전',
      title: '유형 및 기출',
      tasks: [
        '기출문제 분석 및 풀이',
        weakTopics.length > 0
          ? `취약 단원 유형별 집중 풀이: ${weakStr}`
          : '응용/심화 문제 도전',
        '오답노트 본격 작성',
      ],
    },
    {
      week: '1주 전',
      title: '마무리 및 실전',
      tasks: [
        '오답노트 총복습',
        `실전 모의 시험 (${examMinutes}분 시간 제한)`,
        '컨디션 조절 및 자신감 유지',
      ],
    },
  ];
}
