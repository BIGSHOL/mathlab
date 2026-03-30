/**
 * 고등학교 영어 교육과정 (2022 개정)
 *
 * 고등 영어 문법, 독해 전략, 수능 유형별 전략을 구성합니다.
 */
import type { GradeCurriculum } from '../curriculum/types';

export const ENGLISH_HIGH_SCHOOL_CURRICULUM: GradeCurriculum[] = [
  // 고1-1
  {
    grade: '고1',
    semester: '1학기',
    units: [
      {
        name: '시제 심화',
        topics: [
          {
            keywords: ['현재완료 진행', '과거완료', '미래완료', '완료시제'],
            strategies: [
              '현재완료 진행: have/has been + -ing (계속 진행 중인 동작 강조)',
              '과거완료: had + p.p. (대과거, 과거보다 더 과거)',
              '시제 일치: 주절 과거 → 종속절 과거/과거완료',
              '시간/조건 부사절에서는 현재시제가 미래 대용',
            ],
            tags: ['문법', '시제'],
          },
        ],
      },
      {
        name: '관계사 심화',
        topics: [
          {
            keywords: ['관계부사', 'where', 'when', 'why', 'how'],
            strategies: [
              '관계부사: 선행사(장소/시간/이유/방법) + where/when/why/how',
              '관계부사 = 전치사 + 관계대명사: where = in which',
              'the way how는 함께 쓰지 않음 (the way 또는 how만 사용)',
              '관계부사 vs 관계대명사: 절 내 문장성분 완전 여부로 구분',
            ],
            tags: ['문법', '관계사'],
          },
          {
            keywords: ['복합관계사', 'whoever', 'whatever', 'whichever'],
            strategies: [
              '복합관계대명사: whoever(~하는 누구든), whatever(~하는 무엇이든)',
              'whoever = anyone who, whatever = anything that',
              '복합관계부사: whenever, wherever, however (양보/시간/장소)',
              'however + 형용사/부사: 아무리 ~하더라도 (= no matter how)',
            ],
            tags: ['문법', '관계사'],
          },
        ],
      },
      {
        name: '가정법 심화',
        topics: [
          {
            keywords: ['혼합가정법', 'If + had p.p., would + 동사원형'],
            strategies: [
              '혼합가정법: 과거 조건 + 현재 결과 (If I had studied, I would be ~)',
              'I wish / as if / as though + 가정법',
              'If it were not for / If it had not been for: ~이 없다면/없었다면',
              'without / but for = if it were not for',
            ],
            tags: ['문법', '가정법'],
          },
          {
            keywords: ['should', 'were to', '가정법 미래'],
            strategies: [
              'If + should: 만일 ~한다면 (실현 가능성 낮은 미래)',
              'If + were to: ~한다면 (가상적 상황)',
              'Should you need ~: If you should need ~ 도치',
              'Were I you: If I were you 도치',
            ],
            tags: ['문법', '가정법'],
          },
        ],
      },
      {
        name: '특수구문',
        topics: [
          {
            keywords: ['강조', 'It is ~ that', 'do/does/did', '강조구문'],
            strategies: [
              'It is ~ that 강조구문: 주어, 목적어, 부사(구) 강조',
              'do/does/did + 동사원형: 동사 강조 (~하긴 하다)',
              '강조구문 vs 가주어 구문: that절 제거 후 완전한 문장이면 강조구문',
              '의문사 강조: Who was it that ~?, What is it that ~?',
            ],
            tags: ['문법', '특수구문'],
          },
          {
            keywords: ['도치', '부정어', 'Neither', 'So'],
            strategies: [
              '부정어구 도치: Never/Hardly/Seldom + 조동사 + 주어 + 동사',
              'Only + 부사(구/절) 도치: Only then did I realize ~',
              'So + 형용사/부사 + that 도치: So fast did he run that ~',
              'Neither/Nor do I: 나도 ~않다, So do I: 나도 그렇다',
            ],
            tags: ['문법', '특수구문'],
          },
        ],
      },
    ],
  },
  // 고1-2
  {
    grade: '고1',
    semester: '2학기',
    units: [
      {
        name: '분사구문 심화',
        topics: [
          {
            keywords: ['독립분사구문', '비인칭 독립분사구문', '분사구문 심화'],
            strategies: [
              '독립분사구문: 주어가 다를 때 분사 앞에 의미상 주어 표시',
              '비인칭 독립분사구문: generally speaking, considering, judging from',
              'with + 명사 + 분사: 부대상황 (~한 채로)',
              '분사구문의 부정: Not + -ing (Not knowing what to do)',
            ],
            tags: ['문법', '분사'],
          },
        ],
      },
      {
        name: '명사절',
        topics: [
          {
            keywords: ['명사절', 'that절', 'whether', 'if', '의문사절'],
            strategies: [
              '명사절 접속사: that, whether/if, 의문사(what, who, when 등)',
              '주어 자리의 that절: That he passed is surprising',
              '동격의 that: 추상명사(fact, news, idea) + that절',
              'whether vs if: 주어, 전치사 목적어, 보어 자리에는 whether만 가능',
            ],
            tags: ['문법', '절'],
          },
        ],
      },
      {
        name: '부사절',
        topics: [
          {
            keywords: ['부사절', '시간', '조건', '양보', '목적', '결과'],
            strategies: [
              '시간: when, while, as, before, after, since, until',
              '조건: if, unless, provided (that), as long as',
              '양보: although, though, even if, even though, while',
              '목적: so that, in order that / 결과: so ~ that, such ~ that',
            ],
            tags: ['문법', '절'],
          },
          {
            keywords: ['접속사 생략', '분사구문 전환'],
            strategies: [
              '시간/조건 부사절 → 분사구문 전환 가능',
              '접속사 + 분사: While walking (= While I was walking)',
              'Once completed: 일단 완료되면',
              'If necessary/possible: 필요하다면/가능하다면',
            ],
            tags: ['문법', '절'],
          },
        ],
      },
    ],
  },
  // 고2-1 (수능 대비 본격화)
  {
    grade: '고2',
    semester: '1학기',
    units: [
      {
        name: '빈칸 추론',
        topics: [
          {
            keywords: ['빈칸 추론', '논리적 추론', '글의 흐름'],
            strategies: [
              '빈칸 전후 문장에서 단서 찾기 (연결어, 지시어 주목)',
              '글의 주제문과 빈칸의 관계 파악',
              '선택지를 빈칸에 대입하여 논리적 흐름 확인',
              '추상적 어휘의 빈칸: 구체적 예시에서 개념 도출',
            ],
            tags: ['독해', '수능'],
          },
          {
            keywords: ['어휘 빈칸', '문맥상 어휘'],
            strategies: [
              '문맥에서 긍정/부정 뉘앙스 파악',
              '빈칸 앞뒤 문장의 논리적 관계 (인과, 대조, 예시)',
              '반의어 함정 주의: 글의 전체 흐름과 맞는지 확인',
              '다의어는 문맥에 맞는 의미 선택',
            ],
            tags: ['독해', '어휘'],
          },
        ],
      },
      {
        name: '글의 순서/문장 삽입',
        topics: [
          {
            keywords: ['글의 순서', '문장 배열', '논리적 흐름'],
            strategies: [
              '첫 문장에서 글의 방향 파악 (주제 제시)',
              '지시어(this, that, these, such), 연결어 추적',
              '대명사의 선행사 찾기',
              '시간 순서, 인과 관계, 대조 구조 파악',
            ],
            tags: ['독해', '수능'],
          },
          {
            keywords: ['문장 삽입', '주어진 문장', '적절한 위치'],
            strategies: [
              '주어진 문장의 핵심 키워드와 연결어 파악',
              '삽입 위치 전후 문장과의 논리적 연결 확인',
              'However, Therefore, For example 등 연결어가 힌트',
              '대명사나 지시어가 가리키는 대상 확인',
            ],
            tags: ['독해', '수능'],
          },
        ],
      },
      {
        name: '요약문 완성',
        topics: [
          {
            keywords: ['요약문', '주제 파악', '핵심 어휘'],
            strategies: [
              '글의 주제문(topic sentence) 찾기',
              '요약문의 빈칸은 글의 핵심 개념',
              '선택지 어휘 간 관계 파악 (유사어, 반의어)',
              '글의 논지와 요약문의 방향 일치 확인',
            ],
            tags: ['독해', '수능'],
          },
        ],
      },
    ],
  },
  // 고2-2
  {
    grade: '고2',
    semester: '2학기',
    units: [
      {
        name: '장문 독해',
        topics: [
          {
            keywords: ['장문', '긴 지문', '복합 문제'],
            strategies: [
              '단락별 핵심 내용 메모하며 읽기',
              '문제를 먼저 확인하고 목적을 가지고 읽기',
              '지문 순서대로 문제가 배열되는 경향 활용',
              '시간 관리: 장문에 너무 많은 시간 소비 주의',
            ],
            tags: ['독해', '수능'],
          },
        ],
      },
      {
        name: '어법 판단',
        topics: [
          {
            keywords: ['어법', '문법 문제', '밑줄 어법'],
            strategies: [
              '주어-동사 수 일치 확인 (특히 주어가 긴 경우)',
              '능동/수동 구분: 주어가 동작의 주체인지 대상인지',
              '시제 일치: 주절과 종속절의 시제 관계',
              '관계사, 접속사, 전치사 자리 구분',
            ],
            tags: ['문법', '수능'],
          },
          {
            keywords: ['병렬구조', '비교구문', '수식어'],
            strategies: [
              '병렬구조: and, or, but으로 연결된 요소는 같은 형태',
              '비교구문: as ~ as, 비교급 than 구조 확인',
              '수식어 위치: 형용사 vs 부사, 분사의 수식',
              '가정법 시제: 조건절과 주절의 시제 호응',
            ],
            tags: ['문법', '수능'],
          },
        ],
      },
      {
        name: '어휘 추론',
        topics: [
          {
            keywords: ['어휘 추론', '문맥상 의미', '밑줄 어휘'],
            strategies: [
              '밑줄 어휘의 문맥상 의미 파악',
              '글 전체의 분위기(tone)에서 긍정/부정 판단',
              '대조적 연결어 뒤에 반대 개념 예상',
              '선택지 어휘의 다의어 의미 확인',
            ],
            tags: ['어휘', '수능'],
          },
        ],
      },
    ],
  },
  // 고3-1 (수능 직전 대비)
  {
    grade: '고3',
    semester: '1학기',
    units: [
      {
        name: '고난도 빈칸',
        topics: [
          {
            keywords: ['고난도 빈칸', '추상적 빈칸', '철학적 주제'],
            strategies: [
              '추상적 개념은 구체적 예시에서 힌트 찾기',
              '역설(paradox)적 표현 이해: 겉과 속이 다른 주장',
              '필자의 주장과 반대 의견 구분',
              '비유적 표현의 의미 해석',
            ],
            tags: ['독해', '수능'],
          },
        ],
      },
      {
        name: '함축 의미 추론',
        topics: [
          {
            keywords: ['함축 의미', '밑줄 의미', '비유 해석'],
            strategies: [
              '밑줄 친 부분의 문자적 의미 vs 함축적 의미',
              '비유, 은유 표현의 해석',
              '앞뒤 문맥에서 구체적 설명 찾기',
              '필자의 태도나 어조에서 힌트 얻기',
            ],
            tags: ['독해', '수능'],
          },
        ],
      },
      {
        name: '복합 문단',
        topics: [
          {
            keywords: ['복합 문단', '두 지문', '비교 분석'],
            strategies: [
              '두 지문의 공통점과 차이점 파악',
              '각 지문의 주제문을 먼저 확인',
              '문제 유형 파악: 공통 주제, 차이점, 종합 이해',
              '지문 간 관계(보완, 대조, 인과) 파악',
            ],
            tags: ['독해', '수능'],
          },
        ],
      },
    ],
  },
  // 고3-2 (수능 최종 정리)
  {
    grade: '고3',
    semester: '2학기',
    units: [
      {
        name: '실전 전략',
        topics: [
          {
            keywords: ['시간 배분', '문제 풀이 순서', '수능 전략'],
            strategies: [
              '듣기 평가(1-17번) 후 독해 영역 시작',
              '쉬운 문제 먼저: 주제, 제목, 요지 → 빈칸 → 순서/삽입',
              '킬러 문항(빈칸 33-34번)은 마지막에 배치',
              '모르는 문제는 표시 후 넘어가기',
            ],
            tags: ['전략', '수능'],
          },
        ],
      },
      {
        name: '오답 유형 분석',
        topics: [
          {
            keywords: ['오답 분석', '함정', '매력적 오답'],
            strategies: [
              '매력적 오답: 지문 내용과 부분 일치하지만 핵심 아님',
              '과도한 일반화 오답: 지문 범위를 넘어선 주장',
              '반대 의미 오답: 지문과 반대되는 선택지',
              '무관한 정보 오답: 지문에 언급되지 않은 내용',
            ],
            tags: ['전략', '수능'],
          },
        ],
      },
      {
        name: '고난도 어법',
        topics: [
          {
            keywords: ['고난도 어법', '복합 구문', '혼동 어법'],
            strategies: [
              '관계대명사 vs 관계부사: 뒤 절의 완전/불완전 여부',
              '분사 선택: 능동(-ing) vs 수동(-ed), 수식 대상 확인',
              '동사 vs 준동사: 문장의 주어 동사 파악',
              '병렬구조: A, B, and C 형태의 동일 품사 확인',
            ],
            tags: ['문법', '수능'],
          },
        ],
      },
    ],
  },
];
