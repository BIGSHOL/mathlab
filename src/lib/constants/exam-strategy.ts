/**
 * 2022 개정 교육과정 수학 중단원별 시험 시간 배분 전략
 * Source: d:/math report/data/배분전략.txt
 */

export interface ProblemTypeStrategy {
  type: string;
  weight: string;
  time: string;
  difficulty: number; // 1-3 stars
}

export interface QuickSolveTip {
  pattern: string;
  tip: string;
}

export interface UnitStrategy {
  unit: string;
  problems: ProblemTypeStrategy[];
  quickSolve: string[];
  timeTraps: string[];
  tips: string[];
}

export interface GradeStrategy {
  grade: string;
  label: string;
  units: UnitStrategy[];
}

export const EXAM_TIME_STRATEGY = {
  basic: {
    total: 50,
    stages: [
      { stage: '1단계', time: 15, problems: '기본 (1~10번)', strategy: '빠르게, 정확하게' },
      { stage: '2단계', time: 20, problems: '중간 (11~18번)', strategy: '막히면 별표 후 넘기기' },
      { stage: '3단계', time: 10, problems: '고난도 (19~22번)', strategy: '배점 높은 것 우선' },
      { stage: '검토', time: 5, problems: '전체', strategy: 'OMR, 부호, 조건 확인' },
    ],
  },
};

