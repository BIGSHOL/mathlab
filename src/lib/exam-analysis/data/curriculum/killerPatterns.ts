/**
 * 킬러 문항 유형 데이터 + 매칭 함수
 *
 * curriculumStrategies.ts에서 분리됨 (2026-04-29).
 * 인터페이스 정의는 본 파일이 진실의 원천 — types.ts의 동일 이름 정의는
 * 다른 형태(stale)였으므로 제거됨.
 *
 * isTopicMatch는 자체 정의 유지 (utils.ts와 다른 보수적 매칭 — 조사 검사 포함).
 * gradeConnections.ts와 동일 로직.
 */

/** 단원명 보수적 매칭 (조사 검사 포함) — 원본 12K 파일과 동일 */
function isTopicMatch(topic: string, target: string): boolean {
  const tLower = topic.toLowerCase().trim();
  const gLower = target.toLowerCase().trim();
  if (tLower === gLower) return true;
  if (gLower.length <= 2) {
    const idx = tLower.indexOf(gLower);
    if (idx === -1) return false;
    if (idx !== 0 && tLower[idx - 1] !== ' ') return false;
    const afterIdx = idx + gLower.length;
    if (afterIdx >= tLower.length) return true;
    const nextChar = tLower[afterIdx];
    return ['의', '와', '과', '에', ' ', '·', ',', '('].includes(nextChar);
  }
  const idx = tLower.indexOf(gLower);
  if (idx === -1) return false;
  const afterIdx = idx + gLower.length;
  if (afterIdx >= tLower.length) return true;
  const nextChar = tLower[afterIdx];
  if ([' ', '>', '·', ',', '(', ')'].includes(nextChar)) return true;
  return false;
}

export interface KillerPattern {
  pattern: string;
  difficulty: '상' | '최상';
  frequency: '자주출제' | '가끔출제';
  trapDescription: string;
  solutionKey: string[];
  exampleSetup: string;
}

export interface KillerQuestionType {
  unit: string;
  grade?: '중등' | '고등';
  keywords: string[];
  killerPatterns: KillerPattern[];
}

