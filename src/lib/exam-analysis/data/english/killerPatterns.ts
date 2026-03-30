/**
 * 영어 킬러 문항 유형 및 학년 연계 데이터
 *
 * 수능 및 내신에서 자주 출제되는 고난도 유형과 학년 간 연계를 정의합니다.
 */
import type { GradeConnection, KillerQuestionType } from '../curriculum/types';

/**
 * 영어 학년 간 연계
 */
export const ENGLISH_GRADE_CONNECTIONS: GradeConnection[] = [
  // 중1 → 중2, 중3
  {
    fromGrade: '중1',
    fromTopic: 'be동사와 일반동사',
    toGrade: '중2~중3',
    toTopics: ['시제', '수동태', '조동사'],
    importance: 'critical',
    warning: 'be동사와 일반동사 구분은 시제, 수동태, 조동사 학습의 기초입니다.',
    checkItems: [
      'be동사(am, is, are)와 일반동사의 부정문 형태 차이를 아는가?',
      '3인칭 단수 주어에 대한 동사 변화(-s/-es)를 정확히 적용하는가?',
      '의문문에서 Do/Does와 be동사 사용을 구분하는가?',
    ],
  },
  {
    fromGrade: '중1',
    fromTopic: '현재시제와 과거시제',
    toGrade: '중2~고1',
    toTopics: ['현재완료', '과거완료', '시제 일치'],
    importance: 'critical',
    warning: '기본 시제 이해 없이는 완료시제와 시제 일치를 학습할 수 없습니다.',
    checkItems: [
      '규칙동사와 불규칙동사의 과거형을 정확히 쓰는가?',
      '시간 표현(yesterday, tomorrow, now)에 맞는 시제를 선택하는가?',
      '주어의 인칭과 수에 따른 동사 변화를 정확히 아는가?',
    ],
  },
  // 중2 → 중3, 고1
  {
    fromGrade: '중2',
    fromTopic: 'to부정사와 동명사',
    toGrade: '중3~고3',
    toTopics: ['분사', '분사구문', '준동사 심화'],
    importance: 'high',
    warning: 'to부정사와 동명사 구분은 수능 어법 문제의 단골 출제 포인트입니다.',
    checkItems: [
      'to부정사만 목적어로 취하는 동사(want, hope, decide 등)를 아는가?',
      '동명사만 목적어로 취하는 동사(enjoy, finish, avoid 등)를 아는가?',
      '의미가 달라지는 동사(remember, forget, stop)를 정확히 구분하는가?',
    ],
  },
  {
    fromGrade: '중2',
    fromTopic: '비교급과 최상급',
    toGrade: '고1~고3',
    toTopics: ['비교 구문 심화', '배수 표현', '수능 어법'],
    importance: 'medium',
    warning: '비교급/최상급의 형태와 용법은 수능 어법 문제에 자주 출제됩니다.',
    checkItems: [
      '불규칙 비교급(good→better→best, bad→worse→worst)을 암기했는가?',
      '비교급 강조(much, even, far)와 최상급 수식(the very)을 아는가?',
      'as ~ as 원급 비교와 배수 표현(twice as ~ as)을 이해하는가?',
    ],
  },
  // 중3 → 고1, 고2
  {
    fromGrade: '중3',
    fromTopic: '관계대명사',
    toGrade: '고1~고3',
    toTopics: ['관계부사', '복합관계사', '수능 어법'],
    importance: 'critical',
    warning: '관계사는 수능 어법에서 가장 자주 출제되는 영역입니다.',
    checkItems: [
      '관계대명사 who, which, that의 선행사에 따른 선택을 정확히 하는가?',
      '주격 관계대명사와 목적격 관계대명사를 구분하는가?',
      '관계대명사 what과 that의 차이(선행사 유무)를 아는가?',
    ],
  },
  {
    fromGrade: '중3',
    fromTopic: '현재완료',
    toGrade: '고1~고2',
    toTopics: ['현재완료 진행', '과거완료', '시제 일치'],
    importance: 'high',
    warning: '완료시제는 시간 표현과의 조합이 수능에서 자주 출제됩니다.',
    checkItems: [
      '현재완료와 함께 쓸 수 없는 표현(yesterday, ago)을 아는가?',
      'since와 for의 차이(시점 vs 기간)를 정확히 구분하는가?',
      'have been to vs have gone to의 의미 차이를 아는가?',
    ],
  },
  {
    fromGrade: '중3',
    fromTopic: '가정법',
    toGrade: '고1~고3',
    toTopics: ['가정법 과거완료', '혼합가정법', 'I wish 구문'],
    importance: 'high',
    warning: '가정법 시제는 수능 어법의 고난도 출제 포인트입니다.',
    checkItems: [
      '가정법 과거(현재 반대)와 가정법 과거완료(과거 반대)를 구분하는가?',
      'If절에서 were 사용(모든 인칭)을 아는가?',
      'I wish + 가정법 구문을 이해하는가?',
    ],
  },
  // 고1 → 고2, 고3
  {
    fromGrade: '고1',
    fromTopic: '분사구문',
    toGrade: '고2~고3',
    toTopics: ['독립분사구문', '완료분사구문', '수능 어법/구문'],
    importance: 'high',
    warning: '분사구문 해석은 수능 독해에서 문장 이해의 핵심입니다.',
    checkItems: [
      '분사구문의 의미(시간, 이유, 조건, 양보)를 문맥으로 파악하는가?',
      '주절과 분사구문 주어의 일치 여부를 확인하는가?',
      'Being 생략과 완료분사(Having p.p.) 구문을 이해하는가?',
    ],
  },
  {
    fromGrade: '고1',
    fromTopic: '강조/도치 구문',
    toGrade: '고2~고3',
    toTopics: ['부정어 도치', '수능 고난도 구문'],
    importance: 'medium',
    warning: '도치 구문은 수능 독해에서 문장 구조 파악을 어렵게 만듭니다.',
    checkItems: [
      '부정어구(Never, Hardly, Seldom) 도치의 어순을 아는가?',
      'So/Neither 도치 구문을 이해하는가?',
      'It is ~ that 강조구문과 가주어 구문을 구분하는가?',
    ],
  },
  // 고2 → 고3
  {
    fromGrade: '고2',
    fromTopic: '빈칸 추론',
    toGrade: '고3',
    toTopics: ['고난도 빈칸 추론', '추상적 개념 빈칸'],
    importance: 'critical',
    warning: '빈칸 추론은 수능에서 가장 변별력 있는 문제 유형입니다.',
    checkItems: [
      '글의 주제문과 빈칸의 관계를 파악하는가?',
      '빈칸 전후의 연결어와 지시어를 단서로 활용하는가?',
      '추상적 어휘의 빈칸에서 구체적 예시를 힌트로 삼는가?',
    ],
  },
  {
    fromGrade: '고2',
    fromTopic: '글의 순서/문장 삽입',
    toGrade: '고3',
    toTopics: ['복합 문단 독해', '논리적 흐름 파악'],
    importance: 'high',
    warning: '순서/삽입 문제는 글의 논리적 구조 이해 능력을 테스트합니다.',
    checkItems: [
      '지시어(this, that, such)와 연결어를 추적하는가?',
      '대명사의 선행사를 정확히 찾는가?',
      '시간/인과/대조 구조를 파악하는가?',
    ],
  },
];