export const GRADE_STRATEGIES: GradeStrategy[] = [
  {
    grade: 'middle_1',
    label: '중학교 1학년',
    units: [
      {
        unit: '소인수분해',
        problems: [
          { type: '소수 판별', weight: '10%', time: '30초', difficulty: 1 },
          { type: '소인수분해', weight: '15%', time: '1분', difficulty: 1 },
          { type: '약수의 개수/합', weight: '20%', time: '1~2분', difficulty: 2 },
          { type: '최대공약수/최소공배수', weight: '25%', time: '2분', difficulty: 2 },
          { type: '조건 역추적', weight: '30%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: [
          '소수 판별 → 100 이하 소수 암기하면 즉답',
          '단순 소인수분해 → 기계적 나눗셈',
          '약수 개수 → 공식 바로 적용',
        ],
        timeTraps: [
          '"약수가 6개인 가장 작은 자연수" → 경우의 수 고려 필요',
          '최대공약수/최소공배수 조건 문제 → 여러 경우 확인',
        ],
        tips: [
          '100 이하 소수 25개 암기해두면 판별 시간 단축',
          '약수 개수 = (지수+1)들의 곱 → 공식 즉시 적용',
          '최대공약수 × 최소공배수 = 두 수의 곱 활용',
        ],
      },
      {
        unit: '정수와 유리수',
        problems: [
          { type: '부호 결정', weight: '15%', time: '30초', difficulty: 1 },
          { type: '사칙연산', weight: '25%', time: '1분', difficulty: 1 },
          { type: '혼합 계산', weight: '30%', time: '2분', difficulty: 2 },
          { type: '절댓값 포함', weight: '20%', time: '2분', difficulty: 2 },
          { type: '조건 추론', weight: '10%', time: '3분', difficulty: 3 },
        ],
        quickSolve: [
          '부호 결정 → 음수 개수만 세기',
          '단순 사칙연산 → 부호 규칙만 적용',
        ],
        timeTraps: [
          '복잡한 혼합 계산 → 계산 실수 주의',
          '절댓값 + 조건 → 경우 나누기 필요',
        ],
        tips: [
          '음수의 개수: 홀수면 음수, 짝수면 양수',
          '복잡한 계산은 중간 결과를 적어두기',
          '절댓값은 안이 음수인지 양수인지 먼저 판단',
        ],
      },
      {
        unit: '문자와 식 / 일차방정식',
        problems: [
          { type: '식의 값 (대입)', weight: '15%', time: '1분', difficulty: 1 },
          { type: '일차방정식 풀이', weight: '25%', time: '1~2분', difficulty: 1 },
          { type: '분수/소수 방정식', weight: '20%', time: '2분', difficulty: 2 },
          { type: '활용 문제 (기본)', weight: '25%', time: '3분', difficulty: 2 },
          { type: '활용 문제 (심화)', weight: '15%', time: '4~5분', difficulty: 3 },
        ],
        quickSolve: [
          '단순 대입 → 괄호만 조심하면 즉답',
          'ax = b 형태 → 바로 x = b/a',
        ],
        timeTraps: [
          '복잡한 활용 문제 → 식 세우기에 시간 소요',
          '분수 계수 방정식 → 통분 과정에서 실수',
        ],
        tips: [
          '활용 문제: "무엇을 x로 놓을지" 빠르게 결정',
          '분수 방정식: 분모의 최소공배수를 한 번에 곱하기',
          '답 구한 후 검산은 대입으로 빠르게',
        ],
      },
      {
        unit: '좌표와 그래프 / 정비례·반비례',
        problems: [
          { type: '좌표 읽기/찍기', weight: '10%', time: '30초', difficulty: 1 },
          { type: '대칭점', weight: '15%', time: '1분', difficulty: 1 },
          { type: '정비례/반비례 판별', weight: '15%', time: '1분', difficulty: 1 },
          { type: '그래프 해석', weight: '30%', time: '2분', difficulty: 2 },
          { type: '비례상수 조건', weight: '30%', time: '2~3분', difficulty: 2 },
        ],
        quickSolve: [
          '좌표 읽기 → 순서만 기억 (x, y)',
          '대칭점 → 규칙 적용 (x축: y부호, y축: x부호)',
        ],
        timeTraps: [
          '그래프와 도형 넓이 → 그림 그리기 필요',
          '조건 만족 문제 → 여러 조건 동시 확인',
        ],
        tips: [
          '대칭 규칙: x축(y바꿈), y축(x바꿈), 원점(둘 다)',
          '정비례 y=ax, 반비례 y=a/x 형태 즉시 구분',
          '그래프 문제는 대략적인 그림이라도 그리기',
        ],
      },
      {
        unit: '기본 도형 / 작도와 합동',
        problems: [
          { type: '각의 관계 (맞꼭지각 등)', weight: '15%', time: '1분', difficulty: 1 },
          { type: '평행선과 각', weight: '25%', time: '1~2분', difficulty: 2 },
          { type: '합동 조건 판별', weight: '20%', time: '1분', difficulty: 1 },
          { type: '합동 활용', weight: '25%', time: '2~3분', difficulty: 2 },
          { type: '증명 문제', weight: '15%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: [
          '맞꼭지각 → 항상 같음, 즉답',
          '합동 조건 판별 → SSS, SAS, ASA만 체크',
        ],
        timeTraps: [
          '복잡한 평행선 각 → 여러 단계 추론',
          '증명 문제 → 서술 시간 필요',
        ],
        tips: [
          '평행선 보이면 동위각/엇각 바로 표시',
          '합동 조건: SSS, SAS, ASA 3개만 기억',
          '증명은 핵심 이유만 간결하게 서술',
        ],
      },
      {
        unit: '다각형과 원',
        problems: [
          { type: '내각의 합', weight: '15%', time: '1분', difficulty: 1 },
          { type: '정다각형 한 내각/외각', weight: '20%', time: '1분', difficulty: 1 },
          { type: '부채꼴 호의 길이/넓이', weight: '25%', time: '2분', difficulty: 2 },
          { type: '복합 도형', weight: '25%', time: '3분', difficulty: 2 },
          { type: '역추적 문제', weight: '15%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: [
          '내각의 합 → 180°×(n-2) 공식 적용',
          '정다각형 → 외각 = 360°/n 먼저 구하면 빠름',
        ],
        timeTraps: [
          '부채꼴 복합 도형 → 여러 공식 조합',
          '"내각이 ○○°인 정다각형" → 역으로 n 구하기',
        ],
        tips: [
          '정다각형: 외각(360°/n)이 더 계산 쉬움',
          '부채꼴 넓이: S = (1/2)lr 공식이 가장 간단',
          '복합 도형: 전체 - 빈 부분 = 구하는 부분',
        ],
      },
      {
        unit: '입체도형',
        problems: [
          { type: '겉넓이/부피 기본', weight: '30%', time: '2분', difficulty: 1 },
          { type: '전개도', weight: '20%', time: '2분', difficulty: 2 },
          { type: '회전체', weight: '25%', time: '2~3분', difficulty: 2 },
          { type: '복합 입체', weight: '25%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: [
          '기둥 부피 → 밑넓이 × 높이',
          '뿔 부피 → (1/3) × 밑넓이 × 높이',
        ],
        timeTraps: [
          '원뿔 전개도 → 부채꼴 중심각 계산',
          '복합 입체 → 여러 도형 분리',
        ],
        tips: [
          '뿔 = 기둥의 1/3, 이것만 기억',
          '구: 겉넓이 4πr², 부피 (4/3)πr³',
          '복합 입체는 분리해서 각각 계산',
        ],
      },
    ],
  },
  {
    grade: 'middle_2',
    label: '중학교 2학년',
    units: [
      {
        unit: '유리수와 순환소수 / 식의 계산',
        problems: [
          { type: '유한소수 판별', weight: '15%', time: '1분', difficulty: 1 },
          { type: '순환소수 ↔ 분수', weight: '20%', time: '2분', difficulty: 2 },
          { type: '지수법칙', weight: '25%', time: '1~2분', difficulty: 1 },
          { type: '다항식 계산', weight: '25%', time: '2분', difficulty: 2 },
          { type: '조건 문제', weight: '15%', time: '3분', difficulty: 3 },
        ],
        quickSolve: ['유한소수 판별 → 기약분수 후 분모만 확인', '지수법칙 → 곱은 더하고, 거듭은 곱하기'],
        timeTraps: ['순환소수 → 분수 변환 실수 주의', '유한소수 조건 문제 → 경우의 수 고려'],
        tips: ['기약분수로 먼저 만들기 (필수!)', '순환마디 자릿수만큼 9, 비순환은 0', '지수법칙: aᵐ×aⁿ=aᵐ⁺ⁿ, (aᵐ)ⁿ=aᵐⁿ'],
      },
      {
        unit: '일차부등식과 연립방정식',
        problems: [
          { type: '일차부등식 풀이', weight: '15%', time: '1분', difficulty: 1 },
          { type: '연립부등식', weight: '15%', time: '2분', difficulty: 2 },
          { type: '연립방정식 풀이', weight: '20%', time: '2분', difficulty: 1 },
          { type: '해의 조건', weight: '15%', time: '2분', difficulty: 2 },
          { type: '활용 문제', weight: '35%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['단순 부등식 → 음수 곱할 때 부등호만 주의', '연립방정식 → 가감법이 대체로 빠름'],
        timeTraps: ['활용 문제 → 식 세우기가 관건', '해가 없음/무수히 많음 → 특수 조건 확인'],
        tips: ['부등식: 음수로 나누면 부등호 방향 바뀜', '연립방정식: 계수 맞추기 쉬운 쪽으로', '활용: 미지수 2개 → 조건 2개 찾기'],
      },
      {
        unit: '일차함수',
        problems: [
          { type: '기울기/절편 읽기', weight: '15%', time: '30초', difficulty: 1 },
          { type: '그래프 그리기', weight: '15%', time: '1분', difficulty: 1 },
          { type: '식 구하기', weight: '25%', time: '2분', difficulty: 2 },
          { type: '위치 관계', weight: '20%', time: '2분', difficulty: 2 },
          { type: '연립과 교점', weight: '25%', time: '3분', difficulty: 3 },
        ],
        quickSolve: ['y = ax + b에서 a, b 읽기 → 즉답', '평행/일치 조건 → 기울기 비교만'],
        timeTraps: ['두 직선의 교점으로 도형 넓이 → 연립 + 계산', '조건이 많은 문제 → 정리 시간 필요'],
        tips: ['기울기 = (y증가)/(x증가), 분수 그대로 계산', '평행: 기울기 같음, 일치: 기울기+절편 같음', '교점 = 연립방정식의 해'],
      },
      {
        unit: '삼각형과 사각형의 성질',
        problems: [
          { type: '이등변삼각형', weight: '15%', time: '1분', difficulty: 1 },
          { type: '외심/내심', weight: '25%', time: '2분', difficulty: 2 },
          { type: '평행사변형 조건', weight: '20%', time: '2분', difficulty: 2 },
          { type: '특수 사각형', weight: '20%', time: '2분', difficulty: 2 },
          { type: '증명/활용', weight: '20%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['이등변삼각형 → 밑각 같음, 바로 적용', '평행사변형 → 대각선이 서로 이등분'],
        timeTraps: ['외심/내심 혼동 → 정의 헷갈리면 시간 낭비', '증명 문제 → 서술 시간'],
        tips: ['외심: 변의 수직이등분선, 꼭짓점까지 거리 같음', '내심: 각의 이등분선, 변까지 거리 같음', '직사각형: 대각선 길이 같음', '마름모: 대각선이 수직'],
      },
      {
        unit: '도형의 닮음 / 피타고라스 정리',
        problems: [
          { type: '닮음 조건 판별', weight: '15%', time: '1분', difficulty: 1 },
          { type: '닮음비 활용', weight: '25%', time: '2분', difficulty: 2 },
          { type: '피타고라스 기본', weight: '20%', time: '1~2분', difficulty: 1 },
          { type: '직각삼각형 판별', weight: '15%', time: '1분', difficulty: 1 },
          { type: '넓이/부피비', weight: '25%', time: '3분', difficulty: 3 },
        ],
        quickSolve: ['AA 닮음 → 각 2개만 같으면 됨', '피타고라스 기본 → 3-4-5, 5-12-13 암기'],
        timeTraps: ['넓이비, 부피비 → 제곱, 세제곱 계산', '복잡한 도형에서 닮음 찾기'],
        tips: ['닮음비 m:n → 넓이비 m²:n², 부피비 m³:n³', '피타고라스의 수: 3-4-5, 5-12-13, 8-15-17', 'c² > a²+b² → 둔각, c² < a²+b² → 예각'],
      },
      {
        unit: '확률',
        problems: [
          { type: '경우의 수', weight: '20%', time: '1~2분', difficulty: 1 },
          { type: '기본 확률', weight: '20%', time: '1~2분', difficulty: 1 },
          { type: '여사건', weight: '20%', time: '2분', difficulty: 2 },
          { type: '연속 사건', weight: '25%', time: '3분', difficulty: 2 },
          { type: '복합 확률', weight: '15%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['단순 확률 → 경우의 수만 세면 됨', '여사건 → 1에서 빼기'],
        timeTraps: ['"적어도" 문제 → 직접 세면 오래 걸림', '복원/비복원 혼동 → 문제 조건 확인'],
        tips: ['"적어도 하나" = 1 - "하나도 없는 경우"', '"또는" → 더하기, "그리고" → 곱하기', '복원 추출: 확률 유지, 비복원: 분모 감소'],
      },
    ],
  },
  {
    grade: 'middle_3',
    label: '중학교 3학년',
    units: [
      {
        unit: '제곱근과 실수 / 근호 계산',
        problems: [
          { type: '제곱근 개념', weight: '15%', time: '1분', difficulty: 1 },
          { type: '근호 간단히', weight: '20%', time: '1~2분', difficulty: 1 },
          { type: '근호 사칙연산', weight: '25%', time: '2분', difficulty: 2 },
          { type: '분모의 유리화', weight: '25%', time: '2분', difficulty: 2 },
          { type: '실수 분류/대소', weight: '15%', time: '2~3분', difficulty: 3 },
        ],
        quickSolve: ['√4 = 2 (양수만) → 즉답', '√a² = |a| → 절댓값으로 처리'],
        timeTraps: ['켤레식 유리화 → 계산 과정 길어짐', '실수 대소 비교 → 제곱해서 비교'],
        tips: ['√a×√b = √(ab), but √a+√b ≠ √(a+b)', '유리화: √a → √a 곱함, √a±√b → 켤레식', '대소 비교: 양수면 제곱해서 비교'],
      },
      {
        unit: '다항식의 곱셈과 인수분해',
        problems: [
          { type: '곱셈공식 전개', weight: '20%', time: '1분', difficulty: 1 },
          { type: '기본 인수분해', weight: '25%', time: '1~2분', difficulty: 1 },
          { type: '복잡한 인수분해', weight: '25%', time: '2~3분', difficulty: 2 },
          { type: '공식 변형 활용', weight: '20%', time: '2~3분', difficulty: 2 },
          { type: '치환 인수분해', weight: '10%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['곱셈공식 → 암기되어 있으면 즉시 전개', '합차공식 → a²-b² = (a+b)(a-b) 바로 적용'],
        timeTraps: ['복잡한 인수분해 → 여러 단계 필요', '조건이 주어진 식의 값 → 변형 필요'],
        tips: ['곱셈공식 5개 1초 안에 떠올리기', '인수분해: 공통인수 먼저 → 공식 적용', 'a²+b² = (a+b)²-2ab 변형 활용'],
      },
      {
        unit: '이차방정식',
        problems: [
          { type: '인수분해 풀이', weight: '20%', time: '1~2분', difficulty: 1 },
          { type: '완전제곱식 풀이', weight: '15%', time: '2분', difficulty: 2 },
          { type: '근의 공식', weight: '25%', time: '2분', difficulty: 2 },
          { type: '판별식 활용', weight: '20%', time: '2분', difficulty: 2 },
          { type: '활용 문제', weight: '20%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['인수분해 가능 → 가장 빠른 방법', '짝수 공식 → b가 짝수면 계산 간단'],
        timeTraps: ['활용 문제 → 식 세우기에 시간 소요', '근의 조건 → 판별식 부등식 풀이'],
        tips: ['먼저 인수분해 가능한지 확인', '근의 공식 분모는 2a (a 아님!)', '활용: 답 구한 후 조건(양수, 자연수) 확인'],
      },
      {
        unit: '이차함수',
        problems: [
          { type: '그래프 특징', weight: '15%', time: '1분', difficulty: 1 },
          { type: '꼭짓점/축', weight: '20%', time: '1~2분', difficulty: 1 },
          { type: '표준형 ↔ 일반형', weight: '20%', time: '2분', difficulty: 2 },
          { type: '그래프와 x축', weight: '25%', time: '2~3분', difficulty: 2 },
          { type: '최대/최소', weight: '20%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['y = a(x-p)² + q → 꼭짓점 (p, q) 즉시 읽기', 'a의 부호 → 볼록 방향 바로 판단'],
        timeTraps: ['정의역 제한된 최대/최소 → 경우 분류', '그래프와 x축 교점 조건 → 판별식 연결'],
        tips: ['괄호 안이 (x-3)이면 꼭짓점 x좌표는 +3', '꼭짓점 공식: x = -b/2a', '정의역에 꼭짓점 포함되는지 먼저 확인'],
      },
      {
        unit: '삼각비',
        problems: [
          { type: '삼각비 정의', weight: '15%', time: '1분', difficulty: 1 },
          { type: '특수각 값', weight: '20%', time: '1분', difficulty: 1 },
          { type: '삼각비 계산', weight: '25%', time: '2분', difficulty: 2 },
          { type: '변/각 구하기', weight: '25%', time: '2~3분', difficulty: 2 },
          { type: '넓이 문제', weight: '15%', time: '3분', difficulty: 3 },
        ],
        quickSolve: ['특수각 삼각비 → 암기되어 있으면 즉답', 'sin²+cos² = 1 → 바로 활용'],
        timeTraps: ['직각삼각형이 없는 경우 → 수선 그어야 함', '복합 도형 넓이 → 여러 삼각형으로 분할'],
        tips: ['"소대빗, 코인빗, 탄대인" 암기', '특수각: 30°, 45°, 60° 값 완벽 암기', '넓이 = (1/2)ab sinC 공식 활용'],
      },
      {
        unit: '원의 성질',
        problems: [
          { type: '원주각/중심각', weight: '25%', time: '1~2분', difficulty: 1 },
          { type: '접선의 성질', weight: '25%', time: '2분', difficulty: 2 },
          { type: '내접 사각형', weight: '20%', time: '2분', difficulty: 2 },
          { type: '접선과 현', weight: '15%', time: '2~3분', difficulty: 2 },
          { type: '종합 문제', weight: '15%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['원주각 = 중심각의 1/2 → 즉시 적용', '반원에 대한 원주각 = 90°'],
        timeTraps: ['복합 원 문제 → 여러 성질 동시 적용', '증명 문제 → 서술 시간'],
        tips: ['원주각 = 중심각 ÷ 2', '접선 ⊥ 반지름 (접점에서)', '내접 사각형: 대각의 합 = 180°'],
      },
    ],
  },
  {
    grade: 'high_1',
    label: '고등학교 (공통수학1)',
    units: [
      {
        unit: '다항식',
        problems: [
          { type: '다항식 연산', weight: '15%', time: '1~2분', difficulty: 1 },
          { type: '나머지정리', weight: '25%', time: '2분', difficulty: 2 },
          { type: '인수정리', weight: '20%', time: '2분', difficulty: 2 },
          { type: '고차 인수분해', weight: '25%', time: '3분', difficulty: 2 },
          { type: '이차식 나머지', weight: '15%', time: '4분', difficulty: 3 },
        ],
        quickSolve: ['나머지정리 → P(a)가 나머지', '조립제법 → 손에 익으면 빠름'],
        timeTraps: ['이차식으로 나눈 나머지 → 연립 필요', '복잡한 고차 인수분해'],
        tips: ['(x-a)로 나눈 나머지 = P(a)', '(x+a)로 나눈 나머지 = P(-a) (부호 주의!)', '이차식 나머지: R(x) = ax+b로 놓고 두 조건'],
      },
      {
        unit: '방정식과 부등식',
        problems: [
          { type: '복소수 계산', weight: '15%', time: '1~2분', difficulty: 1 },
          { type: '판별식/근과 계수', weight: '25%', time: '2분', difficulty: 2 },
          { type: '이차방정식/함수 관계', weight: '20%', time: '2~3분', difficulty: 2 },
          { type: '이차부등식', weight: '20%', time: '2~3분', difficulty: 2 },
          { type: '고차방정식', weight: '20%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['i의 거듭제곱 → 4개 주기로 즉답', '근과 계수 → 공식 대입'],
        timeTraps: ['대칭식 계산 → 변형 공식 필요', '이차부등식 → D 부호에 따른 경우 분류'],
        tips: ['i¹=i, i²=-1, i³=-i, i⁴=1 (4개 주기)', 'α+β = -b/a (마이너스 주의!)', '이차부등식: 그래프 먼저 그리기'],
      },
      {
        unit: '경우의 수',
        problems: [
          { type: '순열 기본', weight: '15%', time: '1~2분', difficulty: 1 },
          { type: '조합 기본', weight: '15%', time: '1~2분', difficulty: 1 },
          { type: '같은 것이 있는 순열', weight: '20%', time: '2분', difficulty: 2 },
          { type: '원순열', weight: '15%', time: '2분', difficulty: 2 },
          { type: '조건부 배열', weight: '35%', time: '3~4분', difficulty: 3 },
        ],
        quickSolve: ['nPr, nCr → 공식 대입', '중복순열 → nʳ'],
        timeTraps: ['조건이 있는 배열 → 조건부터 처리', '여러 조건 동시 → 포함-배제 원리'],
        tips: ['순열: 순서 O, 조합: 순서 X', '원순열 = (n-1)!', '같은 것 있는 순열 = n!/p!q!...'],
      },
    ],
  },
];
