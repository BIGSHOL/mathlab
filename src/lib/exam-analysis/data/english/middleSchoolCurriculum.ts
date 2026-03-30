/**
 * 중학교 영어 교육과정 (2022 개정)
 *
 * 문법, 어휘, 독해 전략을 학년별로 구성합니다.
 */
import type { GradeCurriculum } from '../curriculum/types';

export const ENGLISH_MIDDLE_SCHOOL_CURRICULUM: GradeCurriculum[] = [
  // 중1-1
  {
    grade: '중1',
    semester: '1학기',
    units: [
      {
        name: 'be동사',
        topics: [
          {
            keywords: ['be동사', 'am', 'is', 'are', '인칭'],
            strategies: [
              '주어에 따른 be동사 선택: I→am, He/She/It→is, We/You/They→are',
              '부정문: be동사 뒤에 not 추가 (is not = isn\'t)',
              '의문문: be동사를 주어 앞으로 이동',
              '주어와 be동사의 일치 여부를 먼저 확인',
            ],
            tags: ['문법', '기초'],
          },
          {
            keywords: ['There is', 'There are', '존재'],
            strategies: [
              'There is + 단수명사, There are + 복수명사',
              '뒤에 오는 명사의 수에 따라 be동사 결정',
              '부정문과 의문문 변환 연습',
              '장소 전치사(in, on, under)와 함께 사용',
            ],
            tags: ['문법', '표현'],
          },
        ],
      },
      {
        name: '일반동사',
        topics: [
          {
            keywords: ['일반동사', '현재시제', '3인칭 단수', '-s', '-es'],
            strategies: [
              '3인칭 단수 주어일 때 동사에 -(e)s 붙이기',
              '-s 붙이는 규칙: 대부분 -s, -ch/-sh/-s/-x/-o는 -es, 자음+y는 y→ies',
              '부정문: do/does + not + 동사원형',
              '의문문: Do/Does + 주어 + 동사원형?',
            ],
            tags: ['문법', '동사'],
          },
          {
            keywords: ['have', 'has', '소유'],
            strategies: [
              'have vs has: 3인칭 단수 주어에만 has 사용',
              'have의 다양한 의미: 가지다, 먹다, 경험하다',
              'have to (의무) 표현과 구분',
              '부정형: don\'t have / doesn\'t have',
            ],
            tags: ['문법', '동사'],
          },
        ],
      },
      {
        name: '의문사',
        topics: [
          {
            keywords: ['의문사', 'What', 'Who', 'When', 'Where', 'Why', 'How'],
            strategies: [
              '의문사 + be동사/조동사 + 주어 + ...? 어순 기억',
              'What: 무엇, Who: 누구, When: 언제, Where: 어디, Why: 왜, How: 어떻게',
              'How + 형용사/부사: How old, How many, How much, How often',
              '의문사가 주어일 때는 의문사 + 동사 어순',
            ],
            tags: ['문법', '의문문'],
          },
        ],
      },
      {
        name: '명령문과 감탄문',
        topics: [
          {
            keywords: ['명령문', 'Don\'t', 'Let\'s', '감탄문'],
            strategies: [
              '명령문: 동사원형으로 시작 (주어 You 생략)',
              '부정 명령문: Don\'t + 동사원형',
              'Let\'s + 동사원형 (~하자) 청유문',
              '감탄문: What + (a/an) + 형용사 + 명사!, How + 형용사/부사!',
            ],
            tags: ['문법', '문장유형'],
          },
        ],
      },
    ],
  },
  // 중1-2
  {
    grade: '중1',
    semester: '2학기',
    units: [
      {
        name: '시제',
        topics: [
          {
            keywords: ['현재시제', '과거시제', '규칙동사', '불규칙동사'],
            strategies: [
              '과거시제: 동사원형 + -ed (규칙), 불규칙 동사는 암기',
              '불규칙동사 3단 변화(원형-과거-과거분사) 암기',
              '과거 부정문: didn\'t + 동사원형',
              '과거 의문문: Did + 주어 + 동사원형?',
            ],
            tags: ['문법', '시제'],
          },
          {
            keywords: ['미래시제', 'will', 'be going to'],
            strategies: [
              'will + 동사원형: 순간적 결정, 예측',
              'be going to + 동사원형: 계획된 미래, 근거 있는 예측',
              'will과 be going to의 미묘한 차이 구분',
              '부정형: will not(won\'t) / be not going to',
            ],
            tags: ['문법', '시제'],
          },
        ],
      },
      {
        name: '조동사',
        topics: [
          {
            keywords: ['can', 'may', 'must', '조동사'],
            strategies: [
              'can: 능력(~할 수 있다), 허가(~해도 된다)',
              'may: 허가(~해도 된다), 추측(~일지도 모른다)',
              'must: 의무(~해야 한다), 강한 추측(~임에 틀림없다)',
              '조동사 + 동사원형 형태 기억',
            ],
            tags: ['문법', '조동사'],
          },
          {
            keywords: ['have to', 'should', 'would'],
            strategies: [
              'have to: must와 비슷하지만 외부적 의무',
              'should: 충고, 권유 (~하는 게 좋겠다)',
              'would like to: 정중한 희망 표현',
              'don\'t have to vs mustn\'t 구분: 불필요 vs 금지',
            ],
            tags: ['문법', '조동사'],
          },
        ],
      },
      {
        name: '문장의 형식',
        topics: [
          {
            keywords: ['1형식', '2형식', '3형식', '4형식', '5형식', '문장형식'],
            strategies: [
              '1형식: 주어 + 동사, 2형식: 주어 + 동사 + 보어',
              '3형식: 주어 + 동사 + 목적어, 4형식: 주어 + 동사 + 간목 + 직목',
              '5형식: 주어 + 동사 + 목적어 + 목적격보어',
              '4형식 ↔ 3형식 전환: give A B = give B to A',
            ],
            tags: ['문법', '문장구조'],
          },
        ],
      },
    ],
  },
  // 중2-1
  {
    grade: '중2',
    semester: '1학기',
    units: [
      {
        name: 'to부정사',
        topics: [
          {
            keywords: ['to부정사', '명사적 용법', '형용사적 용법', '부사적 용법'],
            strategies: [
              '명사적 용법: 주어, 목적어, 보어 역할 (~하는 것)',
              '형용사적 용법: 명사 뒤에서 수식 (~할, ~하는)',
              '부사적 용법: 목적(~하기 위해), 감정의 원인, 결과',
              'to부정사의 의미상 주어: for + 목적격',
            ],
            tags: ['문법', '준동사'],
          },
          {
            keywords: ['too ~ to', 'enough to', 'It ~ to'],
            strategies: [
              'too + 형용사/부사 + to + 동사원형: 너무 ~해서 ...할 수 없다',
              '형용사/부사 + enough + to + 동사원형: ...할 만큼 충분히 ~하다',
              'It is + 형용사 + (for A) + to + 동사원형: 가주어-진주어 구문',
              '가주어 It 구문에서 진주어(to부정사) 찾기',
            ],
            tags: ['문법', '준동사'],
          },
        ],
      },
      {
        name: '동명사',
        topics: [
          {
            keywords: ['동명사', '-ing', '명사 역할'],
            strategies: [
              '동명사: 동사원형 + -ing, 명사 역할 (~하는 것)',
              '동명사 vs to부정사: enjoy, finish, avoid, mind + -ing',
              '전치사 뒤에는 반드시 동명사 사용',
              'stop -ing vs stop to: 행동 중단 vs 목적',
            ],
            tags: ['문법', '준동사'],
          },
          {
            keywords: ['목적어', 'enjoy', 'finish', 'avoid', 'like', 'want'],
            strategies: [
              '동명사만 목적어로 취하는 동사: enjoy, finish, avoid, give up, keep',
              'to부정사만 목적어로 취하는 동사: want, hope, decide, plan, wish',
              '둘 다 가능한 동사: like, love, start, begin, continue',
              '의미가 달라지는 동사: remember, forget, try, stop',
            ],
            tags: ['문법', '준동사'],
          },
        ],
      },
      {
        name: '비교급과 최상급',
        topics: [
          {
            keywords: ['비교급', '-er', 'more', 'than'],
            strategies: [
              '비교급 형태: 짧은 단어 + -er, 긴 단어 more + 원급',
              '비교급 + than: ~보다 더 ...한',
              '불규칙 비교급: good→better, bad→worse, many/much→more',
              '비교급 강조: much, even, far, a lot + 비교급',
            ],
            tags: ['문법', '비교'],
          },
          {
            keywords: ['최상급', '-est', 'most', 'the'],
            strategies: [
              '최상급 형태: the + 짧은 단어 + -est, the most + 원급',
              'one of the + 최상급 + 복수명사: 가장 ~한 것 중 하나',
              '불규칙 최상급: good→best, bad→worst, many/much→most',
              '최상급 앞에 the 붙이는 것 주의',
            ],
            tags: ['문법', '비교'],
          },
        ],
      },
    ],
  },
  // 중2-2
  {
    grade: '중2',
    semester: '2학기',
    units: [
      {
        name: '접속사',
        topics: [
          {
            keywords: ['접속사', 'and', 'but', 'or', 'so', 'because'],
            strategies: [
              '등위접속사: and(그리고), but(그러나), or(또는), so(그래서)',
              '종속접속사: because(왜냐하면), when(~할 때), if(만약), though(비록)',
              'both A and B, either A or B, neither A nor B 구문',
              '접속사 뒤 절의 시제 일치 확인',
            ],
            tags: ['문법', '접속사'],
          },
          {
            keywords: ['that절', '명사절', '목적어절'],
            strategies: [
              '명사절 접속사 that: I think (that) ~, I know (that) ~',
              'that절이 목적어일 때 that 생략 가능',
              'It ~ that 강조구문 vs 가주어-진주어 구문 구분',
              'so ~ that (결과), such ~ that (결과) 구문',
            ],
            tags: ['문법', '접속사'],
          },
        ],
      },
      {
        name: '수동태',
        topics: [
          {
            keywords: ['수동태', 'be + p.p.', 'by'],
            strategies: [
              '수동태 기본형: be동사 + 과거분사 (+ by 행위자)',
              '능동태 → 수동태 변환: 목적어 → 주어, 주어 → by ~',
              '시제별 수동태: is/are done, was/were done, will be done',
              '조동사 수동태: can be done, must be done',
            ],
            tags: ['문법', '수동태'],
          },
          {
            keywords: ['4형식 수동태', '5형식 수동태'],
            strategies: [
              '4형식 수동태: 간접목적어 또는 직접목적어가 주어로',
              '5형식 수동태: 목적격보어 유지 (He was made captain)',
              'by 이외의 전치사: be known for, be interested in, be surprised at',
              '수동태 불가 동사: have, resemble 등 상태동사',
            ],
            tags: ['문법', '수동태'],
          },
        ],
      },
      {
        name: '분사',
        topics: [
          {
            keywords: ['현재분사', '과거분사', '분사의 수식'],
            strategies: [
              '현재분사(-ing): 능동/진행 의미, 과거분사(-ed/불규칙): 수동/완료 의미',
              '분사의 형용사적 용법: 명사 앞 또는 뒤에서 수식',
              '감정동사 분사: -ing(원인), -ed(경험하는 주체)',
              'exciting vs excited, interesting vs interested 구분',
            ],
            tags: ['문법', '분사'],
          },
        ],
      },
    ],
  },
  // 중3-1
  {
    grade: '중3',
    semester: '1학기',
    units: [
      {
        name: '현재완료',
        topics: [
          {
            keywords: ['현재완료', 'have + p.p.', '경험', '완료', '계속', '결과'],
            strategies: [
              '현재완료 형태: have/has + 과거분사',
              '4가지 용법: 경험(ever, never), 완료(just, already), 계속(since, for), 결과',
              '현재완료와 함께 쓸 수 없는 표현: yesterday, last ~, ago',
              'have been to vs have gone to: 다녀왔다 vs 가고 없다',
            ],
            tags: ['문법', '시제'],
          },
          {
            keywords: ['since', 'for', 'yet', 'already', 'ever', 'never'],
            strategies: [
              'since + 시점(과거): ~이래로, for + 기간: ~동안',
              'already(이미): 긍정문, yet(아직): 부정/의문문',
              'ever(지금까지): 의문문, never(한 번도 ~않다): 부정',
              'How long have you ~?: 기간을 묻는 현재완료 의문문',
            ],
            tags: ['문법', '시제'],
          },
        ],
      },
      {
        name: '관계대명사',
        topics: [
          {
            keywords: ['관계대명사', 'who', 'which', 'that', '선행사'],
            strategies: [
              'who: 사람(주격/목적격), which: 사물/동물, that: 사람/사물 모두',
              '관계대명사 역할: 두 문장을 연결 + 대명사 역할',
              '선행사 파악이 핵심: 관계대명사 앞 명사가 선행사',
              '목적격 관계대명사는 생략 가능',
            ],
            tags: ['문법', '관계사'],
          },
          {
            keywords: ['관계대명사 what', '선행사 포함'],
            strategies: [
              'what = the thing(s) which: 선행사 포함',
              'what + 불완전한 문장 (주어 또는 목적어 빠진)',
              'What I want is ~: 내가 원하는 것은 ~이다',
              'that vs what: 선행사 유무로 구분',
            ],
            tags: ['문법', '관계사'],
          },
        ],
      },
      {
        name: '간접의문문',
        topics: [
          {
            keywords: ['간접의문문', '명사절', '의문사절'],
            strategies: [
              '간접의문문 어순: 의문사 + 주어 + 동사 (평서문 어순)',
              'Do you know where he lives? (lives ○, does he live ✗)',
              'I wonder if/whether ~: ~인지 아닌지 궁금하다',
              '간접의문문은 문장 내에서 명사절 역할',
            ],
            tags: ['문법', '의문문'],
          },
        ],
      },
    ],
  },
  // 중3-2
  {
    grade: '중3',
    semester: '2학기',
    units: [
      {
        name: '분사구문',
        topics: [
          {
            keywords: ['분사구문', 'V-ing', '부사절 축약'],
            strategies: [
              '분사구문 만들기: 접속사 제거 → 주어 같으면 생략 → 동사 -ing',
              '분사구문 의미: 시간(~할 때), 이유(~해서), 동시동작(~하면서)',
              'Being 생략: Being tired → Tired, he went home',
              '완료분사구문: Having + p.p. (주절보다 먼저 일어난 일)',
            ],
            tags: ['문법', '분사'],
          },
        ],
      },
      {
        name: '가정법',
        topics: [
          {
            keywords: ['가정법 과거', 'If + 과거', 'would/could'],
            strategies: [
              '가정법 과거: If + 주어 + 과거동사 ~, 주어 + would/could + 동사원형',
              '현재 사실의 반대 상상: If I were you, I would ~',
              'be동사는 인칭에 관계없이 were 사용 (격식체)',
              'wish + 가정법 과거: I wish I were ~',
            ],
            tags: ['문법', '가정법'],
          },
          {
            keywords: ['가정법 과거완료', 'If + had p.p.', 'would have p.p.'],
            strategies: [
              '가정법 과거완료: If + 주어 + had p.p. ~, 주어 + would/could have p.p.',
              '과거 사실의 반대 상상: 과거에 ~했다면, ~했을 텐데',
              '가정법 과거 vs 과거완료: 현재 반대 vs 과거 반대',
              'I wish + had p.p.: ~했으면 좋았을 텐데 (과거 후회)',
            ],
            tags: ['문법', '가정법'],
          },
        ],
      },
      {
        name: '사역동사와 지각동사',
        topics: [
          {
            keywords: ['사역동사', 'make', 'let', 'have', '지각동사', 'see', 'hear'],
            strategies: [
              '사역동사: make/let/have + 목적어 + 동사원형',
              '지각동사: see/hear/feel/watch + 목적어 + 동사원형/-ing',
              '사역동사 수동태: be made to + 동사원형 (to 추가)',
              '지각동사 수동태: be seen/heard to + 동사원형',
            ],
            tags: ['문법', '특수구문'],
          },
        ],
      },
    ],
  },
];
