export interface TimeAllocationGuide {
  type: string;         // 유형
  weight: string;       // 예상 비중
  suggestedTime: string; // 권장 시간
  difficulty: string;   // 난이도 (⭐, ⭐⭐, ⭐⭐⭐)
}

export interface TimeAllocationStrategy {
  unit: string;                    // 단원명
  keywords: string[];              // 매칭 키워드
  examDuration: number;            // 시험 시간 (분) - 중학교: 45, 고등학교: 50
  guides: TimeAllocationGuide[];   // 유형별 시간 배분
  quickTypes: string[];            // 빠르게 풀 수 있는 유형
  timeConsumingTypes: string[];    // 시간 잡아먹는 유형
  timeSavingTips: string[];        // 시간 절약 팁
}

/**
 * 단원별 시간 배분 전략 (50~70분 시험 기준)
 */
export const TIME_ALLOCATION_STRATEGIES: TimeAllocationStrategy[] = [
  // 중학교 1학년
  {
    unit: '소인수분해',
    keywords: ['소인수분해', '소수', '약수', '최대공약수', '최소공배수'],
    examDuration: 45,
    guides: [
      { type: '소수 판별', weight: '10%', suggestedTime: '30초', difficulty: '⭐' },
      { type: '소인수분해', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '약수의 개수/합', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '최대공약수/최소공배수', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '조건 역추적', weight: '30%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '소수 판별 → 100 이하 소수 암기하면 즉답',
      '단순 소인수분해 → 기계적 나눗셈',
      '약수 개수 → 공식 바로 적용',
    ],
    timeConsumingTypes: [
      '"약수가 6개인 가장 작은 자연수" → 경우의 수 고려 필요',
      '최대공약수/최소공배수 조건 문제 → 여러 경우 확인',
    ],
    timeSavingTips: [
      '100 이하 소수 25개 암기해두면 판별 시간 단축',
      '약수 개수 = (지수+1)들의 곱 → 공식 즉시 적용',
      '최대공약수 × 최소공배수 = 두 수의 곱 활용',
    ],
  },
  {
    unit: '정수와 유리수',
    keywords: ['정수', '유리수', '음수', '양수', '절댓값', '수직선'],
    examDuration: 45,
    guides: [
      { type: '정수의 개념', weight: '10%', suggestedTime: '30초', difficulty: '⭐' },
      { type: '수의 대소 비교', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '덧셈/뺄셈', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '곱셈/나눗셈', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '혼합 계산', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '절댓값 계산 → |a| = a (양수), |a| = -a (음수)',
      '같은 부호 덧셈 → 절댓값 더하고 부호 유지',
    ],
    timeConsumingTypes: [
      '혼합 계산 → 부호 실수 주의',
      '분배법칙 활용 문제 → 괄호 처리',
    ],
    timeSavingTips: [
      '음수 × 음수 = 양수, 음수 × 양수 = 음수',
      '부호가 다른 두 수의 덧셈: 절댓값 큰 수 부호 따름',
      '계산 순서: 괄호 → 거듭제곱 → 곱셈/나눗셈 → 덧셈/뺄셈',
    ],
  },
  {
    unit: '문자와 식',
    keywords: ['문자와 식', '다항식', '일차식', '대입', '등식'],
    examDuration: 45,
    guides: [
      { type: '문자 사용', weight: '15%', suggestedTime: '30초', difficulty: '⭐' },
      { type: '식의 값', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '일차식 계산', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '등식의 성질', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '문자에 대입 → 괄호 잊지 않기',
      '동류항끼리 계산 → 계수만 더하기',
    ],
    timeConsumingTypes: [
      '복잡한 식의 값 → 대입 실수 주의',
      '문장제 → 식으로 표현하기',
    ],
    timeSavingTips: [
      'a × 3 = 3a (숫자를 앞에)',
      '음수 대입 시 반드시 괄호: (-2)²',
      '동류항: 문자와 차수가 같은 항끼리만 계산',
    ],
  },
  {
    unit: '좌표와 그래프',
    keywords: ['좌표', '좌표평면', '사분면', '그래프', '순서쌍'],
    examDuration: 45,
    guides: [
      { type: '순서쌍과 좌표', weight: '15%', suggestedTime: '30초', difficulty: '⭐' },
      { type: '사분면 판별', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '대칭점', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '그래프 그리기', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '그래프 해석', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '(+, +) → 1사분면, 반시계로 2, 3, 4사분면',
      'x축 대칭 → y부호 변경, y축 대칭 → x부호 변경',
    ],
    timeConsumingTypes: [
      '그래프 해석 문제 → 조건 여러 개 확인',
      '도형의 넓이 → 좌표 계산 필요',
    ],
    timeSavingTips: [
      '좌표 (x, y): 가로 먼저, 세로 나중',
      '원점 대칭: 부호 둘 다 변경',
      'x축 위의 점: y = 0, y축 위의 점: x = 0',
    ],
  },
  {
    unit: '정비례와 반비례',
    keywords: ['정비례', '반비례', '비례상수', 'y=ax', 'y=a/x'],
    examDuration: 45,
    guides: [
      { type: '정비례 관계', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '반비례 관계', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '그래프 특징', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '식 구하기', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      'y = ax (정비례) → 원점 지나는 직선',
      'y = a/x (반비례) → 쌍곡선',
    ],
    timeConsumingTypes: [
      '활용 문제 → 비례 관계 파악에 시간',
      '그래프와 도형 → 넓이 계산',
    ],
    timeSavingTips: [
      'a > 0: 1, 3사분면 / a < 0: 2, 4사분면',
      '정비례: x가 2배 → y도 2배',
      '반비례: x가 2배 → y는 1/2배',
    ],
  },
  {
    unit: '기본 도형',
    keywords: ['기본 도형', '점선면', '평행선', '동위각', '엇각', '맞꼭지각', '위치 관계', '교선'],
    examDuration: 45,
    guides: [
      { type: '점/선/면/각', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '맞꼭지각', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '동위각/엇각', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '평행선 성질', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '위치 관계', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '맞꼭지각 → 같다',
      '평행선 + 동위각/엇각 → 같다',
    ],
    timeConsumingTypes: [
      '복잡한 도형에서 각도 찾기',
      '꼬인 위치 판별 → 입체적 사고',
    ],
    timeSavingTips: [
      '동위각: 같은 위치, 엇각: 엇갈린 위치',
      '동위각/엇각이 같음 ⟺ 두 직선이 평행',
      '보각: 합이 180°, 여각: 합이 90°',
    ],
  },
  {
    unit: '작도와 합동',
    keywords: ['작도', '합동', '삼각형', 'SSS', 'SAS', 'ASA'],
    examDuration: 45,
    guides: [
      { type: '기본 작도', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '삼각형 작도', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '합동 조건', weight: '30%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '합동 활용', weight: '25%', suggestedTime: '3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '합동 조건 3가지 → SSS, SAS, ASA',
      '대응 변/각 → 합동 기호 순서대로',
    ],
    timeConsumingTypes: [
      '복잡한 도형 합동 증명',
      '작도 순서 서술',
    ],
    timeSavingTips: [
      'AAA, SSA는 합동 조건 아님',
      '합동 기호 △ABC ≡ △DEF: A↔D, B↔E, C↔F 대응',
      '작도: 눈금 없는 자 + 컴퍼스만 사용',
    ],
  },
  {
    unit: '평면도형의 성질',
    keywords: ['다각형', '내각', '외각', '부채꼴', '호', '중심각'],
    examDuration: 45,
    guides: [
      { type: '내각의 합', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '외각의 합', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '정다각형', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '부채꼴', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '넓이/둘레', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      'n각형 내각의 합 = 180°×(n-2)',
      '외각의 합 = 360° (항상)',
    ],
    timeConsumingTypes: [
      '복잡한 도형 각도 → 보조선 필요',
      '부채꼴 복합 문제',
    ],
    timeSavingTips: [
      '정n각형 한 내각 = 180°×(n-2)/n',
      '정n각형 한 외각 = 360°/n',
      '부채꼴 넓이 = (1/2)×r×l (r: 반지름, l: 호의 길이)',
    ],
  },
  {
    unit: '입체도형의 성질',
    keywords: ['입체도형', '다면체', '회전체', '겉넓이', '부피'],
    examDuration: 45,
    guides: [
      { type: '다면체', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '회전체', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '겉넓이', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '부피', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '전개도', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '정다면체 5가지만 → 사, 육, 팔, 십이, 이십',
      '원기둥 부피 = πr²h',
    ],
    timeConsumingTypes: [
      '복잡한 겉넓이 계산',
      '회전체 부피 → 단면 파악 필요',
    ],
    timeSavingTips: [
      '뿔: 부피 = (1/3) × 기둥 부피',
      '구: V = (4/3)πr³, S = 4πr²',
      '원뿔 옆면: 부채꼴 (호 = 밑면 둘레)',
    ],
  },
  {
    unit: '자료의 정리와 해석',
    keywords: ['통계', '도수분포표', '히스토그램', '상대도수', '줄기와 잎'],
    examDuration: 45,
    guides: [
      { type: '줄기와 잎', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '도수분포표', weight: '25%', suggestedTime: '2분', difficulty: '⭐' },
      { type: '히스토그램', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '상대도수', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '자료 해석', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '상대도수 = 도수/전체도수',
      '상대도수의 합 = 1',
    ],
    timeConsumingTypes: [
      '자료 해석 문제 → 표/그래프 꼼꼼히 읽기',
      '역으로 도수 구하기',
    ],
    timeSavingTips: [
      '계급: 이상 ~ 미만 (끝값 중복 X)',
      '도수분포다각형: 히스토그램 가운데 점 연결',
      '상대도수 비교 → 전체가 달라도 비교 가능',
    ],
  },
  {
    unit: '일차방정식',
    keywords: ['일차방정식', '방정식', '활용문제', '문자와 식'],
    examDuration: 45,
    guides: [
      { type: '식의 값 (대입)', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '일차방정식 풀이', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '분수/소수 방정식', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제 (기본)', weight: '25%', suggestedTime: '3분', difficulty: '⭐⭐' },
      { type: '활용 문제 (심화)', weight: '15%', suggestedTime: '4~5분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '단순 대입 → 괄호만 조심하면 즉답',
      'ax = b 형태 → 바로 x = b/a',
    ],
    timeConsumingTypes: [
      '복잡한 활용 문제 → 식 세우기에 시간 소요',
      '분수 계수 방정식 → 통분 과정에서 실수',
    ],
    timeSavingTips: [
      '활용 문제: "무엇을 x로 놓을지" 빠르게 결정',
      '분수 방정식: 분모의 최소공배수를 한 번에 곱하기',
      '답 구한 후 검산은 대입으로 빠르게',
    ],
  },
  // 중학교 2학년
  {
    unit: '연립방정식',
    keywords: ['연립방정식', '연립', '일차부등식'],
    examDuration: 45,
    guides: [
      { type: '일차부등식 풀이', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '연립부등식', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '연립방정식 풀이', weight: '20%', suggestedTime: '2분', difficulty: '⭐' },
      { type: '해의 조건', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '35%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '단순 부등식 → 음수 곱할 때 부등호만 주의',
      '연립방정식 → 가감법이 대체로 빠름',
    ],
    timeConsumingTypes: [
      '활용 문제 → 식 세우기가 관건',
      '해가 없음/무수히 많음 → 특수 조건 확인',
    ],
    timeSavingTips: [
      '부등식: 음수로 나누면 부등호 방향 바뀜',
      '연립방정식: 계수 맞추기 쉬운 쪽으로',
      '활용: 미지수 2개 → 조건 2개 찾기',
    ],
  },
  {
    unit: '일차함수',
    keywords: ['일차함수', '기울기', '그래프', 'y절편'],
    examDuration: 45,
    guides: [
      { type: '기울기/절편 읽기', weight: '15%', suggestedTime: '30초', difficulty: '⭐' },
      { type: '그래프 그리기', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '식 구하기', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '위치 관계', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '연립과 교점', weight: '25%', suggestedTime: '3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'y = ax + b에서 a, b 읽기 → 즉답',
      '평행/일치 조건 → 기울기 비교만',
    ],
    timeConsumingTypes: [
      '두 직선의 교점으로 도형 넓이 → 연립 + 계산',
      '조건이 많은 문제 → 정리 시간 필요',
    ],
    timeSavingTips: [
      '기울기 = (y증가)/(x증가), 분수 그대로 계산',
      '평행: 기울기 같음, 일치: 기울기+절편 같음',
      '교점 = 연립방정식의 해',
    ],
  },
  {
    unit: '유리수와 순환소수',
    keywords: ['유리수', '순환소수', '유한소수', '무한소수', '기약분수'],
    examDuration: 45,
    guides: [
      { type: '유한소수 조건', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '순환소수 표현', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '순환소수 → 분수', weight: '30%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '분수 → 순환소수', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '응용 문제', weight: '10%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '유한소수 조건 → 분모의 소인수가 2, 5뿐',
      '순환마디 읽기 → 점 위치 확인',
    ],
    timeConsumingTypes: [
      '순환소수 → 분수 변환 → 9 개수 세기 실수',
      '복잡한 조건 문제',
    ],
    timeSavingTips: [
      '0.ababab... = ab/99, 0.abcabc... = abc/999',
      '기약분수로 만든 후 분모 소인수 확인',
      '순환마디 길이 = 분모의 성질에 따름',
    ],
  },
  {
    unit: '식의 계산',
    keywords: ['식의 계산', '지수법칙', '단항식', '다항식', '곱셈', '나눗셈'],
    examDuration: 45,
    guides: [
      { type: '지수법칙', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '단항식 계산', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '다항식 덧셈/뺄셈', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '단항식 × 다항식', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '다항식 ÷ 단항식', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      'aᵐ × aⁿ = aᵐ⁺ⁿ → 지수 더하기',
      '(aᵐ)ⁿ = aᵐⁿ → 지수 곱하기',
    ],
    timeConsumingTypes: [
      '복잡한 지수 계산 → 법칙 순서 주의',
      '분배법칙 여러 번 적용',
    ],
    timeSavingTips: [
      'aᵐ ÷ aⁿ = aᵐ⁻ⁿ → 지수 빼기',
      '(ab)ⁿ = aⁿbⁿ → 각각에 지수',
      '다항식 나눗셈: 각 항을 따로 나누기',
    ],
  },
  {
    unit: '일차부등식',
    keywords: ['일차부등식', '부등식', '연립부등식', '부등호'],
    examDuration: 45,
    guides: [
      { type: '부등식 성질', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '일차부등식 풀이', weight: '30%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '연립부등식', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '정수해 구하기', weight: '10%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '양변에 양수 곱/나눔 → 부등호 유지',
      '연립부등식 → 수직선에서 공통 부분',
    ],
    timeConsumingTypes: [
      '활용 문제 → 식 세우기 + 조건 확인',
      '해가 없음/모든 실수 → 특수 경우',
    ],
    timeSavingTips: [
      '음수 곱/나눔 → 부등호 방향 바뀜 (★)',
      'a ≤ x < b → 수직선 구간 표시',
      '정수해 개수 → 수직선에서 세기',
    ],
  },
  {
    unit: '삼각형의 성질',
    keywords: ['삼각형', '이등변삼각형', '직각삼각형', '삼각형의 외심', '삼각형의 내심'],
    examDuration: 45,
    guides: [
      { type: '이등변삼각형', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '직각삼각형', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '외심', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '내심', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '이등변삼각형 → 두 밑각이 같다',
      '외심: 외접원의 중심, 내심: 내접원의 중심',
    ],
    timeConsumingTypes: [
      '외심/내심 복합 문제 → 성질 여러 개 활용',
      '증명 문제 → 서술 시간',
    ],
    timeSavingTips: [
      '외심: 세 변의 수직이등분선의 교점',
      '내심: 세 각의 이등분선의 교점',
      '직각삼각형 외심: 빗변의 중점',
    ],
  },
  {
    unit: '사각형의 성질',
    keywords: ['사각형', '평행사변형', '직사각형', '마름모', '정사각형', '등변사다리꼴'],
    examDuration: 45,
    guides: [
      { type: '평행사변형', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '직사각형/마름모', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '정사각형', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '등변사다리꼴', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '포함 관계', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '평행사변형 → 대각 같고, 대변 같고, 대각선이 서로를 이등분',
      '마름모 → 대각선이 수직',
    ],
    timeConsumingTypes: [
      '사각형 판별 → 조건 여러 개 확인',
      '넓이 구하기 → 대각선 활용',
    ],
    timeSavingTips: [
      '직사각형: 대각선 길이가 같음',
      '마름모 넓이 = (1/2) × 대각선 × 대각선',
      '정사각형 = 직사각형 ∩ 마름모',
    ],
  },
  {
    unit: '도형의 닮음',
    keywords: ['닮음', '닮음비', '닮음의 중심', '축소', '확대'],
    examDuration: 45,
    guides: [
      { type: '닮음 조건', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '닮음비', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '넓이비/부피비', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '삼각형 닮음', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '10%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '닮음비 a:b → 넓이비 a²:b², 부피비 a³:b³',
      '삼각형 닮음: AA, SAS, SSS',
    ],
    timeConsumingTypes: [
      '복잡한 도형에서 닮은 삼각형 찾기',
      '넓이비 활용 문제',
    ],
    timeSavingTips: [
      '평행선 → 닮음 (기본 도형)',
      'AA 닮음이 가장 자주 사용됨',
      '닮음비 m:n → 둘레비도 m:n',
    ],
  },
  {
    unit: '피타고라스 정리',
    keywords: ['피타고라스', '직각삼각형', '빗변', '피타고라스 정리의 역'],
    examDuration: 45,
    guides: [
      { type: '피타고라스 정리', weight: '30%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '정리의 역', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '특수 직각삼각형', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '공간 도형', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
      { type: '활용 문제', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      'a² + b² = c² (직각 끼고 있는 변², 빗변²)',
      '3:4:5, 5:12:13, 8:15:17 비율',
    ],
    timeConsumingTypes: [
      '공간 도형 → 단면 찾기',
      '좌표평면에서 거리 → 두 번 적용',
    ],
    timeSavingTips: [
      '45°-45°-90° → 1:1:√2',
      '30°-60°-90° → 1:√3:2',
      'c² = a² + b² → 직각, > 예각, < 둔각',
    ],
  },
  {
    unit: '경우의 수 (중학교)',
    keywords: ['경우의 수', '합의 법칙', '곱의 법칙', '수형도', '나열'],
    examDuration: 45,
    guides: [
      { type: '합의 법칙', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '곱의 법칙', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '수형도', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '나열하기', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '응용 문제', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '또는 → 더하기 (합의 법칙)',
      '그리고/동시에 → 곱하기 (곱의 법칙)',
    ],
    timeConsumingTypes: [
      '조건이 복잡한 경우 → 분류 필요',
      '중복 제거 문제',
    ],
    timeSavingTips: [
      '수형도는 경우가 적을 때 효과적',
      '자릿수 문제: 각 자리별 경우의 수 곱하기',
      '특정 조건부터 먼저 배치',
    ],
  },
  {
    unit: '확률 (중학교)',
    keywords: ['확률', '사건', '경우의 수', '여사건'],
    examDuration: 45,
    guides: [
      { type: '확률의 뜻', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '기본 확률', weight: '30%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '여사건', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐⭐' },
      { type: '확률의 계산', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '응용 문제', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'P(A) = (A가 일어나는 경우의 수)/(전체 경우의 수)',
      '0 ≤ P ≤ 1, 모든 확률의 합 = 1',
    ],
    timeConsumingTypes: [
      '복합 사건 확률 → 경우의 수 세기',
      '조건부 상황 → 단계별 확률',
    ],
    timeSavingTips: [
      'P(여사건) = 1 - P(A)',
      '"적어도 하나" → 여사건 활용',
      '복원/비복원 추출 구분 확실히',
    ],
  },
  // 중학교 3학년
  {
    unit: '제곱근',
    keywords: ['제곱근', '근호', '무리수', '실수'],
    examDuration: 45,
    guides: [
      { type: '제곱근 개념', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '근호 간단히', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '근호 사칙연산', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '분모의 유리화', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '실수 분류/대소', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '√4 = 2 (양수만) → 즉답',
      '√a² = |a| → 절댓값으로 처리',
    ],
    timeConsumingTypes: [
      '켤레식 유리화 → 계산 과정 길어짐',
      '실수 대소 비교 → 제곱해서 비교',
    ],
    timeSavingTips: [
      '√a×√b = √(ab), but √a+√b ≠ √(a+b)',
      '유리화: √a → √a 곱함, √a±√b → 켤레식',
      '대소 비교: 양수면 제곱해서 비교',
    ],
  },
  {
    unit: '인수분해',
    keywords: ['인수분해', '곱셈공식', '다항식'],
    examDuration: 45,
    guides: [
      { type: '곱셈공식 전개', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '기본 인수분해', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '복잡한 인수분해', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '공식 변형 활용', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '치환 인수분해', weight: '10%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '곱셈공식 → 암기되어 있으면 즉시 전개',
      '합차공식 → a²-b² = (a+b)(a-b) 바로 적용',
    ],
    timeConsumingTypes: [
      '복잡한 인수분해 → 여러 단계 필요',
      '조건이 주어진 식의 값 → 변형 필요',
    ],
    timeSavingTips: [
      '곱셈공식 5개 1초 안에 떠올리기',
      '인수분해: 공통인수 먼저 → 공식 적용',
      'a²+b² = (a+b)²-2ab 변형 활용',
    ],
  },
  {
    unit: '이차방정식',
    keywords: ['이차방정식', '근의 공식', '판별식'],
    examDuration: 45,
    guides: [
      { type: '인수분해 풀이', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '완전제곱식 풀이', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '근의 공식', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '판별식 활용', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '20%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '인수분해 가능 → 가장 빠른 방법',
      '짝수 공식 → b가 짝수면 계산 간단',
    ],
    timeConsumingTypes: [
      '활용 문제 → 식 세우기에 시간 소요',
      '근의 조건 → 판별식 부등식 풀이',
    ],
    timeSavingTips: [
      '먼저 인수분해 가능한지 확인',
      '근의 공식 분모는 2a (a 아님!)',
      '활용: 답 구한 후 조건(양수, 자연수) 확인',
    ],
  },
  {
    unit: '이차함수',
    keywords: ['이차함수', '포물선', '꼭짓점'],
    examDuration: 45,
    guides: [
      { type: '그래프 특징', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '꼭짓점/축', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '표준형 ↔ 일반형', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '그래프와 x축', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '최대/최소', weight: '20%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'y = a(x-p)² + q → 꼭짓점 (p, q) 즉시 읽기',
      'a의 부호 → 볼록 방향 바로 판단',
    ],
    timeConsumingTypes: [
      '정의역 제한된 최대/최소 → 경우 분류',
      '그래프와 x축 교점 조건 → 판별식 연결',
    ],
    timeSavingTips: [
      '괄호 안이 (x-3)이면 꼭짓점 x좌표는 +3',
      '꼭짓점 공식: x = -b/2a',
      '정의역에 꼭짓점 포함되는지 먼저 확인',
    ],
  },
  {
    unit: '삼각비',
    keywords: ['삼각비', 'sin', 'cos', 'tan', '사인', '코사인', '탄젠트'],
    examDuration: 45,
    guides: [
      { type: '삼각비 정의', weight: '20%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '특수각', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '삼각비 표', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '예각의 삼각비', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'sin = 대변/빗변, cos = 인접변/빗변, tan = 대변/인접변',
      '특수각 30°, 45°, 60° 값 암기',
    ],
    timeConsumingTypes: [
      '삼각비 활용 (높이, 거리) → 그림 그리기',
      '삼각비 사이의 관계식 활용',
    ],
    timeSavingTips: [
      'sin30°=1/2, sin45°=√2/2, sin60°=√3/2',
      'sin²θ + cos²θ = 1',
      'tanθ = sinθ/cosθ',
    ],
  },
  {
    unit: '원의 성질',
    keywords: ['원의 성질', '원주각', '중심각', '접선', '할선', '현의 수직이등분선', '원과 직선'],
    examDuration: 45,
    guides: [
      { type: '원주각/중심각', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '원에 내접하는 사각형', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '접선의 성질', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '현의 성질', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '활용 문제', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '원주각 = 중심각의 1/2',
      '같은 호 → 원주각이 같다',
    ],
    timeConsumingTypes: [
      '복합 도형 → 여러 성질 동시 적용',
      '접선과 현 → 접선각 활용',
    ],
    timeSavingTips: [
      '반원의 원주각 = 90°',
      '내접 사각형: 대각의 합 = 180°',
      '접선 길이: PA = PB (외부 점 P)',
    ],
  },
  {
    unit: '통계 (중학교)',
    keywords: ['대푯값', '평균', '중앙값', '최빈값', '산포도', '분산', '표준편차'],
    examDuration: 45,
    guides: [
      { type: '대푯값', weight: '25%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '편차', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '분산', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '표준편차', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '자료 해석', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
    ],
    quickTypes: [
      '중앙값: 자료 나열 후 가운데 값',
      '편차의 합 = 0 (항상)',
    ],
    timeConsumingTypes: [
      '분산 계산 → 편차 제곱 합',
      '자료 변환 후 분산/표준편차',
    ],
    timeSavingTips: [
      '분산 = (편차²의 합)/n = (x²의 평균) - (평균)²',
      '표준편차 = √분산',
      '자료에 a를 더하면: 평균만 +a, 분산/표준편차 불변',
      '자료에 a를 곱하면: 평균×a, 분산×a², 표준편차×|a|',
    ],
  },
  // 고등학교
  {
    unit: '다항식',
    keywords: ['다항식', '나머지정리', '인수정리', '조립제법'],
    examDuration: 50,
    guides: [
      { type: '다항식 연산', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '나머지정리', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '인수정리', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '고차 인수분해', weight: '25%', suggestedTime: '3분', difficulty: '⭐⭐' },
      { type: '이차식 나머지', weight: '15%', suggestedTime: '4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '나머지정리 → P(a)가 나머지',
      '조립제법 → 손에 익으면 빠름',
    ],
    timeConsumingTypes: [
      '이차식으로 나눈 나머지 → 연립 필요',
      '복잡한 고차 인수분해',
    ],
    timeSavingTips: [
      '(x-a)로 나눈 나머지 = P(a)',
      '(x+a)로 나눈 나머지 = P(-a) (부호 주의!)',
      '이차식 나머지: R(x) = ax+b로 놓고 두 조건',
    ],
  },
  {
    unit: '방정식과 부등식',
    keywords: ['복소수', '근과 계수', '이차부등식', '판별식'],
    examDuration: 50,
    guides: [
      { type: '복소수 계산', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '판별식/근과 계수', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '이차방정식/함수 관계', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '이차부등식', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '고차방정식', weight: '20%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'i의 거듭제곱 → 4개 주기로 즉답',
      '근과 계수 → 공식 대입',
    ],
    timeConsumingTypes: [
      '대칭식 계산 → 변형 공식 필요',
      '이차부등식 → D 부호에 따른 경우 분류',
    ],
    timeSavingTips: [
      'i¹=i, i²=-1, i³=-i, i⁴=1 (4개 주기)',
      'α+β = -b/a (마이너스 주의!)',
      '이차부등식: 그래프 먼저 그리기',
    ],
  },
  {
    unit: '수열',
    keywords: ['수열', '등차수열', '등비수열', '시그마', '귀납법'],
    examDuration: 50,
    guides: [
      { type: '등차/등비 기본', weight: '20%', suggestedTime: '2분', difficulty: '⭐' },
      { type: '일반항/합', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '시그마 계산', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '점화식', weight: '20%', suggestedTime: '3분', difficulty: '⭐⭐' },
      { type: '귀납법', weight: '15%', suggestedTime: '4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '등차/등비 공식 → 직접 대입',
      'Σk, Σk², Σk³ → 공식 암기',
    ],
    timeConsumingTypes: [
      '부분분수 분해 → 소거 패턴 찾기',
      '귀납법 증명 → 서술 시간',
    ],
    timeSavingTips: [
      '등차: aₙ=a₁+(n-1)d, 등비: aₙ=a₁×r^(n-1)',
      'Σk=n(n+1)/2, Σk²=n(n+1)(2n+1)/6',
      'aₙ = Sₙ - Sₙ₋₁ (n≥2)',
    ],
  },
  {
    unit: '미분',
    keywords: ['미분', '도함수', '접선', '극값', '최대최소'],
    examDuration: 50,
    guides: [
      { type: '미분계수 정의', weight: '10%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '도함수 계산', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '접선의 방정식', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '극대/극소', weight: '25%', suggestedTime: '3분', difficulty: '⭐⭐' },
      { type: '최대/최소', weight: '20%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '다항함수 미분 → 공식 기계적 적용',
      '접선의 기울기 → f\'(a) 계산',
    ],
    timeConsumingTypes: [
      '극값 조건 → f\'=0 후 부호 변화 확인',
      '구간에서 최대/최소 → 끝점도 확인',
    ],
    timeSavingTips: [
      '(xⁿ)\' = nxⁿ⁻¹',
      '접선: y-f(a) = f\'(a)(x-a)',
      'f\'=0이어도 부호 안 바뀌면 극값 아님',
    ],
  },
  {
    unit: '적분',
    keywords: ['적분', '부정적분', '정적분', '넓이'],
    examDuration: 50,
    guides: [
      { type: '부정적분', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '정적분 계산', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '대칭성 활용', weight: '15%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '넓이 (기본)', weight: '25%', suggestedTime: '3분', difficulty: '⭐⭐' },
      { type: '넓이 (심화)', weight: '20%', suggestedTime: '4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '부정적분 → 미분 역과정',
      '정적분 → F(b)-F(a)',
    ],
    timeConsumingTypes: [
      'x축 아래 넓이 → 절댓값/구간 나누기',
      '두 곡선 사이 → 교점 찾기 + 위아래 확인',
    ],
    timeSavingTips: [
      '∫xⁿdx = xⁿ⁺¹/(n+1) + C',
      '기함수 [-a,a] 적분 = 0',
      '넓이: 절댓값 또는 위-아래',
    ],
  },
  {
    unit: '집합과 명제',
    keywords: ['집합', '명제', '조건', '진리집합', '필요충분조건', '대우', '명제의 역', '귀류법'],
    examDuration: 50,
    guides: [
      { type: '집합 연산', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '벤 다이어그램', weight: '15%', suggestedTime: '2분', difficulty: '⭐' },
      { type: '명제의 역/대우', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '필요/충분조건', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '귀류법 증명', weight: '20%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '드모르간 법칙 → (A∪B)ᶜ = Aᶜ∩Bᶜ 즉시 적용',
      '부분집합 개수 → 2ⁿ 공식',
    ],
    timeConsumingTypes: [
      '필요충분조건 판별 → 진리집합 포함관계 확인',
      '귀류법 증명 → 서술 과정 필요',
    ],
    timeSavingTips: [
      'p→q 참 ⟺ ~q→~p 참 (대우)',
      '필요: q⊂p, 충분: p⊂q (집합으로 기억)',
      'A∩B = A ⟺ A⊂B',
    ],
  },
  {
    unit: '함수',
    keywords: ['함수의 뜻', '합성함수', '역함수', '유리함수', '무리함수', '일대일함수', '일대일대응', '정의역', '치역'],
    examDuration: 50,
    guides: [
      { type: '함수의 정의', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '합성함수', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '역함수', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '유리함수', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '무리함수', weight: '15%', suggestedTime: '3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '일대일 대응 → 역함수 존재 조건',
      '(f∘g)(x) = f(g(x)) → 안쪽부터 계산',
    ],
    timeConsumingTypes: [
      '합성함수 조건 → 정의역/치역 확인 필요',
      '역함수 그래프 → y=x 대칭 이용',
    ],
    timeSavingTips: [
      '역함수: x, y 바꾸고 y에 대해 정리',
      '(f∘f⁻¹)(x) = x, (f⁻¹∘f)(x) = x',
      '유리함수 y=k/(x-a)+b 점근선: x=a, y=b',
    ],
  },
  {
    unit: '지수와 로그',
    keywords: ['지수', '로그', '거듭제곱', '상용로그', '자연로그', '지수법칙', '로그법칙'],
    examDuration: 50,
    guides: [
      { type: '지수법칙', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '로그 정의', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '로그법칙', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '밑 변환 공식', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '상용로그 활용', weight: '20%', suggestedTime: '3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'aᵐ × aⁿ = aᵐ⁺ⁿ → 즉시 적용',
      'log_a(a) = 1, log_a(1) = 0 → 기본값',
    ],
    timeConsumingTypes: [
      '복잡한 로그 계산 → 여러 법칙 적용',
      '자릿수 문제 → 상용로그 성질 이용',
    ],
    timeSavingTips: [
      'log_a(MN) = log_a(M) + log_a(N)',
      'log_a(M/N) = log_a(M) - log_a(N)',
      'log_a(Mⁿ) = n·log_a(M)',
      '밑 변환: log_a(b) = log_c(b)/log_c(a)',
    ],
  },
  {
    unit: '지수함수와 로그함수',
    keywords: ['지수함수', '로그함수', '지수방정식', '로그방정식', '지수부등식', '로그부등식'],
    examDuration: 50,
    guides: [
      { type: '지수함수 그래프', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '로그함수 그래프', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '지수방정식', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '로그방정식', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '지수/로그 부등식', weight: '20%', suggestedTime: '3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'y = aˣ → (0,1) 지남, 점근선 y=0',
      'y = log_a(x) → (1,0) 지남, 점근선 x=0',
    ],
    timeConsumingTypes: [
      '밑이 다른 방정식 → 치환 또는 밑 통일',
      '부등식 → 밑이 1보다 큰지 작은지 확인',
    ],
    timeSavingTips: [
      '지수함수와 로그함수는 y=x 대칭 (역함수)',
      '밑 > 1: 증가함수, 0 < 밑 < 1: 감소함수',
      '로그 진수조건 항상 확인 (진수 > 0)',
      'aˣ = aʸ ⟺ x = y (밑이 같으면)',
    ],
  },
  {
    unit: '삼각함수',
    keywords: ['삼각함수', '호도법', '라디안', '삼각비', '사인', '코사인', '탄젠트', '단위원'],
    examDuration: 50,
    guides: [
      { type: '호도법 변환', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '삼각함수 값', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '삼각함수 공식', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '삼각방정식', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '삼각함수 활용', weight: '20%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '특수각(30°, 45°, 60°) → 값 암기',
      'sin²θ + cos²θ = 1 → 기본 항등식',
    ],
    timeConsumingTypes: [
      '일반각에서 삼각함수 값 → 기준각 찾기',
      '복잡한 삼각함수 식 → 공식 여러 번 적용',
    ],
    timeSavingTips: [
      'π = 180° 기억 (호도법 ↔ 도 변환)',
      '단위원에서 (cosθ, sinθ) 좌표',
      '1 + tan²θ = sec²θ, 1 + cot²θ = csc²θ',
      '사분면 별 부호: ASTC (전코탄사)',
    ],
  },
  {
    unit: '삼각함수의 그래프',
    keywords: ['삼각함수 그래프', '주기', '진폭', '평행이동', '대칭', '사인함수', '코사인함수'],
    examDuration: 50,
    guides: [
      { type: '기본 그래프', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '주기/진폭', weight: '20%', suggestedTime: '2분', difficulty: '⭐' },
      { type: '평행이동', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '그래프 해석', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '최대/최소', weight: '20%', suggestedTime: '3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'y = sinx 주기 2π, y = tanx 주기 π',
      'y = asin(bx) → 주기 = 2π/|b|, 진폭 = |a|',
    ],
    timeConsumingTypes: [
      '복합 변환 → 순서대로 적용 필요',
      '그래프에서 식 구하기 → 조건 대입',
    ],
    timeSavingTips: [
      'sin → cos: x축 방향 -π/2 이동',
      'y = asin(bx+c)+d → 진폭 a, 주기 2π/b, 상하이동 d',
      '최대 = d+|a|, 최소 = d-|a|',
    ],
  },
  {
    unit: '삼각함수의 활용',
    keywords: ['사인법칙', '코사인법칙', '삼각형 넓이', '삼각측량'],
    examDuration: 50,
    guides: [
      { type: '사인법칙', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '코사인법칙', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '삼각형 넓이', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '도형 응용', weight: '25%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'a/sinA = 2R → 외접원 반지름',
      'S = (1/2)absinC → 두 변과 끼인각',
    ],
    timeConsumingTypes: [
      '복잡한 도형 → 보조선/분할 필요',
      '여러 법칙 조합 → 단계별 계산',
    ],
    timeSavingTips: [
      '사인법칙: 대각과 대변의 비',
      '코사인법칙: a² = b² + c² - 2bc·cosA',
      '넓이 공식 세 가지: (1/2)ah, (1/2)absinC, √{s(s-a)(s-b)(s-c)}',
    ],
  },
  {
    unit: '도형의 방정식',
    keywords: ['직선', '원', '점과 직선', '두 직선', '원의 방정식', '접선', '평면좌표'],
    examDuration: 50,
    guides: [
      { type: '직선의 방정식', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '점과 직선 거리', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '원의 방정식', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '직선과 원', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '원의 접선', weight: '20%', suggestedTime: '3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '기울기 m, 점 (a,b) 지남 → y-b = m(x-a)',
      '원의 중심, 반지름 → 표준형에서 즉시 읽기',
    ],
    timeConsumingTypes: [
      '원과 직선 교점 → 연립방정식 풀이',
      '외부 점에서 접선 → 판별식 활용',
    ],
    timeSavingTips: [
      '점과 직선 거리: |ax₁+by₁+c|/√(a²+b²)',
      '일반형 → 표준형: 완전제곱식 변환',
      '접선: 중심-접점 ⊥ 접선',
      '원 위의 점에서 접선: (x-a)(x₁-a) + (y-b)(y₁-b) = r²',
    ],
  },
  {
    unit: '경우의 수',
    keywords: ['경우의 수', '순열', '조합', '팩토리얼', '중복순열', '중복조합', '원순열'],
    examDuration: 50,
    guides: [
      { type: '합/곱의 법칙', weight: '15%', suggestedTime: '1분', difficulty: '⭐' },
      { type: '순열', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '조합', weight: '25%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '중복/원순열', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '응용 문제', weight: '20%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'nPr = n!/(n-r)! → 공식 대입',
      'nCr = n!/r!(n-r)! → 공식 대입',
    ],
    timeConsumingTypes: [
      '조건이 있는 배열 → 경우 분류 필요',
      '복잡한 상황 해석 → 순열/조합 결정',
    ],
    timeSavingTips: [
      '순서 O → 순열, 순서 X → 조합',
      'nCr = nCn-r (대칭성)',
      '원순열: (n-1)!',
      '같은 것 있는 순열: n!/p!q!...',
    ],
  },
  {
    unit: '확률',
    keywords: ['확률', '조건부확률', '독립', '종속', '배반', '확률의 덧셈', '확률의 곱셈'],
    examDuration: 50,
    guides: [
      { type: '확률 기본', weight: '20%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '여사건', weight: '15%', suggestedTime: '1~2분', difficulty: '⭐' },
      { type: '조건부확률', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '독립/종속', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '응용 문제', weight: '20%', suggestedTime: '3~4분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      'P(A) = n(A)/n(S) → 기본 공식',
      '여사건: P(Aᶜ) = 1 - P(A)',
    ],
    timeConsumingTypes: [
      '복잡한 조건부확률 → 표 또는 수형도 필요',
      '독립성 판별 → P(A∩B) = P(A)P(B) 확인',
    ],
    timeSavingTips: [
      '조건부확률: P(B|A) = P(A∩B)/P(A)',
      '독립: P(A∩B) = P(A)×P(B)',
      '"적어도 하나" → 여사건이 빠름',
      '베이즈 정리: 원인→결과 역추적',
    ],
  },
  {
    unit: '통계',
    keywords: ['통계', '평균', '분산', '표준편차', '확률분포', '이항분포', '정규분포'],
    examDuration: 50,
    guides: [
      { type: '평균/분산/표준편차', weight: '20%', suggestedTime: '2분', difficulty: '⭐' },
      { type: '확률분포표', weight: '20%', suggestedTime: '2분', difficulty: '⭐⭐' },
      { type: '이항분포', weight: '25%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '정규분포', weight: '20%', suggestedTime: '2~3분', difficulty: '⭐⭐' },
      { type: '표준화', weight: '15%', suggestedTime: '2~3분', difficulty: '⭐⭐⭐' },
    ],
    quickTypes: [
      '기대값 E(X) = Σxp → 정의대로',
      '표준화 Z = (X-μ)/σ',
    ],
    timeConsumingTypes: [
      '분산 계산 → E(X²) - {E(X)}² 활용',
      '정규분포 표 읽기 → 구간 계산 주의',
    ],
    timeSavingTips: [
      'V(X) = E(X²) - {E(X)}² (분산 공식)',
      'B(n,p): E(X)=np, V(X)=npq',
      'N(μ,σ²) → Z = (X-μ)/σ로 표준화',
      'E(aX+b) = aE(X)+b, V(aX+b) = a²V(X)',
    ],
  },
];

/**
 * 토픽에 맞는 시간 배분 전략 찾기
 */
export function findTimeAllocationStrategy(topic: string): TimeAllocationStrategy | null {
  return TIME_ALLOCATION_STRATEGIES.find(strategy =>
    strategy.keywords.some(keyword =>
      topic.includes(keyword) || keyword.includes(topic)
    )
  ) || null;
}
