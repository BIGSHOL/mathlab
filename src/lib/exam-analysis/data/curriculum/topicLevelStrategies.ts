/**
 * Topic-specific level strategies for Korean Math Curriculum (2022 revised)
 *
 * Each topic has 3 levels with specific study guidance:
 * - lower (하위권): Foundation building
 * - middle (중위권): Skill expansion
 * - upper (상위권): Advanced problem solving
 */

export interface TopicLevelGuide {
  title: string;
  strategies: string[];
  studyAmount: string;
  books: string;
  encouragement: string;
}

export interface TopicStrategies {
  topic: string;
  grade: string;
  lower: TopicLevelGuide;
  middle: TopicLevelGuide;
  upper: TopicLevelGuide;
}

export const TOPIC_LEVEL_STRATEGIES: TopicStrategies[] = [
  // 중1-1학기
  {
    topic: "소인수분해",
    grade: "중1-1",
    lower: {
      title: "기초부터 차근차근 다지기",
      strategies: [
        "1~100 사이의 소수를 먼저 완벽히 암기 (2, 3, 5, 7, 11, 13...)",
        "나눗셈을 이용한 소인수분해 방법을 손으로 반복 연습",
        "약수 구하기와 연결하여 이해"
      ],
      studyAmount: "하루 20분, 기본 문제 10문제씩",
      books: "교과서 예제, 풍산자 개념완성",
      encouragement: "소수만 확실히 알면 소인수분해는 어렵지 않아요!"
    },
    middle: {
      title: "약수 개수/합 공식까지 확장",
      strategies: [
        "약수의 개수 공식 (지수+1)의 곱 완벽 적용",
        "최대공약수, 최소공배수를 소인수분해로 빠르게 구하기",
        "역으로 '약수가 6개인 가장 작은 수' 유형 연습"
      ],
      studyAmount: "하루 30분, 유형별 5문제씩",
      books: "개념원리, RPM",
      encouragement: "공식을 외우는 게 아니라 왜 그런지 이해하면 응용력이 생겨요!"
    },
    upper: {
      title: "심화 문제로 사고력 확장",
      strategies: [
        "'n²의 약수의 개수가 홀수인 이유' 같은 원리 문제 도전",
        "경시대회 기출 유형 (약수 개수 조건 역추적)",
        "고등 수학의 정수론과 연결하여 선행 학습"
      ],
      studyAmount: "하루 20분 심화, 도전 문제 3문제",
      books: "최상위 수학, 에이급",
      encouragement: "이 단원을 깊이 이해하면 고등학교 정수 파트가 쉬워져요!"
    }
  },
  {
    topic: "정수와 유리수",
    grade: "중1-1",
    lower: {
      title: "수직선으로 음수 개념 시각화",
      strategies: [
        "수직선을 직접 그려서 음수의 위치 확인",
        "양수+양수, 음수+음수, 양수+음수 각각 따로 연습",
        "부호 결정 규칙을 표로 정리해서 암기"
      ],
      studyAmount: "하루 30분, 연산 문제 20문제",
      books: "교과서, 베이직쎈",
      encouragement: "음수 계산만 확실하면 중학교 수학 절반은 해결돼요!"
    },
    middle: {
      title: "복잡한 혼합 계산 정복",
      strategies: [
        "덧셈, 뺄셈, 곱셈, 나눗셈이 섞인 복합 계산 연습",
        "분배법칙 활용 문제 집중",
        "계산 실수를 줄이는 검산 습관"
      ],
      studyAmount: "하루 30분, 혼합 계산 15문제",
      books: "개념원리, 쎈",
      encouragement: "계산 실수만 줄여도 10점은 올라요!"
    },
    upper: {
      title: "절댓값과 부등식 연계",
      strategies: [
        "|a-b|의 기하학적 의미(거리) 완벽 이해",
        "조건이 주어졌을 때 식의 값 구하기 심화",
        "고등 절댓값 부등식과 연결"
      ],
      studyAmount: "하루 20분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "절댓값 개념은 고등학교까지 계속 쓰이니 지금 확실히!"
    }
  },
  {
    topic: "문자와 식",
    grade: "중1-1",
    lower: {
      title: "문자 = 수를 대신하는 상자",
      strategies: [
        "'x는 아직 모르는 수를 담는 상자'로 이해",
        "곱셈 기호 생략 규칙 (3×a → 3a) 반복 연습",
        "대입 연습을 충분히 (x=2일 때 3x+1의 값)"
      ],
      studyAmount: "하루 20분, 기본 문제 15문제",
      books: "교과서, 개념쎈",
      encouragement: "문자가 어색하면 숫자를 넣어서 먼저 연습해보세요!"
    },
    middle: {
      title: "다양한 상황을 식으로 표현",
      strategies: [
        "문장을 읽고 문자식으로 바꾸는 연습",
        "속력, 거리, 시간 / 농도 문제 식 세우기",
        "식의 값 구하기 응용 (조건 활용)"
      ],
      studyAmount: "하루 30분, 활용 문제 10문제",
      books: "개념원리 RPM, 쎈",
      encouragement: "식 세우기가 되면 방정식의 반은 끝난 거예요!"
    },
    upper: {
      title: "복잡한 대입과 식의 변형",
      strategies: [
        "x + 1/x = 3일 때 x² + 1/x² 구하기 유형",
        "조건식 변형을 통한 식의 값 추론",
        "고등학교 대칭식 미리 맛보기"
      ],
      studyAmount: "하루 20분, 심화 문제 5문제",
      books: "최상위 수학, 일품",
      encouragement: "이런 유형은 고등학교 '근과 계수의 관계'에서 다시 나와요!"
    }
  },
  {
    topic: "일차방정식",
    grade: "중1-1",
    lower: {
      title: "등식의 성질부터 확실히",
      strategies: [
        "'양변에 같은 수를 더하거나 빼도 등식 성립' 체득",
        "이항의 원리를 등식의 성질로 설명할 수 있게",
        "단순한 ax = b, x + a = b 형태부터 시작"
      ],
      studyAmount: "하루 30분, 기본 문제 15문제",
      books: "교과서, 베이직쎈",
      encouragement: "방정식은 저울이에요. 양쪽 균형만 맞추면 돼요!"
    },
    middle: {
      title: "분수/소수 계수 능숙하게",
      strategies: [
        "분모의 최소공배수를 곱해서 정수로 바꾸기",
        "소수는 10, 100을 곱해서 정수로 바꾸기",
        "복잡한 괄호 처리 연습"
      ],
      studyAmount: "하루 30분, 유형별 10문제",
      books: "개념원리, RPM",
      encouragement: "분수만 잘 처리하면 방정식이 훨씬 쉬워져요!"
    },
    upper: {
      title: "활용 문제 완벽 정복",
      strategies: [
        "속력/농도/나이/일의 양 문제 모든 유형 섭렵",
        "조건이 2개 이상인 복합 활용 문제",
        "답의 조건 검증 (자연수, 양수 등) 습관화"
      ],
      studyAmount: "하루 30분, 활용 심화 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "활용 문제는 '무엇을 x로 놓을까'가 핵심이에요!"
    }
  },
  {
    topic: "좌표와 그래프",
    grade: "중1-1",
    lower: {
      title: "좌표평면 익숙해지기",
      strategies: [
        "모눈종이에 직접 점 찍기 연습",
        "(x, y) 순서 확실히 기억 (가로 먼저, 세로 나중)",
        "각 사분면의 부호 외우기"
      ],
      studyAmount: "하루 20분, 좌표 찍기 20문제",
      books: "교과서, 개념쎈",
      encouragement: "좌표는 '가로, 세로' 순서만 기억하면 돼요!"
    },
    middle: {
      title: "대칭점과 거리 계산",
      strategies: [
        "x축, y축, 원점 대칭점 공식 암기",
        "두 점 사이의 거리 (가로 차이, 세로 차이)",
        "도형의 넓이 구하기 연계"
      ],
      studyAmount: "하루 25분, 유형별 8문제",
      books: "개념원리, 쎈",
      encouragement: "대칭점은 부호만 바꾸면 돼요. 규칙을 찾아보세요!"
    },
    upper: {
      title: "좌표를 활용한 도형 문제",
      strategies: [
        "좌표평면 위의 삼각형/사각형 넓이",
        "조건을 만족하는 점의 좌표 찾기",
        "고등학교 좌표기하 맛보기"
      ],
      studyAmount: "하루 20분, 심화 문제 5문제",
      books: "최상위 수학, 에이급",
      encouragement: "좌표로 도형을 다루는 건 고등학교 기하의 기초예요!"
    }
  },
  {
    topic: "정비례와 반비례",
    grade: "중1-1",
    lower: {
      title: "표와 그래프 연결하기",
      strategies: [
        "x, y의 대응표를 만들어서 규칙 찾기",
        "정비례: y = ax, 반비례: y = a/x 식 형태 암기",
        "원점을 지나는지 여부로 구분"
      ],
      studyAmount: "하루 20분, 그래프 그리기 10문제",
      books: "교과서, 베이직쎈",
      encouragement: "정비례는 직선, 반비례는 곡선! 모양으로 구분하세요."
    },
    middle: {
      title: "그래프 해석과 활용",
      strategies: [
        "비례상수 a의 부호에 따른 그래프 위치",
        "그래프 위의 점 좌표 구하기",
        "실생활 상황을 정비례/반비례로 모델링"
      ],
      studyAmount: "하루 25분, 활용 문제 8문제",
      books: "개념원리, RPM",
      encouragement: "a의 부호만 알면 그래프가 어느 사분면에 있는지 바로 알 수 있어요!"
    },
    upper: {
      title: "일차함수/유리함수 연결",
      strategies: [
        "정비례 → 일차함수의 특수한 경우임을 이해",
        "반비례 → 유리함수의 기본형임을 이해",
        "그래프의 교점, 넓이 문제"
      ],
      studyAmount: "하루 20분, 심화 문제 5문제",
      books: "최상위 수학, 일품",
      encouragement: "지금 배우는 건 고등학교 함수의 기초가 돼요!"
    }
  },
  // 중1-2학기
  {
    topic: "기본 도형",
    grade: "중1-2",
    lower: {
      title: "용어와 기호 익히기",
      strategies: [
        "점, 선, 면, 각의 정의 정확히",
        "직선, 반직선, 선분의 차이 그림으로 이해",
        "각의 종류 (예각, 직각, 둔각, 평각) 구분"
      ],
      studyAmount: "하루 20분, 개념 확인 문제 15문제",
      books: "교과서, 개념쎈",
      encouragement: "기호와 용어만 확실히 알면 도형이 쉬워져요!"
    },
    middle: {
      title: "위치 관계와 각 계산",
      strategies: [
        "동위각, 엇각의 위치 정확히 구분",
        "평행선에서 각의 크기 구하기",
        "맞꼭지각 = 같다는 것 활용"
      ],
      studyAmount: "하루 25분, 각도 계산 10문제",
      books: "개념원리, 쎈",
      encouragement: "평행선만 보이면 동위각, 엇각을 바로 찾는 습관을 들이세요!"
    },
    upper: {
      title: "복합 각도 문제",
      strategies: [
        "평행선이 여러 개인 복잡한 도형",
        "각의 이등분선이 포함된 문제",
        "증명 문제 연습"
      ],
      studyAmount: "하루 20분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "보조선을 그어서 문제를 단순화하는 연습을 해보세요!"
    }
  },
  {
    topic: "작도와 합동",
    grade: "중1-2",
    lower: {
      title: "합동 조건 3가지 암기",
      strategies: [
        "SSS, SAS, ASA 세 가지만 확실히",
        "각 조건이 무엇을 의미하는지 그림으로 이해",
        "SSA는 합동 조건이 아님을 기억"
      ],
      studyAmount: "하루 20분, 합동 판별 15문제",
      books: "교과서, 베이직쎈",
      encouragement: "합동 조건 3가지만 외우면 이 단원 끝이에요!"
    },
    middle: {
      title: "합동 조건 적용과 증명",
      strategies: [
        "두 삼각형이 합동인 이유를 조건으로 설명",
        "대응 순서 정확히 맞추기",
        "간단한 증명 문제 연습"
      ],
      studyAmount: "하루 25분, 증명 포함 8문제",
      books: "개념원리, RPM",
      encouragement: "대응 순서만 맞추면 합동 증명은 어렵지 않아요!"
    },
    upper: {
      title: "합동을 이용한 도형 성질 증명",
      strategies: [
        "이등변삼각형, 평행사변형 성질 증명",
        "합동을 활용한 길이/각도 구하기",
        "서술형 증명 완벽 작성"
      ],
      studyAmount: "하루 25분, 증명 심화 5문제",
      books: "최상위 수학, 에이급",
      encouragement: "증명은 '이유'를 정확히 쓰는 연습이에요!"
    }
  },
  {
    topic: "다각형의 내각과 외각",
    grade: "중1-2",
    lower: {
      title: "공식 정확히 암기",
      strategies: [
        "n각형 내각의 합 = 180° × (n-2)",
        "외각의 합 = 항상 360°",
        "삼각형, 사각형, 오각형으로 직접 확인"
      ],
      studyAmount: "하루 20분, 공식 적용 15문제",
      books: "교과서, 개념쎈",
      encouragement: "삼각형은 180°, 사각형은 360°부터 시작하세요!"
    },
    middle: {
      title: "정다각형 문제 정복",
      strategies: [
        "정n각형의 한 내각 = 180°×(n-2)/n",
        "정n각형의 한 외각 = 360°/n",
        "한 내각이 주어졌을 때 n 구하기"
      ],
      studyAmount: "하루 25분, 정다각형 문제 10문제",
      books: "개념원리, 쎈",
      encouragement: "외각 공식이 더 간단해요. 외각부터 구해보세요!"
    },
    upper: {
      title: "복합 도형과 응용",
      strategies: [
        "볼록/오목 다각형 구분",
        "별 모양 도형의 꼭짓점 각의 합",
        "대각선 개수와 연계 문제"
      ],
      studyAmount: "하루 20분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "별 모양 같은 특이한 도형도 삼각형으로 쪼개서 생각해요!"
    }
  },
  {
    topic: "원과 부채꼴",
    grade: "중1-2",
    lower: {
      title: "원의 기본 용어 익히기",
      strategies: [
        "중심, 반지름, 지름, 호, 현, 부채꼴 정의",
        "지름 = 반지름 × 2 확실히",
        "원주율 π ≈ 3.14 이해"
      ],
      studyAmount: "하루 20분, 용어 확인 10문제",
      books: "교과서, 베이직쎈",
      encouragement: "원의 용어만 알면 공식 적용이 쉬워져요!"
    },
    middle: {
      title: "부채꼴 공식 활용",
      strategies: [
        "호의 길이 l = 2πr × (θ/360°)",
        "넓이 S = πr² × (θ/360°) = (1/2)lr",
        "공식 3가지를 상황에 맞게 선택"
      ],
      studyAmount: "하루 25분, 부채꼴 문제 10문제",
      books: "개념원리, RPM",
      encouragement: "S = (1/2)lr 공식이 계산이 가장 간단해요!"
    },
    upper: {
      title: "복합 도형 넓이",
      strategies: [
        "원과 부채꼴이 겹친 도형",
        "색칠한 부분의 넓이 구하기",
        "회전체로 연결되는 개념 이해"
      ],
      studyAmount: "하루 20분, 심화 문제 5문제",
      books: "최상위 수학, 일품",
      encouragement: "색칠 문제는 '전체 - 빈 부분'으로 접근하세요!"
    }
  },
  {
    topic: "입체도형",
    grade: "중1-2",
    lower: {
      title: "입체도형 이름과 구조 익히기",
      strategies: [
        "각기둥, 원기둥, 각뿔, 원뿔, 구 구분",
        "전개도 모양 익히기",
        "면, 모서리, 꼭짓점 개수 세기"
      ],
      studyAmount: "하루 20분, 개념 문제 10문제",
      books: "교과서, 개념쎈",
      encouragement: "실제 상자를 펼쳐보면 전개도가 이해돼요!"
    },
    middle: {
      title: "겉넓이와 부피 공식",
      strategies: [
        "기둥의 부피 = 밑넓이 × 높이",
        "뿔의 부피 = (1/3) × 밑넓이 × 높이",
        "구의 겉넓이 = 4πr², 부피 = (4/3)πr³"
      ],
      studyAmount: "하루 30분, 계산 문제 10문제",
      books: "개념원리, 쎈",
      encouragement: "뿔은 기둥의 1/3, 이것만 기억하세요!"
    },
    upper: {
      title: "회전체와 복합 입체",
      strategies: [
        "회전축에 따른 회전체 모양 변화",
        "입체도형을 잘라낸 도형의 부피",
        "물에 잠긴 부피 문제"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "회전체는 적분의 기초가 돼요. 잘 익혀두세요!"
    }
  },
  {
    topic: "자료의 정리와 해석",
    grade: "중1-2",
    lower: {
      title: "표와 그래프 읽기",
      strategies: [
        "줄기와 잎 그림 해석",
        "도수분포표 작성법",
        "계급, 계급값, 도수의 의미"
      ],
      studyAmount: "하루 20분, 표/그래프 해석 10문제",
      books: "교과서, 베이직쎈",
      encouragement: "통계는 표를 읽는 것부터 시작이에요!"
    },
    middle: {
      title: "평균과 상대도수",
      strategies: [
        "도수분포표에서 평균 구하기 (계급값 × 도수)",
        "상대도수 계산과 활용",
        "두 집단 비교 문제"
      ],
      studyAmount: "하루 25분, 계산 문제 8문제",
      books: "개념원리, RPM",
      encouragement: "상대도수는 비율이에요. 비교할 때 꼭 필요해요!"
    },
    upper: {
      title: "자료 해석과 추론",
      strategies: [
        "히스토그램에서 분포 특징 분석",
        "상대도수와 확률의 연결",
        "통계적 추론 문제"
      ],
      studyAmount: "하루 20분, 해석 심화 5문제",
      books: "최상위 수학, 일품",
      encouragement: "통계는 데이터를 해석하는 능력이 중요해요!"
    }
  },
  // 중2-1학기
  {
    topic: "유리수와 순환소수",
    grade: "중2-1",
    lower: {
      title: "유한소수 조건 확실히",
      strategies: [
        "기약분수로 먼저 만들기!",
        "분모의 소인수가 2, 5뿐이면 유한소수",
        "순환소수 표기법 (점 찍는 위치) 연습"
      ],
      studyAmount: "하루 25분, 판별 문제 15문제",
      books: "교과서, 베이직쎈",
      encouragement: "기약분수로 먼저! 이게 핵심이에요."
    },
    middle: {
      title: "순환소수 ↔ 분수 변환",
      strategies: [
        "순환소수를 분수로 바꾸는 공식 이해",
        "분모에 9, 90, 99 등이 오는 규칙",
        "변환 후 기약분수 만들기"
      ],
      studyAmount: "하루 30분, 변환 문제 10문제",
      books: "개념원리, 쎈",
      encouragement: "순환마디 자릿수만큼 9를 써요!"
    },
    upper: {
      title: "유한소수 조건 응용",
      strategies: [
        "a/b가 유한소수가 되는 a의 개수 구하기",
        "분모/분자 조건 문제",
        "순환마디 길이 예측 문제"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 에이급",
      encouragement: "조건을 정리해서 경우의 수로 푸는 연습을 해보세요!"
    }
  },
  {
    topic: "식의 계산",
    grade: "중2-1",
    lower: {
      title: "지수법칙 3가지 구분",
      strategies: [
        "곱셈 → 지수 덧셈: aᵐ × aⁿ = aᵐ⁺ⁿ",
        "거듭제곱 → 지수 곱셈: (aᵐ)ⁿ = aᵐⁿ",
        "나눗셈 → 지수 뺄셈: aᵐ ÷ aⁿ = aᵐ⁻ⁿ"
      ],
      studyAmount: "하루 30분, 반복 계산 20문제",
      books: "교과서, 개념쎈",
      encouragement: "곱하면 더하고, 거듭하면 곱해요!"
    },
    middle: {
      title: "복합 지수 계산",
      strategies: [
        "지수법칙 여러 개가 섞인 문제",
        "밑을 같게 만들어서 계산 (4 = 2², 8 = 2³)",
        "음수 밑의 거듭제곱 부호 결정"
      ],
      studyAmount: "하루 30분, 복합 계산 15문제",
      books: "개념원리, RPM",
      encouragement: "밑을 통일하면 계산이 훨씬 쉬워져요!"
    },
    upper: {
      title: "문자 지수와 응용",
      strategies: [
        "2ˣ = 8일 때 x값 구하기",
        "지수 비교 문제",
        "고등 지수의 확장 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "이 단원은 고등학교 지수함수의 기초예요!"
    }
  },
  {
    topic: "다항식의 계산",
    grade: "중2-1",
    lower: {
      title: "동류항 정리 연습",
      strategies: [
        "문자와 차수가 같은 항 찾기",
        "괄호 앞 부호 처리 (음수면 모든 항 부호 변경)",
        "내림차순 정리 습관"
      ],
      studyAmount: "하루 30분, 정리 문제 20문제",
      books: "교과서, 베이직쎈",
      encouragement: "괄호 앞이 마이너스면 안의 부호가 다 바뀌어요!"
    },
    middle: {
      title: "다항식의 곱셈",
      strategies: [
        "분배법칙 확실히 (모든 항에 곱하기)",
        "(단항식) × (다항식) 능숙하게",
        "(다항식) × (다항식) 연습"
      ],
      studyAmount: "하루 30분, 곱셈 문제 15문제",
      books: "개념원리, 쎈",
      encouragement: "모든 항에 다 곱한다! 빠뜨리지 마세요."
    },
    upper: {
      title: "복잡한 식의 전개와 정리",
      strategies: [
        "다항식의 나눗셈",
        "치환을 이용한 계산",
        "곱셈공식 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 일품",
      encouragement: "지금 연습이 중3 곱셈공식에서 빛을 발해요!"
    }
  },
  {
    topic: "일차부등식",
    grade: "중2-1",
    lower: {
      title: "음수 곱하면 부등호 반대",
      strategies: [
        "이것만 확실히: 음수로 곱하거나 나누면 부등호 방향 바뀜",
        "수직선에 해 나타내기 (●, ○ 구분)",
        "단순한 일차부등식부터 연습"
      ],
      studyAmount: "하루 25분, 기본 문제 15문제",
      books: "교과서, 개념쎈",
      encouragement: "음수로 나누면 부등호가 뒤집혀요!"
    },
    middle: {
      title: "연립부등식과 활용",
      strategies: [
        "연립부등식의 해 (공통 범위)",
        "해가 없는 경우 판별",
        "활용 문제 (이상, 이하, 초과, 미만)"
      ],
      studyAmount: "하루 30분, 연립 문제 10문제",
      books: "개념원리, RPM",
      encouragement: "연립부등식은 겹치는 부분을 찾으면 돼요!"
    },
    upper: {
      title: "정수해/자연수해 문제",
      strategies: [
        "부등식의 정수해 개수 구하기",
        "조건을 만족하는 자연수 범위",
        "절댓값이 포함된 부등식 맛보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "범위를 구한 후 정수를 세는 것이 핵심!"
    }
  },
  {
    topic: "연립일차방정식",
    grade: "중2-1",
    lower: {
      title: "대입법과 가감법 기초",
      strategies: [
        "대입법: 한 미지수를 다른 미지수로 표현 후 대입",
        "가감법: 한 미지수를 없애기 위해 더하거나 빼기",
        "검산 습관 (구한 해를 두 식에 대입)"
      ],
      studyAmount: "하루 30분, 기본 문제 10문제씩",
      books: "교과서, 베이직쎈",
      encouragement: "두 방법 중 쉬운 거 골라서 쓰면 돼요!"
    },
    middle: {
      title: "복잡한 계수와 활용",
      strategies: [
        "분수/소수 계수 처리",
        "해가 무수히 많음/해 없음 판별",
        "활용 문제 (속력, 농도, 금액 등)"
      ],
      studyAmount: "하루 30분, 활용 문제 8문제",
      books: "개념원리, 쎈",
      encouragement: "활용 문제는 미지수 2개를 정하는 게 핵심!"
    },
    upper: {
      title: "세 미지수와 특수 연립",
      strategies: [
        "미정계수가 포함된 연립방정식",
        "조건에 맞는 계수 찾기",
        "연립방정식과 그래프의 관계"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 에이급",
      encouragement: "그래프로 해석하면 문제가 더 쉬워 보여요!"
    }
  },
  {
    topic: "일차함수",
    grade: "중2-1",
    lower: {
      title: "기울기와 y절편 이해",
      strategies: [
        "y = ax + b에서 a = 기울기, b = y절편",
        "기울기 = (y 변화량)/(x 변화량)",
        "그래프 그리기 연습"
      ],
      studyAmount: "하루 30분, 그래프 그리기 10문제",
      books: "교과서, 개념쎈",
      encouragement: "기울기는 '얼마나 기울어졌나'예요!"
    },
    middle: {
      title: "일차함수의 식 구하기",
      strategies: [
        "기울기 + 한 점 → 식 구하기",
        "두 점 → 기울기 → 식 구하기",
        "평행, 일치 조건"
      ],
      studyAmount: "하루 30분, 식 구하기 10문제",
      books: "개념원리, RPM",
      encouragement: "조건에 따라 식을 세우는 방법을 외워두세요!"
    },
    upper: {
      title: "일차함수와 일차방정식",
      strategies: [
        "연립방정식의 해 = 두 그래프의 교점",
        "그래프로 해의 개수 판별",
        "넓이 문제 (삼각형, 사각형)"
      ],
      studyAmount: "하루 30분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "방정식과 함수를 연결하면 사고가 넓어져요!"
    }
  },
  // 중2-2학기
  {
    topic: "삼각형의 성질",
    grade: "중2-2",
    lower: {
      title: "이등변삼각형 성질 암기",
      strategies: [
        "두 밑각의 크기가 같음",
        "꼭지각의 이등분선 = 밑변의 수직이등분선",
        "역: 두 각이 같으면 이등변삼각형"
      ],
      studyAmount: "하루 25분, 성질 확인 문제 15문제",
      books: "교과서, 베이직쎈",
      encouragement: "이등변삼각형은 좌우대칭이에요!"
    },
    middle: {
      title: "외심과 내심",
      strategies: [
        "외심: 세 변의 수직이등분선 교점, 세 꼭짓점까지 거리 같음",
        "내심: 세 각의 이등분선 교점, 세 변까지 거리 같음",
        "직각삼각형의 외심 = 빗변의 중점"
      ],
      studyAmount: "하루 30분, 외심/내심 문제 10문제",
      books: "개념원리, 쎈",
      encouragement: "외심은 변, 내심은 각! 이등분 위치로 구분하세요."
    },
    upper: {
      title: "증명과 활용",
      strategies: [
        "삼각형 성질을 이용한 증명",
        "외접원, 내접원의 반지름 구하기",
        "복합 도형 문제"
      ],
      studyAmount: "하루 25분, 증명 심화 5문제",
      books: "최상위 수학, 일품",
      encouragement: "외심, 내심은 고등학교 사인법칙과 연결돼요!"
    }
  },
  {
    topic: "사각형의 성질",
    grade: "중2-2",
    lower: {
      title: "평행사변형 조건 5가지",
      strategies: [
        "두 쌍의 대변이 각각 평행",
        "두 쌍의 대변의 길이가 각각 같음",
        "두 대각선이 서로를 이등분"
      ],
      studyAmount: "하루 25분, 조건 확인 문제 15문제",
      books: "교과서, 개념쎈",
      encouragement: "5가지 조건 중 하나만 만족해도 평행사변형!"
    },
    middle: {
      title: "특수 사각형 구분",
      strategies: [
        "직사각형: 네 각이 직각 + 대각선 길이 같음",
        "마름모: 네 변 길이 같음 + 대각선이 수직",
        "정사각형: 직사각형 + 마름모"
      ],
      studyAmount: "하루 30분, 비교 문제 10문제",
      books: "개념원리, RPM",
      encouragement: "대각선의 성질로 사각형을 구분해요!"
    },
    upper: {
      title: "증명과 좌표 활용",
      strategies: [
        "사각형 성질 증명",
        "좌표평면에서 사각형 판별",
        "벡터 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "좌표로 증명하는 건 고등학교에서 많이 써요!"
    }
  },
  {
    topic: "도형의 닮음",
    grade: "중2-2",
    lower: {
      title: "닮음 조건 3가지",
      strategies: [
        "AA: 두 각이 각각 같음",
        "SAS: 두 변의 비가 같고 그 끼인각이 같음",
        "SSS: 세 변의 비가 같음"
      ],
      studyAmount: "하루 25분, 닮음 판별 15문제",
      books: "교과서, 베이직쎈",
      encouragement: "AA 닮음이 가장 많이 쓰여요. 각 2개만 찾으면 돼요!"
    },
    middle: {
      title: "닮음비, 넓이비, 부피비",
      strategies: [
        "닮음비 m:n → 넓이비 m²:n² → 부피비 m³:n³",
        "비례식 세워서 미지의 변 구하기",
        "평행선과 비례 문제"
      ],
      studyAmount: "하루 30분, 비 활용 문제 10문제",
      books: "개념원리, 쎈",
      encouragement: "닮음비를 제곱하면 넓이비, 세제곱하면 부피비!"
    },
    upper: {
      title: "닮음 활용 심화",
      strategies: [
        "축소/확대 도형의 넓이, 부피 비교",
        "삼각형의 무게중심과 닮음",
        "정사영과 닮음"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 에이급",
      encouragement: "닮음은 고등학교 삼각비와 직결돼요!"
    }
  },
  {
    topic: "피타고라스 정리",
    grade: "중2-2",
    lower: {
      title: "기본 공식 확실히",
      strategies: [
        "a² + b² = c² (c는 빗변, 가장 긴 변)",
        "피타고라스의 수: 3-4-5, 5-12-13, 8-15-17",
        "직각삼각형 판별: c² = a² + b²이면 직각삼각형"
      ],
      studyAmount: "하루 30분, 기본 계산 15문제",
      books: "교과서, 개념쎈",
      encouragement: "3-4-5만 외워도 많은 문제가 풀려요!"
    },
    middle: {
      title: "다양한 적용",
      strategies: [
        "좌표평면의 두 점 사이 거리",
        "직각삼각형 만들어서 해결",
        "대각선 길이, 높이 구하기"
      ],
      studyAmount: "하루 30분, 활용 문제 10문제",
      books: "개념원리, RPM",
      encouragement: "직각이 없으면 수선을 그어서 직각을 만들어요!"
    },
    upper: {
      title: "공간과 응용",
      strategies: [
        "입체도형에서 피타고라스 정리",
        "최단거리 문제 (전개도 활용)",
        "고등 좌표기하 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "피타고라스 정리는 고등학교까지 계속 써요!"
    }
  },
  {
    topic: "경우의 수",
    grade: "중2-2",
    lower: {
      title: "합의 법칙과 곱의 법칙",
      strategies: [
        "'또는' → 더하기 (합의 법칙)",
        "'그리고/동시에' → 곱하기 (곱의 법칙)",
        "수형도 그려서 빠짐없이 세기"
      ],
      studyAmount: "하루 25분, 기본 문제 15문제",
      books: "교과서, 베이직쎈",
      encouragement: "또는은 더하고, 동시에는 곱해요!"
    },
    middle: {
      title: "순서/중복 구분",
      strategies: [
        "순서가 있는 경우 vs 없는 경우",
        "줄 세우기 vs 대표 뽑기",
        "여사건 활용"
      ],
      studyAmount: "하루 30분, 유형별 10문제",
      books: "개념원리, 쎈",
      encouragement: "순서가 중요하면 경우의 수가 더 많아요!"
    },
    upper: {
      title: "조건부 경우의 수",
      strategies: [
        "특정 조건이 있는 배열",
        "이웃하는/이웃하지 않는 경우",
        "고등 순열, 조합 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 일품",
      encouragement: "조건이 있는 문제는 조건부터 처리해요!"
    }
  },
  {
    topic: "확률",
    grade: "중2-2",
    lower: {
      title: "확률의 기본 개념",
      strategies: [
        "확률 = (그 경우의 수) / (전체 경우의 수)",
        "0 ≤ 확률 ≤ 1",
        "주사위, 동전, 카드 기본 문제"
      ],
      studyAmount: "하루 25분, 기본 문제 15문제",
      books: "교과서, 개념쎈",
      encouragement: "확률은 '해당' 나누기 '전체'예요!"
    },
    middle: {
      title: "여사건과 곱셈",
      strategies: [
        "P(A) + P(Aᶜ) = 1 활용",
        "'적어도' → 여사건으로 풀기",
        "독립시행의 확률"
      ],
      studyAmount: "하루 30분, 유형별 10문제",
      books: "개념원리, RPM",
      encouragement: "적어도 문제는 1에서 빼면 쉬워요!"
    },
    upper: {
      title: "조건부 확률 맛보기",
      strategies: [
        "복원/비복원 추출",
        "연속 사건의 확률",
        "고등 조건부확률 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "확률은 고등학교에서 더 중요해져요!"
    }
  },
  // 중3-1학기
  {
    topic: "제곱근과 실수",
    grade: "중3-1",
    lower: {
      title: "제곱근의 정확한 이해",
      strategies: [
        "√4 = 2 (양의 제곱근만)",
        "4의 제곱근 = ±2 (두 개)",
        "√a² = |a| (절댓값)"
      ],
      studyAmount: "하루 30분, 개념 확인 20문제",
      books: "교과서, 베이직쎈",
      encouragement: "√ 기호 자체가 양수만 의미해요!"
    },
    middle: {
      title: "실수 체계 이해",
      strategies: [
        "유리수: 분수로 표현 가능 (유한/순환소수)",
        "무리수: 분수로 표현 불가능 (비순환 무한소수)",
        "실수 = 유리수 ∪ 무리수"
      ],
      studyAmount: "하루 30분, 분류 문제 15문제",
      books: "개념원리, 쎈",
      encouragement: "π, √2는 무리수! 기억해두세요."
    },
    upper: {
      title: "무리수의 성질 심화",
      strategies: [
        "무리수의 정수/소수 부분",
        "실수의 대소 비교",
        "수직선 위의 무리수 표현"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 에이급",
      encouragement: "이 단원을 잘하면 고등학교 복소수가 쉬워져요!"
    }
  },
  {
    topic: "근호를 포함한 식의 계산",
    grade: "중3-1",
    lower: {
      title: "기본 연산 규칙",
      strategies: [
        "√a × √b = √(ab) ← 곱셈만 성립",
        "√a + √b ≠ √(a+b) ← 덧셈은 안 됨!",
        "근호 안을 간단히 (√8 = 2√2)"
      ],
      studyAmount: "하루 30분, 계산 연습 20문제",
      books: "교과서, 개념쎈",
      encouragement: "√끼리는 곱셈만 합쳐져요. 덧셈은 안 돼요!"
    },
    middle: {
      title: "분모의 유리화",
      strategies: [
        "1/√a → √a/a",
        "1/(√a+√b) → (√a-√b)/(a-b) [켤레식 활용]",
        "유리화 후 계산"
      ],
      studyAmount: "하루 30분, 유리화 문제 15문제",
      books: "개념원리, RPM",
      encouragement: "분모에 √가 있으면 유리화가 기본!"
    },
    upper: {
      title: "복잡한 근호 계산",
      strategies: [
        "이중근호 풀기",
        "√(a±b) 형태 처리",
        "고등 극한의 유리화 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "이 연산 능력은 고등 미적분에서 빛나요!"
    }
  },
  {
    topic: "곱셈 공식과 인수분해",
    grade: "중3-1",
    lower: {
      title: "곱셈 공식 5개 암기",
      strategies: [
        "(a+b)² = a² + 2ab + b²",
        "(a-b)² = a² - 2ab + b²",
        "(a+b)(a-b) = a² - b²"
      ],
      studyAmount: "하루 30분, 전개 연습 20문제",
      books: "교과서, 베이직쎈",
      encouragement: "이 5개가 고등학교까지 평생 써요!"
    },
    middle: {
      title: "인수분해 능숙하게",
      strategies: [
        "전개의 역순으로 인수분해",
        "공통인수 먼저 묶기",
        "완전제곱식 vs 합차공식 구분"
      ],
      studyAmount: "하루 30분, 인수분해 20문제",
      books: "개념원리, 쎈",
      encouragement: "인수분해는 전개를 거꾸로 하는 거예요!"
    },
    upper: {
      title: "복잡한 인수분해",
      strategies: [
        "치환을 이용한 인수분해",
        "인수분해의 완성 (여러 단계)",
        "고등 인수정리 미리보기"
      ],
      studyAmount: "하루 30분, 심화 문제 8문제",
      books: "최상위 수학, 에이급",
      encouragement: "인수분해는 고등 수학의 핵심 중 핵심!"
    }
  },
  {
    topic: "이차방정식",
    grade: "중3-1",
    lower: {
      title: "세 가지 풀이법",
      strategies: [
        "인수분해: (x-a)(x-b)=0 → x=a 또는 x=b",
        "완전제곱식: (x-p)²=q → x=p±√q",
        "근의 공식: x = (-b±√(b²-4ac))/2a"
      ],
      studyAmount: "하루 30분, 각 방법으로 10문제씩",
      books: "교과서, 개념쎈",
      encouragement: "세 방법 다 할 수 있어야 해요!"
    },
    middle: {
      title: "근의 공식 능숙하게",
      strategies: [
        "근의 공식 완벽 암기",
        "짝수 공식도 활용",
        "판별식 의미 이해 (근의 종류)"
      ],
      studyAmount: "하루 30분, 근의 공식 문제 15문제",
      books: "개념원리, RPM",
      encouragement: "근의 공식은 만능이에요!"
    },
    upper: {
      title: "활용과 심화",
      strategies: [
        "문장제 활용 문제",
        "근과 계수의 관계 미리보기",
        "판별식을 이용한 조건 문제"
      ],
      studyAmount: "하루 30분, 심화 문제 8문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "이차방정식은 고등학교의 핵심 주제예요!"
    }
  },
  {
    topic: "이차함수",
    grade: "중3-1",
    lower: {
      title: "그래프의 기본형",
      strategies: [
        "y = ax²의 그래프 특징 (포물선)",
        "a > 0 → 아래로 볼록, a < 0 → 위로 볼록",
        "|a|가 클수록 폭이 좁음"
      ],
      studyAmount: "하루 30분, 그래프 그리기 15문제",
      books: "교과서, 베이직쎈",
      encouragement: "이차함수 그래프는 U자 모양!"
    },
    middle: {
      title: "표준형과 일반형",
      strategies: [
        "y = a(x-p)² + q: 꼭짓점 (p, q), 축 x=p",
        "일반형 → 표준형 변환 (완전제곱식)",
        "꼭짓점 공식 활용"
      ],
      studyAmount: "하루 30분, 변환 문제 15문제",
      books: "개념원리, 쎈",
      encouragement: "괄호 안이 (x-3)이면 꼭짓점 x좌표는 +3!"
    },
    upper: {
      title: "최대/최소와 활용",
      strategies: [
        "정의역 제한 시 최대/최소",
        "이차방정식과 이차함수 관계",
        "판별식 활용 심화"
      ],
      studyAmount: "하루 30분, 심화 문제 8문제",
      books: "최상위 수학, 에이급",
      encouragement: "이차함수는 고등 미분의 기초!"
    }
  },
  // 중3-2학기
  {
    topic: "삼각비",
    grade: "중3-2",
    lower: {
      title: "sin, cos, tan 정의",
      strategies: [
        "sin = 대변/빗변",
        "cos = 인접변/빗변",
        "tan = 대변/인접변"
      ],
      studyAmount: "하루 30분, 기본 계산 15문제",
      books: "교과서, 개념쎈",
      encouragement: "빗변은 항상 분모에 있어요 (tan 제외)!"
    },
    middle: {
      title: "특수각 암기",
      strategies: [
        "30°, 45°, 60°의 sin, cos, tan 값 완벽 암기",
        "삼각비 사이의 관계 (sin²+cos²=1)",
        "삼각비 표 읽기"
      ],
      studyAmount: "하루 30분, 특수각 활용 15문제",
      books: "개념원리, RPM",
      encouragement: "특수각 값은 평생 쓰니까 지금 외워요!"
    },
    upper: {
      title: "활용과 확장",
      strategies: [
        "삼각비를 이용한 변/각 계산",
        "삼각형 넓이 = (1/2)ab sinC",
        "고등 삼각함수 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 블랙라벨",
      encouragement: "삼각비가 삼각함수로 확장돼요!"
    }
  },
  {
    topic: "원의 성질",
    grade: "중3-2",
    lower: {
      title: "원주각과 중심각",
      strategies: [
        "원주각 = 중심각의 1/2",
        "같은 호에 대한 원주각은 모두 같음",
        "반원에 대한 원주각 = 90°"
      ],
      studyAmount: "하루 25분, 각 계산 15문제",
      books: "교과서, 베이직쎈",
      encouragement: "원주각은 중심각의 절반!"
    },
    middle: {
      title: "원과 접선",
      strategies: [
        "접선 ⊥ 반지름 (접점에서)",
        "원 밖의 점에서 두 접선의 길이 같음",
        "내접 사각형의 성질"
      ],
      studyAmount: "하루 30분, 접선 문제 10문제",
      books: "개념원리, 쎈",
      encouragement: "접선이 보이면 수직을 떠올리세요!"
    },
    upper: {
      title: "원의 성질 종합",
      strategies: [
        "접선과 현이 이루는 각",
        "원에 내접하는 사각형 활용",
        "고등 원의 방정식 미리보기"
      ],
      studyAmount: "하루 25분, 심화 문제 5문제",
      books: "최상위 수학, 에이급",
      encouragement: "원의 성질은 고등 기하에서 계속 써요!"
    }
  },
  {
    topic: "통계",
    grade: "중3-2",
    lower: {
      title: "대푯값 이해",
      strategies: [
        "평균, 중앙값, 최빈값의 정의",
        "각 대푯값의 특징과 사용 상황",
        "도수분포표에서 평균 구하기"
      ],
      studyAmount: "하루 20분, 계산 문제 15문제",
      books: "교과서, 개념쎈",
      encouragement: "세 가지 대푯값의 차이를 알아두세요!"
    },
    middle: {
      title: "분산과 표준편차",
      strategies: [
        "분산 = 편차²의 평균",
        "표준편차 = √분산",
        "편차의 합 = 0 활용"
      ],
      studyAmount: "하루 25분, 분산 계산 10문제",
      books: "개념원리, RPM",
      encouragement: "분산은 퍼진 정도를 나타내요!"
    },
    upper: {
      title: "산포도 활용",
      strategies: [
        "산점도 해석",
        "상관관계 분석",
        "고등 확률분포 미리보기"
      ],
      studyAmount: "하루 20분, 해석 문제 5문제",
      books: "최상위 수학, 일품",
      encouragement: "통계는 데이터를 읽는 능력이에요!"
    }
  },
  // 공통수학1 (고1-1학기)
  {
    topic: "다항식의 연산",
    grade: "공통수학1",
    lower: {
      title: "전개와 정리",
      strategies: [
        "곱셈 공식 복습 (중3 내용 확실히)",
        "(a+b+c)² 같은 확장 공식",
        "내림차순 정리 습관"
      ],
      studyAmount: "하루 40분, 전개 문제 20문제",
      books: "교과서, 수학의 바이블",
      encouragement: "중3 곱셈 공식이 확실해야 고1이 쉬워요!"
    },
    middle: {
      title: "다항식의 나눗셈",
      strategies: [
        "긴 나눗셈 방법 익히기",
        "빠진 차수에 0 넣기",
        "(몫) × (나누는 식) + (나머지) = (원래 식)"
      ],
      studyAmount: "하루 45분, 나눗셈 문제 15문제",
      books: "개념원리, 쎈",
      encouragement: "나눗셈은 나머지정리의 기초예요!"
    },
    upper: {
      title: "복잡한 전개와 치환",
      strategies: [
        "치환을 이용한 전개",
        "대칭식 계산",
        "곱셈 공식 변형 활용"
      ],
      studyAmount: "하루 40분, 심화 문제 10문제",
      books: "블랙라벨, 일품",
      encouragement: "치환 능력이 고등 수학의 핵심 스킬!"
    }
  },
  {
    topic: "나머지정리와 인수정리",
    grade: "공통수학1",
    lower: {
      title: "나머지정리 기본",
      strategies: [
        "P(x)를 (x-a)로 나눈 나머지 = P(a)",
        "(x+a)로 나누면 P(-a)",
        "조립제법으로 빠르게 계산"
      ],
      studyAmount: "하루 40분, 기본 문제 15문제",
      books: "교과서, 개념원리",
      encouragement: "조립제법만 익히면 계산이 빨라져요!"
    },
    middle: {
      title: "인수정리 활용",
      strategies: [
        "P(a)=0 → (x-a)가 인수",
        "상수항의 약수 대입해서 인수 찾기",
        "고차 다항식의 인수분해"
      ],
      studyAmount: "하루 45분, 인수분해 15문제",
      books: "개념원리, RPM",
      encouragement: "상수항의 약수를 대입해보세요!"
    },
    upper: {
      title: "이차식으로 나눈 나머지",
      strategies: [
        "R(x) = ax + b로 놓기",
        "두 조건으로 a, b 결정",
        "복잡한 조건 문제"
      ],
      studyAmount: "하루 45분, 심화 문제 10문제",
      books: "블랙라벨, 수학의 정석 실력",
      encouragement: "나머지를 일차식으로 놓는 게 핵심!"
    }
  },
  {
    topic: "복소수",
    grade: "공통수학1",
    lower: {
      title: "i의 정의와 연산",
      strategies: [
        "i² = -1, i³ = -i, i⁴ = 1 (4개 주기)",
        "복소수의 덧셈, 뺄셈, 곱셈",
        "켤레복소수의 정의"
      ],
      studyAmount: "하루 35분, 기본 계산 15문제",
      books: "교과서, 수학의 바이블",
      encouragement: "i의 주기 4개만 기억하면 돼요!"
    },
    middle: {
      title: "복소수 나눗셈",
      strategies: [
        "분모의 실수화 (켤레복소수 활용)",
        "복소수의 상등 조건",
        "복소수 방정식"
      ],
      studyAmount: "하루 40분, 나눗셈 문제 15문제",
      books: "개념원리, 쎈",
      encouragement: "분모에 켤레를 곱하면 실수가 돼요!"
    },
    upper: {
      title: "복소수 심화",
      strategies: [
        "i의 거듭제곱 응용",
        "복소수의 성질 증명",
        "복소평면 미리보기"
      ],
      studyAmount: "하루 35분, 심화 문제 8문제",
      books: "블랙라벨, 일품",
      encouragement: "복소수는 기하에서 더 깊이 배워요!"
    }
  },
  {
    topic: "이차방정식과 이차함수",
    grade: "공통수학1",
    lower: {
      title: "판별식 기초",
      strategies: [
        "D = b² - 4ac의 의미",
        "D > 0: 서로 다른 두 실근",
        "D = 0: 중근, D < 0: 두 허근"
      ],
      studyAmount: "하루 40분, 판별식 문제 15문제",
      books: "교과서, 개념원리",
      encouragement: "판별식은 근의 종류를 알려줘요!"
    },
    middle: {
      title: "근과 계수의 관계",
      strategies: [
        "α + β = -b/a (부호 주의!)",
        "αβ = c/a",
        "대칭식 계산 (α² + β² 등)"
      ],
      studyAmount: "하루 45분, 대칭식 문제 15문제",
      books: "개념원리, RPM",
      encouragement: "부호 실수만 안 하면 돼요!"
    },
    upper: {
      title: "이차함수와 x축 관계",
      strategies: [
        "그래프와 x축의 위치 관계 = 판별식",
        "실근 조건, 접하는 조건",
        "이차부등식과 연계"
      ],
      studyAmount: "하루 45분, 종합 문제 10문제",
      books: "블랙라벨, 수학의 정석 실력",
      encouragement: "그래프와 방정식의 연결이 핵심!"
    }
  },
  {
    topic: "고차방정식",
    grade: "공통수학1",
    lower: {
      title: "삼차방정식 풀이",
      strategies: [
        "인수정리로 인수 찾기",
        "조립제법으로 인수분해",
        "삼차는 최소 하나의 실근 존재"
      ],
      studyAmount: "하루 40분, 삼차방정식 15문제",
      books: "교과서, 수학의 바이블",
      encouragement: "일단 하나의 근을 찾는 게 시작!"
    },
    middle: {
      title: "사차방정식과 복이차",
      strategies: [
        "복이차식: x² = t로 치환",
        "켤레근 정리 활용",
        "연립방정식 형태"
      ],
      studyAmount: "하루 45분, 사차방정식 12문제",
      books: "개념원리, 쎈",
      encouragement: "치환하면 이차방정식이 돼요!"
    },
    upper: {
      title: "고차방정식 심화",
      strategies: [
        "삼차방정식의 근과 계수",
        "조건에 맞는 방정식 찾기",
        "그래프와의 관계"
      ],
      studyAmount: "하루 45분, 심화 문제 10문제",
      books: "블랙라벨, 일품",
      encouragement: "고차방정식은 함수의 그래프와 연결돼요!"
    }
  },
  {
    topic: "이차부등식",
    grade: "공통수학1",
    lower: {
      title: "그래프로 해 구하기",
      strategies: [
        "이차함수 그래프를 먼저 그리기",
        "y > 0, y < 0인 구간 찾기",
        "a의 부호 먼저 확인"
      ],
      studyAmount: "하루 40분, 그래프 문제 15문제",
      books: "교과서, 개념원리",
      encouragement: "그래프를 그리면 해가 보여요!"
    },
    middle: {
      title: "D의 부호에 따른 해",
      strategies: [
        "D > 0: 두 근 사이, 바깥",
        "D = 0: 한 점 제외, 모든 실수",
        "D < 0: 모든 실수, 해 없음"
      ],
      studyAmount: "하루 45분, 조건별 15문제",
      books: "개념원리, RPM",
      encouragement: "D의 부호가 해의 형태를 결정해요!"
    },
    upper: {
      title: "연립이차부등식과 조건",
      strategies: [
        "항상 양수/음수 조건",
        "정의역 조건 설정",
        "절댓값 부등식"
      ],
      studyAmount: "하루 45분, 심화 문제 10문제",
      books: "블랙라벨, 수학의 정석 실력",
      encouragement: "부등식은 정의역 조건에서 많이 써요!"
    }
  },
  {
    topic: "순열과 조합",
    grade: "공통수학1",
    lower: {
      title: "기본 공식 암기",
      strategies: [
        "순열: nPr = n!/(n-r)!",
        "조합: nCr = n!/r!(n-r)!",
        "팩토리얼 계산 익숙하게"
      ],
      studyAmount: "하루 40분, 기본 계산 20문제",
      books: "교과서, 수학의 바이블",
      encouragement: "순열은 순서 있음, 조합은 순서 없음!"
    },
    middle: {
      title: "특수 순열",
      strategies: [
        "같은 것이 있는 순열: n!/p!q!...",
        "원순열: (n-1)!",
        "염주순열: (n-1)!/2"
      ],
      studyAmount: "하루 45분, 유형별 15문제",
      books: "개념원리, 쎈",
      encouragement: "원순열은 회전해서 같은 건 하나!"
    },
    upper: {
      title: "조건부 배열",
      strategies: [
        "이웃하는/이웃하지 않는 조건",
        "특정 위치 조건",
        "중복조합"
      ],
      studyAmount: "하루 45분, 심화 문제 10문제",
      books: "블랙라벨, 일품",
      encouragement: "조건이 있으면 조건부터 처리!"
    }
  },
  {
    topic: "집합과 명제",
    grade: "공통수학1",
    lower: {
      title: "집합 연산",
      strategies: [
        "합집합, 교집합, 여집합, 차집합",
        "벤 다이어그램으로 이해",
        "n(A∪B) = n(A) + n(B) - n(A∩B)"
      ],
      studyAmount: "하루 35분, 집합 연산 15문제",
      books: "교과서, 개념원리",
      encouragement: "벤 다이어그램을 그리면 보여요!"
    },
    middle: {
      title: "명제와 조건",
      strategies: [
        "역, 이, 대우의 정의",
        "대우 증명법",
        "필요조건, 충분조건"
      ],
      studyAmount: "하루 40분, 명제 문제 15문제",
      books: "개념원리, RPM",
      encouragement: "명제와 대우의 진리값은 같아요!"
    },
    upper: {
      title: "증명과 논리",
      strategies: [
        "귀류법",
        "수학적 귀납법 미리보기",
        "논리 기호 활용"
      ],
      studyAmount: "하루 40분, 증명 문제 8문제",
      books: "블랙라벨, 수학의 정석 실력",
      encouragement: "증명 능력은 수학의 핵심 역량!"
    }
  },
  {
    topic: "절대부등식",
    grade: "공통수학1",
    lower: {
      title: "산술-기하 평균",
      strategies: [
        "(a+b)/2 ≥ √(ab) (a, b > 0)",
        "등호: a = b일 때",
        "간단한 최대/최소 문제"
      ],
      studyAmount: "하루 35분, 기본 문제 12문제",
      books: "교과서, 수학의 바이블",
      encouragement: "a = b일 때 등호가 성립해요!"
    },
    middle: {
      title: "최대/최소 문제",
      strategies: [
        "곱이 일정할 때 합의 최소",
        "합이 일정할 때 곱의 최대",
        "등호 성립 조건 확인"
      ],
      studyAmount: "하루 40분, 최대/최소 15문제",
      books: "개념원리, 쎈",
      encouragement: "등호 조건 확인이 필수!"
    },
    upper: {
      title: "코시-슈바르츠 부등식",
      strategies: [
        "(a²+b²)(c²+d²) ≥ (ac+bd)²",
        "벡터 내적과의 관계",
        "복잡한 최대/최소"
      ],
      studyAmount: "하루 40분, 심화 문제 8문제",
      books: "블랙라벨, 일품",
      encouragement: "이 부등식은 기하에서 다시 나와요!"
    }
  },
  {
    topic: "함수",
    grade: "공통수학1",
    lower: {
      title: "함수의 기본 개념",
      strategies: [
        "함수의 정의 (일가 대응)",
        "정의역, 공역, 치역 구분",
        "함수 여부 판별"
      ],
      studyAmount: "하루 35분, 개념 문제 15문제",
      books: "교과서, 개념원리",
      encouragement: "하나의 x에 하나의 y만 대응하면 함수!"
    },
    middle: {
      title: "합성함수와 역함수",
      strategies: [
        "(f∘g)(x) = f(g(x))",
        "역함수 존재 조건: 일대일대응",
        "f⁻¹ 구하기 (x↔y 바꾸기)"
      ],
      studyAmount: "하루 45분, 합성/역함수 15문제",
      books: "개념원리, RPM",
      encouragement: "합성은 안쪽 함수부터 계산!"
    },
    upper: {
      title: "함수 심화",
      strategies: [
        "f∘g = g∘f 조건",
        "역함수와 원래 함수의 관계",
        "대칭성 활용"
      ],
      studyAmount: "하루 45분, 심화 문제 10문제",
      books: "블랙라벨, 수학의 정석 실력",
      encouragement: "함수는 미적분의 핵심 기초!"
    }
  },
  // 공통수학2 (고1-2학기)
  {
    topic: "직선의 방정식",
    grade: "공통수학2",
    lower: {
      title: "기울기와 방정식",
      strategies: [
        "y - y₁ = m(x - x₁)",
        "두 점으로 기울기 구하기",
        "기울기 + 한 점 → 방정식"
      ],
      studyAmount: "하루 40분, 기본 문제 15문제",
      books: "교과서, 수학의 바이블",
      encouragement: "직선은 기울기만 알면 돼요!"
    },
    middle: {
      title: "위치 관계와 거리",
      strategies: [
        "평행: 기울기 같음",
        "수직: 기울기 곱 = -1",
        "점과 직선 사이 거리 공식"
      ],
      studyAmount: "하루 45분, 거리 공식 15문제",
      books: "개념원리, 쎈",
      encouragement: "거리 공식의 절댓값 잊지 마세요!"
    },
    upper: {
      title: "직선 심화",
      strategies: [
        "두 직선의 교점을 지나는 직선",
        "넓이 문제",
        "직선 다발"
      ],
      studyAmount: "하루 45분, 심화 문제 10문제",
      books: "블랙라벨, 일품",
      encouragement: "직선은 미분의 접선으로 연결돼요!"
    }
  },
  {
    topic: "원의 방정식",
    grade: "공통수학2",
    lower: {
      title: "표준형과 일반형",
      strategies: [
        "(x-a)² + (y-b)² = r²: 중심 (a, b), 반지름 r",
        "일반형 → 표준형 변환 (완전제곱식)",
        "중심 좌표 부호 주의!"
      ],
      studyAmount: "하루 40분, 기본 문제 15문제",
      books: "교과서, 개념원리",
      encouragement: "괄호 안이 (x-3)이면 중심 x좌표는 +3!"
    },
    middle: {
      title: "원과 직선의 위치 관계",
      strategies: [
        "d < r: 두 점, d = r: 접함, d > r: 안 만남",
        "원의 접선 방정식",
        "할선의 길이"
      ],
      studyAmount: "하루 45분, 위치 관계 15문제",
      books: "개념원리, RPM",
      encouragement: "중심과 직선 사이 거리가 핵심!"
    },
    upper: {
      title: "원 심화",
      strategies: [
        "원 밖의 점에서 접선",
        "두 원의 위치 관계",
        "공통현, 공통접선"
      ],
      studyAmount: "하루 45분, 심화 문제 10문제",
      books: "블랙라벨, 수학의 정석 실력",
      encouragement: "원은 이차곡선의 기초예요!"
    }
  },
  {
    topic: "도형의 이동",
    grade: "공통수학2",
    lower: {
      title: "평행이동",
      strategies: [
        "점: (x, y) → (x+a, y+b)",
        "방정식: x 대신 x-a, y 대신 y-b",
        "점과 방정식의 부호가 반대"
      ],
      studyAmount: "하루 35분, 이동 문제 15문제",
      books: "교과서, 수학의 바이블",
      encouragement: "점은 더하고, 식은 빼요!"
    },
    middle: {
      title: "대칭이동",
      strategies: [
        "x축: y → -y",
        "y축: x → -x",
        "원점: x → -x, y → -y"
      ],
      studyAmount: "하루 40분, 대칭 문제 15문제",
      books: "개념원리, 쎈",
      encouragement: "y = x 대칭은 역함수 그래프!"
    },
    upper: {
      title: "이동 종합",
      strategies: [
        "여러 이동의 합성",
        "도형의 자취",
        "회전이동 (기하 미리보기)"
      ],
      studyAmount: "하루 40분, 심화 문제 8문제",
      books: "블랙라벨, 일품",
      encouragement: "이동을 합성하면 복잡한 문제도 쉬워져요!"
    }
  },
  {
    topic: "평면좌표",
    grade: "공통수학2",
    lower: {
      title: "기초부터 시작하는 평면좌표",
      strategies: [
        "두 점 사이 거리와 내분점 공식 기초",
        "두 점 사이 거리 공식 √{(x₂-x₁)²+(y₂-y₁)²} 암기",
        "내분점 공식: (mx₂+nx₁)/(m+n) 형태로 기억",
        "중점은 1:1 내분점임을 이해"
      ],
      studyAmount: "주 3-4회, 매일 30분, 기본 계산 문제 20문제",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "공식만 외우면 대입만 하면 돼요!"
    },
    middle: {
      title: "내분점, 외분점 구분과 무게중심",
      strategies: [
        "내분점(더하기)과 외분점(빼기) 공식 구분",
        "삼각형의 무게중심 = 세 좌표의 평균",
        "도형의 넓이를 좌표로 구하기"
      ],
      studyAmount: "주 4-5회, 매일 40분, 내분/외분 혼합 문제",
      books: "개념원리, RPM, 쎈",
      encouragement: "내분은 더하고 외분은 빼요. 이것만 기억!"
    },
    upper: {
      title: "좌표를 이용한 도형 증명",
      strategies: [
        "좌표를 설정하여 도형 성질 증명하기",
        "점의 자취 문제",
        "조건을 만족하는 점의 영역"
      ],
      studyAmount: "주 5-6회, 매일 50분, 증명 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "좌표로 증명하는 건 깔끔하고 논리적이에요!"
    }
  },
  {
    topic: "집합",
    grade: "공통수학2",
    lower: {
      title: "집합 연산 기호 익히기",
      strategies: [
        "∪(합집합), ∩(교집합), ᶜ(여집합), -(차집합)",
        "벤 다이어그램으로 시각화",
        "원소나열법, 조건제시법 구분"
      ],
      studyAmount: "주 3-4회, 매일 30분, 벤 다이어그램 그리며 연습",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "그림을 그리면 집합이 쉬워져요!"
    },
    middle: {
      title: "원소 개수 공식과 부분집합",
      strategies: [
        "n(A∪B) = n(A) + n(B) - n(A∩B)",
        "부분집합의 개수 = 2ⁿ",
        "드모르간 법칙"
      ],
      studyAmount: "주 4-5회, 매일 40분, 원소 개수 문제",
      books: "개념원리, RPM, 쎈",
      encouragement: "공식을 외우면 문제가 술술 풀려요!"
    },
    upper: {
      title: "집합 조건 심화",
      strategies: [
        "조건을 만족하는 집합 찾기",
        "집합의 연산 성질 증명",
        "명제와의 연결"
      ],
      studyAmount: "주 5-6회, 매일 50분, 조건 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "집합은 논리의 기초예요!"
    }
  },
  {
    topic: "명제",
    grade: "공통수학2",
    lower: {
      title: "명제의 참/거짓 판별",
      strategies: [
        "명제 = 참/거짓을 판별할 수 있는 문장",
        "\"모든\"이 있으면 반례 하나로 거짓",
        "\"어떤\"이 있으면 예 하나로 참"
      ],
      studyAmount: "주 3-4회, 매일 30분, 참/거짓 판별 연습",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "모든은 까다롭고, 어떤은 쉬워요!"
    },
    middle: {
      title: "역, 이, 대우와 조건",
      strategies: [
        "역: q → p, 이: ~p → ~q, 대우: ~q → ~p",
        "명제와 대우의 진리값은 같음",
        "필요조건, 충분조건, 필요충분조건"
      ],
      studyAmount: "주 4-5회, 매일 40분, 역이대우 변환",
      books: "개념원리, RPM, 쎈",
      encouragement: "대우로 바꾸면 증명이 쉬워지는 경우가 많아요!"
    },
    upper: {
      title: "증명법과 논리",
      strategies: [
        "직접 증명, 대우 증명, 귀류법",
        "필요충분조건의 집합적 해석",
        "복잡한 조건 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 증명 문제 유형별 정리",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "증명은 수학의 꽃이에요!"
    }
  },
  {
    topic: "절대부등식",
    grade: "공통수학2",
    lower: {
      title: "산술-기하 평균 공식 암기",
      strategies: [
        "(a+b)/2 ≥ √(ab) (a, b > 0)",
        "등호 성립 조건: a = b",
        "양수 조건 확인하기"
      ],
      studyAmount: "주 3-4회, 매일 30분, 공식 암기 → 기본 적용",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "양수일 때만 쓸 수 있어요!"
    },
    middle: {
      title: "최대/최소 문제 해결",
      strategies: [
        "곱이 일정할 때 합의 최솟값",
        "합이 일정할 때 곱의 최댓값",
        "등호 조건이 문제 조건에 맞는지 확인"
      ],
      studyAmount: "주 4-5회, 매일 40분, 최대/최소 유형 정리",
      books: "개념원리, RPM, 쎈",
      encouragement: "등호 조건 확인이 필수예요!"
    },
    upper: {
      title: "부등식 심화와 증명",
      strategies: [
        "코시-슈바르츠 부등식",
        "여러 변수의 최대/최소",
        "부등식 증명 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 다양한 부등식",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "부등식은 미적분의 최적화와 연결돼요!"
    }
  },
  {
    topic: "함수",
    grade: "공통수학2",
    lower: {
      title: "함수의 정의와 표현",
      strategies: [
        "함수 = x 하나에 y 하나가 대응",
        "정의역, 공역, 치역 구분",
        "함수인지 아닌지 판별하기"
      ],
      studyAmount: "주 3-4회, 매일 30분, 정의 이해 → 판별 연습",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "x 하나당 y 하나! 이것만 기억하세요."
    },
    middle: {
      title: "합성함수와 역함수",
      strategies: [
        "(f∘g)(x) = f(g(x)) - 안쪽 먼저!",
        "역함수: x와 y를 바꾸고 y에 대해 정리",
        "역함수 존재 조건 = 일대일대응"
      ],
      studyAmount: "주 4-5회, 매일 40분, 합성 계산 → 역함수 구하기",
      books: "개념원리, RPM, 쎈",
      encouragement: "합성은 안쪽부터, 역함수는 바꾸고 정리!"
    },
    upper: {
      title: "함수 심화 문제",
      strategies: [
        "f∘g = g∘f 조건",
        "역함수와 원래 함수의 교점 (y=x 위)",
        "함수의 개수 세기"
      ],
      studyAmount: "주 5-6회, 매일 50분, 조건 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "함수는 미적분의 핵심 기초예요!"
    }
  },
  {
    topic: "유리함수",
    grade: "공통수학2",
    lower: {
      title: "y = k/x 그래프 이해",
      strategies: [
        "k > 0이면 1, 3사분면, k < 0이면 2, 4사분면",
        "점근선: x축과 y축",
        "원점 대칭인 쌍곡선"
      ],
      studyAmount: "주 3-4회, 매일 30분, 그래프 그리기 연습",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "중1 반비례의 확장이에요!"
    },
    middle: {
      title: "y = k/(x-p) + q 형태",
      strategies: [
        "점근선: x = p, y = q",
        "그래프의 평행이동으로 이해",
        "식에서 점근선 바로 읽기"
      ],
      studyAmount: "주 4-5회, 매일 40분, 점근선 찾기 → 그래프 그리기",
      books: "개념원리, RPM, 쎈",
      encouragement: "점근선만 알면 그래프를 그릴 수 있어요!"
    },
    upper: {
      title: "유리함수와 직선의 관계",
      strategies: [
        "유리함수와 직선의 교점 개수",
        "유리함수의 치역, 역함수",
        "유리함수를 포함한 방정식/부등식"
      ],
      studyAmount: "주 5-6회, 매일 50분, 교점 → 역함수 → 부등식",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "유리함수는 분수함수라고 생각하면 쉬워요!"
    }
  },
  {
    topic: "무리함수",
    grade: "공통수학2",
    lower: {
      title: "y = √x 그래프 이해",
      strategies: [
        "정의역: x ≥ 0, 치역: y ≥ 0",
        "원점에서 시작하는 반쪽 포물선",
        "y = x²의 역함수임을 이해"
      ],
      studyAmount: "주 3-4회, 매일 30분, 그래프 그리기 → 정의역/치역",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "루트 안은 0 이상이어야 해요!"
    },
    middle: {
      title: "y = √(ax+b) + c 형태",
      strategies: [
        "정의역: ax + b ≥ 0 조건에서 결정",
        "시작점 좌표 구하기",
        "그래프의 방향 (a > 0, a < 0)"
      ],
      studyAmount: "주 4-5회, 매일 40분, 정의역/치역 → 그래프",
      books: "개념원리, RPM, 쎈",
      encouragement: "시작점만 찾으면 그래프를 그릴 수 있어요!"
    },
    upper: {
      title: "무리함수 심화",
      strategies: [
        "무리함수와 직선의 교점",
        "무리함수의 역함수",
        "무리방정식, 무리부등식"
      ],
      studyAmount: "주 5-6회, 매일 50분, 교점 → 역함수 → 방정식",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "무리함수는 이차함수와 짝꿍이에요!"
    }
  },
  {
    topic: "지수",
    grade: "대수",
    lower: {
      title: "지수법칙 확장 이해",
      strategies: [
        "중학교 지수법칙 복습 (정수 지수)",
        "a⁰ = 1, a⁻ⁿ = 1/aⁿ 확실히",
        "유리수 지수: a^(m/n) = ⁿ√(aᵐ)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 지수 확장 개념 → 기본 계산",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "분수 지수 = 근호라고 생각하세요!"
    },
    middle: {
      title: "복잡한 지수 계산",
      strategies: [
        "밑을 같게 만들어서 지수 비교",
        "여러 지수법칙이 섞인 계산",
        "지수가 포함된 방정식/부등식 기초"
      ],
      studyAmount: "주 4-5회, 매일 40분, 복합 계산 → 방정식 기초",
      books: "개념원리, RPM, 쎈",
      encouragement: "밑을 통일하면 지수끼리 비교할 수 있어요!"
    },
    upper: {
      title: "지수 심화 문제",
      strategies: [
        "지수 방정식/부등식 심화",
        "2^x + 2^(-x) 형태의 식의 값",
        "지수함수와의 연결"
      ],
      studyAmount: "주 5-6회, 매일 50분, 심화 계산 → 함수 연결",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "지수는 로그와 항상 짝꿍이에요!"
    }
  },
  {
    topic: "로그",
    grade: "대수",
    lower: {
      title: "로그의 정의와 기본 성질",
      strategies: [
        "log_a b = c ⟺ a^c = b 변환 연습",
        "log_a 1 = 0, log_a a = 1 기억",
        "진수 > 0, 밑 > 0이고 ≠ 1 조건"
      ],
      studyAmount: "주 3-4회, 매일 30분, 정의 변환 → 기본 성질",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "지수와 로그는 서로 바꿀 수 있어요!"
    },
    middle: {
      title: "로그 법칙 활용",
      strategies: [
        "log(ab) = log a + log b (곱 → 합)",
        "log(a/b) = log a - log b (나눔 → 차)",
        "log aⁿ = n log a (지수 → 계수)",
        "밑 변환 공식"
      ],
      studyAmount: "주 4-5회, 매일 40분, 법칙 적용 → 복합 계산",
      books: "개념원리, RPM, 쎈",
      encouragement: "곱은 더하고, 나누면 빼요. 지수는 앞으로!"
    },
    upper: {
      title: "로그 심화와 활용",
      strategies: [
        "로그 방정식/부등식",
        "상용로그의 활용 (자릿수, 소수점)",
        "로그함수와의 연결"
      ],
      studyAmount: "주 5-6회, 매일 50분, 방정식 → 활용 → 함수",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "로그는 큰 수를 다루는 도구예요!"
    }
  },
  {
    topic: "지수함수",
    grade: "대수",
    lower: {
      title: "y = aˣ 그래프 기초",
      strategies: [
        "a > 1: 증가함수, 0 < a < 1: 감소함수",
        "항상 점 (0, 1)을 지남",
        "x축이 점근선 (y > 0 항상)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 그래프 그리기 → 성질 정리",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "밑이 1보다 큰지 작은지만 보세요!"
    },
    middle: {
      title: "지수함수의 그래프와 방정식",
      strategies: [
        "지수함수의 평행이동",
        "지수방정식: 밑 통일 → 지수 비교",
        "지수부등식: 밑에 따라 부등호 방향"
      ],
      studyAmount: "주 4-5회, 매일 40분, 그래프 변환 → 방정식/부등식",
      books: "개념원리, RPM, 쎈",
      encouragement: "밑이 1보다 작으면 부등호가 바뀌어요!"
    },
    upper: {
      title: "지수함수 심화",
      strategies: [
        "지수함수의 최대/최소",
        "지수함수와 로그함수의 관계",
        "지수함수를 포함한 복합 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 최대/최소 → 역함수 관계",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "지수와 로그는 역함수 관계예요!"
    }
  },
  {
    topic: "로그함수",
    grade: "대수",
    lower: {
      title: "y = log_a x 그래프 기초",
      strategies: [
        "a > 1: 증가함수, 0 < a < 1: 감소함수",
        "항상 점 (1, 0)을 지남",
        "y축이 점근선 (x > 0만 정의)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 그래프 → 정의역/치역",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "로그함수는 지수함수를 y=x에 대칭!"
    },
    middle: {
      title: "로그함수의 그래프와 방정식",
      strategies: [
        "로그함수의 평행이동",
        "로그방정식: 진수 조건 확인 필수",
        "로그부등식: 밑에 따라 부등호 방향"
      ],
      studyAmount: "주 4-5회, 매일 40분, 그래프 → 방정식/부등식",
      books: "개념원리, RPM, 쎈",
      encouragement: "진수 > 0 조건을 반드시 확인하세요!"
    },
    upper: {
      title: "로그함수 심화",
      strategies: [
        "로그함수의 최대/최소",
        "복잡한 로그방정식/부등식",
        "지수함수와 연립 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 심화 방정식 → 연립 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "로그의 조건을 빠뜨리지 않는 게 핵심!"
    }
  },
  {
    topic: "삼각함수의 뜻",
    grade: "대수",
    lower: {
      title: "호도법과 삼각함수 정의",
      strategies: [
        "180° = π(라디안) 변환",
        "단위원에서 sin, cos, tan 정의",
        "사분면별 삼각함수 부호 (ASTC)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 각도 변환 → 단위원 이해",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "단위원만 이해하면 삼각함수가 쉬워져요!"
    },
    middle: {
      title: "삼각함수 기본 관계와 값",
      strategies: [
        "sin²θ + cos²θ = 1 (절대 암기!)",
        "특수각 (0°, 30°, 45°, 60°, 90°, ...) 값",
        "탄젠트 = 사인/코사인"
      ],
      studyAmount: "주 4-5회, 매일 40분, 공식 암기 → 값 계산",
      books: "개념원리, RPM, 쎈",
      encouragement: "특수각 값은 표로 정리해서 외우세요!"
    },
    upper: {
      title: "삼각함수 심화 계산",
      strategies: [
        "삼각함수 사이의 관계식 활용",
        "조건이 주어진 삼각함수 값 구하기",
        "삼각방정식 기초"
      ],
      studyAmount: "주 5-6회, 매일 50분, 관계식 → 조건 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "조건을 제곱하면 관계식을 쓸 수 있어요!"
    }
  },
  {
    topic: "삼각함수의 그래프",
    grade: "대수",
    lower: {
      title: "y = sin x, y = cos x 그래프",
      strategies: [
        "sin x: (0,0)에서 시작, 물결 모양",
        "cos x: (0,1)에서 시작, 물결 모양",
        "주기 = 2π, 치역 = [-1, 1]"
      ],
      studyAmount: "주 3-4회, 매일 30분, 그래프 직접 그리기 연습",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "sin은 0에서, cos는 1에서 시작!"
    },
    middle: {
      title: "주기와 진폭",
      strategies: [
        "y = a sin(bx + c) + d 해석",
        "진폭 = |a|, 주기 = 2π/|b|",
        "그래프의 평행이동"
      ],
      studyAmount: "주 4-5회, 매일 40분, 계수 해석 → 그래프 그리기",
      books: "개념원리, RPM, 쎈",
      encouragement: "주기 = 2π를 b로 나눈 거예요!"
    },
    upper: {
      title: "삼각함수 그래프 심화",
      strategies: [
        "삼각함수의 최대/최소",
        "삼각방정식/부등식의 그래프 해석",
        "삼각함수의 대칭성 활용"
      ],
      studyAmount: "주 5-6회, 매일 50분, 최대/최소 → 방정식/부등식",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "그래프를 그리면 방정식도 쉬워져요!"
    }
  },
  {
    topic: "삼각함수의 활용",
    grade: "대수",
    lower: {
      title: "사인법칙, 코사인법칙 기초",
      strategies: [
        "사인법칙: a/sin A = b/sin B = c/sin C = 2R",
        "코사인법칙: a² = b² + c² - 2bc cos A",
        "어떤 법칙을 쓸지 조건 보고 선택"
      ],
      studyAmount: "주 3-4회, 매일 30분, 공식 암기 → 기본 적용",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "두 법칙만 알면 삼각형은 다 풀 수 있어요!"
    },
    middle: {
      title: "삼각형 넓이와 활용",
      strategies: [
        "S = (1/2) ab sin C",
        "삼각형 넓이 다양한 공식 정리",
        "외접원/내접원 관련 문제"
      ],
      studyAmount: "주 4-5회, 매일 40분, 넓이 공식 → 활용 문제",
      books: "개념원리, RPM, 쎈",
      encouragement: "넓이 공식이 가장 많이 쓰여요!"
    },
    upper: {
      title: "삼각함수 활용 심화",
      strategies: [
        "복잡한 삼각형 문제",
        "삼각함수와 도형의 융합",
        "삼각형의 결정 조건"
      ],
      studyAmount: "주 5-6회, 매일 50분, 심화 도형 → 종합 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "삼각함수는 기하의 강력한 도구예요!"
    }
  },
  {
    topic: "등차수열",
    grade: "대수",
    lower: {
      title: "일반항과 합 공식 기초",
      strategies: [
        "aₙ = a₁ + (n-1)d (n번째 항)",
        "Sₙ = n(a₁ + aₙ)/2 (합)",
        "등차중항: b = (a+c)/2"
      ],
      studyAmount: "주 3-4회, 매일 30분, 공식 암기 → 기본 계산",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "공차 d를 (n-1)번 더해요!"
    },
    middle: {
      title: "수열 문제 해결",
      strategies: [
        "조건에서 a₁, d 구하기",
        "Sₙ과 aₙ의 관계: aₙ = Sₙ - Sₙ₋₁",
        "등차수열 활용 문제"
      ],
      studyAmount: "주 4-5회, 매일 40분, 조건 문제 → 합과 일반항",
      books: "개념원리, RPM, 쎈",
      encouragement: "a₁과 d만 찾으면 모든 항을 알 수 있어요!"
    },
    upper: {
      title: "등차수열 심화",
      strategies: [
        "등차수열의 성질 증명",
        "여러 조건이 주어진 문제",
        "등비수열과의 연결"
      ],
      studyAmount: "주 5-6회, 매일 50분, 증명 → 복합 조건 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "수열의 성질을 이해하면 응용이 쉬워요!"
    }
  },
  {
    topic: "등비수열",
    grade: "대수",
    lower: {
      title: "일반항과 합 공식 기초",
      strategies: [
        "aₙ = a₁ × r^(n-1) (n번째 항)",
        "Sₙ = a₁(rⁿ-1)/(r-1) (r≠1일 때)",
        "등비중항: b² = ac"
      ],
      studyAmount: "주 3-4회, 매일 30분, 공식 암기 → 기본 계산",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "공비를 (n-1)번 곱해요!"
    },
    middle: {
      title: "등비수열 문제 해결",
      strategies: [
        "조건에서 a₁, r 구하기",
        "r = 1인 경우 주의",
        "등비수열 활용 문제"
      ],
      studyAmount: "주 4-5회, 매일 40분, 조건 문제 → 합과 일반항",
      books: "개념원리, RPM, 쎈",
      encouragement: "r = 1이면 등차수열이 돼요!"
    },
    upper: {
      title: "등비수열 심화",
      strategies: [
        "등비급수와 수렴 조건 (|r| < 1)",
        "등비수열의 성질 증명",
        "등차+등비 복합 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 급수 → 복합 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "등비급수는 미적분의 급수와 연결돼요!"
    }
  },
  {
    topic: "수열의 합",
    grade: "대수",
    lower: {
      title: "Σ(시그마) 기호 이해",
      strategies: [
        "Σk=1~n aₖ의 의미: a₁+a₂+...+aₙ",
        "Σ의 기본 성질: Σ(a+b) = Σa + Σb",
        "Σc = cn (상수의 합)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 시그마 기호 → 전개/계산",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "시그마는 합을 나타내는 기호예요!"
    },
    middle: {
      title: "시그마 공식 활용",
      strategies: [
        "Σk = n(n+1)/2",
        "Σk² = n(n+1)(2n+1)/6",
        "Σk³ = {n(n+1)/2}²"
      ],
      studyAmount: "주 4-5회, 매일 40분, 공식 암기 → 복합 계산",
      books: "개념원리, RPM, 쎈",
      encouragement: "세 공식만 외우면 대부분 풀 수 있어요!"
    },
    upper: {
      title: "수열의 합 심화",
      strategies: [
        "부분분수 분해",
        "군수열, 계차수열",
        "점화식과 연결"
      ],
      studyAmount: "주 5-6회, 매일 50분, 부분분수 → 특수 수열",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "부분분수는 소거되는 걸 찾는 게 핵심!"
    }
  },
  {
    topic: "수학적 귀납법",
    grade: "대수",
    lower: {
      title: "귀납법의 구조 이해",
      strategies: [
        "1단계: n=1일 때 성립 확인",
        "2단계: n=k일 때 성립 가정 → n=k+1 증명",
        "두 단계 모두 필요"
      ],
      studyAmount: "주 3-4회, 매일 30분, 간단한 공식 증명 연습",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "도미노처럼 하나가 넘어지면 다 넘어져요!"
    },
    middle: {
      title: "귀납법 증명 완성",
      strategies: [
        "n=k 가정을 반드시 사용해야 함",
        "다양한 등식 증명 연습",
        "부등식 증명"
      ],
      studyAmount: "주 4-5회, 매일 40분, 등식 증명 → 부등식 증명",
      books: "개념원리, RPM, 쎈",
      encouragement: "가정을 이용하는 부분이 핵심이에요!"
    },
    upper: {
      title: "귀납법 심화",
      strategies: [
        "복잡한 부등식 증명",
        "점화식과 귀납법",
        "귀납법의 다양한 변형"
      ],
      studyAmount: "주 5-6회, 매일 50분, 심화 증명 → 변형 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "귀납법은 수학에서 가장 아름다운 증명 방법 중 하나예요!"
    }
  },
  {
    topic: "함수의 극한",
    grade: "미적분Ⅰ",
    lower: {
      title: "극한의 개념 이해",
      strategies: [
        "lim(x→a) f(x) = L의 의미",
        "좌극한, 우극한이 같아야 극한 존재",
        "함수값 f(a)와 극한값은 다를 수 있음"
      ],
      studyAmount: "주 3-4회, 매일 30분, 그래프로 극한 이해",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "x가 a에 가까이 갈 때 y가 어디로 가는지 보세요!"
    },
    middle: {
      title: "부정형 극한 해결",
      strategies: [
        "0/0 꼴: 인수분해 후 약분",
        "∞/∞ 꼴: 최고차항으로 나눔",
        "∞-∞ 꼴: 유리화 또는 통분"
      ],
      studyAmount: "주 4-5회, 매일 40분, 부정형 유형별 연습",
      books: "개념원리, RPM, 쎈",
      encouragement: "0/0이면 약분할 게 있다는 뜻이에요!"
    },
    upper: {
      title: "극한 심화",
      strategies: [
        "샌드위치 정리",
        "복잡한 극한값 계산",
        "미정계수가 있는 극한"
      ],
      studyAmount: "주 5-6회, 매일 50분, 심화 계산 → 조건 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "극한은 미분의 정의 그 자체예요!"
    }
  },
  {
    topic: "함수의 연속",
    grade: "미적분Ⅰ",
    lower: {
      title: "연속의 정의 이해",
      strategies: [
        "연속의 3조건: ①f(a) 정의 ②극한 존재 ③f(a)=극한값",
        "그래프가 끊어지지 않으면 연속",
        "연속이 아닌 점의 종류 (불연속점)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 그래프로 연속/불연속 판별",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "끊어지지 않으면 연속이에요!"
    },
    middle: {
      title: "연속 조건 활용",
      strategies: [
        "연속이 되도록 미정계수 결정",
        "구간에서의 연속",
        "연속함수의 성질"
      ],
      studyAmount: "주 4-5회, 매일 40분, 미정계수 결정 문제",
      books: "개념원리, RPM, 쎈",
      encouragement: "세 조건 중 어떤 게 안 맞는지 찾으세요!"
    },
    upper: {
      title: "연속 심화와 사잇값 정리",
      strategies: [
        "최대·최소 정리, 사잇값 정리",
        "방정식의 실근 존재 증명",
        "미분가능성과 연속의 관계"
      ],
      studyAmount: "주 5-6회, 매일 50분, 정리 활용 → 증명 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "연속이면 사잇값 정리를 쓸 수 있어요!"
    }
  },
  {
    topic: "미분계수와 도함수",
    grade: "미적분Ⅰ",
    lower: {
      title: "미분계수의 정의",
      strategies: [
        "f'(a) = lim(h→0) {f(a+h)-f(a)}/h",
        "미분계수 = 접선의 기울기 = 순간변화율",
        "미분가능 → 연속 (역은 성립 안 함)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 정의로 미분계수 계산",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "미분계수는 그 점에서의 기울기예요!"
    },
    middle: {
      title: "도함수와 미분 공식",
      strategies: [
        "(xⁿ)' = nxⁿ⁻¹",
        "{cf(x)}' = cf'(x), {f+g}' = f'+g'",
        "곱의 미분, 몫의 미분"
      ],
      studyAmount: "주 4-5회, 매일 40분, 미분 공식 → 복합 계산",
      books: "개념원리, RPM, 쎈",
      encouragement: "공식만 외우면 미분은 기계적으로 할 수 있어요!"
    },
    upper: {
      title: "미분 심화",
      strategies: [
        "복잡한 함수의 미분",
        "미분가능성 조건 판별",
        "접선의 방정식 심화"
      ],
      studyAmount: "주 5-6회, 매일 50분, 복잡한 미분 → 접선 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "미분은 함수를 분석하는 최고의 도구예요!"
    }
  },
  {
    topic: "도함수의 활용",
    grade: "미적분Ⅰ",
    lower: {
      title: "접선의 방정식",
      strategies: [
        "점 (a, f(a))에서 접선: y - f(a) = f'(a)(x - a)",
        "접선의 기울기 = f'(a)",
        "함수값과 미분계수 구분하기"
      ],
      studyAmount: "주 3-4회, 매일 30분, 접선의 방정식 기본 문제",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "기울기가 f'(a)라는 것만 기억하세요!"
    },
    middle: {
      title: "극대/극소와 그래프",
      strategies: [
        "f'(x) = 0인 점이 극값 후보",
        "f'(x)의 부호 변화로 극대/극소 판정",
        "함수의 증가/감소 구간"
      ],
      studyAmount: "주 4-5회, 매일 40분, 극값 판정 → 그래프 그리기",
      books: "개념원리, RPM, 쎈",
      encouragement: "f'의 부호가 바뀌는 곳이 극값!"
    },
    upper: {
      title: "도함수 활용 심화",
      strategies: [
        "최대/최소 문제 (닫힌 구간)",
        "방정식의 실근 개수",
        "속도/가속도 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 최적화 → 실근 개수",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "미분은 최적의 값을 찾는 도구예요!"
    }
  },
  {
    topic: "부정적분",
    grade: "미적분Ⅰ",
    lower: {
      title: "적분의 개념과 기본 공식",
      strategies: [
        "∫xⁿdx = xⁿ⁺¹/(n+1) + C",
        "부정적분 = 미분의 역연산",
        "+C (적분상수) 절대 잊지 않기"
      ],
      studyAmount: "주 3-4회, 매일 30분, 기본 적분 공식 연습",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "미분을 거꾸로 하면 적분이에요!"
    },
    middle: {
      title: "다양한 함수의 부정적분",
      strategies: [
        "다항함수의 적분",
        "합/차/상수배의 적분",
        "초기조건으로 C 결정"
      ],
      studyAmount: "주 4-5회, 매일 40분, 복합 적분 → 초기조건 문제",
      books: "개념원리, RPM, 쎈",
      encouragement: "적분하고 미분해서 맞는지 확인해보세요!"
    },
    upper: {
      title: "부정적분 심화",
      strategies: [
        "f'(x)를 알 때 f(x) 구하기",
        "미분과 적분의 관계 활용",
        "복잡한 조건 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 조건 문제 → 역추적",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "적분은 미분의 역과정임을 항상 기억하세요!"
    }
  },
  {
    topic: "정적분",
    grade: "미적분Ⅰ",
    lower: {
      title: "정적분 계산 기초",
      strategies: [
        "∫[a,b] f(x)dx = F(b) - F(a)",
        "위끝에서 아래끝을 빼기",
        "적분 구간 바꾸면 부호 반대"
      ],
      studyAmount: "주 3-4회, 매일 30분, 정적분 기본 계산 반복",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "위에서 아래를 빼면 돼요!"
    },
    middle: {
      title: "정적분의 성질 활용",
      strategies: [
        "기함수의 대칭 적분 = 0",
        "우함수의 대칭 적분 = 2배",
        "구간 나누기"
      ],
      studyAmount: "주 4-5회, 매일 40분, 대칭성 → 구간 분할",
      books: "개념원리, RPM, 쎈",
      encouragement: "대칭성을 활용하면 계산이 빨라져요!"
    },
    upper: {
      title: "정적분 심화",
      strategies: [
        "정적분으로 정의된 함수",
        "∫[a,x] f(t)dt의 미분",
        "복잡한 정적분 계산"
      ],
      studyAmount: "주 5-6회, 매일 50분, 정의된 함수 → 미분 연결",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "정적분을 미분하면 피적분함수가 나와요!"
    }
  },
  {
    topic: "정적분의 활용",
    grade: "미적분Ⅰ",
    lower: {
      title: "넓이 기본 공식",
      strategies: [
        "곡선과 x축 사이 넓이 = ∫|f(x)|dx",
        "x축 아래 부분은 음수 → 절댓값 또는 부호 처리",
        "구간을 나누어 계산"
      ],
      studyAmount: "주 3-4회, 매일 30분, 기본 넓이 문제 반복",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "x축 아래면 음수가 되니까 절댓값!"
    },
    middle: {
      title: "두 곡선 사이 넓이",
      strategies: [
        "넓이 = ∫[a,b] |f(x)-g(x)|dx",
        "위 함수에서 아래 함수 빼기",
        "교점 찾아서 구간 나누기"
      ],
      studyAmount: "주 4-5회, 매일 40분, 두 곡선 → 교점 찾기 → 넓이",
      books: "개념원리, RPM, 쎈",
      encouragement: "먼저 교점을 찾고 어느 게 위인지 확인하세요!"
    },
    upper: {
      title: "정적분 활용 심화",
      strategies: [
        "복잡한 영역의 넓이",
        "적분과 미분의 종합 활용",
        "속도와 거리 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 복합 넓이 → 속도/거리",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "적분은 '합'을 구하는 거예요!"
    }
  },
  {
    topic: "순열과 조합(심화)",
    grade: "확률과 통계",
    lower: {
      title: "순열/조합 공식 복습",
      strategies: [
        "순열 ₙPᵣ = n!/(n-r)!",
        "조합 ₙCᵣ = n!/r!(n-r)!",
        "순서 있으면 순열, 없으면 조합"
      ],
      studyAmount: "주 3-4회, 매일 30분, 공식 → 기본 문제 반복",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "순서가 중요한지 아닌지만 판단하세요!"
    },
    middle: {
      title: "중복순열, 중복조합",
      strategies: [
        "중복순열: ₙΠᵣ = nʳ",
        "중복조합: ₙHᵣ = ₙ₊ᵣ₋₁Cᵣ",
        "같은 것이 있는 순열"
      ],
      studyAmount: "주 4-5회, 매일 40분, 유형별 구분 → 복합 문제",
      books: "개념원리, RPM, 쎈",
      encouragement: "중복조합의 H 공식을 꼭 외우세요!"
    },
    upper: {
      title: "조합 심화와 이항정리",
      strategies: [
        "이항정리: (a+b)ⁿ의 전개",
        "일반항: ₙCᵣ aⁿ⁻ʳbʳ",
        "이항계수의 성질"
      ],
      studyAmount: "주 5-6회, 매일 50분, 이항정리 → 계수 찾기",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "이항정리는 조합의 꽃이에요!"
    }
  },
  {
    topic: "확률",
    grade: "확률과 통계",
    lower: {
      title: "확률의 기본 계산",
      strategies: [
        "확률 = 해당 경우의 수 / 전체 경우의 수",
        "0 ≤ P(A) ≤ 1",
        "여사건: P(Aᶜ) = 1 - P(A)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 기본 확률 계산 반복",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "경우의 수를 잘 세면 확률은 쉬워요!"
    },
    middle: {
      title: "덧셈/곱셈 정리",
      strategies: [
        "P(A∪B) = P(A) + P(B) - P(A∩B)",
        "독립이면 P(A∩B) = P(A)×P(B)",
        "\"적어도\" 문제 → 여사건 활용"
      ],
      studyAmount: "주 4-5회, 매일 40분, 덧셈/곱셈 정리 → 여사건",
      books: "개념원리, RPM, 쎈",
      encouragement: "적어도 문제는 1에서 빼세요!"
    },
    upper: {
      title: "확률 심화",
      strategies: [
        "복잡한 확률 계산",
        "확률의 곱셈정리 심화",
        "다단계 확률 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 복합 확률 → 다단계 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "확률은 경우를 나누어 생각하면 쉬워요!"
    }
  },
  {
    topic: "조건부확률",
    grade: "확률과 통계",
    lower: {
      title: "조건부확률 정의",
      strategies: [
        "P(B|A) = P(A∩B)/P(A)",
        "\"A가 주어졌을 때 B의 확률\"",
        "분모에 조건이 오는 것 기억"
      ],
      studyAmount: "주 3-4회, 매일 30분, 정의 → 기본 계산",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "조건이 분모에 들어가요!"
    },
    middle: {
      title: "확률의 곱셈정리와 독립",
      strategies: [
        "P(A∩B) = P(A)×P(B|A)",
        "독립: P(B|A) = P(B)",
        "독립 ≠ 배반 (완전 다른 개념!)"
      ],
      studyAmount: "주 4-5회, 매일 40분, 곱셈정리 → 독립 판정",
      books: "개념원리, RPM, 쎈",
      encouragement: "독립과 배반은 다른 거예요!"
    },
    upper: {
      title: "조건부확률 심화",
      strategies: [
        "베이즈 정리",
        "원인의 확률",
        "복잡한 조건부확률"
      ],
      studyAmount: "주 5-6회, 매일 50분, 베이즈 → 역방향 확률",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "베이즈 정리는 원인을 추론하는 거예요!"
    }
  },
  {
    topic: "확률분포",
    grade: "확률과 통계",
    lower: {
      title: "확률변수와 기댓값",
      strategies: [
        "이산확률변수의 정의",
        "확률분포표 작성",
        "E(X) = Σxᵢpᵢ (기댓값)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 분포표 → 기댓값 계산",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "기댓값은 평균이에요!"
    },
    middle: {
      title: "분산과 표준편차",
      strategies: [
        "V(X) = E(X²) - {E(X)}²",
        "σ(X) = √V(X)",
        "E(aX+b) = aE(X)+b, V(aX+b) = a²V(X)"
      ],
      studyAmount: "주 4-5회, 매일 40분, 분산 공식 → 성질 활용",
      books: "개념원리, RPM, 쎈",
      encouragement: "E는 그대로, V는 제곱!"
    },
    upper: {
      title: "이항분포",
      strategies: [
        "B(n,p)의 확률 공식",
        "E(X) = np, V(X) = np(1-p)",
        "이항분포 활용 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 이항분포 → 정규분포 연결",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "이항분포는 확률분포의 대표 선수!"
    }
  },
  {
    topic: "정규분포",
    grade: "확률과 통계",
    lower: {
      title: "정규분포의 특징",
      strategies: [
        "평균 중심으로 좌우대칭 종 모양",
        "N(μ, σ²)으로 표기",
        "표준정규분포 N(0, 1)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 그래프 이해 → 기본 성질",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "정규분포는 종 모양이에요!"
    },
    middle: {
      title: "표준화와 확률 계산",
      strategies: [
        "Z = (X-μ)/σ로 표준화",
        "표준정규분포표 읽는 법",
        "P(a ≤ X ≤ b) 계산"
      ],
      studyAmount: "주 4-5회, 매일 40분, 표준화 → 확률 계산",
      books: "개념원리, RPM, 쎈",
      encouragement: "표준화하면 표를 볼 수 있어요!"
    },
    upper: {
      title: "정규분포 활용",
      strategies: [
        "이항분포의 정규분포 근사",
        "역방향 문제 (확률 → 값)",
        "복합 정규분포 문제"
      ],
      studyAmount: "주 5-6회, 매일 50분, 근사 → 역방향 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "정규분포는 통계의 핵심이에요!"
    }
  },
  {
    topic: "통계적 추정",
    grade: "확률과 통계",
    lower: {
      title: "모집단과 표본",
      strategies: [
        "모집단, 표본, 모평균, 표본평균 구분",
        "표본추출 방법",
        "표본평균의 성질"
      ],
      studyAmount: "주 3-4회, 매일 30분, 용어 정리 → 기본 개념",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "모집단은 전체, 표본은 일부예요!"
    },
    middle: {
      title: "표본평균의 분포",
      strategies: [
        "E(X̄) = μ, V(X̄) = σ²/n",
        "표본평균의 정규분포",
        "중심극한정리"
      ],
      studyAmount: "주 4-5회, 매일 40분, 분포 → 중심극한정리",
      books: "개념원리, RPM, 쎈",
      encouragement: "n이 커지면 정규분포에 가까워져요!"
    },
    upper: {
      title: "모평균 추정과 신뢰구간",
      strategies: [
        "신뢰구간: x̄ ± z×σ/√n",
        "95% → z=1.96, 99% → z=2.58",
        "n이 커지면 신뢰구간이 좁아짐"
      ],
      studyAmount: "주 5-6회, 매일 50분, 신뢰구간 → 응용 문제",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "신뢰구간은 '믿을 수 있는 범위'예요!"
    }
  },
  {
    topic: "수열의 극한",
    grade: "미적분Ⅱ",
    lower: {
      title: "수열의 수렴/발산",
      strategies: [
        "수렴: 특정 값에 가까이 감",
        "발산: 무한대로 감 또는 진동",
        "등비수열의 극한 조건"
      ],
      studyAmount: "주 3-4회, 매일 30분, 수렴/발산 판별 연습",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "|r| < 1이면 수렴해요!"
    },
    middle: {
      title: "수열 극한 계산",
      strategies: [
        "∞/∞ 꼴: 최고차항으로 나눔",
        "극한의 기본 성질 활용",
        "샌드위치 정리"
      ],
      studyAmount: "주 4-5회, 매일 40분, 부정형 계산 → 정리 활용",
      books: "개념원리, RPM, 쎈",
      encouragement: "최고차항만 보면 돼요!"
    },
    upper: {
      title: "수열 극한 심화",
      strategies: [
        "점화식과 극한",
        "복잡한 수열의 극한",
        "급수와의 연결"
      ],
      studyAmount: "주 5-6회, 매일 50분, 점화식 → 급수 연결",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "수열의 극한이 급수의 기초예요!"
    }
  },
  {
    topic: "급수",
    grade: "미적분Ⅱ",
    lower: {
      title: "급수의 수렴/발산",
      strategies: [
        "Σaₙ의 의미: a₁+a₂+... 무한 합",
        "lim aₙ ≠ 0이면 발산",
        "등비급수: |r| < 1일 때 수렴"
      ],
      studyAmount: "주 3-4회, 매일 30분, 수렴 조건 → 기본 급수",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "일반항이 0으로 안 가면 발산!"
    },
    middle: {
      title: "등비급수 계산",
      strategies: [
        "Σarⁿ⁻¹ = a/(1-r) (|r| < 1)",
        "부분합 Sₙ의 극한",
        "급수의 성질"
      ],
      studyAmount: "주 4-5회, 매일 40분, 등비급수 공식 → 활용",
      books: "개념원리, RPM, 쎈",
      encouragement: "등비급수 공식만 외우면 돼요!"
    },
    upper: {
      title: "급수 심화",
      strategies: [
        "여러 가지 급수의 합",
        "부분분수 분해를 이용한 급수",
        "급수와 함수의 연결"
      ],
      studyAmount: "주 5-6회, 매일 50분, 다양한 급수 → 정적분 연결",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "급수는 적분의 이산 버전이에요!"
    }
  },
  {
    topic: "여러 가지 함수의 미분",
    grade: "미적분Ⅱ",
    lower: {
      title: "지수/로그함수 미분",
      strategies: [
        "(eˣ)' = eˣ",
        "(aˣ)' = aˣ ln a",
        "(ln x)' = 1/x"
      ],
      studyAmount: "주 3-4회, 매일 30분, 공식 암기 → 기본 적용",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "e^x는 미분해도 자기 자신!"
    },
    middle: {
      title: "삼각함수 미분",
      strategies: [
        "(sin x)' = cos x",
        "(cos x)' = -sin x (마이너스!)",
        "(tan x)' = sec²x"
      ],
      studyAmount: "주 4-5회, 매일 40분, 삼각함수 미분 → 복합 적용",
      books: "개념원리, RPM, 쎈",
      encouragement: "cos 미분할 때 마이너스 조심!"
    },
    upper: {
      title: "여러 가지 미분법",
      strategies: [
        "합성함수 미분 (연쇄법칙)",
        "음함수 미분",
        "매개변수 미분"
      ],
      studyAmount: "주 5-6회, 매일 50분, 연쇄법칙 → 음함수/매개변수",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "겉미분 × 속미분이 연쇄법칙!"
    }
  },
  {
    topic: "여러 가지 적분법",
    grade: "미적분Ⅱ",
    lower: {
      title: "기본 적분 공식",
      strategies: [
        "∫eˣdx = eˣ + C",
        "∫(1/x)dx = ln|x| + C",
        "∫sin x dx = -cos x + C"
      ],
      studyAmount: "주 3-4회, 매일 30분, 적분 공식 암기 → 기본 계산",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "미분의 역과정을 생각하세요!"
    },
    middle: {
      title: "치환적분",
      strategies: [
        "u = g(x)로 놓고 du = g'(x)dx",
        "적분 후 원래 변수로 복원",
        "정적분에서 적분 구간도 바꿈"
      ],
      studyAmount: "주 4-5회, 매일 40분, 치환 연습 → 구간 변환",
      books: "개념원리, RPM, 쎈",
      encouragement: "치환하면 복잡한 적분도 간단해져요!"
    },
    upper: {
      title: "부분적분",
      strategies: [
        "∫fg'dx = fg - ∫f'g dx",
        "LIATE 규칙으로 f 선택",
        "반복 부분적분"
      ],
      studyAmount: "주 5-6회, 매일 50분, 부분적분 → 복합 적분",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "로다삼지: 로그-다항-삼각-지수 순서!"
    }
  },
  {
    topic: "정적분의 활용(심화)",
    grade: "미적분Ⅱ",
    lower: {
      title: "넓이 심화",
      strategies: [
        "절댓값 적분 = 구간 나누기",
        "매개변수로 표현된 곡선의 넓이",
        "극좌표 기초"
      ],
      studyAmount: "주 3-4회, 매일 30분, 절댓값 적분 → 매개변수",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "음수 구간은 부호를 바꿔서 더해요!"
    },
    middle: {
      title: "회전체의 부피",
      strategies: [
        "x축 회전: V = π∫[f(x)]²dx",
        "y축 회전: 셸 방법 또는 치환",
        "π를 빠뜨리지 않기!"
      ],
      studyAmount: "주 4-5회, 매일 40분, x축 회전 → y축 회전",
      books: "개념원리, RPM, 쎈",
      encouragement: "부피에는 π가 꼭 붙어요!"
    },
    upper: {
      title: "적분 활용 심화",
      strategies: [
        "곡선의 길이",
        "복잡한 회전체",
        "정적분으로 정의된 함수의 미분"
      ],
      studyAmount: "주 5-6회, 매일 50분, 곡선의 길이 → 정적분 함수",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "정적분을 미분하면 피적분함수!"
    }
  },
  {
    topic: "이차곡선",
    grade: "기하",
    lower: {
      title: "포물선, 타원, 쌍곡선 정의",
      strategies: [
        "포물선: 초점과 준선까지 거리 같음",
        "타원: 두 초점까지 거리의 합 = 2a",
        "쌍곡선: 두 초점까지 거리의 차 = 2a"
      ],
      studyAmount: "주 3-4회, 매일 30분, 정의 → 표준형 방정식",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "정의만 알면 방정식이 나와요!"
    },
    middle: {
      title: "표준형과 요소 찾기",
      strategies: [
        "타원: c² = a² - b²",
        "쌍곡선: c² = a² + b² (타원과 반대!)",
        "초점, 꼭짓점, 점근선 구하기"
      ],
      studyAmount: "주 4-5회, 매일 40분, 요소 찾기 → 그래프 그리기",
      books: "개념원리, RPM, 쎈",
      encouragement: "타원은 빼고, 쌍곡선은 더해요!"
    },
    upper: {
      title: "이차곡선 심화",
      strategies: [
        "이차곡선과 직선의 관계",
        "접선의 방정식",
        "이차곡선의 성질 활용"
      ],
      studyAmount: "주 5-6회, 매일 50분, 직선과의 관계 → 접선",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "이차곡선은 기하의 꽃이에요!"
    }
  },
  {
    topic: "평면벡터",
    grade: "기하",
    lower: {
      title: "벡터의 기본 연산",
      strategies: [
        "벡터의 덧셈, 뺄셈, 실수배",
        "벡터의 성분 표현: (a, b)",
        "벡터의 크기: √(a²+b²)"
      ],
      studyAmount: "주 3-4회, 매일 30분, 연산 → 성분 표현",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "벡터는 크기와 방향을 가진 화살표!"
    },
    middle: {
      title: "벡터의 내적",
      strategies: [
        "a⃗·b⃗ = |a⃗||b⃗|cos θ",
        "a⃗·b⃗ = a₁b₁ + a₂b₂",
        "내적 = 0 ⟺ 수직"
      ],
      studyAmount: "주 4-5회, 매일 40분, 내적 정의 → 수직 조건",
      books: "개념원리, RPM, 쎈",
      encouragement: "내적이 0이면 수직이에요!"
    },
    upper: {
      title: "벡터 심화",
      strategies: [
        "직선의 벡터방정식",
        "벡터를 이용한 도형 문제",
        "정사영"
      ],
      studyAmount: "주 5-6회, 매일 50분, 벡터방정식 → 도형 활용",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "벡터로 기하 문제를 깔끔하게 풀 수 있어요!"
    }
  },
  {
    topic: "공간도형과 공간좌표",
    grade: "기하",
    lower: {
      title: "공간좌표 기초",
      strategies: [
        "공간에서의 점 (x, y, z)",
        "두 점 사이 거리 공식",
        "구의 방정식 기본"
      ],
      studyAmount: "주 3-4회, 매일 30분, 좌표 → 거리 → 구",
      books: "개념원리 기본편, 베이직쎈",
      encouragement: "평면에 z축만 추가한 거예요!"
    },
    middle: {
      title: "공간벡터와 내적",
      strategies: [
        "공간벡터의 성분: (a, b, c)",
        "내적: a⃗·b⃗ = a₁b₁ + a₂b₂ + a₃b₃",
        "공간에서의 수직, 평행 조건"
      ],
      studyAmount: "주 4-5회, 매일 40분, 공간벡터 → 내적 활용",
      books: "개념원리, RPM, 쎈",
      encouragement: "평면벡터에 성분 하나만 추가!"
    },
    upper: {
      title: "공간기하 심화",
      strategies: [
        "직선과 평면의 방정식",
        "점과 평면 사이 거리",
        "정사영"
      ],
      studyAmount: "주 5-6회, 매일 50분, 평면 방정식 → 거리 → 정사영",
      books: "블랙라벨, 최고수준, 일품",
      encouragement: "공간기하는 대학 수학의 기초예요!"
    }
  }
];

/**
 * Look up topic-level strategies by topic name (substring match)
 */
export function findTopicStrategies(topicName: string): TopicStrategies | undefined {
  // Exact match first
  const exact = TOPIC_LEVEL_STRATEGIES.find(t => t.topic === topicName);
  if (exact) return exact;

  // Substring match
  return TOPIC_LEVEL_STRATEGIES.find(t =>
    topicName.includes(t.topic) || t.topic.includes(topicName)
  );
}

/**
 * Find multiple matching topics
 */
export function findMultipleTopicStrategies(topicNames: string[]): TopicStrategies[] {
  const results: TopicStrategies[] = [];
  for (const name of topicNames) {
    const found = findTopicStrategies(name);
    if (found && !results.includes(found)) {
      results.push(found);
    }
  }
  return results;
}
