/**
 * 영어 자주 하는 실수 데이터
 *
 * 단원별로 학생들이 자주 범하는 실수와 예방법을 제공합니다.
 */
import type { UnitMistakes } from '../curriculum/types';

export const ENGLISH_COMMON_MISTAKES: UnitMistakes[] = [
  // 중1 단원
  {
    unit: 'be동사',
    mistakes: [
      {
        keywords: ['be동사', 'am', 'is', 'are'],
        mistakes: [
          'He are → He is (3인칭 단수에 are 사용)',
          'I is → I am (1인칭에 is 사용)',
          'They is → They are (복수 주어에 is 사용)',
          'You is → You are (2인칭에 is 사용)',
        ],
        prevention: [
          '주어 먼저 확인: I→am, You/We/They→are, He/She/It→is',
          '주어 위에 인칭 표시하고 be동사 선택하는 습관',
          'be동사 변화표를 손으로 여러 번 써보며 암기',
        ],
      },
    ],
  },
  {
    unit: '일반동사',
    mistakes: [
      {
        keywords: ['일반동사', '3인칭 단수', '-s', '-es'],
        mistakes: [
          'She go → She goes (3인칭 단수 -s 누락)',
          'He studys → He studies (자음+y → ies 규칙 미적용)',
          'She watchs → She watches (-ch 뒤 -es 미적용)',
          'She doesn\'t goes → She doesn\'t go (조동사 뒤 원형 미사용)',
        ],
        prevention: [
          '3인칭 단수 주어 확인 → 동사에 -(e)s 붙이기',
          '부정문/의문문에서는 조동사가 수를 나타내므로 동사는 원형',
          '-s 붙이는 규칙표 암기: -ch/-sh/-s/-x/-o → -es',
        ],
      },
    ],
  },
  {
    unit: '시제',
    mistakes: [
      {
        keywords: ['과거시제', '불규칙동사', 'did'],
        mistakes: [
          'I goed → I went (불규칙 과거형 미암기)',
          'He did went → He went (did + 과거형 이중 사용)',
          'She didn\'t went → She didn\'t go (부정문에서 원형 미사용)',
          'Did he went? → Did he go? (의문문에서 원형 미사용)',
        ],
        prevention: [
          '불규칙동사 3단 변화(go-went-gone) 철저히 암기',
          '조동사(did, does, do) 뒤에는 항상 동사원형',
          '시간 표현(yesterday, last week)과 시제 일치 확인',
        ],
      },
      {
        keywords: ['미래시제', 'will', 'be going to'],
        mistakes: [
          'I will going → I will go (will + -ing 오류)',
          'He is going go → He is going to go (to 누락)',
          'I will to go → I will go (will + to 오류)',
        ],
        prevention: [
          'will + 동사원형 (to 없음)',
          'be going to + 동사원형 (to 필수)',
          '두 표현의 형태 차이 명확히 구분',
        ],
      },
    ],
  },
  // 중2 단원
  {
    unit: 'to부정사와 동명사',
    mistakes: [
      {
        keywords: ['to부정사', '동명사', 'enjoy', 'want'],
        mistakes: [
          'enjoy to swim → enjoy swimming (enjoy + 동명사)',
          'finish to work → finish working (finish + 동명사)',
          'want swimming → want to swim (want + to부정사)',
          'hope meeting → hope to meet (hope + to부정사)',
        ],
        prevention: [
          '동명사만: enjoy, finish, avoid, give up, mind, keep',
          'to부정사만: want, hope, decide, plan, wish, expect',
          '목적어별 동사 리스트 만들어 반복 암기',
        ],
      },
      {
        keywords: ['remember', 'forget', 'stop', '의미 변화'],
        mistakes: [
          'remember to V(해야 할 것)와 remember V-ing(한 것) 혼동',
          'stop to V(하기 위해 멈추다)와 stop V-ing(하던 것을 멈추다) 혼동',
          'forget to V(해야 할 것)와 forget V-ing(한 것) 혼동',
        ],
        prevention: [
          'to부정사: 미래/아직 안 한 일, 동명사: 과거/이미 한 일',
          '예문으로 의미 차이 체화: I stopped to smoke(담배 피려고 멈춤) vs I stopped smoking(금연)',
          '시제 개념으로 이해: to=할 것, -ing=한 것',
        ],
      },
    ],
  },
  {
    unit: '비교급과 최상급',
    mistakes: [
      {
        keywords: ['비교급', '-er', 'more', 'than'],
        mistakes: [
          'more bigger → bigger (이중 비교급)',
          'gooder → better (불규칙 비교급 미암기)',
          'He is tall than me → He is taller than me (비교급 형태 누락)',
          'more fast → faster (짧은 단어에 more 사용)',
        ],
        prevention: [
          '짧은 단어(1~2음절): -er/-est, 긴 단어(3음절 이상): more/most',
          '불규칙 비교급 암기: good-better-best, bad-worse-worst',
          '-er과 more는 함께 쓰지 않음',
        ],
      },
      {
        keywords: ['최상급', 'the', '-est', 'most'],
        mistakes: [
          'He is most tall → He is the tallest (the 누락)',
          'the most fastest → the fastest (이중 최상급)',
          'one of the best player → one of the best players (단수형 오류)',
        ],
        prevention: [
          '최상급 앞에 the 필수 (부사 최상급 제외)',
          'one of the + 최상급 + 복수명사',
          '최상급 형태 확인: -est 또는 most (둘 중 하나만)',
        ],
      },
    ],
  },
  // 중3 단원
  {
    unit: '관계대명사',
    mistakes: [
      {
        keywords: ['관계대명사', 'who', 'which', 'that'],
        mistakes: [
          'The man which → The man who (사람에 which 사용)',
          'The book who → The book which (사물에 who 사용)',
          'The girl which I met → The girl whom I met (목적격 who/whom)',
          'I know that he said → I know what he said (선행사 없이 that 사용)',
        ],
        prevention: [
          '선행사 확인: 사람→who(m), 사물/동물→which, 모두→that',
          '관계대명사 뒤 절에서 빠진 성분 확인 (주어/목적어)',
          'what = the thing which (선행사 포함)',
        ],
      },
    ],
  },
  {
    unit: '현재완료',
    mistakes: [
      {
        keywords: ['현재완료', 'have + p.p.', '과거'],
        mistakes: [
          'I have seen him yesterday → I saw him yesterday (과거 부사와 함께 사용)',
          'I have been to Paris last year → I went to Paris last year (last 와 함께 사용)',
          'He has went → He has gone (과거분사 형태 오류)',
          'I have been knowing him → I have known him (진행형 불가 동사)',
        ],
        prevention: [
          '현재완료와 함께 쓸 수 없는 표현: yesterday, ago, last ~, in 2020',
          '현재완료와 함께 쓰는 표현: ever, never, just, already, yet, since, for',
          '불규칙 과거분사(go-went-gone, see-saw-seen) 암기',
        ],
      },
      {
        keywords: ['since', 'for', '기간', '시점'],
        mistakes: [
          'since three years → for three years (기간에 since 사용)',
          'for 2020 → since 2020 (시점에 for 사용)',
        ],
        prevention: [
          'since + 시점(특정 시간): since Monday, since 2020',
          'for + 기간(기간 길이): for two hours, for three years',
          '예문으로 구분 연습: "since I was young" vs "for 10 years"',
        ],
      },
    ],
  },
  {
    unit: '가정법',
    mistakes: [
      {
        keywords: ['가정법 과거', 'If', 'were', 'would'],
        mistakes: [
          'If I was you → If I were you (가정법에서 were 사용)',
          'If I am rich, I would → If I were rich, I would (직설법과 혼용)',
          'If I had money, I will buy → If I had money, I would buy (will 사용 오류)',
        ],
        prevention: [
          '가정법 과거: If + 과거, would/could + 원형 (현재 반대)',
          '가정법에서 be동사는 인칭에 관계없이 were (격식)',
          '직설법(if + 현재)과 가정법(if + 과거) 구분',
        ],
      },
      {
        keywords: ['가정법 과거완료', 'had p.p.', 'would have p.p.'],
        mistakes: [
          'If I had knew → If I had known (과거분사 형태 오류)',
          'If I had studied, I would pass → If I had studied, I would have passed (주절 시제)',
          'If I studied hard, I would have passed → If I had studied hard, I would have passed (조건절 시제)',
        ],
        prevention: [
          '가정법 과거완료: If + had p.p., would/could have p.p. (과거 반대)',
          '조건절과 주절의 시제 호응 확인',
          '과거분사 형태(know-knew-known) 정확히 암기',
        ],
      },
    ],
  },
  // 고등 단원
  {
    unit: '분사/분사구문',
    mistakes: [
      {
        keywords: ['분사', '-ing', '-ed', '능동', '수동'],
        mistakes: [
          'The boring movie → The bored audience (능동/수동 혼동)',
          'interested story → interesting story (감정 유발 vs 느끼는 주체)',
          'The breaking window → The broken window (진행 vs 완료 혼동)',
        ],
        prevention: [
          '-ing: 능동/진행, 감정을 유발하는 원인',
          '-ed(p.p.): 수동/완료, 감정을 느끼는 대상',
          '수식받는 명사의 입장에서 능동인지 수동인지 판단',
        ],
      },
      {
        keywords: ['분사구문', '주어 일치', '접속사 생략'],
        mistakes: [
          'Walking in the park, the birds sang → 주어 불일치',
          'Seeing from the tower, the city looks beautiful → Seen from the tower (수동)',
          'Finishing homework, I went to bed → Having finished (완료분사)',
        ],
        prevention: [
          '분사구문 주어 = 주절 주어 확인',
          '분사의 동작 주체와 주절 주어의 관계로 능동/수동 결정',
          '시간 순서가 다르면 Having p.p. 사용',
        ],
      },
    ],
  },
  {
    unit: '어법 종합',
    mistakes: [
      {
        keywords: ['수일치', '주어', '동사'],
        mistakes: [
          'The number of students are → The number of students is',
          'A number of people was → A number of people were',
          'One of my friends are → One of my friends is',
          'Every student have → Every student has',
        ],
        prevention: [
          'The number of ~ : 단수 취급 (~의 수)',
          'A number of ~ : 복수 취급 (많은 ~)',
          'One of + 복수명사: 단수 취급',
          'Every/Each + 단수명사 + 단수동사',
        ],
      },
      {
        keywords: ['관계사', 'that', 'what', '완전', '불완전'],
        mistakes: [
          'I know what you did → I know what you did (what 뒤 불완전)',
          'The thing what I need → The thing that I need (선행사 + that)',
          'I don\'t know that he said → I don\'t know what he said (불완전 절에 that)',
        ],
        prevention: [
          '선행사 있음 + 불완전 절 → who/which/that',
          '선행사 없음 + 불완전 절 → what',
          '완전한 절 앞에는 관계부사(where, when) 또는 접속사',
        ],
      },
    ],
  },
];

/**
 * 영어 자주 하는 실수 검색 함수
 */
export function findEnglishCommonMistakes(topic: string): UnitMistakes | undefined {
  const normalizedTopic = topic.toLowerCase();
  return ENGLISH_COMMON_MISTAKES.find(um => {
    const unitMatch = um.unit.toLowerCase().includes(normalizedTopic) ||
      normalizedTopic.includes(um.unit.toLowerCase());
    const keywordMatch = um.mistakes.some(m =>
      m.keywords.some(k =>
        k.toLowerCase().includes(normalizedTopic) ||
        normalizedTopic.includes(k.toLowerCase())
      )
    );
    return unitMatch || keywordMatch;
  });
}
