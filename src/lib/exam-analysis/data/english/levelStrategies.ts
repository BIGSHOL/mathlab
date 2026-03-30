/**
 * 영어 수준별 학습 전략 데이터
 *
 * 하위권, 중위권, 상위권별 맞춤 학습 전략을 제공합니다.
 */
import type { LevelStrategy } from '../curriculum/types';

export const ENGLISH_LEVEL_STRATEGIES: LevelStrategy[] = [
  {
    level: '하위권',
    targetGrade: '5~6등급',
    description: '기초 문법과 핵심 어휘 완성이 최우선',
    coreStrategies: [
      '중학 문법 총정리부터 시작 (be동사, 일반동사, 시제, 조동사)',
      '수능 필수 어휘 1000개 암기 목표',
      '짧은 지문(100~150단어)으로 독해 감각 익히기',
      '기출문제 중 쉬운 유형(주제, 제목, 요지)부터 연습',
    ],
    studyHours: '주 10시간 이상',
    recommendedBooks: ['문법의 끝 Start', '천일문 기본', '리딩튜터 기본'],
    keyPrinciple: '매일 꾸준히! 하루 30분 문법 + 30분 어휘 + 30분 독해',
  },
  {
    level: '중위권',
    targetGrade: '3~4등급',
    description: '유형별 접근법 체득과 시간 관리 훈련',
    coreStrategies: [
      '수능 문제 유형별 풀이 전략 학습',
      '빈칸 추론 유형 집중 훈련 (단서 찾기 연습)',
      '순서/삽입 문제 논리적 흐름 파악 훈련',
      '어법 빈출 포인트 15개 완벽 정리',
    ],
    studyHours: '주 8시간 이상',
    recommendedBooks: ['수능특강 영어', '어법끝 5.0', '워드마스터 수능 2000'],
    keyPrinciple: '유형별 전략 체화! 왜 틀렸는지 반드시 분석',
  },
  {
    level: '상위권',
    targetGrade: '1~2등급',
    description: '고난도 문항 정복과 실전 감각 완성',
    coreStrategies: [
      '킬러 문항(빈칸 33-34, 순서/삽입 36-37) 집중 훈련',
      '지문 속 논리 구조(역설, 인과, 대조) 빠르게 파악',
      '실전 시간 배분 훈련 (듣기 후 35분 내 독해 완료)',
      '오답 원인 정밀 분석 (어휘/구문/논리 중 어디가 문제인가)',
    ],
    studyHours: '주 6시간 이상 (양보다 질)',
    recommendedBooks: ['수능완성 영어', '킬러 독해', '마더텅 수능기출'],
    keyPrinciple: '실수 최소화! 아는 문제 확실히 맞히고 킬러에서 1~2개 더 가져가기',
  },
];

/**
 * 수준별 시간 배분 전략
 */
export const ENGLISH_TIME_STRATEGIES = {
  '하위권': {
    phases: [
      { phase: '듣기', time: '25분', tip: '듣기에서 최대한 점수 확보' },
      { phase: '독해 전반 (18-28번)', time: '15분', tip: '주제/요지/제목 문제 빠르게 해결' },
      { phase: '어법/어휘 (29-30번)', time: '4분', tip: '자신 있는 것만 확실히' },
      { phase: '빈칸 (31-34번)', time: '12분', tip: '쉬운 빈칸만 도전, 어려운 건 찍기' },
      { phase: '순서/삽입 (35-37번)', time: '9분', tip: '지시어/연결어 추적' },
      { phase: '장문 (38-45번)', time: '10분', tip: '핵심 문장 위주로 속독' },
    ],
    totalTime: '70분',
    keyAdvice: '시간 내 풀 수 있는 문제에 집중. 어려운 문제는 과감히 포기하고 찍기.',
  },
  '중위권': {
    phases: [
      { phase: '듣기', time: '25분', tip: '듣기 만점 목표' },
      { phase: '독해 전반 (18-28번)', time: '12분', tip: '1분 내외로 빠르게 처리' },
      { phase: '어법/어휘 (29-30번)', time: '3분', tip: '어법 포인트 빠르게 체크' },
      { phase: '빈칸 (31-34번)', time: '14분', tip: '31-32는 확실히, 33-34는 시간 안 되면 찍기' },
      { phase: '순서/삽입 (35-37번)', time: '9분', tip: '각 3분씩 배분' },
      { phase: '장문 (38-45번)', time: '12분', tip: '문제 먼저 읽고 필요한 부분만 정독' },
    ],
    totalTime: '70분',
    keyAdvice: '빈칸 33-34에서 너무 많은 시간 소비 금지. 모르면 표시하고 넘어가기.',
  },
  '상위권': {
    phases: [
      { phase: '듣기', time: '25분', tip: '듣기 만점은 기본' },
      { phase: '독해 전반 (18-28번)', time: '10분', tip: '30초~1분 내 처리' },
      { phase: '어법/어휘 (29-30번)', time: '2분', tip: '빠르게 처리' },
      { phase: '빈칸 (31-34번)', time: '14분', tip: '33-34 각 4분 이내 목표' },
      { phase: '순서/삽입 (35-37번)', time: '7분', tip: '논리 구조 빠르게 파악' },
      { phase: '장문 (38-45번)', time: '10분', tip: '핵심 파악 후 정확하게' },
      { phase: '검토', time: '2분', tip: '마킹 확인, 찍은 문제 재검토' },
    ],
    totalTime: '70분',
    keyAdvice: '쉬운 문제에서 실수 절대 금지. 킬러에서 1~2개 더 가져가기.',
  },
};

/**
 * 수준별 격려 메시지
 */
export const ENGLISH_ENCOURAGEMENT_MESSAGES = {
  '하위권': [
    '기초부터 차근차근! 지금 노력하면 반드시 성적이 오릅니다.',
    '모르는 단어가 많아도 괜찮아요. 하루 20개씩만 외우면 됩니다.',
    '쉬운 문제부터 확실하게 맞히는 연습이 실력 향상의 지름길입니다.',
    '영어는 하루아침에 늘지 않아요. 꾸준함이 가장 중요합니다.',
  ],
  '중위권': [
    '유형별 전략을 익히면 점수가 금방 오릅니다!',
    '오답 분석이 곧 실력입니다. 왜 틀렸는지 반드시 확인하세요.',
    '어휘력이 독해의 기본! 매일 꾸준히 어휘 학습하세요.',
    '빈칸 추론은 연습량이 답입니다. 많이 풀어보세요.',
  ],
  '상위권': [
    '1등급까지 거의 다 왔어요! 실수만 줄이면 됩니다.',
    '킬러 문항도 결국 패턴입니다. 많이 풀면서 감을 익히세요.',
    '시간 관리가 핵심! 실전처럼 연습하세요.',
    '마지막까지 긴장 늦추지 마세요. 아는 문제에서 실수하면 안 됩니다.',
  ],
};

/**
 * 정답률 기반 수준 및 전략 조회
 */
export function getEnglishStrategyByScore(correctRate: number): LevelStrategy {
  if (correctRate < 50) {
    return ENGLISH_LEVEL_STRATEGIES.find(s => s.level === '하위권')!;
  }
  if (correctRate < 80) {
    return ENGLISH_LEVEL_STRATEGIES.find(s => s.level === '중위권')!;
  }
  return ENGLISH_LEVEL_STRATEGIES.find(s => s.level === '상위권')!;
}