export const KILLER_QUESTION_TYPES: KillerQuestionType[] = [
  {
    unit: '소인수분해',
    keywords: ['소인수분해'],
    killerPatterns: [
      {
        pattern: '약수의 개수 조건 역추적',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '약수의 개수가 주어지고 원래 수를 찾는 역방향 문제',
        solutionKey: [
          '약수 개수 = (지수+1)들의 곱을 역이용',
          '여러 가지 경우의 수 고려 (예: 12 = 12, 6×2, 4×3, 3×2×2)',
          '가장 작은 자연수를 찾을 때는 작은 소수에 큰 지수 배치',
        ],
        exampleSetup: '약수의 개수가 12개인 가장 작은 자연수는?',
      },
      {
        pattern: '최대공약수/최소공배수 조건 문제',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '두 수의 최대공약수와 최소공배수가 주어지고 두 수를 찾는 문제',
        solutionKey: [
          '(최대공약수) × (최소공배수) = 두 수의 곱',
          '두 수를 최대공약수로 나눈 몫은 서로소',
          '조건을 만족하는 모든 쌍 찾기',
        ],
        exampleSetup: '최대공약수가 6, 최소공배수가 72인 두 자연수의 순서쌍은?',
      },
    ],
  },
  {
    unit: '일차방정식의 풀이',
    keywords: ['일차방정식의 풀이', '등식의 성질', '일차방정식'],
    killerPatterns: [
      {
        pattern: '계수에 문자가 포함된 방정식',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'ax = b 형태에서 a = 0인 경우를 놓침',
        solutionKey: [
          'a ≠ 0이면 x = b/a',
          'a = 0, b = 0이면 해가 무수히 많음',
          'a = 0, b ≠ 0이면 해가 없음',
        ],
        exampleSetup: '(k-2)x = k + 4가 해가 없으려면 k의 값은?',
      },
    ],
  },
  {
    unit: '일차방정식의 활용',
    keywords: ['일차방정식의 활용', '방정식 활용', '방정식 문장제'],
    killerPatterns: [
      {
        pattern: '활용 문제의 조건 검증',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '구한 해가 문제 상황에서 불가능한 경우',
        solutionKey: [
          '나이, 개수 등은 자연수 조건',
          '거리, 속력, 시간은 양수 조건',
          '문제의 맥락에서 답의 타당성 검토',
        ],
        exampleSetup: '연속하는 세 자연수의 합이 24일 때, 세 수를 구하시오.',
      },
    ],
  },
  {
    unit: '정비례',
    keywords: ['정비례', '반비례', '비례 관계'],
    killerPatterns: [
      {
        pattern: '비례상수 부호와 그래프',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '비례상수 a의 부호에 따른 그래프 위치 혼동',
        solutionKey: [
          'y = ax: a > 0이면 1, 3사분면, a < 0이면 2, 4사분면',
          'y = a/x: a > 0이면 1, 3사분면, a < 0이면 2, 4사분면',
          '그래프가 지나는 점으로 부호 결정',
        ],
        exampleSetup: 'y = a/x의 그래프가 점 (-2, 3)을 지날 때, 이 그래프가 지나는 사분면은?',
      },
      {
        pattern: '정비례/반비례 판별',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '식의 형태만 보고 판별하면 틀리는 경우',
        solutionKey: [
          'y = ax (a ≠ 0)만 정비례',
          'y = a/x (a ≠ 0)만 반비례',
          'y = 2x + 1, y = x²는 정비례/반비례 아님',
        ],
        exampleSetup: 'xy = 6을 만족하는 x, y의 관계를 설명하시오.',
      },
    ],
  },
  {
    unit: '작도',
    keywords: ['작도', '합동', '삼각형의 작도', '삼각형의 합동'],
    killerPatterns: [
      {
        pattern: 'SSA는 합동 조건이 아님',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '두 변과 그 끼인각이 아닌 각이 같을 때 합동으로 착각',
        solutionKey: [
          'SSS, SAS, ASA만 합동 조건',
          'SSA(두 변과 끼인각이 아닌 각)는 합동 조건 아님',
          'AAA도 합동 조건 아님 (닮음 조건)',
        ],
        exampleSetup: 'AB = DE, BC = EF, ∠C = ∠F일 때, △ABC ≅ △DEF인가?',
      },
      {
        pattern: '대응 순서 맞추기',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '합동 기호에서 대응하는 꼭짓점 순서를 틀림',
        solutionKey: [
          '△ABC ≅ △DEF이면 A↔D, B↔E, C↔F',
          '대응변: AB=DE, BC=EF, CA=FD',
          '대응각: ∠A=∠D, ∠B=∠E, ∠C=∠F',
        ],
        exampleSetup: '△ABC ≅ △DEF에서 BC에 대응하는 변은?',
      },
    ],
  },
  {
    unit: '유리수와 순환소수',
    keywords: ['유리수와 순환소수'],
    killerPatterns: [
      {
        pattern: '유한소수 판별',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '기약분수로 만들지 않고 분모만 보고 판별',
        solutionKey: [
          '반드시 기약분수로 약분 후 판별',
          '기약분수 분모의 소인수가 2, 5뿐이면 유한소수',
          '분모에 2, 5 외 소인수가 있으면 무한소수(순환소수)',
        ],
        exampleSetup: '6/15는 유한소수인가?',
      },
      {
        pattern: '순환소수를 분수로 변환',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '순환마디 파악 실수 또는 변환 공식 오류',
        solutionKey: [
          '0.abc̅ = (abc - ab)/900 형태 파악',
          '순환마디 자릿수만큼 9, 비순환 자릿수만큼 0',
          '변환 후 기약분수로 정리',
        ],
        exampleSetup: '0.1̅2̅를 기약분수로 나타내시오.',
      },
    ],
  },
  {
    unit: '지수법칙',
    keywords: ['지수법칙', '거듭제곱의 계산'],
    killerPatterns: [
      {
        pattern: '지수법칙 혼동',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'aᵐ × aⁿ = aᵐⁿ으로 착각, (aᵐ)ⁿ = aᵐ⁺ⁿ으로 착각',
        solutionKey: [
          'aᵐ × aⁿ = aᵐ⁺ⁿ (같은 밑의 곱 → 지수 덧셈)',
          '(aᵐ)ⁿ = aᵐⁿ (거듭제곱의 거듭제곱 → 지수 곱셈)',
          '(ab)ⁿ = aⁿbⁿ',
        ],
        exampleSetup: '(2³)² × 2⁴ ÷ 2⁵의 값은?',
      },
      {
        pattern: '동류항 판별',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '문자는 같지만 차수가 다른 항을 동류항으로 착각',
        solutionKey: [
          '동류항: 문자와 차수가 모두 같은 항',
          '3x²y와 5xy²는 동류항 아님',
          '상수항끼리는 동류항',
        ],
        exampleSetup: '3a²b, -5ab², 7a²b 중 동류항끼리 묶으시오.',
      },
    ],
  },
  {
    unit: '일차부등식의 풀이',
    keywords: ['일차부등식의 풀이', '일차부등식', '부등식의 성질'],
    killerPatterns: [
      {
        pattern: '음수 곱셈 시 부등호 방향',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '양변에 음수를 곱하거나 나눌 때 부등호 방향 유지',
        solutionKey: [
          '양수 곱/나눗셈 → 부등호 방향 유지',
          '음수 곱/나눗셈 → 부등호 방향 반대로',
          '-x > 3의 양변에 -1을 곱하면 x < -3',
        ],
        exampleSetup: '-2x + 6 ≥ 0을 풀면?',
      },
      {
        pattern: '해의 범위 표현',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '경계값 포함 여부(≤, <)와 수직선 표시(●, ○) 혼동',
        solutionKey: [
          '≤, ≥: 경계값 포함 → ● (채운 점)',
          '<, >: 경계값 미포함 → ○ (빈 점)',
          '"미만/초과"와 "이하/이상" 구분',
        ],
        exampleSetup: 'x > 3을 수직선에 나타내시오.',
      },
    ],
  },
  {
    unit: '일차부등식의 활용',
    keywords: ['일차부등식의 활용', '부등식 활용'],
    killerPatterns: [
      {
        pattern: '부등식 세우기와 해 선택',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '부등식의 해 중에서 문제 조건(자연수, 양수 등)에 맞는 답을 선택하지 않음',
        solutionKey: [
          '"이상", "이하", "초과", "미만" 등의 표현을 부등호로 변환',
          '부등식의 해 중 문제 조건에 맞는 답 선택',
          '서술형: 부등식 세우기 → 풀이 → 조건에 맞는 답 선택까지 서술',
        ],
        exampleSetup: '한 자루에 500원인 연필과 300원인 지우개를 합쳐 10개 사는데 총 4000원 이하로 쓰려면 연필은 최대 몇 자루?',
      },
    ],
  },
  {
    unit: '연립방정식의 풀이',
    keywords: ['연립방정식의 풀이', '가감법', '대입법', '연립일차방정식'],
    killerPatterns: [
      {
        pattern: '해가 무수히 많음/해 없음',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '일반적인 연립방정식처럼 풀다가 특수한 경우를 놓침',
        solutionKey: [
          '두 식이 같아지면 → 해가 무수히 많음',
          '0 = k (k≠0) 형태면 → 해가 없음',
          '계수 비교: a₁/a₂ = b₁/b₂ = c₁/c₂면 무수히 많음',
        ],
        exampleSetup: 'x + 2y = 3, 2x + 4y = 6의 해는?',
      },
      {
        pattern: '세 방정식에서 공통해',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '세 방정식을 모두 만족하는 해 찾기',
        solutionKey: [
          '두 방정식으로 해를 구한 후 나머지에 대입',
          '미정계수가 있으면 조건을 이용해 결정',
          '공통해가 없을 수도 있음',
        ],
        exampleSetup: 'x + y = 5, 2x - y = 1, ax + by = 7을 모두 만족하는 해가 있을 때 a + b는?',
      },
    ],
  },
  {
    unit: '일차함수의 그래프',
    keywords: ['일차함수의 그래프', '기울기', 'y절편'],
    killerPatterns: [
      {
        pattern: '기울기의 부호와 그래프 방향',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '기울기가 음수일 때 그래프 방향을 반대로 그림',
        solutionKey: [
          '기울기 > 0: 오른쪽 위로 ↗',
          '기울기 < 0: 오른쪽 아래로 ↘',
          '기울기 = 0: x축에 평행',
        ],
        exampleSetup: 'y = -2x + 3의 그래프 개형을 그리시오.',
      },
      {
        pattern: '기울기 계산 순서',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '(y의 변화량)/(x의 변화량)에서 분자와 분모를 반대로',
        solutionKey: [
          '기울기 = (y₂ - y₁)/(x₂ - x₁)',
          '분자가 y, 분모가 x',
          '두 점의 순서는 같게 맞추기',
        ],
        exampleSetup: '두 점 (1, 3), (4, -3)을 지나는 직선의 기울기는?',
      },
    ],
  },
  {
    unit: '일차함수의 활용',
    keywords: ['일차함수의 활용', '일차함수 활용'],
    killerPatterns: [
      {
        pattern: '실생활 상황에서 일차함수 식 세우기',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '두 점이 주어졌을 때 기울기 → y절편 순서를 빠뜨리거나 그래프의 기울기와 절편에 실생활적 의미를 부여하지 못함',
        solutionKey: [
          '두 점으로 기울기 먼저 구하기 → y절편 결정',
          '기울기의 실생활적 의미 (예: 1분에 ○원씩 증가)',
          'y절편의 의미 (예: 기본 요금)',
        ],
        exampleSetup: '10분에 3000원, 20분에 5000원인 요금 체계를 일차함수로 나타내시오.',
      },
    ],
  },
  {
    unit: '일차함수와 일차방정식',
    keywords: ['일차함수와 일차방정식', '직선의 교점', '연립방정식과 그래프'],
    killerPatterns: [
      {
        pattern: 'x = k, y = k 형태의 직선',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'x = 2를 y = 2로 착각하거나, 기울기를 잘못 판단',
        solutionKey: [
          'x = k: y축에 평행한 수직선, 기울기 없음(정의 안 됨)',
          'y = k: x축에 평행한 수평선, 기울기 = 0',
          '"기울기 0"과 "기울기 없음"은 다름',
        ],
        exampleSetup: 'x = 3과 y = 2의 교점의 좌표는?',
      },
      {
        pattern: '두 직선의 위치 관계',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '평행, 일치, 한 점에서 만남 조건 혼동',
        solutionKey: [
          '기울기 다름 → 한 점에서 만남',
          '기울기 같고 y절편 다름 → 평행',
          '기울기 같고 y절편도 같음 → 일치',
        ],
        exampleSetup: 'y = 2x + 1과 y = 2x - 3의 위치 관계는?',
      },
    ],
  },
  {
    unit: '이등변삼각형',
    keywords: ['이등변삼각형', '이등변삼각형의 성질', '정삼각형'],
    killerPatterns: [
      {
        pattern: '이등변삼각형의 성질 활용',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '꼭지각의 이등분선이 밑변을 "수직이등분"함을 빠뜨림',
        solutionKey: [
          '두 밑각의 크기가 같음',
          '꼭지각의 이등분선 = 밑변의 수직이등분선',
          '역도 성립 (두 각이 같으면 이등변삼각형)',
        ],
        exampleSetup: '이등변삼각형에서 꼭지각이 40°일 때, 밑각의 크기는?',
      },
    ],
  },
  {
    unit: '외심',
    keywords: ['외심', '내심', '삼각형의 외심', '삼각형의 내심'],
    killerPatterns: [
      {
        pattern: '외심과 내심 혼동',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '외심과 내심의 정의와 성질을 반대로 기억',
        solutionKey: [
          '외심: 세 변의 수직이등분선의 교점, 세 꼭짓점까지 거리 같음',
          '내심: 세 각의 이등분선의 교점, 세 변까지 거리 같음',
          '직각삼각형의 외심은 빗변의 중점',
        ],
        exampleSetup: '삼각형의 외심에서 세 꼭짓점까지의 거리가 5일 때, 외접원의 반지름은?',
      },
    ],
  },
  {
    unit: '평행사변형의 성질',
    keywords: ['평행사변형의 성질', '평행사변형의 조건', '평행사변형'],
    killerPatterns: [
      {
        pattern: '평행사변형의 조건',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '5가지 조건 중 일부만 알거나 잘못 적용',
        solutionKey: [
          '두 쌍의 대변이 각각 평행',
          '두 쌍의 대변의 길이가 각각 같음',
          '두 쌍의 대각의 크기가 각각 같음',
          '두 대각선이 서로를 이등분',
          '한 쌍의 대변이 평행하고 길이가 같음',
        ],
        exampleSetup: '사각형 ABCD에서 AB // DC, AD = BC일 때, 평행사변형인가?',
      },
    ],
  },
  {
    unit: '여러 가지 사각형',
    keywords: ['여러 가지 사각형', '직사각형', '마름모', '정사각형', '등변사다리꼴'],
    killerPatterns: [
      {
        pattern: '특수 사각형의 대각선 성질',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '직사각형, 마름모, 정사각형의 대각선 성질 혼동',
        solutionKey: [
          '직사각형: 대각선 길이 같음, 서로 이등분',
          '마름모: 대각선이 서로 수직이등분',
          '정사각형: 길이 같고 수직이등분 (둘 다)',
        ],
        exampleSetup: '대각선이 서로 수직이등분하고 길이가 같은 사각형은?',
      },
    ],
  },
  {
    unit: '닮음의 뜻',
    keywords: ['닮음의 뜻', '닮음의 성질', '닮음의 위치'],
    killerPatterns: [
      {
        pattern: '닮음비와 넓이비/부피비',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '닮음비를 그대로 넓이비, 부피비로 사용',
        solutionKey: [
          '닮음비 = m : n',
          '넓이비 = m² : n²',
          '부피비 = m³ : n³',
        ],
        exampleSetup: '닮음비가 2 : 3인 두 삼각형의 넓이비는?',
      },
    ],
  },
  {
    unit: '삼각형의 닮음 조건',
    keywords: ['삼각형의 닮음 조건', 'AA 닮음', 'SAS 닮음', 'SSS 닮음'],
    killerPatterns: [
      {
        pattern: 'AA 닮음에서 세 각 필요 없음',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'AA 닮음에서 세 각이 모두 같아야 한다고 착각',
        solutionKey: [
          'AA 닮음: 두 각만 같으면 닮음 (나머지 각은 자동으로 같음)',
          'SAS 닮음: 끼인각이 같고 그 양변의 비가 같음',
          'SSS 닮음: 세 변의 비가 모두 같음',
        ],
        exampleSetup: '△ABC와 △DEF에서 ∠A = ∠D, ∠B = ∠E일 때, 닮음인가?',
      },
    ],
  },
  {
    unit: '피타고라스 정리',
    keywords: ['피타고라스 정리'],
    killerPatterns: [
      {
        pattern: '빗변 오판',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '가장 긴 변이 아닌 변을 빗변으로 설정',
        solutionKey: [
          '빗변 = 가장 긴 변 = 직각의 대변',
          'a² + b² = c²에서 c가 빗변',
          '세 변이 주어지면 가장 긴 변 찾기 먼저',
        ],
        exampleSetup: '세 변의 길이가 5, 12, 13인 삼각형은 직각삼각형인가?',
      },
      {
        pattern: '직각삼각형 판별',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'c² > a² + b² 또는 c² < a² + b²의 의미',
        solutionKey: [
          'c² = a² + b² → 직각삼각형',
          'c² > a² + b² → 둔각삼각형 (c의 대각이 둔각)',
          'c² < a² + b² → 예각삼각형',
        ],
        exampleSetup: '세 변이 4, 5, 7인 삼각형은 어떤 삼각형인가?',
      },
    ],
  },
  {
    unit: '경우의 수',
    keywords: ['경우의 수'],
    killerPatterns: [
      {
        pattern: '합의 법칙과 곱의 법칙 구분',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '"또는"과 "그리고"를 구분하지 못함',
        solutionKey: [
          '"또는/이거나" → 합의 법칙 (더하기)',
          '"그리고/동시에" → 곱의 법칙 (곱하기)',
          '합의 법칙은 동시에 일어나지 않는 경우에만',
        ],
        exampleSetup: '주사위를 던져 3의 배수 또는 짝수가 나오는 경우의 수는?',
      },
      {
        pattern: '순서의 유무 판단',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '순서가 있는 경우와 없는 경우를 혼동',
        solutionKey: [
          '대표 2명 뽑기 (순서 X) vs 회장, 부회장 뽑기 (순서 O)',
          '순서 있으면 경우의 수 더 많음',
          '수형도를 그려 확인',
        ],
        exampleSetup: '5명 중 대표 2명을 뽑는 경우의 수와 회장, 부회장을 뽑는 경우의 수는?',
      },
    ],
  },
  {
    unit: '확률의 뜻',
    keywords: ['확률의 뜻', '확률의 성질', '확률의 기본'],
    killerPatterns: [
      {
        pattern: '적어도 하나',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '"적어도"를 직접 계산하다 경우를 빠뜨림',
        solutionKey: [
          '"적어도 하나" = 1 - "하나도 아닌 경우"',
          '여사건 활용이 훨씬 쉬움',
          'P(적어도 하나) = 1 - P(모두 아닌 경우)',
        ],
        exampleSetup: '동전 3개를 던질 때, 적어도 1개가 앞면일 확률은?',
      },
    ],
  },
  {
    unit: '확률의 계산',
    keywords: ['확률의 계산', '확률의 덧셈', '확률의 곱셈'],
    killerPatterns: [
      {
        pattern: '복원추출 vs 비복원추출',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '뽑은 것을 되돌려 놓는지 여부에 따른 확률 차이',
        solutionKey: [
          '복원추출: 첫 번째와 두 번째 확률이 같음',
          '비복원추출: 전체 개수가 줄어듦',
          '문제에서 "다시 넣고/넣지 않고" 확인',
        ],
        exampleSetup: '빨간 공 3개, 파란 공 2개 중 비복원으로 2개를 뽑을 때 둘 다 빨간 공일 확률은?',
      },
    ],
  },
  {
    unit: '제곱근의 뜻',
    keywords: ['제곱근의 뜻', '제곱근의 성질'],
    killerPatterns: [
      {
        pattern: '√a²의 값',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '√a² = a로 단순히 생각 (a가 음수일 때 오류)',
        solutionKey: [
          '√a² = |a| (절댓값)',
          'a ≥ 0이면 √a² = a',
          'a < 0이면 √a² = -a',
        ],
        exampleSetup: '√(-5)²의 값은?',
      },
      {
        pattern: '√a와 a의 제곱근 구분',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '√4 = ±2로 착각',
        solutionKey: [
          '√4 = 2 (양의 제곱근만)',
          '4의 제곱근 = ±2 (양, 음 모두)',
          '√ 기호 자체가 양의 제곱근을 의미',
        ],
        exampleSetup: '√9의 값과 9의 제곱근을 각각 구하시오.',
      },
    ],
  },
  {
    unit: '근호를 포함한 식의 곱셈과 나눗셈',
    keywords: ['근호를 포함한 식의 곱셈과 나눗셈', '근호 곱셈', '근호 나눗셈', '유리화'],
    killerPatterns: [
      {
        pattern: '분모의 유리화 (켤레식)',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '분모가 √a ± √b일 때 유리화 방법',
        solutionKey: [
          '분모가 √a이면 √a를 곱함',
          '분모가 √a + √b이면 √a - √b를 곱함 (켤레식)',
          '(√a + √b)(√a - √b) = a - b',
        ],
        exampleSetup: '1/(√3 + √2)를 유리화하시오.',
      },
    ],
  },
  {
    unit: '근호를 포함한 식의 덧셈과 뺄셈',
    keywords: ['근호를 포함한 식의 덧셈과 뺄셈', '근호 덧셈', '근호 뺄셈'],
    killerPatterns: [
      {
        pattern: '덧셈/뺄셈 착각',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '√a + √b = √(a+b)로 계산',
        solutionKey: [
          '√a + √b ≠ √(a+b) (성립 안 함!)',
          '√a × √b = √(ab) (이것만 성립)',
          '덧셈/뺄셈은 근호 안이 같을 때만 가능',
        ],
        exampleSetup: '√2 + √3의 값을 간단히 하시오. (답: 간단히 안 됨)',
      },
    ],
  },
  {
    unit: '다항식의 곱셈',
    keywords: ['다항식의 곱셈', '다항식 전개'],
    killerPatterns: [
      {
        pattern: '중간항 부호 실수',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(a-b)² = a² - b²로 착각 (중간항 누락)',
        solutionKey: [
          '(a+b)² = a² + 2ab + b²',
          '(a-b)² = a² - 2ab + b² (중간항 -2ab)',
          '(a+b)(a-b) = a² - b² (이건 중간항 없음)',
        ],
        exampleSetup: '(3x - 2)²을 전개하시오.',
      },
    ],
  },
  {
    unit: '곱셈 공식',
    keywords: ['곱셈 공식', '곱셈공식', '완전제곱식'],
    killerPatterns: [
      {
        pattern: '곱셈 공식 변형 활용',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'a² + b²를 인수분해하려다 막힘',
        solutionKey: [
          'a² + b² = (a+b)² - 2ab',
          'a² + b² = (a-b)² + 2ab',
          '(a-b)² = (a+b)² - 4ab',
        ],
        exampleSetup: 'a + b = 5, ab = 3일 때, a² + b²의 값은?',
      },
    ],
  },
  {
    unit: '인수분해 공식',
    keywords: ['인수분해 공식', '인수분해', '공통인수'],
    killerPatterns: [
      {
        pattern: '완전제곱식 vs 합차공식 혼동',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'a² - b²을 (a-b)²으로 인수분해',
        solutionKey: [
          'a² - b² = (a+b)(a-b) ← 합차공식',
          'a² - 2ab + b² = (a-b)² ← 완전제곱식',
          '"제곱 - 제곱"과 "제곱 - 2배 + 제곱" 구분',
        ],
        exampleSetup: 'x² - 9를 인수분해하시오.',
      },
    ],
  },
  {
    unit: '인수분해의 활용',
    keywords: ['인수분해의 활용', '인수분해 활용'],
    killerPatterns: [
      {
        pattern: '공통인수 완전 추출',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '공통인수를 덜 묶거나 남은 식을 다시 인수분해하지 않음',
        solutionKey: [
          '모든 항의 공통인수를 먼저 완전히 묶기',
          '묶고 남은 식도 인수분해 가능한지 확인',
          '인수분해 결과를 전개하여 검산',
        ],
        exampleSetup: '2x² - 8을 완전히 인수분해하시오.',
      },
    ],
  },
  {
    unit: '이차방정식의 풀이',
    keywords: ['이차방정식의 풀이', '인수분해 풀이', '근의 공식'],
    killerPatterns: [
      {
        pattern: '근의 공식 분모',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'x = (-b ± √(b²-4ac)) / 2a에서 분모를 a로 착각',
        solutionKey: [
          '분모는 반드시 2a',
          '짝수 공식: b = 2b\'일 때 x = (-b\' ± √(b\'²-ac)) / a',
          '판별식 D = b² - 4ac',
        ],
        exampleSetup: '2x² + 5x - 3 = 0을 근의 공식으로 풀면?',
      },
    ],
  },
  {
    unit: '이차방정식의 활용',
    keywords: ['이차방정식의 활용', '이차방정식 활용'],
    killerPatterns: [
      {
        pattern: '활용 문제의 해 검증',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '두 근 중 문제 조건에 맞지 않는 근을 답으로 선택',
        solutionKey: [
          '길이, 개수 등은 양수 조건',
          '나이, 인원은 자연수 조건',
          '두 근 모두 조건에 맞는지 확인',
        ],
        exampleSetup: '연속하는 두 자연수의 곱이 72일 때, 두 수를 구하시오.',
      },
    ],
  },
  {
    unit: '이차함수와 그래프',
    keywords: ['이차함수와 그래프', '이차함수의 그래프', 'y=ax²'],
    killerPatterns: [
      {
        pattern: '꼭짓점 좌표 부호',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'y = a(x-p)² + q에서 꼭짓점을 (-p, q)로 착각',
        solutionKey: [
          'y = a(x-p)² + q의 꼭짓점은 (p, q)',
          '괄호 안이 (x-3)이면 x좌표는 +3',
          '괄호 안이 (x+2)이면 x좌표는 -2',
        ],
        exampleSetup: 'y = 2(x+3)² - 5의 꼭짓점 좌표는?',
      },
    ],
  },
  {
    unit: '이차함수의 활용',
    keywords: ['이차함수의 활용', '이차함수의 최대', '이차함수의 최소'],
    killerPatterns: [
      {
        pattern: '정의역 제한 시 최대/최소',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '정의역이 제한되면 꼭짓점이 최대/최소가 아닐 수 있음',
        solutionKey: [
          '정의역에 꼭짓점 x좌표가 포함되는지 확인',
          '포함되면: 꼭짓점에서 최대/최소',
          '포함 안 되면: 구간 끝점에서 최대/최소',
        ],
        exampleSetup: 'y = (x-3)² + 1 (0 ≤ x ≤ 2)의 최솟값은?',
      },
    ],
  },
  {
    unit: '삼각비의 뜻',
    keywords: ['삼각비의 뜻', '삼각비의 값', '삼각비 정의', '특수각의 삼각비'],
    killerPatterns: [
      {
        pattern: 'sin, cos, tan 정의 혼동',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '대변, 인접변, 빗변을 혼동하여 삼각비 오계산',
        solutionKey: [
          'sin θ = 대변/빗변 (opposite/hypotenuse)',
          'cos θ = 인접변/빗변 (adjacent/hypotenuse)',
          'tan θ = 대변/인접변 (opposite/adjacent)',
          '"소대빗, 코인빗, 탄대인"으로 암기',
        ],
        exampleSetup: '직각삼각형에서 빗변 5, 대변 3일 때 sin θ는?',
      },
      {
        pattern: '특수각 값 혼동',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '30°, 45°, 60°의 삼각비 값을 서로 바꿔 기억',
        solutionKey: [
          'sin: 30° → 1/2, 45° → √2/2, 60° → √3/2',
          'cos: 30° → √3/2, 45° → √2/2, 60° → 1/2',
          'sin과 cos은 30°, 60°에서 서로 바뀜',
        ],
        exampleSetup: 'sin 60° + cos 30°의 값은?',
      },
    ],
  },
  {
    unit: '삼각비의 활용',
    keywords: ['삼각비의 활용'],
    killerPatterns: [
      {
        pattern: '직각삼각형이 없는 경우',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '일반 삼각형에 직접 삼각비를 적용하려 함',
        solutionKey: [
          '직각삼각형이 없으면 수선(높이)을 그어 만들기',
          '삼각형 넓이 = (1/2) × 밑변 × 높이',
          '높이 = (한 변) × sin(그 변의 대각)',
        ],
        exampleSetup: '두 변이 5, 8이고 끼인각이 60°인 삼각형의 넓이는?',
      },
      {
        pattern: '넓이 공식 계수 누락',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '삼각형 넓이 공식에서 1/2를 빠뜨림',
        solutionKey: [
          'S = (1/2) ab sin C (반드시 1/2 포함)',
          '두 변과 그 끼인각이 필요',
          '예각/둔각 모두 적용 가능',
        ],
        exampleSetup: '두 변이 4, 6이고 끼인각이 45°인 삼각형의 넓이는?',
      },
    ],
  },
  {
    unit: '원과 현',
    keywords: ['원과 현', '현의 수직이등분', '원의 현'],
    killerPatterns: [
      {
        pattern: '원주각과 중심각 관계',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '원주각 = 중심각 × 2로 착각 (반대임)',
        solutionKey: [
          '원주각 = 중심각 / 2 (절반)',
          '중심각 = 원주각 × 2 (두 배)',
          '같은 호에 대한 원주각은 모두 같음',
        ],
        exampleSetup: '중심각이 80°일 때, 같은 호에 대한 원주각은?',
      },
    ],
  },
  {
    unit: '원주각',
    keywords: ['원주각', '중심각', '원주각과 중심각'],
    killerPatterns: [
      {
        pattern: '반원에 대한 원주각',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '반원(지름)에 대한 원주각이 90°임을 모름',
        solutionKey: [
          '지름에 대한 원주각 = 90° (항상)',
          '역: 원주각이 90°면 그 호는 반원',
          '직각삼각형의 외접원에서 빗변 = 지름',
        ],
        exampleSetup: '원에 내접하는 삼각형에서 한 각이 90°일 때, 그 대변은?',
      },
    ],
  },
  {
    unit: '원과 접선',
    keywords: ['원과 접선'],
    killerPatterns: [
      {
        pattern: '접선의 성질',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '접선이 접점에서 반지름과 수직임을 활용하지 못함',
        solutionKey: [
          '접선 ⊥ 반지름 (접점에서)',
          '원 밖의 점에서 그은 두 접선의 길이 같음',
          '피타고라스 정리로 접선의 길이 계산',
        ],
        exampleSetup: '반지름 5인 원의 중심에서 13만큼 떨어진 점에서 그은 접선의 길이는?',
      },
      {
        pattern: '접선과 현이 이루는 각',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '접선과 현이 이루는 각이 그 현에 대한 원주각과 같음을 모름',
        solutionKey: [
          '(접선과 현이 이루는 각) = (그 현에 대한 원주각)',
          '접점에서 그은 현에 대해 성립',
          '그림을 그려 관계 파악',
        ],
        exampleSetup: '접선 AT와 현 AB가 이루는 각이 35°일 때, 호 AB에 대한 원주각은?',
      },
    ],
  },
  {
    unit: '대푯값',
    keywords: ['대푯값', '평균', '중앙값', '최빈값'],
    killerPatterns: [
      {
        pattern: '대푯값 선택과 해석',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '극단값이 있을 때 평균이 대표성을 잃는 것을 모르거나, 중앙값과 최빈값의 차이를 혼동',
        solutionKey: [
          '평균: 모든 자료 값의 합 / 자료 개수 (극단값에 민감)',
          '중앙값: 크기순으로 나열했을 때 가운데 값 (극단값에 강건)',
          '최빈값: 가장 자주 나타나는 값 (없거나 여러 개 가능)',
        ],
        exampleSetup: '자료 1, 2, 3, 3, 100의 평균, 중앙값, 최빈값을 각각 구하시오.',
      },
    ],
  },
  {
    unit: '산포도',
    keywords: ['산포도', '분산', '표준편차', '편차'],
    killerPatterns: [
      {
        pattern: '분산 공식 혼동',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '분산을 (편차의 합)²으로 계산',
        solutionKey: [
          '분산 = (편차²의 평균) = Σ(xᵢ - x̄)² / n',
          '또는 분산 = (x²의 평균) - (평균)²',
          '편차의 합은 항상 0',
        ],
        exampleSetup: '자료 2, 4, 6의 분산을 구하시오.',
      },
      {
        pattern: '표준편차 단위',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '분산과 표준편차의 단위 차이를 무시',
        solutionKey: [
          '표준편차 = √분산',
          '표준편차의 단위는 원래 자료와 같음',
          '분산의 단위는 원래 자료 단위의 제곱',
        ],
        exampleSetup: '분산이 16일 때, 표준편차는?',
      },
    ],
  },
  {
    unit: '다항식의 연산',
    keywords: ['다항식의 연산'],
    killerPatterns: [
      {
        pattern: '전개 시 항 개수',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '(a+b+c)² 전개에서 교차항 누락',
        solutionKey: [
          '(a+b+c)² = a² + b² + c² + 2ab + 2bc + 2ca',
          'n개 합의 제곱은 제곱항 n개 + 교차항 nC₂개',
          '치환하여 2개씩 묶어 계산하면 실수 줄임',
        ],
        exampleSetup: '(x + y - 2)²을 전개하시오.',
      },
      {
        pattern: '다항식 나눗셈에서 빠진 차수',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '중간 차수 항이 없을 때 0을 넣지 않음',
        solutionKey: [
          'x³ + 1을 x - 1로 나눌 때, x² 항과 x항에 0 삽입',
          '조립제법에서도 빠진 차수에 0 넣기',
          '몫의 차수 = (피제수 차수) - (제수 차수)',
        ],
        exampleSetup: 'x³ + 8을 x + 2로 나눈 몫과 나머지는?',
      },
    ],
  },
  {
    unit: '나머지정리',
    keywords: ['나머지정리', '인수정리', '항등식', '조립제법'],
    killerPatterns: [
      {
        pattern: '나누는 식의 부호',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(x-a)로 나눈 나머지가 P(-a)라고 착각',
        solutionKey: [
          '(x-a)로 나눈 나머지 = P(a)',
          '(x+a)로 나눈 나머지 = P(-a)',
          '조립제법: x-2로 나눌 때 2 사용, x+3으로 나눌 때 -3 사용',
        ],
        exampleSetup: 'P(x) = x³ - 2x + 1을 x + 1로 나눈 나머지는?',
      },
      {
        pattern: '이차식으로 나눈 나머지',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(x-a)(x-b)로 나눈 나머지가 상수라고 착각',
        solutionKey: [
          '(일차식)으로 나눈 나머지 = 상수',
          '(이차식)으로 나눈 나머지 = 일차식 또는 상수',
          'R(x) = px + q로 놓고 P(a), P(b)를 이용해 p, q 결정',
        ],
        exampleSetup: 'P(x)를 (x-1)(x-2)로 나눈 나머지를 구하시오. (단, P(1) = 3, P(2) = 7)',
      },
    ],
  },
  {
    unit: '고차식 인수분해',
    keywords: ['고차식 인수분해', '복이차식', '이차식 치환', '삼차식 인수분해'],
    killerPatterns: [
      {
        pattern: '인수정리로 인수 찾기',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'P(a) = 0이면 (x+a)가 인수라고 착각',
        solutionKey: [
          'P(a) = 0이면 (x-a)가 인수',
          'P(-a) = 0이면 (x+a)가 인수',
          '상수항의 약수를 대입해 인수 찾기',
        ],
        exampleSetup: 'x³ - 6x² + 11x - 6을 인수분해하시오.',
      },
      {
        pattern: '복이차식 인수분해',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'x⁴ + ax² + b 형태를 직접 인수분해하려 함',
        solutionKey: [
          'x² = t로 치환하여 t에 대한 이차식으로 변환',
          't² + at + b를 인수분해 후 t를 x²로 복원',
          'x²의 인수분해도 확인 (x² - 1 = (x+1)(x-1))',
        ],
        exampleSetup: 'x⁴ - 5x² + 4를 인수분해하시오.',
      },
    ],
  },
  {
    unit: '복소수',
    keywords: ['복소수'],
    killerPatterns: [
      {
        pattern: 'i의 거듭제곱',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'i² = 1로 착각하거나 거듭제곱 주기 모름',
        solutionKey: [
          'i¹ = i, i² = -1, i³ = -i, i⁴ = 1 (4개 주기)',
          'i^n은 n을 4로 나눈 나머지로 판단',
          'i⁴⁵ = i^(44+1) = (i⁴)¹¹ × i = i',
        ],
        exampleSetup: 'i²⁰²³의 값은?',
      },
      {
        pattern: '복소수 나눗셈',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '분모의 실수화를 하지 않거나 켤레복소수를 잘못 사용',
        solutionKey: [
          '(a + bi)의 켤레복소수 = (a - bi)',
          '분모, 분자에 분모의 켤레복소수를 곱함',
          '(a + bi)(a - bi) = a² + b² (실수)',
        ],
        exampleSetup: '(2 + 3i)/(1 - i)를 a + bi 형태로 나타내시오.',
      },
    ],
  },
  {
    unit: '이차함수와 이차방정식',
    keywords: ['이차함수와 이차방정식', '이차방정식과 이차함수', '이차함수의 그래프와 x축'],
    killerPatterns: [
      {
        pattern: '그래프와 x축의 위치 관계',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'D > 0을 "x축보다 위에 있다"로 해석',
        solutionKey: [
          'D > 0: x축과 서로 다른 두 점에서 만남',
          'D = 0: x축과 접함 (한 점)',
          'D < 0: x축과 만나지 않음',
        ],
        exampleSetup: 'y = x² - 4x + k의 그래프가 x축과 접하려면 k는?',
      },
      {
        pattern: '그래프가 x축보다 항상 위',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '조건 "a > 0, D < 0"을 빠뜨림',
        solutionKey: [
          '모든 x에서 y > 0: a > 0이고 D < 0',
          '모든 x에서 y < 0: a < 0이고 D < 0',
          '그래프를 그려서 확인',
        ],
        exampleSetup: 'y = x² - 2x + k가 항상 양수이려면 k의 범위는?',
      },
    ],
  },
  {
    unit: '고차방정식',
    keywords: ['고차방정식'],
    killerPatterns: [
      {
        pattern: '삼차방정식의 근',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '삼차방정식도 허근만 가질 수 있다고 착각',
        solutionKey: [
          '삼차방정식은 최소 하나의 실근을 가짐',
          '세 실근 또는 실근 1개 + 켤레허근 2개',
          '인수정리로 실근을 먼저 찾기',
        ],
        exampleSetup: 'x³ + x + 2 = 0의 실근의 개수는?',
      },
      {
        pattern: '켤레근 정리',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '복소수 계수 방정식에도 켤레근 정리를 적용',
        solutionKey: [
          '실계수 다항방정식에서 허근은 켤레로 나타남',
          '2 + 3i가 근이면 2 - 3i도 근',
          '복소수 계수 방정식에는 적용 안 됨',
        ],
        exampleSetup: '실계수 삼차방정식이 1 + i를 근으로 가질 때, 나머지 근은?',
      },
    ],
  },
  {
    unit: '이차부등식',
    keywords: ['이차부등식'],
    killerPatterns: [
      {
        pattern: 'a의 부호 미확인',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'ax² + bx + c > 0에서 a > 0이라고 가정',
        solutionKey: [
          'a > 0이면 포물선이 아래로 볼록',
          'a < 0이면 포물선이 위로 볼록',
          'a의 부호에 따라 해의 형태가 달라짐',
        ],
        exampleSetup: '-x² + 4x - 3 > 0을 풀면?',
      },
      {
        pattern: 'D < 0일 때 해',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'D < 0이면 해가 없다고 단정',
        solutionKey: [
          'a > 0, D < 0: x² + ... > 0의 해는 모든 실수',
          'a > 0, D < 0: x² + ... < 0의 해는 없음',
          'a < 0일 때는 반대',
        ],
        exampleSetup: 'x² + 2x + 3 > 0의 해는?',
      },
    ],
  },
  {
    unit: '순열',
    keywords: ['순열', '조합', 'nPr', 'nCr'],
    killerPatterns: [
      {
        pattern: '같은 것이 있는 순열',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '같은 것이 있을 때 나누는 것을 잊음',
        solutionKey: [
          'n!/p!q!r!... (p개, q개, r개... 같은 것이 있을 때)',
          'MISSISSIPPI: 11!/(1!×4!×4!×2!)',
          '모든 같은 것의 팩토리얼로 나눔',
        ],
        exampleSetup: 'SUCCESS의 모든 철자를 사용하여 만들 수 있는 경우의 수는?',
      },
      {
        pattern: '원순열',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '원순열에서 n!로 계산',
        solutionKey: [
          '원순열 = (n-1)!',
          '염주순열(뒤집어도 같은 경우) = (n-1)!/2',
          '회전하여 같은 것은 하나로 봄',
        ],
        exampleSetup: '5명이 원탁에 앉는 경우의 수는?',
      },
    ],
  },
  {
    unit: '행렬의 연산',
    keywords: ['행렬의 연산', '행렬의 덧셈', '행렬의 곱셈'],
    killerPatterns: [
      {
        pattern: '행렬 곱셈의 교환법칙',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'AB = BA라고 착각',
        solutionKey: [
          '행렬 곱셈은 교환법칙이 성립하지 않음',
          'AB ≠ BA (일반적으로)',
          '곱셈 순서를 바꾸면 결과가 다름',
        ],
        exampleSetup: 'A = [[1,2],[0,1]], B = [[1,0],[1,1]]일 때, AB와 BA를 비교하시오.',
      },
      {
        pattern: '행렬의 곱과 역행렬 조건',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '역행렬 공식에서 분모가 0인 경우',
        solutionKey: [
          '2×2 행렬 [[a,b],[c,d]]의 역행렬 존재 조건: ad - bc ≠ 0',
          'ad - bc = 0이면 역행렬 없음',
          '역행렬 = [[d,-b],[-c,a]] / (ad-bc)',
        ],
        exampleSetup: '[[2,4],[1,2]]의 역행렬이 존재하는가?',
      },
    ],
  },
  {
    unit: '평면좌표',
    keywords: ['평면좌표'],
    killerPatterns: [
      {
        pattern: '내분점과 외분점 공식',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '내분점과 외분점 공식을 혼동',
        solutionKey: [
          '내분점: (mx₂ + nx₁)/(m + n), (my₂ + ny₁)/(m + n)',
          '외분점: (mx₂ - nx₁)/(m - n), (my₂ - ny₁)/(m - n)',
          '내분은 더하기, 외분은 빼기',
        ],
        exampleSetup: 'A(1, 2), B(4, 5)를 2:1로 내분하는 점과 외분하는 점은?',
      },
      {
        pattern: '무게중심 좌표',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '3으로 나누는 것을 잊음',
        solutionKey: [
          '무게중심 = ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3)',
          '세 좌표의 평균',
          '중선을 2:1로 내분',
        ],
        exampleSetup: '세 꼭짓점이 (0, 0), (6, 0), (3, 6)인 삼각형의 무게중심은?',
      },
    ],
  },
  {
    unit: '직선의 방정식',
    keywords: ['직선의 방정식'],
    killerPatterns: [
      {
        pattern: '점과 직선 사이 거리',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '공식에서 절댓값을 빼먹음',
        solutionKey: [
          'd = |ax₁ + by₁ + c| / √(a² + b²)',
          '분자에 절댓값 필수',
          '직선의 방정식을 ax + by + c = 0 형태로',
        ],
        exampleSetup: '점 (3, -1)과 직선 3x + 4y - 2 = 0 사이의 거리는?',
      },
      {
        pattern: '수직 조건',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '두 직선의 수직 조건을 기울기 합 = -1로 착각',
        solutionKey: [
          '수직 조건: m₁ × m₂ = -1 (기울기의 곱)',
          '평행 조건: m₁ = m₂ (기울기가 같음)',
          '기울기가 없는 직선(x = k)과 수평선(y = k)은 수직',
        ],
        exampleSetup: 'y = 2x + 1과 수직인 직선의 기울기는?',
      },
    ],
  },
  {
    unit: '원의 방정식',
    keywords: ['원의 방정식', '원과 직선의 위치 관계'],
    killerPatterns: [
      {
        pattern: '중심 좌표 부호',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(x-a)² + (y-b)² = r²에서 중심을 (-a, -b)로 착각',
        solutionKey: [
          '(x-a)² + (y-b)² = r²의 중심은 (a, b)',
          '(x-3)²이면 x좌표는 +3',
          '(x+2)²이면 x좌표는 -2',
        ],
        exampleSetup: '(x+1)² + (y-3)² = 16의 중심과 반지름은?',
      },
      {
        pattern: '원과 직선의 위치 관계',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'd와 r 비교에서 등호 포함 여부',
        solutionKey: [
          'd < r: 두 점에서 만남',
          'd = r: 접함 (한 점)',
          'd > r: 만나지 않음',
        ],
        exampleSetup: '원 x² + y² = 9와 직선 y = x + k가 접하려면 k는?',
      },
    ],
  },
  {
    unit: '도형의 이동',
    keywords: ['도형의 이동'],
    killerPatterns: [
      {
        pattern: '점과 방정식의 이동 부호',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '점의 이동과 방정식의 이동에서 부호 처리를 같게 함',
        solutionKey: [
          '점 (x, y) → (x+a, y+b)로 평행이동',
          '방정식에서는 x 대신 x-a, y 대신 y-b 대입',
          '점과 방정식의 부호가 반대',
        ],
        exampleSetup: 'y = x²을 x축 방향으로 2, y축 방향으로 3만큼 평행이동하면?',
      },
      {
        pattern: '대칭이동',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'x축, y축, 원점 대칭의 규칙 혼동',
        solutionKey: [
          'x축 대칭: y → -y',
          'y축 대칭: x → -x',
          '원점 대칭: x → -x, y → -y',
        ],
        exampleSetup: 'y = x² - 2x를 원점에 대해 대칭이동하면?',
      },
    ],
  },
  {
    unit: '집합의 연산',
    keywords: ['집합의 연산', '교집합', '합집합', '여집합', '드모르간'],
    killerPatterns: [
      {
        pattern: '드모르간 법칙',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '(A∪B)ᶜ를 Aᶜ∪Bᶜ로 착각',
        solutionKey: [
          '(A∪B)ᶜ = Aᶜ ∩ Bᶜ',
          '(A∩B)ᶜ = Aᶜ ∪ Bᶜ',
          '여집합을 취하면 ∪와 ∩가 바뀜',
        ],
        exampleSetup: 'U = {1,2,3,4,5}, A = {1,2}, B = {2,3}일 때, (A∪B)ᶜ는?',
      },
    ],
  },
  {
    unit: '명제',
    keywords: ['명제', '역', '이', '대우', '필요조건', '충분조건'],
    killerPatterns: [
      {
        pattern: '필요조건과 충분조건',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'p → q에서 p가 필요조건이라고 착각',
        solutionKey: [
          'p → q가 참일 때: p는 충분조건, q는 필요조건',
          '"p이면 q이다"에서 p가 충분, q가 필요',
          '집합으로: P ⊂ Q이면 P가 충분, Q가 필요',
        ],
        exampleSetup: '"x = 2이면 x² = 4이다"에서 각각 무슨 조건인가?',
      },
    ],
  },
  {
    unit: '절대부등식',
    keywords: ['절대부등식'],
    killerPatterns: [
      {
        pattern: '산술-기하 평균 등호 조건',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '등호 성립 조건 확인 없이 최솟값 결정',
        solutionKey: [
          '산술평균 ≥ 기하평균, 등호는 a = b일 때',
          '문제의 조건에서 a = b가 가능한지 확인',
          '불가능하면 등호 성립 안 함 → 최솟값 아님',
        ],
        exampleSetup: 'x > 0일 때, x + 4/x의 최솟값은? (등호 성립: x = 2)',
      },
      {
        pattern: '양수 조건 미확인',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '음수에 산술-기하 평균을 적용',
        solutionKey: [
          'a, b가 양수일 때만 (a+b)/2 ≥ √(ab)',
          '음수가 포함되면 적용 불가',
          '조건을 확인하고 양수임을 보이기',
        ],
        exampleSetup: 'a > -1일 때, (a+1) + 1/(a+1)의 최솟값은? (a+1 > 0 확인)',
      },
    ],
  },
  {
    unit: '함수',
    keywords: ['함수'],
    killerPatterns: [
      {
        pattern: '합성함수 순서',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '(f∘g)(x)를 g(f(x))로 계산',
        solutionKey: [
          '(f∘g)(x) = f(g(x))',
          '안쪽 함수 g를 먼저 계산',
          '(f∘g) ≠ (g∘f) 일반적으로',
        ],
        exampleSetup: 'f(x) = 2x, g(x) = x + 1일 때, (f∘g)(3)은?',
      },
      {
        pattern: '역함수 존재 조건',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '모든 함수에 역함수가 있다고 착각',
        solutionKey: [
          '역함수 존재 ⟺ 일대일대응',
          'y = x²은 역함수 없음 (x ≥ 0으로 제한하면 있음)',
          '그래프: y = x에 대해 대칭',
        ],
        exampleSetup: 'f(x) = x³의 역함수는?',
      },
    ],
  },
  {
    unit: '유리함수',
    keywords: ['유리함수', '유리함수의 그래프'],
    killerPatterns: [
      {
        pattern: '점근선',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'y = k/(x-p) + q의 점근선을 x = -p, y = -q로 착각',
        solutionKey: [
          'y = k/(x-p) + q의 점근선: x = p, y = q',
          '괄호 안 부호와 반대로',
          '그래프는 점근선에 가까워지지만 만나지 않음',
        ],
        exampleSetup: 'y = 2/(x-1) + 3의 점근선은?',
      },
    ],
  },
  {
    unit: '무리함수',
    keywords: ['무리함수', '무리함수의 그래프'],
    killerPatterns: [
      {
        pattern: '무리함수의 정의역',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '근호 안이 음수가 될 수 있다고 착각',
        solutionKey: [
          '√(ax + b)에서 ax + b ≥ 0',
          '정의역: x ≥ -b/a (a > 0일 때)',
          '치역도 제한됨 (대개 y ≥ c 형태)',
        ],
        exampleSetup: 'y = √(2x - 4)의 정의역과 치역은?',
      },
    ],
  },
  {
    unit: '지수',
    keywords: ['지수'],
    killerPatterns: [
      {
        pattern: '유리수 지수 변환',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'a^(m/n)에서 n의 위치 혼동',
        solutionKey: [
          'a^(m/n) = ⁿ√(aᵐ) = (ⁿ√a)ᵐ',
          '분모 n이 근호의 지수',
          '분자 m이 거듭제곱의 지수',
        ],
        exampleSetup: '8^(2/3)의 값은?',
      },
      {
        pattern: 'a⁰ = 1',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'a⁰ = 0으로 착각',
        solutionKey: [
          'a⁰ = 1 (a ≠ 0)',
          'a⁻ⁿ = 1/aⁿ',
          '0⁰은 정의되지 않음',
        ],
        exampleSetup: '5⁰ + 2⁻³의 값은?',
      },
    ],
  },
  {
    unit: '로그',
    keywords: ['로그'],
    killerPatterns: [
      {
        pattern: '로그 덧셈 착각',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'log(a+b) = log a + log b로 착각',
        solutionKey: [
          'log(ab) = log a + log b ← 곱의 로그',
          'log(a+b) ≠ log a + log b',
          'log(a/b) = log a - log b',
        ],
        exampleSetup: 'log 2 + log 3의 값은?',
      },
      {
        pattern: '진수 조건과 밑 조건',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '진수나 밑의 조건을 확인하지 않음',
        solutionKey: [
          '진수 > 0',
          '밑 > 0이고 밑 ≠ 1',
          '방정식/부등식 풀이 후 조건 확인 필수',
        ],
        exampleSetup: 'log₂(x-1) = 3의 해는?',
      },
    ],
  },
  {
    unit: '지수함수',
    keywords: ['지수함수'],
    killerPatterns: [
      {
        pattern: '지수함수의 밑에 따른 증가/감소',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'a > 1일 때와 0 < a < 1일 때 혼동',
        solutionKey: [
          'a > 1: 증가함수 (x↑ → y↑)',
          '0 < a < 1: 감소함수 (x↑ → y↓)',
          '지수부등식에서 밑에 따라 부등호 방향 주의',
        ],
        exampleSetup: '(1/2)ˣ > 8을 풀면?',
      },
      {
        pattern: '지수함수의 점근선',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'y = aˣ이 x축과 만난다고 착각',
        solutionKey: [
          'x축(y = 0)이 점근선',
          '그래프는 x축에 가까워지지만 만나지 않음',
          'aˣ > 0 (항상 양수)',
        ],
        exampleSetup: 'y = 2ˣ의 그래프가 x축과 만나는 점은?',
      },
    ],
  },
  {
    unit: '로그함수',
    keywords: ['로그함수'],
    killerPatterns: [
      {
        pattern: '로그함수의 밑에 따른 증가/감소',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '밑이 1보다 작을 때 부등호 방향',
        solutionKey: [
          'a > 1: 증가함수',
          '0 < a < 1: 감소함수',
          '로그부등식에서 밑에 따라 부등호 방향 바뀜',
        ],
        exampleSetup: 'log₀.₅ x > 2를 풀면?',
      },
      {
        pattern: '로그함수의 정의역',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '모든 실수에서 정의된다고 착각',
        solutionKey: [
          'y = logₐ x의 정의역: x > 0',
          'y축(x = 0)이 점근선',
          '항상 점 (1, 0)을 지남',
        ],
        exampleSetup: 'y = log₂(x-1)의 정의역은?',
      },
    ],
  },
  {
    unit: '삼각함수의 정의',
    keywords: ['삼각함수의 정의', '호도법', '라디안', '단위원'],
    killerPatterns: [
      {
        pattern: '사분면별 부호',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '각 사분면에서 삼각함수 부호 혼동',
        solutionKey: [
          '1사분면: 모두 +',
          '2사분면: sin만 +',
          '3사분면: tan만 +',
          '4사분면: cos만 +',
        ],
        exampleSetup: 'sin 150°, cos 150°, tan 150°의 부호는?',
      },
      {
        pattern: '삼각함수 기본 관계',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'sin θ + cos θ = 1로 착각',
        solutionKey: [
          'sin²θ + cos²θ = 1 (제곱의 합!)',
          'tan θ = sin θ / cos θ',
          '1 + tan²θ = sec²θ',
        ],
        exampleSetup: 'sin θ = 3/5일 때, cos θ는? (θ는 제1사분면)',
      },
    ],
  },
  {
    unit: '삼각함수의 그래프',
    keywords: ['삼각함수의 그래프'],
    killerPatterns: [
      {
        pattern: '주기 계산',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'y = sin(bx)의 주기를 2πb로 착각',
        solutionKey: [
          'y = sin(bx)의 주기 = 2π/|b|',
          'y = tan(bx)의 주기 = π/|b|',
          'b가 클수록 주기가 짧아짐',
        ],
        exampleSetup: 'y = sin(2x)의 주기는?',
      },
      {
        pattern: '그래프의 이동',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'y = sin(x - π/4)의 이동 방향',
        solutionKey: [
          'y = sin(x - a)는 오른쪽으로 a만큼 이동',
          'y = sin(x + a)는 왼쪽으로 a만큼 이동',
          '괄호 안 부호와 반대 방향',
        ],
        exampleSetup: 'y = sin x를 오른쪽으로 π/3만큼 이동하면?',
      },
    ],
  },
  {
    unit: '사인법칙',
    keywords: ['사인법칙', '코사인법칙', '삼각형의 넓이'],
    killerPatterns: [
      {
        pattern: '사인법칙과 코사인법칙 선택',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '어떤 법칙을 써야 할지 판단 못함',
        solutionKey: [
          '사인법칙: 변과 대각 관계, 외접원 반지름',
          '코사인법칙: 세 변 또는 두 변과 끼인각',
          '주어진 조건에 맞는 법칙 선택',
        ],
        exampleSetup: '삼각형에서 두 변이 5, 7이고 끼인각이 60°일 때, 나머지 변은?',
      },
      {
        pattern: '코사인법칙 부호',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'a² = b² + c² - 2bc cos A에서 마지막 항 부호',
        solutionKey: [
          'a² = b² + c² - 2bc cos A (빼기!)',
          'cos A = (b² + c² - a²) / 2bc',
          'A가 둔각이면 cos A < 0',
        ],
        exampleSetup: '세 변이 3, 5, 7인 삼각형의 가장 큰 각의 cos값은?',
      },
    ],
  },
  {
    unit: '등차수열',
    keywords: ['등차수열'],
    killerPatterns: [
      {
        pattern: '일반항 공식',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'aₙ = a₁ + nd로 착각',
        solutionKey: [
          'aₙ = a₁ + (n-1)d',
          'n번째 항까지 공차 d가 (n-1)번 더해짐',
          '등차중항: b = (a + c)/2',
        ],
        exampleSetup: '첫째항 3, 공차 2인 등차수열의 10번째 항은?',
      },
      {
        pattern: '등차수열의 합',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'Sₙ = n(n-1)d/2로 착각',
        solutionKey: [
          'Sₙ = n(a₁ + aₙ)/2',
          'Sₙ = n{2a₁ + (n-1)d}/2',
          '첫째항과 끝항을 알면 첫 번째 공식이 편리',
        ],
        exampleSetup: '1 + 2 + 3 + ... + 100의 값은?',
      },
    ],
  },
  {
    unit: '등비수열',
    keywords: ['등비수열'],
    killerPatterns: [
      {
        pattern: '일반항 지수',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'aₙ = a₁ × rⁿ으로 착각',
        solutionKey: [
          'aₙ = a₁ × r^(n-1)',
          'n번째 항까지 공비 r을 (n-1)번 곱함',
          '등비중항: b² = ac (b = ±√ac)',
        ],
        exampleSetup: '첫째항 2, 공비 3인 등비수열의 5번째 항은?',
      },
      {
        pattern: 'r = 1인 경우',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '등비수열 합 공식에서 r = 1인 경우 처리',
        solutionKey: [
          'r ≠ 1: Sₙ = a₁(1-rⁿ)/(1-r) = a₁(rⁿ-1)/(r-1)',
          'r = 1: Sₙ = na₁',
          'r = 1이면 등차수열(공차 0)',
        ],
        exampleSetup: '2 + 2 + 2 + ... + 2 (n개)의 합은?',
      },
    ],
  },
  {
    unit: '시그마',
    keywords: ['시그마', '수열의 합', '부분분수', '급수의 합'],
    killerPatterns: [
      {
        pattern: 'Σ 공식',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'Σk² = n(n+1)/2로 착각',
        solutionKey: [
          'Σk = n(n+1)/2',
          'Σk² = n(n+1)(2n+1)/6',
          'Σk³ = {n(n+1)/2}²',
        ],
        exampleSetup: '1² + 2² + 3² + ... + 10²의 값은?',
      },
      {
        pattern: '부분분수 분해',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '소거 패턴 파악 실패',
        solutionKey: [
          '1/k(k+1) = 1/k - 1/(k+1) 형태로 분해',
          '연속된 항이 소거됨',
          '처음 몇 개와 마지막 몇 개만 남음',
        ],
        exampleSetup: 'Σ(k=1 to n) 1/k(k+1)의 값은?',
      },
    ],
  },
  {
    unit: '수학적 귀납법',
    keywords: ['수학적 귀납법'],
    killerPatterns: [
      {
        pattern: '귀납 가정 미사용',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'n = k+1 증명에서 n = k 가정을 사용하지 않음',
        solutionKey: [
          '반드시 n = k일 때 성립한다는 가정을 이용',
          '가정을 이용하지 않으면 귀납법이 아님',
          'P(k) → P(k+1)을 보여야 함',
        ],
        exampleSetup: '1 + 2 + ... + n = n(n+1)/2를 수학적 귀납법으로 증명하시오.',
      },
      {
        pattern: 'n = 1 확인 생략',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'n = 1일 때 성립 확인을 빠뜨림',
        solutionKey: [
          '귀납법 첫 단계: n = 1(또는 시작값)에서 성립 확인',
          '이 단계가 없으면 증명 불완전',
          '반례가 존재할 수 있음',
        ],
        exampleSetup: 'n = 2부터 시작하는 명제는 n = 2에서 확인',
      },
    ],
  },
  {
    unit: '함수의 극한',
    keywords: ['함수의 극한'],
    killerPatterns: [
      {
        pattern: '0/0 부정형',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '0/0을 0으로 바로 계산',
        solutionKey: [
          '0/0 꼴은 부정형 → 인수분해나 유리화',
          '공통인수를 약분하면 극한 계산 가능',
          '분자, 분모가 모두 0으로 가는지 먼저 확인',
        ],
        exampleSetup: 'lim(x→2) (x² - 4)/(x - 2)의 값은?',
      },
      {
        pattern: '∞/∞ 부정형',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '∞/∞를 1로 계산하거나 처리 못함',
        solutionKey: [
          '분자, 분모를 최고차항으로 나눔',
          '분자 차수 > 분모 차수: 발산',
          '분자 차수 = 분모 차수: 최고차 계수비',
          '분자 차수 < 분모 차수: 0',
        ],
        exampleSetup: 'lim(x→∞) (3x² + 2x)/(x² - 1)의 값은?',
      },
    ],
  },
  {
    unit: '연속',
    keywords: ['연속', '불연속', '연속함수', '중간값 정리'],
    killerPatterns: [
      {
        pattern: '연속의 세 조건',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '조건 하나만 확인하고 연속이라고 판단',
        solutionKey: [
          '① f(a)가 정의됨',
          '② lim(x→a) f(x)가 존재함',
          '③ lim(x→a) f(x) = f(a)',
          '세 조건 모두 만족해야 연속',
        ],
        exampleSetup: 'f(x) = (x² - 1)/(x - 1) (x ≠ 1), f(1) = 2일 때, x = 1에서 연속인가?',
      },
      {
        pattern: '미분가능 → 연속',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '연속이면 미분가능하다고 착각',
        solutionKey: [
          '미분가능 → 연속 (항상 성립)',
          '연속 → 미분가능 (성립 안 함)',
          'y = |x|는 x = 0에서 연속이지만 미분 불가능',
        ],
        exampleSetup: 'f(x) = |x|는 x = 0에서 미분가능한가?',
      },
    ],
  },
  {
    unit: '미분계수',
    keywords: ['미분계수', '도함수', '접선의 방정식', '미분의 정의'],
    killerPatterns: [
      {
        pattern: '미분계수의 정의',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '극한에서 h → a로 착각',
        solutionKey: [
          'f\'(a) = lim(h→0) [f(a+h) - f(a)]/h',
          '또는 f\'(a) = lim(x→a) [f(x) - f(a)]/(x-a)',
          'h는 0으로, x는 a로 감',
        ],
        exampleSetup: 'f(x) = x²의 x = 3에서의 미분계수를 정의를 이용해 구하시오.',
      },
      {
        pattern: '상수의 미분',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '상수의 미분이 그 상수라고 착각',
        solutionKey: [
          '(상수)\' = 0',
          '(cf(x))\' = cf\'(x) (상수 × 함수)',
          '(xⁿ)\' = nxⁿ⁻¹',
        ],
        exampleSetup: '(3x² + 5)\'을 구하시오.',
      },
    ],
  },
  {
    unit: '도함수의 활용',
    grade: '고등',  // 미적분I 극값·접선
    keywords: ['도함수의 활용'],
    killerPatterns: [
      {
        pattern: 'f\'(a) = 0이면 극값?',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'f\'(a) = 0인 점이 항상 극값이라고 착각',
        solutionKey: [
          'f\'(a) = 0이고 f\'(x)의 부호가 바뀌어야 극값',
          'f\'(x) = 0이어도 부호가 안 바뀌면 극값 아님',
          '예: f(x) = x³, f\'(0) = 0이지만 극값 아님',
        ],
        exampleSetup: 'f(x) = x³의 x = 0에서 극값을 가지는가?',
      },
      {
        pattern: '접선의 방정식',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '기울기를 f(a)로 착각',
        solutionKey: [
          '점 (a, f(a))에서 접선의 기울기 = f\'(a)',
          '접선의 방정식: y - f(a) = f\'(a)(x - a)',
          '함숫값과 미분계수를 혼동하지 않기',
        ],
        exampleSetup: 'y = x²에서 x = 2인 점에서의 접선의 방정식은?',
      },
    ],
  },
  {
    unit: '부정적분',
    keywords: ['부정적분'],
    killerPatterns: [
      {
        pattern: '적분상수 누락',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '+ C를 빠뜨림',
        solutionKey: [
          '부정적분은 반드시 + C',
          '정적분은 C 없음 (소거됨)',
          '초기 조건이 주어지면 C 결정',
        ],
        exampleSetup: '∫2x dx = x² + C (C 필수)',
      },
      {
        pattern: 'xⁿ의 적분',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '∫xⁿ dx = xⁿ⁺¹로 착각 (n+1로 안 나눔)',
        solutionKey: [
          '∫xⁿ dx = xⁿ⁺¹/(n+1) + C (n ≠ -1)',
          'n = -1일 때: ∫(1/x) dx = ln|x| + C',
          '미분하여 검산',
        ],
        exampleSetup: '∫x³ dx를 구하시오.',
      },
    ],
  },
  {
    unit: '정적분',
    keywords: ['정적분'],
    killerPatterns: [
      {
        pattern: '정적분 계산 순서',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'F(a) - F(b)로 계산 (순서 반대)',
        solutionKey: [
          '∫[a to b] f(x) dx = F(b) - F(a)',
          '"위끝 - 아래끝"',
          '적분 구간 바꾸면 부호 반대',
        ],
        exampleSetup: '∫[1 to 3] 2x dx의 값은?',
      },
      {
        pattern: '기함수의 적분',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '기함수의 대칭 구간 적분이 0임을 모름',
        solutionKey: [
          'f(-x) = -f(x) (기함수)이면 ∫[-a to a] f(x) dx = 0',
          'f(-x) = f(x) (우함수)이면 ∫[-a to a] f(x) dx = 2∫[0 to a] f(x) dx',
          '대칭성 활용하면 계산 단축',
        ],
        exampleSetup: '∫[-2 to 2] x³ dx의 값은?',
      },
    ],
  },
  {
    unit: '정적분의 활용',
    grade: '고등',  // 미적분I 넓이·속도
    keywords: ['정적분의 활용'],
    killerPatterns: [
      {
        pattern: 'x축 아래 부분의 넓이',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '음수 그대로 계산하면 넓이가 음수',
        solutionKey: [
          '넓이는 항상 양수',
          'x축 아래 부분: 적분값에 -1을 곱하거나 |f(x)|를 적분',
          '구간을 나누어 각각 양수화',
        ],
        exampleSetup: 'y = x² - 4와 x축 사이의 넓이를 구하시오. (-2 ≤ x ≤ 2)',
      },
      {
        pattern: '두 곡선 사이 넓이',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '위, 아래 곡선 구분 없이 계산',
        solutionKey: [
          '넓이 = ∫[a to b] |f(x) - g(x)| dx',
          'f(x) ≥ g(x)이면 ∫[a to b] (f(x) - g(x)) dx',
          '위아래가 바뀌는 구간에서 분리',
        ],
        exampleSetup: 'y = x²과 y = x + 2 사이의 넓이를 구하시오.',
      },
    ],
  },
  {
    unit: '중복순열',
    keywords: ['중복순열', '중복조합', '원순열', '같은 것이 있는 순열'],
    killerPatterns: [
      {
        pattern: '중복조합',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '중복순열과 중복조합 공식 혼동',
        solutionKey: [
          '중복순열: nΠr = nʳ (순서 O, 중복 O)',
          '중복조합: nHr = ₙ₊ᵣ₋₁Cᵣ (순서 X, 중복 O)',
          '중복조합에서 n + r - 1에 주의',
        ],
        exampleSetup: '3종류의 과일 중에서 중복을 허용하여 5개를 선택하는 경우의 수는?',
      },
      {
        pattern: '조건부 순열',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '특정 조건(이웃, 이웃하지 않음)이 있는 순열',
        solutionKey: [
          '이웃하는 경우: 묶어서 하나로 취급',
          '이웃하지 않는 경우: 나머지 배열 후 빈자리에 배치',
          '양 끝 조건: 양 끝 먼저 배열',
        ],
        exampleSetup: 'A, B, C, D, E를 일렬로 배열할 때, A와 B가 이웃하는 경우의 수는?',
      },
    ],
  },
  {
    unit: '이항정리',
    keywords: ['이항정리'],
    killerPatterns: [
      {
        pattern: '일반항의 r',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(a+b)ⁿ의 일반항에서 r을 1부터 시작',
        solutionKey: [
          '일반항: ₙCᵣ aⁿ⁻ʳ bʳ, r은 0부터 n까지',
          'r+1번째 항의 r값 주의',
          '특정 항 = x^k 형태 맞추기',
        ],
        exampleSetup: '(x + 2)⁵의 전개식에서 x³의 계수는?',
      },
      {
        pattern: '(-b)ʳ 부호',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '(a-b)ⁿ에서 (-1)ʳ 처리 누락',
        solutionKey: [
          '(a-b)ⁿ의 일반항: ₙCᵣ aⁿ⁻ʳ (-b)ʳ = ₙCᵣ aⁿ⁻ʳ (-1)ʳ bʳ',
          'r이 홀수면 음수, 짝수면 양수',
          '부호 결정 후 계수 계산',
        ],
        exampleSetup: '(x - 1)⁶의 전개식에서 x⁴의 계수는?',
      },
    ],
  },
  {
    unit: '확률의 기본',
    keywords: ['확률의 기본', '덧셈정리', '여사건', '확률 기본'],
    killerPatterns: [
      {
        pattern: '덧셈정리에서 중복',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'P(A∪B) = P(A) + P(B)로 계산 (중복 미제외)',
        solutionKey: [
          'P(A∪B) = P(A) + P(B) - P(A∩B)',
          '배반사건이면 P(A∩B) = 0',
          '벤 다이어그램으로 확인',
        ],
        exampleSetup: '주사위를 던져 3의 배수 또는 짝수가 나올 확률은?',
      },
      {
        pattern: '여사건',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '"적어도"를 직접 계산하다 경우 누락',
        solutionKey: [
          'P(적어도 하나) = 1 - P(하나도 아님)',
          '"적어도", "최소한" → 여사건 활용',
          '직접 계산보다 훨씬 간단',
        ],
        exampleSetup: '동전 4개를 던질 때, 적어도 1개가 앞면일 확률은?',
      },
    ],
  },
  {
    unit: '조건부확률',
    keywords: ['조건부확률'],
    killerPatterns: [
      {
        pattern: 'P(B|A)와 P(A|B) 혼동',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '조건의 위치를 바꿔서 계산',
        solutionKey: [
          'P(B|A) = P(A∩B)/P(A): A가 주어졌을 때 B',
          'P(A|B) = P(A∩B)/P(B): B가 주어졌을 때 A',
          '조건(주어진 사건)이 분모에 들어감',
        ],
        exampleSetup: 'P(A) = 0.3, P(B) = 0.4, P(A∩B) = 0.1일 때, P(B|A)는?',
      },
      {
        pattern: '독립과 배반',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '독립사건과 배반사건을 같은 개념으로 착각',
        solutionKey: [
          '독립: P(A∩B) = P(A)P(B) → 서로 영향 없음',
          '배반: P(A∩B) = 0 → 동시에 일어나지 않음',
          '독립 ≠ 배반 (완전히 다른 개념)',
        ],
        exampleSetup: 'P(A) = 0.3, P(B) = 0.5일 때, A, B가 독립이면 P(A∩B)는?',
      },
    ],
  },
  {
    unit: '확률분포',
    keywords: ['확률분포'],
    killerPatterns: [
      {
        pattern: '분산 공식',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'V(X) = E(X)² - E(X²)로 착각',
        solutionKey: [
          'V(X) = E(X²) - {E(X)}²',
          'E(X²)가 먼저, {E(X)}²를 뺌',
          '또는 V(X) = E((X - μ)²)',
        ],
        exampleSetup: 'E(X) = 3, E(X²) = 13일 때, V(X)는?',
      },
      {
        pattern: 'V(aX+b) 공식',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'V(aX+b) = a²V(X) + b로 착각',
        solutionKey: [
          'E(aX+b) = aE(X) + b',
          'V(aX+b) = a²V(X) (b는 분산에 영향 없음)',
          'σ(aX+b) = |a|σ(X)',
        ],
        exampleSetup: 'V(X) = 4일 때, V(3X - 2)는?',
      },
    ],
  },
  {
    unit: '정규분포',
    keywords: ['정규분포'],
    killerPatterns: [
      {
        pattern: '표준화 공식',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'Z = (X-μ)/σ에서 분자와 분모를 반대로',
        solutionKey: [
          'Z = (X - μ)/σ',
          '"값에서 평균을 빼고 표준편차로 나눈다"',
          '표준화하면 N(0, 1)이 됨',
        ],
        exampleSetup: 'X ~ N(50, 10²)일 때, X = 70을 표준화하면?',
      },
      {
        pattern: '정규분포표 대칭성',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'P(Z ≤ -a) 계산에서 대칭성 미활용',
        solutionKey: [
          'P(Z ≤ -a) = P(Z ≥ a) = 1 - P(Z ≤ a)',
          'P(-a ≤ Z ≤ a) = 2P(0 ≤ Z ≤ a)',
          '표준정규분포는 y축 대칭',
        ],
        exampleSetup: 'P(Z ≤ 1.5) = 0.9332일 때, P(Z ≥ -1.5)는?',
      },
    ],
  },
  {
    unit: '표본평균',
    keywords: ['표본평균', '모평균 추정', '신뢰구간', '표본조사'],
    killerPatterns: [
      {
        pattern: '신뢰구간 공식',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '√n을 n으로 착각',
        solutionKey: [
          '신뢰구간: x̄ ± z × σ/√n',
          '분모는 √n (n이 아님!)',
          'n이 커지면 구간 폭이 좁아짐',
        ],
        exampleSetup: 'n = 100, σ = 10, x̄ = 50일 때, 95% 신뢰구간은?',
      },
      {
        pattern: 'n과 신뢰구간 폭',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'n이 커지면 신뢰구간이 넓어진다고 착각',
        solutionKey: [
          'n ↑ → 신뢰구간 폭 ↓ (좁아짐)',
          '신뢰도 ↑ → 신뢰구간 폭 ↑ (넓어짐)',
          '표본 크기와 신뢰도는 반대 효과',
        ],
        exampleSetup: '표본 크기를 4배로 늘리면 신뢰구간 폭은?',
      },
    ],
  },
  {
    unit: '수열의 극한',
    keywords: ['수열의 극한'],
    killerPatterns: [
      {
        pattern: '등비수열의 수렴',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '|r| ≤ 1이면 수렴이라고 착각',
        solutionKey: [
          '|r| < 1: 수렴 (→ 0)',
          'r = 1: 상수 a₁으로 수렴',
          'r = -1: 진동 (발산)',
          '|r| > 1: 발산',
        ],
        exampleSetup: 'aₙ = (-1)ⁿ의 극한은?',
      },
      {
        pattern: 'lim aₙ = 0과 급수의 수렴',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'lim aₙ = 0이면 Σaₙ이 수렴한다고 착각',
        solutionKey: [
          'lim aₙ ≠ 0이면 급수는 반드시 발산',
          'lim aₙ = 0이어도 급수는 수렴할 수도, 발산할 수도 있음',
          '예: Σ(1/n)은 발산 (조화급수)',
        ],
        exampleSetup: 'lim(n→∞) 1/n = 0이지만 Σ(1/n)은?',
      },
    ],
  },
  {
    unit: '급수',
    keywords: ['급수'],
    killerPatterns: [
      {
        pattern: '등비급수 수렴 조건',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '|r| ≥ 1일 때 합 공식 적용',
        solutionKey: [
          '|r| < 1일 때만 수렴, 합 = a/(1-r)',
          '|r| ≥ 1이면 발산 (합 없음)',
          '수렴 조건 먼저 확인',
        ],
        exampleSetup: 'Σ(1/2)ⁿ (n=1 to ∞)의 합은?',
      },
      {
        pattern: '급수와 정적분',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '급수의 합을 정적분으로 바꾸는 연결 실패',
        solutionKey: [
          'lim(n→∞) (1/n) Σf(k/n) = ∫[0 to 1] f(x) dx',
          '구분구적법의 역과정',
          '급수를 리만합으로 해석',
        ],
        exampleSetup: 'lim(n→∞) (1/n)(1² + 2² + ... + n²)/n²의 값은?',
      },
    ],
  },
  {
    unit: '지수함수 미분',
    keywords: ['지수함수 미분', '로그함수 미분', '삼각함수 미분'],
    killerPatterns: [
      {
        pattern: '지수/로그 미분 혼동',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(eˣ)\' = xeˣ⁻¹로 착각',
        solutionKey: [
          '(eˣ)\' = eˣ (자기 자신)',
          '(aˣ)\' = aˣ ln a',
          '(ln x)\' = 1/x',
          '(logₐ x)\' = 1/(x ln a)',
        ],
        exampleSetup: '(e²ˣ)\'을 구하시오.',
      },
      {
        pattern: '삼각함수 미분 부호',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(cos x)\' = sin x로 착각',
        solutionKey: [
          '(sin x)\' = cos x',
          '(cos x)\' = -sin x (마이너스!)',
          '(tan x)\' = sec²x',
        ],
        exampleSetup: '(sin x + cos x)\'을 구하시오.',
      },
    ],
  },
  {
    unit: '합성함수 미분',
    keywords: ['합성함수 미분', '매개변수 미분', '음함수 미분', '역함수 미분'],
    killerPatterns: [
      {
        pattern: '합성함수 미분 (연쇄법칙)',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '속미분을 빠뜨림',
        solutionKey: [
          '{f(g(x))}\' = f\'(g(x)) × g\'(x)',
          '겉미분 × 속미분',
          '(sin 2x)\' = cos 2x × 2 = 2cos 2x',
        ],
        exampleSetup: '(e^(x²))\'을 구하시오.',
      },
      {
        pattern: '몫의 미분 부호',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(f/g)\' = (f\'g + fg\')/g²로 착각',
        solutionKey: [
          '(f/g)\' = (f\'g - fg\')/g² (빼기!)',
          '분자: 분자 미분 × 분모 - 분자 × 분모 미분',
          '분모: 분모의 제곱',
        ],
        exampleSetup: '(x/(x+1))\'을 구하시오.',
      },
    ],
  },
  {
    unit: '도함수의 활용',
    grade: '고등',  // 미적분II 변곡점·이계도함수
    keywords: ['도함수의 활용'],
    killerPatterns: [
      {
        pattern: '이계도함수와 볼록성',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'f\'\'(x) > 0이면 위로 볼록이라고 착각',
        solutionKey: [
          'f\'\'(x) > 0: 아래로 볼록 (∪)',
          'f\'\'(x) < 0: 위로 볼록 (∩)',
          '변곡점: f\'\'(x) = 0이고 부호가 바뀌는 점',
        ],
        exampleSetup: 'f(x) = x³의 변곡점은?',
      },
      {
        pattern: '매개변수 미분',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'dy/dx = (dx/dt)/(dy/dt)로 착각',
        solutionKey: [
          'dy/dx = (dy/dt)/(dx/dt)',
          '분자가 y, 분모가 x',
          '이계도함수: d²y/dx² = (d/dt(dy/dx))/(dx/dt)',
        ],
        exampleSetup: 'x = t², y = t³일 때, dy/dx는?',
      },
    ],
  },
  {
    unit: '치환적분',
    keywords: ['치환적분', '부분적분'],
    killerPatterns: [
      {
        pattern: '치환적분 du 처리',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'u = g(x)로 치환 후 du 처리 누락',
        solutionKey: [
          'u = g(x)이면 du = g\'(x) dx',
          'dx = du/g\'(x)로 바꾸기',
          '정적분에서는 적분 구간도 바꿈',
        ],
        exampleSetup: '∫2x × e^(x²) dx를 치환적분으로 구하시오.',
      },
      {
        pattern: '부분적분 선택',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'f와 g\' 선택을 잘못하여 더 복잡해짐',
        solutionKey: [
          'LIATE 순서: 로그 > 역삼각 > 대수(다항) > 삼각 > 지수',
          '앞에 있는 것을 f로, 뒤의 것을 g\'로',
          '∫x eˣ dx에서 f = x, g\' = eˣ',
        ],
        exampleSetup: '∫x cos x dx를 부분적분으로 구하시오.',
      },
    ],
  },
  {
    unit: '정적분의 활용',
    grade: '고등',  // 미적분II 회전체 부피
    keywords: ['정적분의 활용'],
    killerPatterns: [
      {
        pattern: '회전체 부피 π 누락',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'V = ∫{f(x)}² dx로 계산 (π 빠뜨림)',
        solutionKey: [
          'V = π∫[a to b] {f(x)}² dx',
          '단면적 πr²을 적분',
          'y축 회전은 x와 y를 바꿔서',
        ],
        exampleSetup: 'y = x (0 ≤ x ≤ 1)을 x축 둘레로 회전한 회전체의 부피는?',
      },
      {
        pattern: '정적분으로 정의된 함수',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'F(x) = ∫[a to g(x)] f(t) dt의 미분',
        solutionKey: [
          'F(x) = ∫[a to x] f(t) dt이면 F\'(x) = f(x)',
          '상한이 g(x)이면 F\'(x) = f(g(x)) × g\'(x)',
          '합성함수 미분 적용',
        ],
        exampleSetup: 'F(x) = ∫[0 to x²] t dt일 때, F\'(x)는?',
      },
    ],
  },
  {
    unit: '포물선',
    keywords: ['포물선', '초점', '준선', '포물선의 방정식'],
    killerPatterns: [
      {
        pattern: '포물선 초점과 준선',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'y² = 4px에서 초점을 (4p, 0)으로 착각',
        solutionKey: [
          'y² = 4px: 초점 (p, 0), 준선 x = -p',
          'x² = 4py: 초점 (0, p), 준선 y = -p',
          '4p에서 4로 나눈 값이 p',
        ],
        exampleSetup: 'y² = 8x의 초점과 준선은?',
      },
    ],
  },
  {
    unit: '타원',
    keywords: ['타원', '타원의 방정식', '장축', '단축'],
    killerPatterns: [
      {
        pattern: '타원의 c² 공식',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '타원에서 c² = a² + b²로 착각 (쌍곡선 공식과 혼동)',
        solutionKey: [
          '타원: c² = a² - b² (빼기)',
          '타원은 a > c (항상)',
          '이심률 e = c/a (0 < e < 1)',
        ],
        exampleSetup: '타원 x²/25 + y²/16 = 1의 초점의 좌표는?',
      },
    ],
  },
  {
    unit: '쌍곡선',
    keywords: ['쌍곡선', '쌍곡선의 방정식', '점근선'],
    killerPatterns: [
      {
        pattern: '쌍곡선의 c² 공식과 점근선',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '쌍곡선에서 c² = a² - b²로 착각하거나, 점근선을 y = ±(a/b)x로 착각',
        solutionKey: [
          '쌍곡선: c² = a² + b² (더하기)',
          'x²/a² - y²/b² = 1의 점근선: y = ±(b/a)x',
          '쌍곡선은 c > a',
        ],
        exampleSetup: 'x²/9 - y²/4 = 1의 초점과 점근선은?',
      },
    ],
  },
  {
    unit: '벡터의 연산',
    keywords: ['벡터의 연산', '벡터의 합', '벡터의 차', '실수배'],
    killerPatterns: [
      {
        pattern: '벡터 평행 조건',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '두 벡터가 평행한 조건을 내적 = 0으로 착각',
        solutionKey: [
          '평행 조건: a⃗ = kb⃗ (실수배 관계)',
          '수직 조건: a⃗·b⃗ = 0 (내적이 0)',
          '실수배 ka⃗: k > 0 같은 방향, k < 0 반대 방향',
        ],
        exampleSetup: 'a⃗ = (2, 3)과 평행하고 크기가 √52인 벡터를 구하시오.',
      },
    ],
  },
  {
    unit: '벡터의 내적',
    keywords: ['벡터의 내적', '벡터의 성분', '수직 조건'],
    killerPatterns: [
      {
        pattern: '내적과 수직',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '내적 = 0이면 평행이라고 착각',
        solutionKey: [
          'a⃗·b⃗ = 0 ⟺ a⃗ ⊥ b⃗ (수직)',
          '평행 조건: a⃗ = kb⃗ (실수배)',
          '내적의 기하적 의미: |a⃗||b⃗|cos θ',
        ],
        exampleSetup: 'a⃗ = (2, 3), b⃗ = (3, -2)일 때, a⃗와 b⃗는 어떤 관계?',
      },
      {
        pattern: '내적 성분 계산',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'a⃗·b⃗ = a₁b₂ + a₂b₁로 착각',
        solutionKey: [
          'a⃗·b⃗ = a₁b₁ + a₂b₂ (같은 성분끼리)',
          'a⃗ = (a₁, a₂), b⃗ = (b₁, b₂)',
          '|a⃗|² = a⃗·a⃗ = a₁² + a₂²',
        ],
        exampleSetup: 'a⃗ = (1, 2), b⃗ = (3, 4)일 때, a⃗·b⃗는?',
      },
    ],
  },
  {
    unit: '삼수선 정리',
    keywords: ['삼수선 정리', '정사영', '이면각', '공간 위치 관계'],
    killerPatterns: [
      {
        pattern: '좌표평면 위의 점',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'xy평면 위의 점에서 z = 0인 것을 잊음',
        solutionKey: [
          'xy평면 위: z = 0',
          'yz평면 위: x = 0',
          'zx평면 위: y = 0',
        ],
        exampleSetup: '점 (3, 4, 5)에서 xy평면에 내린 수선의 발의 좌표는?',
      },
    ],
  },
  {
    unit: '공간좌표',
    keywords: ['공간좌표', '구의 방정식', '공간에서의 거리'],
    killerPatterns: [
      {
        pattern: '공간 거리 공식',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'z성분을 빠뜨림',
        solutionKey: [
          'd = √{(x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²}',
          '평면 거리에 z성분 추가',
          '구의 방정식에서도 세 성분 모두',
        ],
        exampleSetup: '(1, 2, 3)과 (4, 6, 3) 사이의 거리는?',
      },
    ],
  },
  // ===== 추가 킬러 문항 유형 (53개 토픽) =====
  {
    unit: '최대공약수',
    keywords: ['최대공약수', '최소공배수', '공약수', '공배수'],
    killerPatterns: [
      {
        pattern: '조건을 만족하는 자연수 찾기',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '최대공약수와 최소공배수의 관계를 이용해 역으로 수를 찾는 문제에서 서로소 조건을 빠뜨림',
        solutionKey: [
          'GCD×LCM=두 수의 곱 활용',
          '소인수분해로 조건 체계적 정리',
          '두 수를 GCD로 나눈 몫은 반드시 서로소',
        ],
        exampleSetup: '최대공약수가 12이고 최소공배수가 180인 두 자연수를 모두 구하시오.',
      },
      {
        pattern: '세 수의 최대공약수·최소공배수',
        difficulty: '상',
        frequency: '가끔출제',
        trapDescription: '세 수의 최소공배수를 두 수씩 순서대로 구하면서 중복 소인수를 놓침',
        solutionKey: [
          '세 수 모두 소인수분해 후 각 소인수별로 지수 비교',
          'GCD: 공통 소인수의 최소 지수, LCM: 모든 소인수의 최대 지수',
        ],
        exampleSetup: '12, 18, 30의 최대공약수와 최소공배수는?',
      },
    ],
  },
  {
    unit: '양수와 음수',
    keywords: ['양수와 음수', '양수', '음수', '절댓값', '수의 대소'],
    killerPatterns: [
      {
        pattern: '절댓값과 부호 판별 문제',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '|a| = 3일 때 a = 3만 생각하고 a = -3을 빠뜨리는 실수',
        solutionKey: [
          '|a| = k이면 a = k 또는 a = -k (두 값)',
          '|a - b|는 수직선에서 a와 b 사이의 거리',
          '절댓값 안의 부호를 경우 분리',
        ],
        exampleSetup: '|x| = 5를 만족하는 정수 x의 합은?',
      },
    ],
  },
  {
    unit: '정수의 사칙연산',
    keywords: ['정수의 사칙연산', '정수의 덧셈', '정수의 뺄셈', '정수의 곱셈', '정수의 나눗셈'],
    killerPatterns: [
      {
        pattern: '부호가 섞인 복합 계산',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '여러 단계의 사칙연산에서 부호 규칙을 잘못 적용하여 중간 결과 부호가 뒤집힘',
        solutionKey: [
          '곱셈·나눗셈의 부호: 음수 개수가 짝수면 양, 홀수면 음',
          '뺄셈 → 부호를 바꾸어 덧셈으로 변환',
          '괄호부터 계산하고, 연산 순서를 반드시 지키기',
        ],
        exampleSetup: '(-3) × {(-2) + 5} ÷ (-1)의 값은?',
      },
    ],
  },
  {
    unit: '유리수의 사칙연산',
    keywords: ['유리수의 사칙연산', '유리수의 덧셈', '유리수의 뺄셈', '분수의 계산'],
    killerPatterns: [
      {
        pattern: '혼합 계산 연산 순서',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '분수의 혼합 계산에서 덧셈을 곱셈보다 먼저 하거나 통분 과정에서 부호를 잃어버림',
        solutionKey: [
          '거듭제곱 → 곱셈·나눗셈 → 덧셈·뺄셈 순서',
          '나눗셈은 역수를 곱하는 것으로 변환',
          '통분 후 분자 계산에서 부호 주의',
        ],
        exampleSetup: '(-2/3) ÷ 4/9 - 1/2 × (-3)의 값은?',
      },
    ],
  },
  {
    unit: '문자의 사용',
    keywords: ['문자의 사용', '식의 값', '대입', '문자를 사용한 식'],
    killerPatterns: [
      {
        pattern: '곱셈 기호 생략 규칙 역이용',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '문자식을 수식으로 바꿀 때 곱셈 기호 생략 규칙을 역으로 적용하지 못해 대입 실수',
        solutionKey: [
          '2a = 2 × a, a² = a × a 로 풀어서 대입',
          '음수 대입 시 반드시 괄호 사용: a = -3 → 2a = 2 × (-3)',
          '나눗셈은 분수로 표현된 것을 인식',
        ],
        exampleSetup: 'a = -2, b = 3일 때, 2a² - 3b의 값은?',
      },
    ],
  },
  {
    unit: '일차식의 계산',
    keywords: ['일차식의 계산', '일차식', '동류항', '일차식의 덧셈', '일차식의 뺄셈'],
    killerPatterns: [
      {
        pattern: '괄호 앞 음수 분배',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '-(2x - 3)에서 -를 분배할 때 뒤 항의 부호를 바꾸지 않는 실수',
        solutionKey: [
          '괄호 앞 음수: 괄호 안 모든 항의 부호를 바꿈',
          '분수 계수의 동류항 정리: 통분 필수',
          '동류항끼리만 합칠 수 있음 (x항, 상수항 분리)',
        ],
        exampleSetup: '3(2x - 1) - 2(x + 4)를 간단히 하시오.',
      },
    ],
  },
  {
    unit: '좌표평면',
    keywords: ['좌표평면', '좌표', '순서쌍', '사분면'],
    killerPatterns: [
      {
        pattern: '사분면 조건 문제',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '좌표축 위의 점(x=0 또는 y=0)을 특정 사분면에 속하는 것으로 착각',
        solutionKey: [
          '좌표축 위의 점은 어떤 사분면에도 속하지 않음',
          '제1사분면: x>0, y>0 / 제2: x<0, y>0 / 제3: x<0, y<0 / 제4: x>0, y<0',
          '점의 부호 조건을 부등식으로 정리',
        ],
        exampleSetup: '점 (a-1, 2-b)가 제3사분면에 있을 때 a, b의 범위는?',
      },
    ],
  },
  {
    unit: '점·선·면',
    keywords: ['점·선·면', '점 선 면', '교점', '교선', '수선'],
    killerPatterns: [
      {
        pattern: '직선·반직선·선분의 개수',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '한 직선 위의 n개 점에서 만들어지는 선분, 반직선의 수를 구할 때 공식을 혼동',
        solutionKey: [
          '선분의 수: nC₂ = n(n-1)/2',
          '반직선의 수: 2(n-1) (양쪽 방향)',
          '직선은 항상 1개 (한 직선 위이므로)',
        ],
        exampleSetup: '한 직선 위에 5개의 점이 있을 때, 선분의 개수는?',
      },
    ],
  },
  {
    unit: '위치 관계',
    keywords: ['위치 관계', '평행', '꼬인 위치', '수직'],
    killerPatterns: [
      {
        pattern: '꼬인 위치 판별',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '한 평면 위에 있지 않으면서 만나지 않는 두 직선을 평행으로 착각',
        solutionKey: [
          '꼬인 위치: 같은 평면 위에 있지 않은 두 직선',
          '만나지도 않고 평행하지도 않음',
          '공간에서만 존재 (평면에서는 없음)',
        ],
        exampleSetup: '직육면체에서 모서리 AB와 꼬인 위치에 있는 모서리를 모두 구하시오.',
      },
    ],
  },
  {
    unit: '다각형의 성질',
    keywords: ['다각형의 성질', '다각형', '내각', '외각', '대각선'],
    killerPatterns: [
      {
        pattern: '내각·외각의 합 응용',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '정n각형의 한 내각과 한 외각 공식을 혼동하거나 대각선 개수 공식에서 2로 나누는 것을 빠뜨림',
        solutionKey: [
          '내각의 합: (n-2) × 180°',
          '외각의 합: 항상 360°',
          '대각선의 수: n(n-3)/2',
        ],
        exampleSetup: '정다각형의 한 내각이 140°일 때, 이 다각형의 대각선의 수는?',
      },
    ],
  },
  {
    unit: '원과 부채꼴',
    keywords: ['원과 부채꼴', '부채꼴', '호의 길이', '넓이'],
    killerPatterns: [
      {
        pattern: '부채꼴의 호의 길이와 넓이 공식 적용',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '부채꼴 넓이 공식 S = (1/2)lr에서 l(호의 길이)과 r(반지름)을 혼동하거나, 중심각을 라디안으로 변환하지 않음',
        solutionKey: [
          'S = (1/2) × l × r (l: 호의 길이, r: 반지름)',
          'l = 2πr × (중심각/360°)',
          'S = πr² × (중심각/360°)',
        ],
        exampleSetup: '반지름이 6cm이고 중심각이 120°인 부채꼴의 넓이와 호의 길이는?',
      },
    ],
  },
  {
    unit: '다면체',
    keywords: ['다면체', '정다면체', '각기둥', '각뿔'],
    killerPatterns: [
      {
        pattern: '오일러 공식과 정다면체',
        difficulty: '상',
        frequency: '가끔출제',
        trapDescription: '꼭짓점·모서리·면의 수에서 오일러 공식(V-E+F=2)을 적용하지 않거나, 정다면체가 5종류뿐임을 모름',
        solutionKey: [
          '오일러 공식: V - E + F = 2',
          '정다면체: 정사면체, 정육면체, 정팔면체, 정십이면체, 정이십면체',
          '각기둥의 모서리 수: 3n, 각뿔의 모서리 수: 2n',
        ],
        exampleSetup: '한 꼭짓점에 정삼각형이 4개씩 모이는 정다면체의 모서리 수는?',
      },
    ],
  },
  {
    unit: '겉넓이',
    keywords: ['겉넓이', '표면적', '입체도형의 겉넓이'],
    killerPatterns: [
      {
        pattern: '전개도와 겉넓이 계산',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '원뿔의 옆면 전개도가 부채꼴임을 이용하지 못하거나, 원기둥의 옆면이 직사각형인 것을 놓침',
        solutionKey: [
          '원기둥 겉넓이: 2πr² + 2πrh',
          '원뿔 겉넓이: πr² + πrl (l: 모선의 길이)',
          '구의 겉넓이: 4πr²',
        ],
        exampleSetup: '밑면 반지름 3cm, 모선 길이 5cm인 원뿔의 겉넓이는?',
      },
    ],
  },
  {
    unit: '도수분포표',
    keywords: ['도수분포표', '도수', '계급', '히스토그램'],
    killerPatterns: [
      {
        pattern: '도수분포표에서 평균 계산',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '계급값(계급의 중앙값)을 써야 하는데 계급의 양 끝 값을 사용하거나, (계급값×도수)의 합을 구한 뒤 총 도수로 나누는 것을 빠뜨림',
        solutionKey: [
          '계급값 = (계급의 시작 + 끝) / 2',
          '평균 = Σ(계급값 × 도수) / 총 도수',
          '계급의 크기가 일정한지 확인',
        ],
        exampleSetup: '도수분포표에서 계급이 40~50, 50~60, ... 일 때 평균을 구하시오.',
      },
    ],
  },
  {
    unit: '상대도수',
    keywords: ['상대도수', '상대도수의 분포'],
    killerPatterns: [
      {
        pattern: '상대도수를 이용한 비교',
        difficulty: '상',
        frequency: '가끔출제',
        trapDescription: '전체 도수가 다른 두 집단을 도수로 직접 비교하거나, 상대도수의 합이 1임을 이용하지 않음',
        solutionKey: [
          '상대도수 = (그 계급의 도수) / (전체 도수)',
          '모든 계급의 상대도수 합 = 1',
          '전체 도수가 다른 집단 비교 시 반드시 상대도수 사용',
        ],
        exampleSetup: 'A반(30명)과 B반(40명)의 성적을 상대도수로 비교하시오.',
      },
    ],
  },
  {
    unit: '유한소수',
    keywords: ['유한소수', '순환소수', '유리수와 순환소수'],
    killerPatterns: [
      {
        pattern: '유한소수 판별 조건',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '기약분수의 분모를 소인수분해했을 때 2와 5 이외의 소인수가 있으면 무한소수인데, 약분하지 않은 채로 판별하는 실수',
        solutionKey: [
          '반드시 기약분수로 만든 후 분모를 소인수분해',
          '분모의 소인수가 2와 5뿐이면 유한소수',
          '그 외 소인수가 있으면 순환소수',
        ],
        exampleSetup: '12/30을 소수로 나타내면 유한소수인지 순환소수인지 판별하시오.',
      },
    ],
  },
  {
    unit: '단항식의 계산',
    keywords: ['단항식의 계산', '단항식의 곱셈', '단항식의 나눗셈', '지수법칙'],
    killerPatterns: [
      {
        pattern: '지수법칙 혼합 적용',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '(a²)³ = a⁵로 계산하거나, a² × a³ = a⁶으로 계산하는 지수법칙 혼동',
        solutionKey: [
          'a^m × a^n = a^(m+n) (밑이 같으면 지수를 더함)',
          '(a^m)^n = a^(mn) (거듭제곱의 거듭제곱은 지수를 곱함)',
          'a^m ÷ a^n = a^(m-n) (밑이 같으면 지수를 뺌)',
        ],
        exampleSetup: '(-2x²y)³ ÷ 4x³y²를 계산하시오.',
      },
    ],
  },
  {
    unit: '다항식의 계산',
    keywords: ['다항식의 계산', '다항식의 덧셈', '다항식의 뺄셈', '다항식의 곱셈'],
    killerPatterns: [
      {
        pattern: '다항식 × 다항식 전개',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '분배법칙 적용 시 일부 항을 곱하지 않고 빠뜨리는 실수 (특히 3개 이상 항)',
        solutionKey: [
          '앞 다항식의 각 항을 뒤 다항식의 모든 항에 분배',
          '전개 후 동류항 정리 필수',
          '항의 수: (m개 항) × (n개 항) = mn개 항 → 동류항 정리',
        ],
        exampleSetup: '(2x + 3)(x² - x + 1)을 전개하시오.',
      },
    ],
  },
  {
    unit: '연립부등식',
    keywords: ['연립부등식', '연립일차부등식'],
    killerPatterns: [
      {
        pattern: '연립부등식의 해 구간',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '각 부등식의 해를 수직선에 나타낸 후 공통 부분(교집합)을 찾지 않고 합집합을 구함',
        solutionKey: [
          '각 부등식을 따로 풀어 해를 구함',
          '수직선에 나타낸 뒤 공통 부분(교집합)이 해',
          '공통 부분이 없으면 해 없음',
        ],
        exampleSetup: '2x - 1 > 3 이고 -x + 4 ≥ 1을 만족하는 정수 x를 모두 구하시오.',
      },
    ],
  },
  {
    unit: '연립방정식의 활용',
    keywords: ['연립방정식의 활용', '연립방정식 활용'],
    killerPatterns: [
      {
        pattern: '속도·거리·시간 문제',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '미지수를 2개 설정한 후 식을 세울 때, 단위를 통일하지 않거나 조건을 하나만 사용',
        solutionKey: [
          '미지수 2개 → 조건 2개 필요 (식이 2개)',
          '거리 = 속력 × 시간 관계 활용',
          '단위를 반드시 통일 (분/시간, m/km)',
        ],
        exampleSetup: '갈 때 시속 4km, 올 때 시속 6km로 걸어서 총 5시간 걸렸을 때 거리는?',
      },
    ],
  },
  {
    unit: '닮음의 활용',
    keywords: ['닮음의 활용', '축도', '축척'],
    killerPatterns: [
      {
        pattern: '평행선과 선분의 비',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '삼각형에서 한 변에 평행한 직선이 다른 두 변을 만들 때, 비례식을 세울 때 대응 선분을 잘못 대입',
        solutionKey: [
          'DE//BC이면 AD:DB = AE:EC',
          '또한 AD:AB = AE:AC = DE:BC',
          '보조선(평행선)을 그어 닮음 삼각형을 만드는 전략',
        ],
        exampleSetup: '△ABC에서 DE//BC, AD = 3, DB = 5일 때 DE:BC는?',
      },
    ],
  },
  {
    unit: '제곱근의 활용',
    keywords: ['제곱근의 활용', '제곱근의 성질'],
    killerPatterns: [
      {
        pattern: '제곱근의 대소 비교',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '√5와 √7을 비교할 때는 쉽지만, 3과 √10 등 서로 다른 형태를 비교할 때 제곱으로 변환하지 않음',
        solutionKey: [
          'a > 0, b > 0일 때 a > b ⟺ √a > √b',
          '정수와 비교: 양변을 제곱하여 비교 (3 vs √10 → 9 vs 10)',
          '근호 안의 수가 클수록 큰 수',
        ],
        exampleSetup: '√17, 4, √19를 작은 것부터 크기 순으로 나열하시오.',
      },
    ],
  },
  {
    unit: '근호를 포함한 식의 사칙계산',
    keywords: ['근호를 포함한 식의 사칙계산', '무리식의 계산'],
    killerPatterns: [
      {
        pattern: '분배법칙과 유리화 복합',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '(√2 + √3)(√2 - √3) 같은 합차공식을 적용하지 못하고 일일이 전개하다 실수',
        solutionKey: [
          '(√a + √b)(√a - √b) = a - b (합차공식)',
          '분모가 √a + √b일 때 √a - √b를 곱하여 유리화',
          '전개 후 동류항(같은 √ 항) 정리',
        ],
        exampleSetup: '1/(√5 + √3)을 분모를 유리화하여 나타내시오.',
      },
    ],
  },
  {
    unit: '무리수와 실수',
    keywords: ['무리수와 실수', '무리수', '실수', '수의 체계'],
    killerPatterns: [
      {
        pattern: '무리수 판별',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'π, √2가 무리수인 것은 알지만 √4 = 2(유리수)를 무리수로 착각하거나, 0.101001000...이 무리수인 이유를 모름',
        solutionKey: [
          '유리수: (정수)/(정수)로 표현 가능 = 유한소수 또는 순환소수',
          '무리수: 순환하지 않는 무한소수',
          '√(완전제곱수)는 유리수 (예: √9 = 3)',
        ],
        exampleSetup: '다음 중 무리수인 것을 모두 고르시오: √16, π, 0.333..., √5',
      },
    ],
  },
  {
    unit: '곱셈 공식의 활용',
    keywords: ['곱셈 공식의 활용', '곱셈 공식', '변형'],
    killerPatterns: [
      {
        pattern: '곱셈 공식 변형 적용',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'x + 1/x = 3일 때 x² + 1/x²을 구할 때, (x + 1/x)² = x² + 2 + 1/x²에서 중간항 2를 빠뜨림',
        solutionKey: [
          '(a + b)² = a² + 2ab + b² → a² + b² = (a+b)² - 2ab',
          '(a - b)² = a² - 2ab + b² → a² + b² = (a-b)² + 2ab',
          'a³ + b³ = (a+b)(a²-ab+b²), a³ - b³ = (a-b)(a²+ab+b²)',
        ],
        exampleSetup: 'x + 1/x = 5일 때, x² + 1/x²의 값은?',
      },
    ],
  },
  {
    unit: 'y=a(x-p)²+q',
    keywords: ['y=a(x-p)²+q', '이차함수의 그래프', '꼭짓점', '평행이동'],
    killerPatterns: [
      {
        pattern: '꼭짓점 좌표 부호 실수',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: 'y = 2(x-3)² + 1에서 꼭짓점을 (-3, 1)로 적거나, y = a(x+2)²에서 꼭짓점을 (2, 0)으로 착각',
        solutionKey: [
          'y = a(x-p)² + q에서 꼭짓점: (p, q)',
          '(x-3)이면 p=3, (x+2)=(x-(-2))이면 p=-2',
          '축의 방정식: x = p',
        ],
        exampleSetup: 'y = -2(x+1)² + 3의 꼭짓점과 축의 방정식은?',
      },
      {
        pattern: '이차함수의 최댓값·최솟값',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'a > 0이면 아래로 볼록(최솟값 q), a < 0이면 위로 볼록(최댓값 q)인데 혼동',
        solutionKey: [
          'a > 0: 아래로 볼록 → 최솟값 q (x = p일 때)',
          'a < 0: 위로 볼록 → 최댓값 q (x = p일 때)',
          '정의역이 제한된 경우 구간 양 끝점도 비교',
        ],
        exampleSetup: 'y = -(x-2)² + 5의 최댓값과 그때의 x값은?',
      },
    ],
  },
  {
    unit: '연립방정식',
    keywords: ['연립방정식', '이차연립방정식', '연립이차방정식'],
    killerPatterns: [
      {
        pattern: '이차와 일차 연립',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '일차식을 이차식에 대입한 후 정리하는 과정에서 전개 실수, 또는 판별식으로 해의 존재를 확인하지 않음',
        solutionKey: [
          '일차식에서 한 문자를 표현 → 이차식에 대입',
          '정리 후 이차방정식의 판별식(D)으로 해의 개수 판별',
          '구한 해를 원래 두 식에 모두 대입하여 검증',
        ],
        exampleSetup: 'x + y = 3, x² + y² = 5를 만족하는 x, y를 구하시오.',
      },
    ],
  },
  {
    unit: '절댓값 부등식',
    keywords: ['절댓값 부등식', '절댓값', '부등식'],
    killerPatterns: [
      {
        pattern: '|x - a| < b 와 |x - a| > b',
        difficulty: '상',
        frequency: '자주출제',
        trapDescription: '|x| < 3은 -3 < x < 3이지만, |x| > 3은 x < -3 또는 x > 3인데 연결 부등식으로 잘못 씀',
        solutionKey: [
          '|x| < a (a>0) ⟹ -a < x < a (하나의 구간)',
          '|x| > a (a>0) ⟹ x < -a 또는 x > a (두 구간)',
          '|x - c| < a ⟹ c - a < x < c + a (중심 c, 반지름 a)',
        ],
        exampleSetup: '|2x - 1| ≤ 5를 만족하는 정수 x의 개수는?',
      },
    ],
  },
  {
    unit: '역행렬',
    keywords: ['역행렬', '역행렬의 존재', '2×2 역행렬'],
    killerPatterns: [
      {
        pattern: '역행렬 존재성과 ad-bc 판별',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '2×2 행렬 ((a,b),(c,d))에서 ad-bc=0이면 역행렬이 존재하지 않는데, 행렬식 계산 실수로 0이 아닌 값을 얻음',
        solutionKey: [
          'det(A) = ad - bc ≠ 0이면 역행렬 존재',
          'A⁻¹ = (1/det(A)) × ((d, -b), (-c, a))',
          'AA⁻¹ = A⁻¹A = I (단위행렬)',
        ],
        exampleSetup: 'A = ((2, 3), (4, 6))의 역행렬이 존재하는지 판별하시오.',
      },
    ],
  },
  {
    unit: '속도와 가속도',
    keywords: ['속도와 가속도', '속도', '가속도', '위치 함수'],
    killerPatterns: [
      {
        pattern: '속도와 거리의 구분',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '속도의 적분이 위치(변위)이고, 속력의 적분이 이동거리인데, 속도가 음수일 때 방향 전환을 고려하지 않음',
        solutionKey: [
          '위치 s(t) → 속도 v(t) = s\'(t) → 가속도 a(t) = v\'(t)',
          '이동 거리 = ∫|v(t)|dt (절댓값 적분)',
          '변위 = ∫v(t)dt (부호 고려)',
        ],
        exampleSetup: 'v(t) = t² - 4t일 때, t = 0에서 t = 5까지 이동거리는?',
      },
    ],
  },
  {
    unit: '변곡점',
    keywords: ['변곡점', '이계도함수', '오목 볼록'],
    killerPatterns: [
      {
        pattern: '변곡점 판별 조건',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'f\'\'(x) = 0인 점을 무조건 변곡점으로 판단하지만, f\'\'(x) = 0이고 부호가 바뀌어야 변곡점',
        solutionKey: [
          'f\'\'(c) = 0이고 f\'\'(x)의 부호가 c 전후에서 바뀌면 변곡점',
          'f\'\'(x) = 0만으로는 부족 (예: f(x) = x⁴, x=0은 변곡점 아님)',
          '오목(f\'\'<0)→볼록(f\'\'>0) 또는 그 반대일 때 변곡점',
        ],
        exampleSetup: 'f(x) = x⁴ - 6x²의 변곡점을 구하시오.',
      },
    ],
  },
  {
    unit: '회전체의 부피',
    keywords: ['회전체의 부피', '회전체', '부피'],
    killerPatterns: [
      {
        pattern: '회전축에 따른 공식 선택',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'x축 회전과 y축 회전의 공식을 혼동하거나, 두 곡선 사이 영역의 회전체에서 바깥-안쪽 반지름을 잘못 설정',
        solutionKey: [
          'x축 회전: V = π∫{f(x)}²dx',
          'y축 회전: V = π∫{g(y)}²dy 또는 셸 방법',
          '두 곡선: V = π∫{f(x)² - g(x)²}dx (바깥² - 안쪽²)',
        ],
        exampleSetup: 'y = x²과 y = x로 둘러싸인 영역을 x축 둘레로 회전한 회전체의 부피는?',
      },
    ],
  },
  {
    unit: '이차곡선과 직선',
    keywords: ['이차곡선과 직선', '접선', '이차곡선의 접선'],
    killerPatterns: [
      {
        pattern: '판별식을 이용한 접선',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '직선 y=mx+n을 이차곡선에 대입한 후 판별식 D=0 조건을 세울 때, 정리 과정에서 부호 실수',
        solutionKey: [
          '직선을 이차곡선에 대입 → 이차방정식 정리',
          '접선: D = 0 (중근), 두 교점: D > 0, 만나지 않음: D < 0',
          '포물선·타원·쌍곡선 각각의 접선 공식도 숙지',
        ],
        exampleSetup: '포물선 y² = 8x에 접하고 기울기가 2인 직선의 방정식은?',
      },
    ],
  },
  {
    unit: '피타고라스 정리의 활용',
    keywords: ['피타고라스 정리의 활용', '피타고라스 활용', '직각삼각형 판정'],
    killerPatterns: [
      {
        pattern: '직각삼각형 판정과 응용',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'c² > a² + b² 또는 c² < a² + b²의 의미를 혼동하거나, 입체도형에서 피타고라스 정리를 적용하지 못함',
        solutionKey: [
          'c² = a² + b² → 직각삼각형, c² > a² + b² → 둔각삼각형, c² < a² + b² → 예각삼각형',
          '보조선을 그어 직각삼각형을 만드는 전략',
          '입체도형(원뿔, 사각뿔 등)에서도 단면에 피타고라스 정리 적용',
        ],
        exampleSetup: '세 변의 길이가 4, 5, 7인 삼각형은 어떤 삼각형인가?',
      },
    ],
  },
  {
    unit: '이차방정식',
    keywords: ['이차방정식', '근과 계수', '판별식', '이차방정식의 판별식'],
    killerPatterns: [
      {
        pattern: '판별식 부호와 근의 관계',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'D ≥ 0을 "서로 다른 두 실근"으로 해석하거나, "실근을 가진다"를 D > 0으로만 착각',
        solutionKey: [
          'D > 0: 서로 다른 두 실근, D = 0: 중근, D < 0: 서로 다른 두 허근',
          '"실근을 가진다" (중근 포함) → D ≥ 0',
          '근과 계수의 관계: α + β = -b/a (부호 주의!), αβ = c/a',
        ],
        exampleSetup: 'x² + 2x + k = 0이 실근을 가지려면 k의 범위는?',
      },
      {
        pattern: '대칭식 계산 (근과 계수)',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: 'α² + β²를 직접 구하려 하거나 근과 계수 공식의 부호를 잘못 적용',
        solutionKey: [
          'α² + β² = (α + β)² - 2αβ',
          'α³ + β³ = (α + β)³ - 3αβ(α + β)',
          '1/α + 1/β = (α + β)/αβ',
        ],
        exampleSetup: '두 근의 합이 4, 곱이 2일 때, 두 근의 제곱의 합은?',
      },
    ],
  },
  {
    unit: '역함수',
    keywords: ['역함수', '역함수의 그래프'],
    killerPatterns: [
      {
        pattern: '역함수 존재 조건과 그래프',
        difficulty: '최상',
        frequency: '자주출제',
        trapDescription: '모든 함수에 역함수가 있다고 착각하거나, 역함수 구하는 과정에서 x, y 교환 후 정의역을 확인하지 않음',
        solutionKey: [
          '역함수 존재 ⟺ 일대일대응',
          '구하는 법: y = f(x)에서 x와 y를 바꾸고 y에 대해 정리',
          '원래 함수와 역함수의 그래프는 직선 y = x에 대해 대칭',
        ],
        exampleSetup: 'f(x) = 2x + 1의 역함수를 구하고 그래프의 관계를 설명하시오.',
      },
    ],
  },
];

/**
 * 토픽에 해당하는 킬러 문항 유형 찾기
 */
export function findKillerPatterns(topic: string): KillerQuestionType | null {
  if (!topic) return null;

  for (const killerType of KILLER_QUESTION_TYPES) {
    for (const keyword of killerType.keywords) {
      if (isTopicMatch(topic, keyword)) {
        return killerType;
      }
    }
  }

  return null;
}

/**
 * 학년에 맞는 킬러 문항 유형 전체 조회
 */
export function getKillerPatternsByGrade(grade: string): KillerQuestionType[] {
  // 학년별 관련 단원 매핑
  const gradeUnits: Record<string, string[]> = {
    '고1': ['이차방정식과 이차함수', '도형의 방정식', '순열과 조합', '행렬'],
    '고2': ['지수와 로그', '삼각함수', '수열', '미분', '적분', '확률'],
    '고3': ['이차곡선', '벡터'],
  };

  const relevantUnits = gradeUnits[grade] || [];

  return KILLER_QUESTION_TYPES.filter(k =>
    relevantUnits.some(u => k.unit.includes(u) || u.includes(k.unit))
  );
}