/**
 * 영어 킬러 문항 유형 (수능 기준)
 */
export const ENGLISH_KILLER_PATTERNS: KillerQuestionType[] = [
  {
    grade: '고2~고3',
    topic: '빈칸 추론 (어휘)',
    patterns: [
      {
        type: '추상적 개념 빈칸',
        description: '철학적, 심리학적 개념이 빈칸에 들어가는 고난도 유형',
        approach: [
          '빈칸 전후 문장에서 구체적 예시나 부연 설명 찾기',
          '글의 전체 주제와 필자의 주장 파악',
          '선택지 어휘의 사전적 의미보다 문맥상 의미 우선',
          '역설적(paradox) 표현에 주의하며 글의 방향 파악',
        ],
        timeEstimate: '3~4분',
      },
      {
        type: '반의어 함정',
        description: '문맥과 반대되는 매력적 오답이 있는 유형',
        approach: [
          '빈칸 앞뒤 연결어(However, Therefore, In contrast) 주목',
          '글의 전체 흐름(긍정/부정)과 빈칸 부분의 관계 파악',
          '부분적으로 맞는 선택지보다 전체 논지에 맞는 것 선택',
          '빈칸을 포함한 문장만 보지 말고 문단 전체 맥락 확인',
        ],
        timeEstimate: '2~3분',
      },
    ],
  },
  {
    grade: '고2~고3',
    topic: '빈칸 추론 (구/절)',
    patterns: [
      {
        type: '구/절 빈칸',
        description: '빈칸에 구나 절 형태의 긴 표현이 들어가는 유형',
        approach: [
          '빈칸이 문장에서 어떤 역할(주어, 목적어, 보어)인지 파악',
          '빈칸 앞뒤의 주어와 동사를 확인하여 문법적 적합성 검토',
          '선택지를 대입했을 때 문장이 논리적으로 완결되는지 확인',
          '너무 일반적이거나 너무 구체적인 선택지는 주의',
        ],
        timeEstimate: '3~4분',
      },
    ],
  },
  {
    grade: '고2~고3',
    topic: '문장 삽입',
    patterns: [
      {
        type: '지시어 추적형',
        description: 'this, that, such, these 등 지시어가 단서인 유형',
        approach: [
          '주어진 문장의 지시어가 가리키는 대상을 앞 문장에서 찾기',
          '대명사(it, they)의 선행사 확인',
          '삽입 위치 전후 문장의 논리적 연결 확인',
          '주어진 문장의 연결어(However, Therefore)가 앞 문장과 맞는지 확인',
        ],
        timeEstimate: '2~3분',
      },
      {
        type: '논리 전개형',
        description: '글의 논리적 흐름 사이에 삽입하는 유형',
        approach: [
          '글의 전체 구조(서론-본론-결론, 문제-해결, 원인-결과) 파악',
          '주어진 문장이 예시, 부연, 반박, 결론 중 어떤 역할인지 판단',
          '문장 삽입 후 앞뒤 문장의 흐름이 자연스러운지 확인',
          'For example, In fact 등 역할 표지 단서 활용',
        ],
        timeEstimate: '2~3분',
      },
    ],
  },
  {
    grade: '고2~고3',
    topic: '글의 순서',
    patterns: [
      {
        type: '대명사 연결형',
        description: '대명사와 선행사의 연결로 순서를 찾는 유형',
        approach: [
          '각 문단의 첫 문장에서 지시어, 대명사 확인',
          '대명사가 있으면 선행사가 나온 문단 뒤에 배치',
          'The + 명사 형태는 앞에서 이미 언급된 개념',
          '시간 순서, 인과 관계 표지어 활용',
        ],
        timeEstimate: '2~3분',
      },
      {
        type: '논리 구조형',
        description: '글의 논리적 전개 구조로 순서를 찾는 유형',
        approach: [
          '주어진 문장에서 주제 및 방향 파악',
          '일반 → 구체, 원인 → 결과, 문제 → 해결 순서 확인',
          '연결어(First, Moreover, However)로 순서 추론',
          '결론이나 요약 문장은 마지막에 배치',
        ],
        timeEstimate: '2~3분',
      },
    ],
  },
  {
    grade: '고1~고3',
    topic: '어법 판단',
    patterns: [
      {
        type: '수일치 함정',
        description: '주어와 동사 사이에 수식어가 끼어 수일치를 혼동하는 유형',
        approach: [
          '진짜 주어 찾기: 전치사구, 관계절, 삽입구 제거',
          '주어가 긴 경우 핵심 주어만 추출하여 동사와 비교',
          '주의 표현: one of ~, a number of ~, the number of ~',
          '도치 구문에서 주어 위치 확인',
        ],
        timeEstimate: '1~2분',
      },
      {
        type: '능동/수동 선택',
        description: '-ing와 -ed(p.p.) 중 선택하는 유형',
        approach: [
          '수식받는 명사가 동작의 주체(능동)인지 대상(수동)인지 판단',
          '감정동사: 감정을 유발하는 주체 → -ing, 감정을 느끼는 주체 → -ed',
          '분사구문에서 주절 주어와의 관계로 능동/수동 판단',
          'being + p.p. 에서 being 생략 가능 (수동 분사구문)',
        ],
        timeEstimate: '1~2분',
      },
      {
        type: '관계사 선택',
        description: '관계대명사와 관계부사, that과 what 구분 유형',
        approach: [
          '뒤 절이 완전한 문장 → 관계부사, 불완전 → 관계대명사',
          '선행사 유무: 있으면 that/which/who, 없으면 what',
          '선행사가 사람 → who(m), 사물/동물 → which, 모두 가능 → that',
          '전치사 + 관계대명사에서는 that 불가',
        ],
        timeEstimate: '1~2분',
      },
      {
        type: '병렬구조',
        description: 'and, or, but으로 연결된 요소의 형태 일치 유형',
        approach: [
          'and, or, but, not only A but also B 등으로 연결된 요소 확인',
          '연결된 요소들의 품사와 형태가 동일한지 검토',
          'to부정사 병렬: to A and (to) B에서 두 번째 to 생략 가능',
          '비교 구문에서 비교 대상의 형태 일치 확인',
        ],
        timeEstimate: '1~2분',
      },
    ],
  },
  {
    grade: '고2~고3',
    topic: '함축 의미 추론',
    patterns: [
      {
        type: '비유/은유 해석',
        description: '밑줄 친 표현의 비유적 의미를 찾는 유형',
        approach: [
          '밑줄 친 표현의 문자적 의미 먼저 파악',
          '앞뒤 문맥에서 구체적 상황이나 예시 찾기',
          '글의 전체 주제와 밑줄 표현의 관계 파악',
          '비유 표현의 원관념(실제 의미) 도출',
        ],
        timeEstimate: '2~3분',
      },
    ],
  },
  {
    grade: '중3~고1',
    topic: '문법 종합',
    patterns: [
      {
        type: '시제 판단',
        description: '문맥에 맞는 시제를 선택하는 유형',
        approach: [
          '시간 부사(구)와 시제의 일치 확인',
          '주절과 종속절의 시제 관계 파악',
          '현재완료와 과거시제 구분: 현재와의 관련성 여부',
          '시간/조건 부사절에서는 미래 대신 현재시제',
        ],
        timeEstimate: '1~2분',
      },
      {
        type: '가정법 시제',
        description: '가정법 과거와 가정법 과거완료를 구분하는 유형',
        approach: [
          '현재 사실의 반대 → 가정법 과거 (If + 과거, would + 원형)',
          '과거 사실의 반대 → 가정법 과거완료 (If + had p.p., would have p.p.)',
          'I wish, as if 뒤의 시제로 현재/과거 반대 구분',
          '혼합가정법: 조건절과 주절의 시간대가 다른 경우',
        ],
        timeEstimate: '1~2분',
      },
    ],
  },
];

/**
 * 영어 킬러 패턴 검색 함수
 */
export function findEnglishKillerPatterns(topic: string): KillerQuestionType[] {
  const normalizedTopic = topic.toLowerCase();
  return ENGLISH_KILLER_PATTERNS.filter(k => {
    const topicMatch = k.topic.toLowerCase().includes(normalizedTopic) ||
      normalizedTopic.includes(k.topic.toLowerCase());
    return topicMatch;
  });
}

/**
 * 영어 학년 연계 검색 함수
 */
export function findEnglishGradeConnections(topic: string): GradeConnection[] {
  const normalizedTopic = topic.toLowerCase();
  return ENGLISH_GRADE_CONNECTIONS.filter(conn => {
    const fromMatch = conn.fromTopic.toLowerCase().includes(normalizedTopic) ||
      normalizedTopic.includes(conn.fromTopic.toLowerCase());
    const toMatch = conn.toTopics.some(t =>
      t.toLowerCase().includes(normalizedTopic) ||
      normalizedTopic.includes(t.toLowerCase())
    );
    return fromMatch || toMatch;
  });
}
