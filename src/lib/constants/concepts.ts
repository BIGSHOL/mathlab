/**
 * 교육과정 기반 개념 시드 데이터.
 *
 * 초등 3~6학년: docs/work-plans/elementary-math-curriculum-guide.md 기준
 * 중학교 1~3학년: docs/guides/middle_school_math_concepts.md 기준
 * 고등학교 1학년(공통수학1): docs/guides/공통수학1_개념문제_가이드.md + reports/math-concepts-full.md 기준
 *
 * 각 개념은 고유 ID, 학년, 트랙(연산/개념), 파트(6대 영역), 설명, 선수관계를 포함합니다.
 *
 * Converted from: d:/math_test/backend/app/data/seed_concepts.py
 */

// ──────────────────────────────────────────
// 개념 시드 데이터 인터페이스
// ──────────────────────────────────────────

export interface ConceptSeedData {
  id: string;
  name: string;
  grade: string;
  category: 'concept' | 'computation';
  part: 'calc' | 'algebra' | 'func' | 'geo' | 'data';
  description: string;
  parentId: string | null;
  prerequisites: string[];
}

// =============================================
// 초등학교 3학년 (elementary_3)
// =============================================

export const ELEMENTARY_3_CONCEPTS: ConceptSeedData[] = [
  // ── 수와 연산 (NUM) ──
  { id: 'E3-NUM-01', name: '세 자리 수 덧셈', grade: 'elementary_3', category: 'computation', part: 'calc', description: '받아올림이 없는, 한 번 있는, 여러 번 있는 (세 자리 수)+(세 자리 수) 계산. 자릿값을 맞추어 일의 자리부터 차례로 더한다. 받아올림이 있으면 윗자리에 1을 올려 계산한다. 세로셈으로 자릿값을 정확히 맞추는 것이 중요하다.', parentId: null, prerequisites: [] },
  { id: 'E3-NUM-02', name: '세 자리 수 뺄셈', grade: 'elementary_3', category: 'computation', part: 'calc', description: '받아내림이 없는, 한 번 있는, 두 번 있는 (세 자리 수)-(세 자리 수) 계산. 일의 자리부터 차례로 뺀다. 윗자리에서 1을 빌려오면 10이 된다. 중간에 0이 있는 경우(예: 504-278) 윗자리에서 연속 받아내림한다.', parentId: null, prerequisites: [] },
  { id: 'E3-NUM-03', name: '나눗셈 기초', grade: 'elementary_3', category: 'computation', part: 'calc', description: '똑같이 나누기 개념. 곱셈과 나눗셈의 관계(12÷3=4 ↔ 3×4=12). 곱셈구구를 이용하여 몫 구하기. 나눗셈의 기호(÷)와 몫, 나머지 개념. 나머지는 항상 나누는 수보다 작다.', parentId: null, prerequisites: [] },
  { id: 'E3-NUM-04', name: '두 자리 곱셈', grade: 'elementary_3', category: 'computation', part: 'calc', description: '(몇십)×(몇), (몇십몇)×(몇) 계산. 일의 자리에서 올림, 십의 자리에서 올림이 있는 경우. 올림이 두 번 있는 (몇십몇)×(몇). 세 자리 수×한 자리 수, 두 자리 수×두 자리 수로 확장.', parentId: null, prerequisites: ['E3-NUM-01'] },
  { id: 'E3-NUM-05', name: '분수 기초', grade: 'elementary_3', category: 'concept', part: 'calc', description: '전체를 똑같이 나눈 것 중의 일부를 분수로 나타냄. 분모(나눈 수), 분자(취한 수). 단위분수(분자가 1인 분수). 진분수(분자<분모), 가분수(분자≥분모), 대분수(자연수+진분수). 분모가 같은 분수의 크기 비교: 분자가 클수록 큰 분수.', parentId: null, prerequisites: ['E3-NUM-03'] },
  { id: 'E3-NUM-06', name: '소수 기초', grade: 'elementary_3', category: 'concept', part: 'calc', description: '0.1은 1을 10으로 똑같이 나눈 것 중 하나. 1보다 작은 소수(0.3, 0.7 등)와 1보다 큰 소수(1.5, 2.3 등). 소수점 아래 한 자리 수의 크기 비교. 자연수 부분이 같으면 소수 부분을 비교한다.', parentId: null, prerequisites: ['E3-NUM-05'] },
  // ── 도형 (GEO) ──
  { id: 'E3-GEO-01', name: '평면도형 기초', grade: 'elementary_3', category: 'concept', part: 'geo', description: '선분(두 점을 곧게 이은 선), 반직선(한 점에서 한 쪽으로 끝없이 뻗은 선), 직선(양쪽으로 끝없이 뻗은 선). 각(한 점에서 그은 두 반직선으로 이루어진 도형). 직각(90°), 직각삼각형, 직사각형(네 각이 모두 직각), 정사각형(네 변과 네 각이 모두 같은 사각형).', parentId: null, prerequisites: [] },
  { id: 'E3-GEO-02', name: '원', grade: 'elementary_3', category: 'concept', part: 'geo', description: '원의 중심(원의 한가운데 점), 반지름(중심에서 원 위의 한 점까지의 거리), 지름(원 위의 두 점을 중심을 지나게 이은 선분). 지름=반지름×2. 한 원에서 반지름과 지름은 각각 무수히 많다. 컴퍼스로 원 그리기.', parentId: null, prerequisites: [] },
  // ── 측정 (MEA → calc) ──
  { id: 'E3-MEA-01', name: '길이와 시간', grade: 'elementary_3', category: 'concept', part: 'calc', description: '1cm=10mm, 1km=1000m. mm는 cm보다 작은 단위로 정밀한 측정에 사용. km는 먼 거리를 나타낼 때 사용. 1분=60초. 시간의 덧셈과 뺄셈에서 60초를 넘기면 1분으로 올림, 60분을 넘기면 1시간으로 올림한다.', parentId: null, prerequisites: [] },
  { id: 'E3-MEA-02', name: '들이와 무게', grade: 'elementary_3', category: 'concept', part: 'calc', description: '들이: 그릇에 담을 수 있는 양. 1L=1000mL. 무게: 물체의 무거운 정도. 1kg=1000g. 들이와 무게의 덧셈·뺄셈에서 mL/g 단위를 맞추어 계산하고, 1000이 넘으면 L/kg으로 올림한다.', parentId: null, prerequisites: [] },
  // ── 자료와 가능성 (STA) ──
  { id: 'E3-STA-01', name: '자료의 정리', grade: 'elementary_3', category: 'concept', part: 'data', description: '표: 자료를 항목별로 정리하여 나타낸 것. 그림그래프: 그림을 이용하여 수량을 나타낸 그래프. 그림 1개가 나타내는 수를 정하고, 수량만큼 그림을 그린다. 자료를 수집하고 분류하여 표와 그림그래프로 나타내는 과정을 익힌다.', parentId: null, prerequisites: [] },
  // ── 추가 (3-2 교과서) ──
  { id: 'E3-NUM-07', name: '나머지가 있는 나눗셈', grade: 'elementary_3', category: 'computation', part: 'calc', description: '(몇십)÷(몇), (몇십몇)÷(몇)에서 나머지가 있는 나눗셈. 내림이 있는 경우와 없는 경우. (세 자리 수)÷(한 자리 수)의 나눗셈. 나머지는 항상 나누는 수보다 작다. 검산: 나누는 수×몫+나머지=나누어지는 수로 확인한다.', parentId: 'E3-NUM-03', prerequisites: ['E3-NUM-03'] },
  { id: 'E3-NUM-08', name: '세 자리 수 곱셈', grade: 'elementary_3', category: 'computation', part: 'calc', description: '(세 자리 수)×(한 자리 수) 계산. 일의 자리, 십의 자리, 백의 자리에서 올림이 있는 경우. (몇십)×(몇십), (몇십몇)×(몇십) 계산. (두 자리 수)×(두 자리 수): 올림이 한 번, 여러 번 있는 경우. 세로셈으로 부분 곱을 구한 뒤 더한다.', parentId: 'E3-NUM-04', prerequisites: ['E3-NUM-04'] },
];

// =============================================
// 초등학교 4학년 (elementary_4)
// =============================================

export const ELEMENTARY_4_CONCEPTS: ConceptSeedData[] = [
  // ── 수와 연산 (NUM) ──
  { id: 'E4-NUM-01', name: '만 단위 이해', grade: 'elementary_4', category: 'concept', part: 'calc', description: '10,000은 천의 10배이다. 만, 십만, 백만, 천만, 억, 조 단위를 이해한다. 큰 수는 네 자리씩 끊어 읽으며, 각 자릿값은 오른쪽부터 일, 십, 백, 천이 반복된다. 뛰어 세기를 통해 큰 수의 규칙을 파악하고, 수의 크기를 비교할 때는 자릿수가 많은 수가 더 크며, 같으면 높은 자릿값부터 비교한다.', parentId: null, prerequisites: ['E3-NUM-04'] },
  { id: 'E4-NUM-02', name: '억 단위 이해', grade: 'elementary_4', category: 'concept', part: 'calc', description: '100,000,000은 만의 만 배이다. 억 단위의 수를 읽고 쓸 수 있다. 십억, 백억, 천억으로 자릿값이 확장된다. 네 자리씩 끊어 읽는 방법을 적용하여 큰 수를 정확히 읽는다. 실생활에서 사용되는 큰 수(인구, 예산 등)를 억 단위로 나타낸다.', parentId: 'E4-NUM-01', prerequisites: ['E4-NUM-01'] },
  { id: 'E4-NUM-03', name: '조 단위 이해', grade: 'elementary_4', category: 'concept', part: 'calc', description: '1,000,000,000,000은 억의 만 배이다. 조 단위까지 수를 읽고 쓸 수 있다. 만, 억, 조 단위 간의 관계를 이해하고, 네 자리씩 끊어 읽기를 통해 체계적으로 큰 수를 다룬다. 국가 예산, 천문학적 거리 등 실생활 맥락에서 조 단위 수를 활용한다.', parentId: 'E4-NUM-02', prerequisites: ['E4-NUM-02'] },
  { id: 'E4-NUM-04', name: '큰 수 비교', grade: 'elementary_4', category: 'concept', part: 'calc', description: '두 수의 크기를 비교할 때 먼저 자릿수를 비교한다. 자릿수가 많은 수가 더 크다. 자릿수가 같으면 가장 높은 자리부터 차례로 비교하여 처음으로 다른 숫자가 나오는 자리에서 큰 쪽이 더 큰 수이다. 부등호(>, <, =)를 사용하여 크기 관계를 나타낸다.', parentId: 'E4-NUM-01', prerequisites: ['E4-NUM-01'] },
  { id: 'E4-NUM-05', name: '세 자리 × 두 자리 곱셈', grade: 'elementary_4', category: 'computation', part: 'calc', description: '(세 자리 수)×(몇십), (세 자리 수)×(몇십몇) 곱셈. 세로셈으로 일의 자리부터 차례로 곱하고, 올림이 있으면 윗자리에 더한다. (세 자리 수)×(몇십몇)은 일의 자리와 십의 자리를 각각 곱한 후 자릿값에 맞추어 더한다.', parentId: null, prerequisites: ['E3-NUM-04'] },
  { id: 'E4-NUM-06', name: '세 자리 ÷ 두 자리 나눗셈', grade: 'elementary_4', category: 'computation', part: 'calc', description: '(세 자리 수)÷(두 자리 수) 나눗셈. 몫이 한 자리 수 또는 두 자리 수인 경우를 구별한다. 나누어떨어지지 않으면 나머지가 생기며, 나머지는 항상 나누는 수보다 작다. 검산: (나누는 수)×(몫)+(나머지)=(나누어지는 수).', parentId: null, prerequisites: ['E4-NUM-05'] },
  { id: 'E4-NUM-07', name: '동분모 분수 덧셈', grade: 'elementary_4', category: 'computation', part: 'calc', description: '분모가 같은 진분수의 덧셈. 분모는 그대로 두고 분자끼리 더한다. 결과가 가분수이면 대분수로 바꾼다. 예: 3/7+5/7=8/7=1과 1/7. 대분수의 덧셈은 자연수 부분과 분수 부분을 각각 더한다.', parentId: null, prerequisites: ['E3-NUM-05'] },
  { id: 'E4-NUM-08', name: '동분모 분수 뺄셈', grade: 'elementary_4', category: 'computation', part: 'calc', description: '분모가 같은 분수의 뺄셈. 분모는 그대로 두고 분자끼리 뺀다. 대분수의 뺄셈에서 분수 부분이 뺄 수 없으면 자연수에서 1을 빌려와 가분수로 바꾼 후 뺀다. 예: 3과2/5 - 1과4/5에서 3과2/5를 2과7/5로 바꾸어 계산.', parentId: 'E4-NUM-07', prerequisites: ['E4-NUM-07'] },
  { id: 'E4-NUM-09', name: '1에서 분수 빼기', grade: 'elementary_4', category: 'computation', part: 'calc', description: '자연수 1에서 분수 빼기. 1=분모/분모로 바꾸어 계산. 예: 1-3/8=8/8-3/8=5/8. 자연수에서 분수를 빼는 경우에도 자연수를 가분수로 변환하여 계산한다.', parentId: 'E4-NUM-08', prerequisites: ['E4-NUM-08'] },
  { id: 'E4-NUM-10', name: '대분수 연산 (동분모)', grade: 'elementary_4', category: 'computation', part: 'calc', description: '대분수의 덧셈과 뺄셈 종합. 자연수 부분끼리, 분수 부분끼리 각각 계산한다. 분수 부분의 합이 1 이상이면 자연수 부분에 1을 더한다. 분수 부분을 뺄 수 없으면 자연수에서 1을 빌려와 분수 부분을 가분수로 만든 후 뺀다.', parentId: 'E4-NUM-07', prerequisites: ['E4-NUM-07', 'E4-NUM-08'] },
  { id: 'E4-NUM-11', name: '소수 덧셈', grade: 'elementary_4', category: 'computation', part: 'calc', description: '소수의 덧셈. 소수점을 맞추어 세로셈으로 계산한다. 자연수의 덧셈과 같은 방법으로 같은 자릿값끼리 더하고, 결과에 소수점을 맞추어 찍는다. 0.1이 몇 개인지 생각하여 계산할 수도 있다.', parentId: null, prerequisites: ['E3-NUM-06'] },
  { id: 'E4-NUM-12', name: '소수 뺄셈', grade: 'elementary_4', category: 'computation', part: 'calc', description: '소수의 뺄셈. 소수점을 맞추어 세로셈으로 계산한다. 같은 자릿값끼리 빼고, 받아내림이 필요하면 윗자리에서 10을 빌려온다. 자연수에서 소수를 빼는 경우(예: 3-1.7) 자연수를 3.0으로 바꾸어 계산한다.', parentId: 'E4-NUM-11', prerequisites: ['E4-NUM-11'] },
  // ── 도형과 측정 (GEO) ──
  { id: 'E4-GEO-01', name: '예각', grade: 'elementary_4', category: 'concept', part: 'geo', description: '예각은 0°보다 크고 90°보다 작은 각이다. 직각=90°, 둔각은 90°보다 크고 180°보다 작은 각. 각의 크기를 각도라 하며 단위는 도(°)이다. 각도기의 중심을 꼭짓점에, 밑금을 한 변에 맞추어 다른 변이 가리키는 눈금을 읽는다.', parentId: null, prerequisites: ['E3-GEO-01'] },
  { id: 'E4-GEO-02', name: '직각', grade: 'elementary_4', category: 'concept', part: 'geo', description: '직각은 정확히 90°인 각이다. 두 직선이 만나서 이루는 네 각이 모두 직각일 때, 두 직선은 서로 수직이라 한다. 삼각자의 직각 부분을 이용하여 직각을 확인하거나 그릴 수 있다. 직각은 예각과 둔각을 구분하는 기준이 된다.', parentId: null, prerequisites: ['E3-GEO-01'] },
  { id: 'E4-GEO-03', name: '둔각', grade: 'elementary_4', category: 'concept', part: 'geo', description: '둔각은 90°보다 크고 180°보다 작은 각이다. 각도기를 사용하여 둔각의 크기를 잴 수 있다. 둔각이 포함된 삼각형을 둔각삼각형이라 한다. 직각보다 큰 각을 인식하고, 실생활에서 둔각의 예를 찾아볼 수 있다(시계 바늘, 부채 등).', parentId: null, prerequisites: ['E4-GEO-02'] },
  { id: 'E4-GEO-04', name: '삼각형 분류 (변)', grade: 'elementary_4', category: 'concept', part: 'geo', description: '삼각형을 변의 길이에 따라 분류한다. 이등변삼각형: 두 변의 길이가 같은 삼각형이며 두 밑각의 크기도 같다. 정삼각형: 세 변의 길이가 모두 같은 삼각형이며 세 각이 모두 60°이다. 정삼각형은 이등변삼각형에 포함된다.', parentId: null, prerequisites: ['E4-GEO-01', 'E4-GEO-02', 'E4-GEO-03'] },
  { id: 'E4-GEO-05', name: '삼각형 분류 (각)', grade: 'elementary_4', category: 'concept', part: 'geo', description: '삼각형을 각의 크기에 따라 분류한다. 예각삼각형: 세 각이 모두 예각(90° 미만). 직각삼각형: 한 각이 직각(90°). 둔각삼각형: 한 각이 둔각(90° 초과). 삼각형의 세 각의 크기의 합은 항상 180°이다.', parentId: 'E4-GEO-04', prerequisites: ['E4-GEO-01', 'E4-GEO-02', 'E4-GEO-03'] },
  { id: 'E4-GEO-06', name: '사각형 분류와 포함관계', grade: 'elementary_4', category: 'concept', part: 'geo', description: '사각형의 포함 관계를 이해한다. 사각형 ⊃ 사다리꼴(한 쌍의 대변이 평행) ⊃ 평행사변형(두 쌍의 대변이 평행) ⊃ 마름모(네 변의 길이가 같음)/직사각형(네 각이 직각) ⊃ 정사각형(네 변과 네 각이 모두 같음). 수직과 수선, 평행과 평행선의 개념을 이해한다.', parentId: null, prerequisites: ['E3-GEO-01'] },
  { id: 'E4-GEO-07', name: '다각형과 대각선', grade: 'elementary_4', category: 'concept', part: 'geo', description: '다각형은 여러 선분으로 둘러싸인 도형이다. 정다각형은 모든 변의 길이와 모든 각의 크기가 같은 다각형이다. 대각선은 다각형에서 이웃하지 않는 두 꼭짓점을 이은 선분이다. n각형의 한 꼭짓점에서 그을 수 있는 대각선은 (n-3)개이고, 대각선의 총 개수는 n(n-3)/2개이다.', parentId: null, prerequisites: ['E3-GEO-01'] },
  { id: 'E4-GEO-08', name: '평면도형의 이동', grade: 'elementary_4', category: 'concept', part: 'geo', description: '평면도형의 밀기(평행이동): 모양과 크기가 변하지 않고 위치만 바뀜. 뒤집기(대칭이동): 거울에 비친 것처럼 좌우 또는 상하가 바뀜. 돌리기(회전이동): 한 점을 중심으로 일정한 각도만큼 회전. 이 세 가지를 조합하여 무늬를 꾸밀 수 있다.', parentId: null, prerequisites: ['E3-GEO-01'] },
  { id: 'E4-GEO-09', name: '각도 재기와 그리기', grade: 'elementary_4', category: 'concept', part: 'geo', description: '각도기를 사용하여 각의 크기를 재고, 주어진 크기의 각을 그린다. 직각보다 작은 각을 예각, 직각보다 큰 각을 둔각이라 한다. 각의 크기 단위는 도(°)이며, 직각=90°이다. 각도를 어림하여 약 몇 도인지 짐작하는 능력을 기른다.', parentId: null, prerequisites: ['E3-GEO-01'] },
  { id: 'E4-GEO-10', name: '각도의 덧셈과 뺄셈', grade: 'elementary_4', category: 'computation', part: 'geo', description: '두 각도의 합과 차를 계산한다. 받아올림이 있는 각도의 덧셈(예: 75°+48°=123°)과 받아내림이 있는 각도의 뺄셈(예: 130°-85°=45°). 삼각형 세 각의 크기의 합은 180°이고, 사각형 네 각의 크기의 합은 360°이다.', parentId: 'E4-GEO-09', prerequisites: ['E4-GEO-09'] },
  // ── 자료와 가능성 (STA) ──
  { id: 'E4-STA-01', name: '막대그래프', grade: 'elementary_4', category: 'concept', part: 'data', description: '막대그래프: 조사한 자료의 수량을 막대의 길이로 나타낸 그래프. 가로축에 조사 항목, 세로축에 수량(또는 반대). 막대의 길이를 비교하여 항목별 수량의 크고 작음을 한눈에 파악할 수 있다. 눈금 한 칸의 크기를 정하여 그린다.', parentId: null, prerequisites: ['E3-STA-01'] },
  { id: 'E4-STA-02', name: '꺾은선그래프', grade: 'elementary_4', category: 'concept', part: 'data', description: '꺾은선그래프: 시간의 흐름에 따른 수량의 변화를 점과 선으로 나타낸 그래프. 선이 급경사이면 변화가 크고, 완만하면 변화가 작다. 가로축에 시간, 세로축에 수량을 나타내고, 점을 찍어 선분으로 연결한다. 물결선(~)으로 필요 없는 부분을 생략할 수 있다.', parentId: null, prerequisites: ['E4-STA-01'] },
  // ── 변화와 관계 (ALG) ──
  { id: 'E4-ALG-01', name: '규칙 찾기', grade: 'elementary_4', category: 'concept', part: 'algebra', description: '수나 도형의 배열에서 규칙을 찾아 다음에 올 것을 추측한다. 수의 배열: 일정한 수만큼 증가/감소하는 규칙 파악. 도형의 배열: 반복되는 단위를 찾아 규칙 파악. 규칙을 식으로 나타내어 대응 관계를 이해하는 기초를 다진다.', parentId: null, prerequisites: [] },
];

// =============================================
// 초등학교 5학년 (elementary_5)
// =============================================

export const ELEMENTARY_5_CONCEPTS: ConceptSeedData[] = [
  // ── 수와 연산 (NUM) ──
  { id: 'E5-NUM-01', name: '약수', grade: 'elementary_5', category: 'concept', part: 'calc', description: '어떤 수를 나누어떨어지게 하는 수를 그 수의 약수라 한다. 예: 12의 약수는 1, 2, 3, 4, 6, 12이다. 약수를 구할 때는 1부터 차례로 나누어 보거나, 곱셈식을 이용한다. 1은 모든 수의 약수이고, 어떤 수 자신도 항상 약수이다.', parentId: null, prerequisites: ['E4-NUM-06'] },
  { id: 'E5-NUM-02', name: '배수', grade: 'elementary_5', category: 'concept', part: 'calc', description: '어떤 수를 1배, 2배, 3배... 한 수를 그 수의 배수라 한다. 예: 3의 배수는 3, 6, 9, 12, ...이다. 배수는 무한히 많으며, 0은 모든 수의 배수이다. 배수 판별법(2의 배수: 짝수, 5의 배수: 일의 자리가 0 또는 5, 3의 배수: 각 자리 숫자의 합이 3의 배수)을 활용한다.', parentId: null, prerequisites: ['E4-NUM-05'] },
  { id: 'E5-NUM-03', name: '공약수와 최대공약수 (GCD)', grade: 'elementary_5', category: 'computation', part: 'calc', description: '두 수의 공통된 약수를 공약수라 하고, 그중 가장 큰 수를 최대공약수(GCD)라 한다. 거꾸로 나눗셈(두 수를 공통인 수로 나누는 방법)으로 최대공약수를 구한다. 공약수는 최대공약수의 약수이다. 최대공약수가 1이면 두 수는 서로소이다.', parentId: 'E5-NUM-01', prerequisites: ['E5-NUM-01'] },
  { id: 'E5-NUM-04', name: '공배수와 최소공배수 (LCM)', grade: 'elementary_5', category: 'computation', part: 'calc', description: '두 수의 공통된 배수를 공배수라 하고, 그중 가장 작은 수를 최소공배수(LCM)라 한다. 거꾸로 나눗셈으로 최소공배수를 구한다. 공배수는 최소공배수의 배수이다. 두 수의 곱 = 최대공약수 × 최소공배수 관계가 성립한다.', parentId: 'E5-NUM-02', prerequisites: ['E5-NUM-02', 'E5-NUM-03'] },
  { id: 'E5-NUM-05', name: '약분과 기약분수', grade: 'elementary_5', category: 'computation', part: 'calc', description: '분모와 분자를 공약수로 나누어 간단한 분수로 만드는 것을 약분이라 한다. 더 이상 약분할 수 없는 분수(분모와 분자가 서로소)를 기약분수라 한다. 약분할 때는 분모와 분자의 최대공약수로 나누면 한 번에 기약분수가 된다.', parentId: 'E5-NUM-03', prerequisites: ['E5-NUM-03'] },
  { id: 'E5-NUM-06', name: '통분', grade: 'elementary_5', category: 'computation', part: 'calc', description: '분모가 다른 두 분수의 분모를 같게 만드는 것을 통분이라 한다. 두 분모의 최소공배수를 공통 분모로 정하고, 각 분수의 분모와 분자에 같은 수를 곱하여 분모를 맞춘다. 통분 후 분자의 크기를 비교하여 분수의 크기를 비교할 수 있다.', parentId: 'E5-NUM-04', prerequisites: ['E5-NUM-04'] },
  { id: 'E5-NUM-07', name: '혼합 계산 (연산 순서)', grade: 'elementary_5', category: 'computation', part: 'calc', description: '덧셈, 뺄셈, 곱셈, 나눗셈이 섞여 있는 식의 계산 순서: 괄호 안 → 곱셈/나눗셈 → 덧셈/뺄셈. 같은 순위의 연산은 왼쪽부터 차례로 계산한다(좌결합성). 괄호의 종류: 소괄호( ), 중괄호{ }, 대괄호[ ]를 안쪽부터 계산한다.', parentId: null, prerequisites: ['E4-NUM-05', 'E4-NUM-06'] },
  { id: 'E5-NUM-08', name: '이분모 분수 덧셈', grade: 'elementary_5', category: 'computation', part: 'calc', description: '분모가 다른 분수의 덧셈. 먼저 통분하여 분모를 같게 만든 후 분자끼리 더한다. 예: 1/2+1/3=3/6+2/6=5/6. 결과가 가분수이면 대분수로 바꾸고, 약분이 되면 기약분수로 만든다. 세 분수 이상의 덧셈에서도 통분 후 계산한다.', parentId: 'E5-NUM-06', prerequisites: ['E5-NUM-06', 'E4-NUM-07'] },
  { id: 'E5-NUM-09', name: '이분모 분수 뺄셈', grade: 'elementary_5', category: 'computation', part: 'calc', description: '분모가 다른 분수의 뺄셈. 통분하여 분모를 같게 만든 후 분자끼리 뺀다. 예: 3/4-1/3=9/12-4/12=5/12. 대분수의 뺄셈에서 분수 부분을 뺄 수 없으면 자연수에서 1을 빌려와 가분수로 바꾼 후 계산한다. 결과는 기약분수로 나타낸다.', parentId: 'E5-NUM-08', prerequisites: ['E5-NUM-06', 'E4-NUM-08'] },
  { id: 'E5-NUM-10', name: '대분수 연산 (이분모)', grade: 'elementary_5', category: 'computation', part: 'calc', description: '분모가 다른 대분수의 덧셈과 뺄셈. 통분 후 자연수 부분과 분수 부분을 각각 계산한다. 분수 부분의 합이 1 이상이면 자연수 부분으로 올림한다. 뺄셈에서 분수 부분이 부족하면 자연수에서 1을 빌려와 가분수로 바꾼다. 예: 2와3/4+1과2/3=4와5/12.', parentId: 'E5-NUM-08', prerequisites: ['E5-NUM-08', 'E5-NUM-09', 'E4-NUM-10'] },
  { id: 'E5-NUM-11', name: '수의 범위 (이상/이하/초과/미만)', grade: 'elementary_5', category: 'concept', part: 'calc', description: '이상(≥): 기준값을 포함하여 그보다 크거나 같은 수. 이하(≤): 기준값을 포함하여 그보다 작거나 같은 수. 초과(>): 기준값을 포함하지 않고 그보다 큰 수. 미만(<): 기준값을 포함하지 않고 그보다 작은 수. 수직선 위에 범위를 나타내어 시각화한다.', parentId: null, prerequisites: [] },
  { id: 'E5-NUM-12', name: '어림하기 (올림/버림/반올림)', grade: 'elementary_5', category: 'computation', part: 'calc', description: '올림: 구하려는 자리 아래 수가 0이 아니면 윗자리에 1을 더하고 아랫자리를 0으로 만듦. 버림: 구하려는 자리 아래 수를 모두 0으로 만듦. 반올림: 구하려는 자리 바로 아래 숫자가 0~4이면 버리고 5~9이면 올림. 실생활에서 어림 결과를 활용한다.', parentId: 'E5-NUM-11', prerequisites: ['E5-NUM-11'] },
  { id: 'E5-NUM-13', name: '분수의 곱셈', grade: 'elementary_5', category: 'computation', part: 'calc', description: '(분수)×(자연수): 분자에 자연수를 곱한다. (자연수)×(분수): 자연수를 분수의 분자에 곱한다. (분수)×(분수): 분자끼리 곱하고 분모끼리 곱한다. 계산 전에 약분하면 간편하다. 대분수는 가분수로 바꾸어 계산한 후 다시 대분수로 나타낸다.', parentId: null, prerequisites: ['E5-NUM-05'] },
  { id: 'E5-NUM-14', name: '소수의 곱셈', grade: 'elementary_5', category: 'computation', part: 'calc', description: '(소수)×(자연수), (자연수)×(소수), (소수)×(소수) 계산. 소수점을 무시하고 자연수처럼 곱한 후, 두 수의 소수점 아래 자릿수의 합만큼 결과에서 소수점을 왼쪽으로 이동한다. 예: 0.2×0.3=0.06 (소수 첫째 자리+첫째 자리=둘째 자리).', parentId: null, prerequisites: ['E4-NUM-11'] },
  { id: 'E5-NUM-15', name: '평균', grade: 'elementary_5', category: 'concept', part: 'data', description: '평균은 자료의 값을 모두 더한 후 자료의 개수로 나눈 값이다. 평균 = (모든 값의 합) ÷ (자료의 개수). 평균을 이용하여 전체 합을 구할 수도 있다(합 = 평균 × 개수). 평균은 자료의 대표값으로 사용되며, 자료의 전체적인 경향을 파악하는 데 유용하다.', parentId: null, prerequisites: ['E5-NUM-07'] },
  { id: 'E5-NUM-16', name: '가능성 (확률 기초)', grade: 'elementary_5', category: 'concept', part: 'data', description: '어떤 일이 일어날 가능성을 수로 나타낸다. 불가능한 사건의 가능성은 0, 반반인 사건은 1/2, 확실한 사건은 1이다. 가능성은 0과 1 사이의 수로 표현한다. 일상생활에서 일어날 가능성이 높은 일과 낮은 일을 구분하고 수치화하는 기초를 다진다.', parentId: null, prerequisites: [] },
  // ── 도형과 측정 (GEO) ──
  { id: 'E5-GEO-01', name: '다각형의 둘레', grade: 'elementary_5', category: 'concept', part: 'geo', description: '다각형의 둘레는 모든 변의 길이의 합이다. 정다각형의 둘레 = (한 변의 길이) × (변의 수). 직사각형의 둘레 = (가로+세로)×2. 정사각형의 둘레 = (한 변의 길이)×4. 둘레의 길이를 구할 때는 모든 변을 빠짐없이 더해야 한다.', parentId: null, prerequisites: [] },
  { id: 'E5-GEO-02', name: '직사각형/평행사변형 넓이', grade: 'elementary_5', category: 'concept', part: 'geo', description: '직사각형의 넓이 = 가로 × 세로. 넓이의 단위: 1cm², 1m², 1km², 1a(=100m²), 1ha(=10000m²). 평행사변형의 넓이 = 밑변 × 높이. 평행사변형을 잘라 직사각형으로 등적변형하면 공식을 유도할 수 있다.', parentId: 'E5-GEO-01', prerequisites: ['E5-GEO-01'] },
  { id: 'E5-GEO-03', name: '삼각형 넓이', grade: 'elementary_5', category: 'concept', part: 'geo', description: '삼각형의 넓이 = 밑변 × 높이 ÷ 2. 같은 삼각형 2개를 붙이면 평행사변형이 되므로 평행사변형 넓이의 절반이다. 밑변과 높이의 선택에 따라 여러 가지 방법으로 넓이를 구할 수 있다. 높이는 밑변에 수직인 선분의 길이이다.', parentId: 'E5-GEO-02', prerequisites: ['E5-GEO-02'] },
  { id: 'E5-GEO-04', name: '마름모/사다리꼴 넓이', grade: 'elementary_5', category: 'concept', part: 'geo', description: '마름모의 넓이 = (한 대각선) × (다른 대각선) ÷ 2. 마름모를 대각선으로 잘라 4개의 직각삼각형으로 나누어 유도한다. 사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2. 같은 사다리꼴 2개를 뒤집어 붙이면 평행사변형이 된다.', parentId: 'E5-GEO-03', prerequisites: ['E5-GEO-03'] },
  { id: 'E5-GEO-05', name: '합동', grade: 'elementary_5', category: 'concept', part: 'geo', description: '모양과 크기가 같아 완전히 포개어지는 두 도형을 서로 합동이라 한다. 합동인 도형에서 대응변의 길이와 대응각의 크기가 각각 같다. 삼각형의 합동 조건(SSS, SAS, ASA)은 중학교에서 배우며, 초등에서는 겹쳐서 확인하는 방법으로 합동을 판단한다.', parentId: null, prerequisites: ['E4-GEO-04'] },
  { id: 'E5-GEO-06', name: '선대칭과 점대칭', grade: 'elementary_5', category: 'concept', part: 'geo', description: '선대칭도형: 한 직선을 축으로 접었을 때 완전히 겹쳐지는 도형. 대칭축은 대응점을 이은 선분을 수직이등분한다. 점대칭도형: 한 점을 중심으로 180° 회전했을 때 처음 도형과 겹쳐지는 도형. 대칭의 중심은 대응점을 이은 선분의 중점이다.', parentId: 'E5-GEO-05', prerequisites: ['E5-GEO-05', 'E4-GEO-08'] },
  { id: 'E5-GEO-07', name: '직육면체와 정육면체', grade: 'elementary_5', category: 'concept', part: 'geo', description: '직육면체: 직사각형 6개로 둘러싸인 도형. 면 6개, 모서리 12개, 꼭짓점 8개. 오일러 공식: V-E+F=2 (8-12+6=2). 정육면체: 정사각형 6개로 둘러싸인 도형. 겨냥도(3차원 느낌으로 그린 그림)와 전개도(펼친 그림)를 그리고 해석할 수 있다.', parentId: null, prerequisites: ['E4-GEO-06'] },
  // ── 변화와 관계 (ALG) ──
  { id: 'E5-ALG-01', name: '규칙과 대응', grade: 'elementary_5', category: 'concept', part: 'algebra', description: '두 양 사이의 대응 관계를 이해한다. 한 양이 변하면 다른 양도 규칙적으로 변한다. ○, △ 등의 기호를 사용하여 대응 관계를 식으로 나타낸다. 예: 정삼각형의 수 ○와 성냥개비의 수 △ 사이에 △=○×2+1 관계. 함수적 사고의 기초를 다진다.', parentId: 'E4-ALG-01', prerequisites: ['E4-ALG-01'] },
];

// =============================================
// 초등학교 6학년 (elementary_6)
// =============================================

export const ELEMENTARY_6_CONCEPTS: ConceptSeedData[] = [
  // ── 수와 연산 (NUM) ──
  { id: 'E6-NUM-01', name: '자연수÷자연수→분수', grade: 'elementary_6', category: 'computation', part: 'calc', description: '자연수의 나눗셈 결과를 분수로 나타낸다. a÷b=a/b. 예: 3÷7=3/7, 5÷2=5/2=2와1/2. 나누어떨어지지 않는 나눗셈도 분수로 정확히 표현할 수 있다. 이를 통해 나눗셈과 분수의 관계를 이해하고, 분수의 나눗셈으로 확장하는 기초를 다진다.', parentId: null, prerequisites: ['E5-NUM-05'] },
  { id: 'E6-NUM-02', name: '분수÷자연수', grade: 'elementary_6', category: 'computation', part: 'calc', description: '(분수)÷(자연수) 계산. a/b÷c=a/(b×c). 예: 6/7÷2=6/14=3/7. 분모에 자연수를 곱하거나, 분자를 자연수로 나눌 수 있으면 분자를 나눈다. 대분수는 가분수로 바꾸어 계산한다. 분수의 곱셈과 연결하여 ÷c = ×(1/c)임을 이해한다.', parentId: 'E6-NUM-01', prerequisites: ['E6-NUM-01', 'E5-NUM-13'] },
  { id: 'E6-NUM-03', name: '분수÷분수 (역수 곱셈)', grade: 'elementary_6', category: 'computation', part: 'calc', description: '(분수)÷(분수)는 나누는 분수의 역수를 곱하여 계산한다. a/b÷c/d=a/b×d/c. 역수: 분모와 분자를 바꾼 수(c/d의 역수는 d/c). 예: 2/3÷4/5=2/3×5/4=10/12=5/6. 왜 역수를 곱하는지 원리를 이해하는 것이 중요하다.', parentId: 'E6-NUM-02', prerequisites: ['E6-NUM-02', 'E5-NUM-13'] },
  { id: 'E6-NUM-04', name: '소수÷자연수', grade: 'elementary_6', category: 'computation', part: 'calc', description: '(소수)÷(자연수) 계산. 자연수의 나눗셈과 같은 방법으로 나누되, 몫의 소수점 위치를 나누어지는 수의 소수점 위치에 맞추어 찍는다. 예: 2.46÷3=0.82. 나누어떨어지지 않으면 소수점 아래에 0을 내려 계속 나눈다.', parentId: null, prerequisites: ['E5-NUM-14'] },
  { id: 'E6-NUM-05', name: '소수÷소수', grade: 'elementary_6', category: 'computation', part: 'calc', description: '(소수)÷(소수) 계산. 나누는 수의 소수점을 오른쪽으로 옮겨 자연수로 만들고, 나누어지는 수도 같은 칸만큼 소수점을 옮긴다. 예: 3.25÷0.5→32.5÷5=6.5. 나머지가 있을 때 나머지의 소수점은 옮기기 전의 원래 위치에 찍는다.', parentId: 'E6-NUM-04', prerequisites: ['E6-NUM-04'] },
  // ── 변화와 관계 (ALG) - 비와 비율 ──
  { id: 'E6-ALG-01', name: '비와 비율', grade: 'elementary_6', category: 'concept', part: 'algebra', description: '비(a:b)는 두 양의 상대적 크기를 비교하는 방법이다. 기준량과 비교하는 양을 구분한다. 비율 = (비교하는 양) ÷ (기준량)으로 분수, 소수, 백분율로 나타낼 수 있다. 예: 사과 3개와 배 5개의 비는 3:5, 비율은 3/5=0.6이다.', parentId: null, prerequisites: ['E5-NUM-05'] },
  { id: 'E6-ALG-02', name: '백분율', grade: 'elementary_6', category: 'concept', part: 'algebra', description: '기준량을 100으로 했을 때의 비율을 백분율(%)이라 한다. 백분율 = 비율 × 100(%). 예: 비율이 0.25이면 백분율은 25%. 할인율, 득표율, 타율 등 실생활에서 백분율이 널리 쓰인다. 분수, 소수, 백분율 사이의 상호 변환을 할 수 있다.', parentId: 'E6-ALG-01', prerequisites: ['E6-ALG-01'] },
  { id: 'E6-ALG-03', name: '비례식', grade: 'elementary_6', category: 'computation', part: 'algebra', description: '비율이 같은 두 비를 등호로 나타낸 식을 비례식이라 한다. a:b=c:d에서 외항의 곱 = 내항의 곱(ad=bc). 이 성질을 이용하여 미지의 값을 구한다. 예: 2:3=x:12에서 3x=24, x=8. 지도의 축척, 요리 레시피 등 실생활에 활용한다.', parentId: 'E6-ALG-01', prerequisites: ['E6-ALG-01'] },
  { id: 'E6-ALG-04', name: '비례배분', grade: 'elementary_6', category: 'computation', part: 'algebra', description: '전체를 주어진 비로 나누는 것을 비례배분이라 한다. 전체를 a:b로 배분할 때, A의 몫 = 전체 × a/(a+b), B의 몫 = 전체 × b/(a+b). 예: 1000원을 2:3으로 배분하면 400원, 600원. 두 양의 합이 전체와 같은지 확인한다.', parentId: 'E6-ALG-03', prerequisites: ['E6-ALG-03'] },
  // ── 도형과 측정 (GEO) ──
  { id: 'E6-GEO-01', name: '각기둥과 각뿔', grade: 'elementary_6', category: 'concept', part: 'geo', description: 'n각기둥: 두 밑면이 합동인 n각형이고 옆면이 직사각형. 면 n+2개, 꼭짓점 2n개, 모서리 3n개. n각뿔: 밑면이 n각형이고 옆면이 삼각형. 면 n+1개, 꼭짓점 n+1개, 모서리 2n개. 전개도를 그려 입체도형의 구조를 이해하고, 겨냥도로 3차원 모양을 표현한다.', parentId: 'E5-GEO-07', prerequisites: ['E5-GEO-07'] },
  { id: 'E6-GEO-02', name: '직육면체의 부피와 겉넓이', grade: 'elementary_6', category: 'computation', part: 'geo', description: '직육면체의 부피 V=가로×세로×높이(abc). 정육면체의 부피 V=한 모서리³. 겉넓이 S=2(ab+bc+ca). 부피 단위: 1cm³, 1m³=1,000,000cm³, 1L=1000cm³. 부피와 들이의 관계를 이해하고, 실생활 문제에서 부피와 겉넓이를 구한다.', parentId: 'E5-GEO-07', prerequisites: ['E5-GEO-07', 'E5-GEO-02'] },
  { id: 'E6-GEO-03', name: '원주와 원주율', grade: 'elementary_6', category: 'concept', part: 'geo', description: '원주(둘레)는 원의 테두리를 따라 한 바퀴 돈 길이이다. 원주율(π)은 원주÷지름의 값으로 약 3.14이다. 원주=지름×π=2×반지름×π. 어떤 원이든 원주÷지름은 항상 일정하다. 실측으로 원주율을 구해 보고, 원주를 계산하는 데 활용한다.', parentId: null, prerequisites: ['E3-GEO-02'] },
  { id: 'E6-GEO-04', name: '원의 넓이', grade: 'elementary_6', category: 'computation', part: 'geo', description: '원의 넓이=π×반지름×반지름(πr²). 유도: 원을 잘게 부채꼴로 잘라 직사각형으로 등적변형하면, 가로≈원주의 반(πr), 세로=반지름(r)이므로 넓이≈πr×r=πr². 반지름과 지름의 관계를 이용하여 다양한 문제를 해결한다.', parentId: 'E6-GEO-03', prerequisites: ['E6-GEO-03', 'E5-GEO-02'] },
  { id: 'E6-GEO-05', name: '원기둥·원뿔·구 (회전체)', grade: 'elementary_6', category: 'concept', part: 'geo', description: '직사각형을 한 변을 축으로 회전하면 원기둥, 직각삼각형을 회전하면 원뿔, 반원을 회전하면 구가 된다. 원기둥의 전개도: 두 원(밑면)과 직사각형(옆면). 원기둥의 겉넓이=2πr²+2πrh. 원뿔과 구의 구성 요소(모선, 반지름 등)를 이해한다.', parentId: 'E6-GEO-04', prerequisites: ['E6-GEO-04', 'E6-GEO-01'] },
  // ── 자료와 가능성 (STA) ──
  { id: 'E6-STA-01', name: '띠그래프와 원그래프', grade: 'elementary_6', category: 'concept', part: 'data', description: '전체를 100%로 놓고 각 항목의 비율을 나타내는 그래프. 띠그래프: 띠의 길이로 비율을 나타냄. 원그래프: 원의 면적(중심각)으로 비율을 나타냄. 각 항목의 백분율을 구하고, 합이 100%가 되는지 확인한다. 비율의 크기를 시각적으로 비교하기에 적합하다.', parentId: 'E4-STA-02', prerequisites: ['E4-STA-02', 'E6-ALG-02'] },
  // ── 공간과 입체 ──
  { id: 'E6-GEO-06', name: '쌓기나무와 투영도', grade: 'elementary_6', category: 'concept', part: 'geo', description: '쌓기나무로 만든 입체를 위, 앞, 옆에서 본 모양(투영도)으로 나타낸다. 3차원 입체를 2차원 평면으로 표현하는 과정이다. 위에서 본 모양에 숫자를 쓰면 각 위치에 쌓인 개수를 알 수 있다. 주어진 투영도로 쌓기나무의 최소/최대 개수를 추론한다.', parentId: 'E5-GEO-07', prerequisites: ['E5-GEO-07'] },
  // ── 추가 (소단원 확장) ──
  { id: 'E6-ALG-05', name: '비의 성질', grade: 'elementary_6', category: 'concept', part: 'algebra', description: '비의 전항과 후항에 0이 아닌 같은 수를 곱하거나 나누어도 비율은 같다. 이 성질을 이용하여 간단한 자연수의 비로 나타낸다. 예: 1.2:0.8 → 전항·후항에 10을 곱하면 12:8 → 4로 나누면 3:2. 분수의 비도 분모의 최소공배수를 곱하여 자연수의 비로 바꾼다.', parentId: 'E6-ALG-01', prerequisites: ['E6-ALG-01'] },
  { id: 'E6-GEO-07', name: '각기둥의 전개도', grade: 'elementary_6', category: 'concept', part: 'geo', description: '각기둥을 모서리를 따라 잘라 펼친 그림을 전개도라 한다. 전개도에서 밑면 2개와 옆면(직사각형)으로 구성된다. 밑면의 변의 개수와 옆면의 수가 같다. 옆면의 가로의 합=밑면의 둘레. 전개도를 접었을 때 맞닿는 변의 길이가 같은지 확인한다.', parentId: 'E6-GEO-01', prerequisites: ['E6-GEO-01'] },
  { id: 'E6-GEO-08', name: '원기둥의 전개도', grade: 'elementary_6', category: 'concept', part: 'geo', description: '원기둥의 전개도는 2개의 원(밑면)과 1개의 직사각형(옆면)으로 구성된다. 직사각형의 가로=원의 둘레(2πr), 세로=원기둥의 높이(h). 전개도를 접으면 직사각형이 옆면을 감싸 원기둥이 된다. 원기둥의 겉넓이=2πr²+2πrh.', parentId: 'E6-GEO-05', prerequisites: ['E6-GEO-05', 'E6-GEO-03'] },
  { id: 'E6-NUM-06', name: '소수 나눗셈의 활용', grade: 'elementary_6', category: 'computation', part: 'calc', description: '(소수)÷(소수)에서 자릿수가 다른 경우: 소수점을 같은 수만큼 옮겨 자연수로 만든다. 몫을 반올림하여 나타내기: 구하려는 자리 아래에서 반올림. 나누어 주고 남는 양 구하기: 나머지의 소수점은 원래 소수점 위치에 맞춘다. 어림과 실제 계산 결과 비교.', parentId: 'E6-NUM-05', prerequisites: ['E6-NUM-05'] },
  { id: 'E6-STA-02', name: '그래프 해석과 비교', grade: 'elementary_6', category: 'concept', part: 'data', description: '같은 자료를 막대그래프, 꺾은선그래프, 띠그래프, 원그래프로 나타낼 수 있다. 자료의 목적에 맞는 그래프 선택: 양 비교→막대, 변화→꺾은선, 비율→띠/원. 두 그래프를 비교하여 자료의 특징을 파악하고, 추세를 예측한다.', parentId: 'E6-STA-01', prerequisites: ['E6-STA-01'] },
  { id: 'E6-NUM-07', name: '대분수의 나눗셈', grade: 'elementary_6', category: 'computation', part: 'calc', description: '(대분수)÷(자연수): 대분수를 가분수로 바꾸어 계산한다. 예: 2와1/3÷4=7/3÷4=7/12. (대분수)÷(분수): 대분수를 가분수로 바꾼 뒤 나누는 분수의 역수를 곱한다. 예: 1과1/2÷3/4=3/2×4/3=2. 자연수÷분수: 자연수를 분수로 바꾸어(a=a/1) 역수를 곱한다.', parentId: 'E6-NUM-03', prerequisites: ['E6-NUM-03', 'E6-NUM-02'] },
];

// =============================================
// 중학교 1학년 (middle_1)
// =============================================

export const MIDDLE_1_CONCEPTS: ConceptSeedData[] = [
  { id: 'M1-NUM-01', name: '소인수분해', grade: 'middle_1', category: 'computation', part: 'calc', description: '소수·합성수, 거듭제곱, 소인수분해. 약수의 개수=(a+1)(b+1)', parentId: null, prerequisites: ['E5-NUM-01', 'E5-NUM-03'] },
  { id: 'M1-NUM-02', name: '최대공약수·최소공배수 (소인수분해)', grade: 'middle_1', category: 'computation', part: 'calc', description: 'GCD: 공통 소인수의 최소 지수 곱. LCM: 모든 소인수의 최대 지수 곱', parentId: 'M1-NUM-01', prerequisites: ['M1-NUM-01', 'E5-NUM-03', 'E5-NUM-04'] },
  { id: 'M1-NUM-03', name: '정수와 유리수', grade: 'middle_1', category: 'concept', part: 'calc', description: '양의 정수, 0, 음의 정수. 유리수 = a/b (b≠0). 절댓값 = 원점으로부터 거리', parentId: null, prerequisites: ['E6-NUM-03'] },
  { id: 'M1-NUM-04', name: '정수·유리수 사칙연산', grade: 'middle_1', category: 'computation', part: 'calc', description: '부호 규칙, 역수, 혼합 계산. (+)×(-)=(-), (-)×(-)=(+)', parentId: 'M1-NUM-03', prerequisites: ['M1-NUM-03', 'E5-NUM-07'] },
  { id: 'M1-ALG-01', name: '문자와 식', grade: 'middle_1', category: 'concept', part: 'algebra', description: '문자 사용 규칙, 곱셈 기호 생략, 식의 값, 동류항, 일차식 계산', parentId: null, prerequisites: ['E5-ALG-01', 'M1-NUM-04'] },
  { id: 'M1-ALG-02', name: '일차방정식', grade: 'middle_1', category: 'computation', part: 'algebra', description: '등식의 성질, ax+b=0, 이항. 실생활 모델링 문제', parentId: 'M1-ALG-01', prerequisites: ['M1-ALG-01'] },
  { id: 'M1-FUNC-01', name: '좌표평면과 그래프', grade: 'middle_1', category: 'concept', part: 'func', description: '순서쌍 (x,y), 사분면. 정비례 y=ax, 반비례 y=a/x', parentId: null, prerequisites: ['E5-ALG-01'] },
  { id: 'M1-GEO-01', name: '기본 도형과 작도', grade: 'middle_1', category: 'concept', part: 'geo', description: '점, 선, 면, 각. 수직이등분선, 각의 이등분선 작도', parentId: null, prerequisites: ['E4-GEO-02'] },
  { id: 'M1-GEO-02', name: '삼각형의 성질과 합동조건', grade: 'middle_1', category: 'concept', part: 'geo', description: 'SSS, SAS, ASA 합동. 삼각형 내각의 합 = 180°', parentId: 'M1-GEO-01', prerequisites: ['M1-GEO-01', 'E5-GEO-05'] },
  { id: 'M1-GEO-03', name: '평면도형의 성질', grade: 'middle_1', category: 'concept', part: 'geo', description: '다각형 내각·외각의 합. n각형 내각합 = 180°×(n-2)', parentId: 'M1-GEO-02', prerequisites: ['M1-GEO-02', 'E4-GEO-07'] },
  { id: 'M1-STA-01', name: '자료의 정리와 해석', grade: 'middle_1', category: 'concept', part: 'data', description: '줄기와 잎 그림, 도수분포표, 히스토그램, 도수분포다각형, 상대도수', parentId: null, prerequisites: ['E6-STA-01', 'E5-NUM-15'] },
  // ── 추가 개념 (교과서 기반 확장) ──
  { id: 'M1-NUM-05', name: '유리수의 곱셈과 나눗셈', grade: 'middle_1', category: 'computation', part: 'calc', description: '부호가 같은 두 수의 곱셈: 절댓값의 곱에 +부호. 부호가 다른 두 수의 곱셈: 절댓값의 곱에 -부호. 셋 이상의 곱: 음수 개수 짝수→+, 홀수→-. 나눗셈: 역수를 곱하여 계산. 역수는 분모·분자를 바꾼 수.', parentId: 'M1-NUM-04', prerequisites: ['M1-NUM-04'] },
  { id: 'M1-ALG-03', name: '일차식의 계산', grade: 'middle_1', category: 'computation', part: 'algebra', description: '항: 수 또는 문자의 곱으로 이루어진 식. 상수항: 수로만 된 항. 계수: 문자에 곱해진 수. 다항식·단항식. 동류항: 문자와 차수가 같은 항. 동류항끼리 분배법칙으로 계수를 더하거나 빼서 정리. 일차식의 덧셈·뺄셈.', parentId: 'M1-ALG-01', prerequisites: ['M1-ALG-01'] },
  { id: 'M1-ALG-04', name: '일차방정식의 활용', grade: 'middle_1', category: 'computation', part: 'algebra', description: '실생활 문제를 일차방정식으로 모델링하여 해결. 거리·속력·시간 관계(거리=속력×시간), 농도 문제(소금물의 농도=소금의 양/소금물의 양×100), 나이·가격·개수 문제. 풀이 순서: 미지수 정하기→방정식 세우기→풀기→검산.', parentId: 'M1-ALG-02', prerequisites: ['M1-ALG-02'] },
  { id: 'M1-FUNC-02', name: '정비례와 반비례', grade: 'middle_1', category: 'concept', part: 'func', description: '정비례: y=ax(a≠0). x가 2배→y도 2배. 그래프는 원점을 지나는 직선. a>0이면 오른쪽 위, a<0이면 오른쪽 아래. 반비례: y=a/x(a≠0). x가 2배→y는 1/2배. 그래프는 쌍곡선. |a|가 클수록 원점에서 멀어진다.', parentId: 'M1-FUNC-01', prerequisites: ['M1-FUNC-01'] },
  { id: 'M1-GEO-04', name: '위치 관계와 평행선', grade: 'middle_1', category: 'concept', part: 'geo', description: '두 직선의 위치 관계: 만난다(한 점에서 교차 또는 수직), 평행하다, 일치한다. 꼬인 위치(공간). 직선과 평면의 위치 관계. 평행선의 성질: 동위각 크기 같다, 엇각 크기 같다. 역으로 동위각이나 엇각이 같으면 두 직선은 평행.', parentId: 'M1-GEO-01', prerequisites: ['M1-GEO-01'] },
  { id: 'M1-GEO-05', name: '원과 부채꼴', grade: 'middle_1', category: 'concept', part: 'geo', description: '원: 한 점에서 같은 거리에 있는 점의 집합. 현, 호, 활꼴. 부채꼴: 두 반지름과 호로 이루어진 도형. 중심각. 부채꼴의 호의 길이 l=2πr×(θ/360). 부채꼴의 넓이 S=πr²×(θ/360)=½rl. 원주율 π, 원의 둘레=2πr, 넓이=πr².', parentId: 'M1-GEO-01', prerequisites: ['M1-GEO-01', 'E3-GEO-02'] },
  { id: 'M1-GEO-06', name: '다면체와 회전체', grade: 'middle_1', category: 'concept', part: 'geo', description: '다면체: 다각형인 면으로 둘러싸인 입체도형. 꼭짓점·모서리·면의 개수 관계(오일러 공식 V-E+F=2). 정다면체: 5종(정사면체, 정육면체, 정팔면체, 정십이면체, 정이십면체). 회전체: 직선을 축으로 평면도형을 회전시킨 입체(원기둥, 원뿔, 구).', parentId: 'M1-GEO-03', prerequisites: ['M1-GEO-03'] },
  { id: 'M1-GEO-07', name: '입체도형의 겉넓이와 부피', grade: 'middle_1', category: 'computation', part: 'geo', description: '기둥(각기둥·원기둥): 겉넓이=2×밑넓이+옆넓이, 부피=밑넓이×높이. 뿔(각뿔·원뿔): 부피=⅓×밑넓이×높이, 원뿔 옆넓이=πrl. 구: 겉넓이=4πr², 부피=⁴⁄₃πr³.', parentId: 'M1-GEO-06', prerequisites: ['M1-GEO-06', 'M1-GEO-05'] },
  { id: 'M1-GEO-08', name: '삼각형의 작도', grade: 'middle_1', category: 'concept', part: 'geo', description: '눈금 없는 자와 컴퍼스만으로 기본 작도: 선분의 수직이등분선, 각의 이등분선. 삼각형 작도 조건: 세 변(SSS), 두 변과 끼인각(SAS), 한 변과 양 끝 각(ASA). 삼각형이 결정되는 조건과 하나로 정해지는 이유.', parentId: 'M1-GEO-01', prerequisites: ['M1-GEO-01'] },
  { id: 'M1-STA-02', name: '도수분포표와 히스토그램', grade: 'middle_1', category: 'concept', part: 'data', description: '변량, 계급(자료를 일정 간격으로 나눈 구간), 계급의 크기, 계급값(계급 양 끝의 평균), 도수(각 계급에 속하는 자료의 수). 도수분포표 작성법. 히스토그램(직사각형 그래프), 도수분포다각형(계급값을 이은 꺾은선). 그래프 해석.', parentId: 'M1-STA-01', prerequisites: ['M1-STA-01'] },
  { id: 'M1-STA-03', name: '상대도수', grade: 'middle_1', category: 'concept', part: 'data', description: '상대도수 = (그 계급의 도수)/(전체 도수). 전체 합 = 1. 도수의 총합이 다른 두 집단을 비교할 때 유용. 상대도수 분포표와 상대도수 그래프(꺾은선). 상대도수가 가장 큰 계급 = 가장 많은 비율을 차지하는 계급.', parentId: 'M1-STA-02', prerequisites: ['M1-STA-02'] },
];

// =============================================
// 중학교 2학년 (middle_2)
// =============================================

export const MIDDLE_2_CONCEPTS: ConceptSeedData[] = [
  { id: 'M2-NUM-01', name: '유리수와 순환소수', grade: 'middle_2', category: 'concept', part: 'calc', description: '순환소수 표현, 순환소수↔분수 변환', parentId: 'M1-NUM-03', prerequisites: ['M1-NUM-03', 'M1-NUM-04'] },
  { id: 'M2-ALG-01', name: '지수법칙과 단항식 계산', grade: 'middle_2', category: 'computation', part: 'algebra', description: 'a^m × a^n = a^(m+n), (a^m)^n = a^(mn), (ab)^n = a^n·b^n', parentId: 'M1-ALG-01', prerequisites: ['M1-ALG-01', 'M1-NUM-01'] },
  { id: 'M2-ALG-02', name: '다항식의 덧셈·뺄셈·곱셈', grade: 'middle_2', category: 'computation', part: 'algebra', description: '동류항 정리, 분배법칙, 다항식×단항식', parentId: 'M2-ALG-01', prerequisites: ['M2-ALG-01'] },
  { id: 'M2-ALG-03', name: '일차부등식', grade: 'middle_2', category: 'computation', part: 'algebra', description: '부등식의 성질, ax+b>0 풀이. 음수 곱/나누면 부등호 방향 바뀜', parentId: 'M1-ALG-02', prerequisites: ['M1-ALG-02'] },
  { id: 'M2-ALG-04', name: '연립방정식', grade: 'middle_2', category: 'computation', part: 'algebra', description: '가감법, 대입법. 미지수 2개 일차방정식 체계', parentId: 'M1-ALG-02', prerequisites: ['M1-ALG-02', 'M2-ALG-03'] },
  { id: 'M2-FUNC-01', name: '일차함수', grade: 'middle_2', category: 'concept', part: 'func', description: 'y=ax+b, 기울기와 y절편. 그래프의 평행·일치. 연립방정식과 관계', parentId: 'M1-FUNC-01', prerequisites: ['M1-FUNC-01', 'M1-ALG-02'] },
  { id: 'M2-GEO-01', name: '삼각형·사각형의 성질', grade: 'middle_2', category: 'concept', part: 'geo', description: '이등변삼각형, 직각삼각형 성질. 평행사변형 조건', parentId: 'M1-GEO-02', prerequisites: ['M1-GEO-02'] },
  { id: 'M2-GEO-02', name: '닮음과 피타고라스 정리', grade: 'middle_2', category: 'concept', part: 'geo', description: '닮음비, AA/SAS/SSS 닮음. a²+b²=c²', parentId: 'M2-GEO-01', prerequisites: ['M2-GEO-01'] },
  { id: 'M2-STA-01', name: '경우의 수와 확률', grade: 'middle_2', category: 'concept', part: 'data', description: '합의 법칙, 곱의 법칙. 확률의 정의와 성질', parentId: 'M1-STA-01', prerequisites: ['M1-STA-01', 'E5-NUM-16'] },
  // ── 추가 개념 (교과서 기반 확장) ──
  { id: 'M2-NUM-02', name: '유한소수와 순환소수의 분수 변환', grade: 'middle_2', category: 'computation', part: 'calc', description: '유한소수로 나타낼 수 있는 분수: 기약분수의 분모를 소인수분해했을 때 2와 5만 있는 경우. 순환소수→분수 변환: 순환마디 이용. 예) 0.333...=x, 10x=3.33..., 9x=3, x=⅓. 모든 유리수는 유한소수 또는 순환소수.', parentId: 'M2-NUM-01', prerequisites: ['M2-NUM-01', 'M1-NUM-01'] },
  { id: 'M2-ALG-05', name: '일차부등식의 활용', grade: 'middle_2', category: 'computation', part: 'algebra', description: '실생활 문제를 일차부등식으로 모델링. 거리·속력·시간, 물건 개수·가격, 농도 변화 문제. 부등식의 해에서 자연수 해, 정수 해 구하기. ~이상, ~이하, ~미만, ~초과의 수학적 표현. 풀이→해 해석→검증 단계.', parentId: 'M2-ALG-03', prerequisites: ['M2-ALG-03'] },
  { id: 'M2-ALG-06', name: '연립방정식의 활용', grade: 'middle_2', category: 'computation', part: 'algebra', description: '미지수 2개인 실생활 문제를 연립방정식으로 모델링. 속력·거리·시간 문제(대향·추월), 농도 혼합 문제, 나이·원가·정가 문제. 풀이 순서: 미지수 정하기→연립방정식 세우기→풀기→검산.', parentId: 'M2-ALG-04', prerequisites: ['M2-ALG-04'] },
  { id: 'M2-FUNC-02', name: '일차함수의 그래프', grade: 'middle_2', category: 'concept', part: 'func', description: 'y=ax+b의 그래프: 기울기 a(x가 1 증가할 때 y의 변화량), y절편 b(x=0일 때 y값). a>0이면 오른쪽 위로, a<0이면 오른쪽 아래로. x절편: y=0 대입. 두 직선의 평행(기울기 같고 y절편 다름), 일치(기울기·y절편 모두 같음).', parentId: 'M2-FUNC-01', prerequisites: ['M2-FUNC-01'] },
  { id: 'M2-FUNC-03', name: '일차함수의 식 구하기', grade: 'middle_2', category: 'computation', part: 'func', description: '기울기와 한 점이 주어질 때: y=ax+b에 대입. 두 점이 주어질 때: 기울기=(y₂-y₁)/(x₂-x₁). x절편과 y절편이 주어질 때. 그래프에서 식 구하기. 조건에 맞는 일차함수 결정.', parentId: 'M2-FUNC-02', prerequisites: ['M2-FUNC-02'] },
  { id: 'M2-FUNC-04', name: '일차함수와 일차방정식의 관계', grade: 'middle_2', category: 'concept', part: 'func', description: 'ax+by+c=0은 일차함수 y=(-a/b)x-c/b의 그래프와 같다(b≠0). ax+c=0은 x축에 수직인 직선. by+c=0은 x축에 평행한 직선. 연립방정식의 해 = 두 일차함수 그래프의 교점. 해가 없으면 평행, 무수히 많으면 일치.', parentId: 'M2-FUNC-02', prerequisites: ['M2-FUNC-02', 'M2-ALG-04'] },
  { id: 'M2-GEO-03', name: '이등변삼각형과 직각삼각형', grade: 'middle_2', category: 'concept', part: 'geo', description: '이등변삼각형: 두 변의 길이가 같은 삼각형. 꼭지각의 이등분선은 밑변을 수직이등분. 두 밑각의 크기가 같다. 역으로 두 각이 같으면 이등변삼각형. 직각삼각형의 합동 조건: RHA(빗변+한 예각), RHS(빗변+한 변).', parentId: 'M1-GEO-02', prerequisites: ['M1-GEO-02'] },
  { id: 'M2-GEO-04', name: '삼각형의 외심과 내심', grade: 'middle_2', category: 'concept', part: 'geo', description: '외심: 세 변의 수직이등분선의 교점. 외접원의 중심. 세 꼭짓점까지 거리 같다. 내심: 세 내각의 이등분선의 교점. 내접원의 중심. 세 변까지 거리 같다. 외심의 위치: 예각삼각형(내부), 직각삼각형(빗변 중점), 둔각삼각형(외부).', parentId: 'M2-GEO-03', prerequisites: ['M2-GEO-03'] },
  { id: 'M2-GEO-05', name: '평행사변형의 성질과 조건', grade: 'middle_2', category: 'concept', part: 'geo', description: '평행사변형 성질: 두 쌍의 대변이 평행·같다, 두 쌍의 대각이 같다, 두 대각선이 서로를 이등분. 평행사변형이 되는 조건: 대변 2쌍 평행, 대변 2쌍 같다, 대각 2쌍 같다, 대각선 서로 이등분, 한 쌍의 대변 평행+같다.', parentId: 'M1-GEO-03', prerequisites: ['M1-GEO-03'] },
  { id: 'M2-GEO-06', name: '여러 가지 사각형', grade: 'middle_2', category: 'concept', part: 'geo', description: '직사각형: 네 각이 직각인 평행사변형. 대각선 길이 같다. 마름모: 네 변이 같은 평행사변형. 대각선 서로 수직. 정사각형: 직사각형+마름모. 등변사다리꼴: 아랫변 양 끝 각 같다. 사각형 포함 관계: 사각형⊃사다리꼴⊃평행사변형⊃직사각형/마름모⊃정사각형.', parentId: 'M2-GEO-05', prerequisites: ['M2-GEO-05'] },
  { id: 'M2-GEO-07', name: '도형의 닮음', grade: 'middle_2', category: 'concept', part: 'geo', description: '닮은 도형: 모양이 같고 크기만 다른 도형. 닮음비: 대응하는 변의 길이의 비. 대응각의 크기 같다. 삼각형의 닮음 조건: AA(두 쌍의 각), SAS(두 변의 비와 끼인각), SSS(세 변의 비). 삼각형과 평행선: 평행선이 삼각형의 두 변과 만나면 닮은 삼각형 생성.', parentId: 'M2-GEO-01', prerequisites: ['M2-GEO-01'] },
  { id: 'M2-GEO-08', name: '피타고라스 정리의 활용', grade: 'middle_2', category: 'computation', part: 'geo', description: '피타고라스 정리: 직각삼각형에서 a²+b²=c²(c=빗변). 역: a²+b²=c²이면 직각삼각형. 활용: 좌표평면에서 두 점 사이의 거리, 직육면체의 대각선, 정삼각형의 높이와 넓이. 삼각형의 두 변의 중점을 연결한 선분: 중점연결정리.', parentId: 'M2-GEO-02', prerequisites: ['M2-GEO-02', 'M3-NUM-02'] },
  { id: 'M2-STA-02', name: '확률의 계산', grade: 'middle_2', category: 'computation', part: 'data', description: '확률의 덧셈: 배반사건 A, B에 대해 P(A∪B)=P(A)+P(B). 여사건의 확률: P(Aᶜ)=1-P(A). "적어도 하나"는 여사건으로 계산. 확률의 곱셈: 독립사건 A, B에 대해 P(A∩B)=P(A)×P(B). 연속하여 일어나는 사건의 확률 계산.', parentId: 'M2-STA-01', prerequisites: ['M2-STA-01'] },
];

// =============================================
// 중학교 3학년 (middle_3)
// =============================================

export const MIDDLE_3_CONCEPTS: ConceptSeedData[] = [
  { id: 'M3-NUM-01', name: '제곱근과 실수', grade: 'middle_3', category: 'concept', part: 'calc', description: '제곱근의 뜻, √a 성질. 무리수, 실수의 대소 관계', parentId: 'M1-NUM-03', prerequisites: ['M1-NUM-04', 'M2-ALG-01'] },
  { id: 'M3-NUM-02', name: '근호를 포함한 식의 계산', grade: 'middle_3', category: 'computation', part: 'calc', description: '√a×√b=√(ab), 분모 유리화, 근호 포함 사칙연산', parentId: 'M3-NUM-01', prerequisites: ['M3-NUM-01'] },
  { id: 'M3-ALG-01', name: '다항식의 곱셈과 곱셈공식', grade: 'middle_3', category: 'computation', part: 'algebra', description: '(a+b)²=a²+2ab+b², (a-b)²=a²-2ab+b², (a+b)(a-b)=a²-b²', parentId: 'M2-ALG-02', prerequisites: ['M2-ALG-02'] },
  { id: 'M3-ALG-02', name: '인수분해', grade: 'middle_3', category: 'computation', part: 'algebra', description: '공통인수, 곱셈공식의 역, x²+(a+b)x+ab=(x+a)(x+b)', parentId: 'M3-ALG-01', prerequisites: ['M3-ALG-01'] },
  { id: 'M3-ALG-03', name: '이차방정식', grade: 'middle_3', category: 'computation', part: 'algebra', description: '인수분해, 완전제곱식, 근의 공식. x=(-b±√(b²-4ac))/2a', parentId: 'M3-ALG-02', prerequisites: ['M3-ALG-02', 'M3-NUM-02'] },
  { id: 'M3-FUNC-01', name: '이차함수', grade: 'middle_3', category: 'concept', part: 'func', description: 'y=ax², y=a(x-p)²+q. 꼭짓점, 축, 개형. 최댓값/최솟값', parentId: 'M2-FUNC-01', prerequisites: ['M2-FUNC-01', 'M3-ALG-03'] },
  { id: 'M3-GEO-01', name: '삼각비', grade: 'middle_3', category: 'concept', part: 'geo', description: 'sin, cos, tan. 특수각(30°,45°,60°) 삼각비값', parentId: 'M2-GEO-02', prerequisites: ['M2-GEO-02'] },
  { id: 'M3-GEO-02', name: '원의 성질', grade: 'middle_3', category: 'concept', part: 'geo', description: '원주각·중심각, 원에 내접하는 사각형, 접선과 할선', parentId: 'E6-GEO-04', prerequisites: ['E6-GEO-04', 'M2-GEO-02'] },
  { id: 'M3-STA-01', name: '대푯값과 산포도', grade: 'middle_3', category: 'concept', part: 'data', description: '평균, 중앙값, 최빈값. 분산, 표준편차', parentId: 'M2-STA-01', prerequisites: ['M2-STA-01', 'E5-NUM-15'] },
  { id: 'M3-STA-02', name: '상관관계', grade: 'middle_3', category: 'concept', part: 'data', description: '산점도, 양의 상관, 음의 상관, 상관 없음', parentId: 'M3-STA-01', prerequisites: ['M3-STA-01', 'M1-FUNC-01'] },
  // ── 추가 개념 (교과서 기반 확장) ──
  { id: 'M3-NUM-03', name: '제곱근의 성질과 대소 관계', grade: 'middle_3', category: 'concept', part: 'calc', description: 'a>0일 때 √a²=a, (-√a)²=a. (√a)²=a(a≥0). √a²=|a|(a가 음수일 수 있을 때). 제곱근의 대소 관계: a>b>0이면 √a>√b. 수직선 위에 무리수 나타내기: √2는 빗변이 √2인 직각삼각형으로 작도.', parentId: 'M3-NUM-01', prerequisites: ['M3-NUM-01'] },
  { id: 'M3-NUM-04', name: '무리수와 실수의 분류', grade: 'middle_3', category: 'concept', part: 'calc', description: '무리수: 순환하지 않는 무한소수. √2, π 등. 유리수와 무리수는 서로소. 실수=유리수∪무리수. 실수의 수직선 대응: 모든 실수는 수직선 위의 한 점에 대응하고 역도 성립(완비성). 실수의 대소 비교: a-b>0이면 a>b.', parentId: 'M3-NUM-01', prerequisites: ['M3-NUM-01'] },
  { id: 'M3-ALG-04', name: '곱셈 공식의 응용', grade: 'middle_3', category: 'computation', part: 'algebra', description: '곱셈 공식의 변형: (a+b)²+(a-b)²=2(a²+b²), (a+b)²-(a-b)²=4ab, (x+1/x)²=x²+2+1/x². 치환을 이용한 곱셈 공식 적용. 수의 계산에 곱셈 공식 활용: 102²=(100+2)², 99×101=(100-1)(100+1).', parentId: 'M3-ALG-01', prerequisites: ['M3-ALG-01'] },
  { id: 'M3-ALG-05', name: '인수분해 공식의 응용', grade: 'middle_3', category: 'computation', part: 'algebra', description: '인수분해의 활용: 수의 계산 간소화(예: 57²-43²=(57+43)(57-43)=100×14=1400). 복잡한 식의 인수분해: 공통 부분 치환, 한 문자에 대해 정리. 인수분해를 이용한 방정식 풀이의 기초. ax²+bx+c에서 ac의 인수 조합.', parentId: 'M3-ALG-02', prerequisites: ['M3-ALG-02', 'M3-ALG-04'] },
  { id: 'M3-ALG-06', name: '이차방정식의 근의 공식', grade: 'middle_3', category: 'computation', part: 'algebra', description: 'ax²+bx+c=0(a≠0)의 근: x=(-b±√(b²-4ac))/2a. 판별식 D=b²-4ac: D>0이면 서로 다른 두 실근, D=0이면 중근(한 근), D<0이면 실근 없음. 짝수 공식: b=2b\'일 때 x=(-b\'±√(b\'²-ac))/a. 완전제곱식 유도 과정.', parentId: 'M3-ALG-03', prerequisites: ['M3-ALG-03', 'M3-NUM-02'] },
  { id: 'M3-ALG-07', name: '이차방정식의 활용', grade: 'middle_3', category: 'computation', part: 'algebra', description: '실생활 문제를 이차방정식으로 모델링: 연속하는 정수, 도형의 넓이, 수에 관한 문제. 풀이 순서: 미지수 설정→이차방정식 세우기→풀기→문제 조건에 맞는지 검증. 음수 해나 자연수가 아닌 해는 문맥상 부적합할 수 있으므로 반드시 검산.', parentId: 'M3-ALG-03', prerequisites: ['M3-ALG-03'] },
  { id: 'M3-FUNC-02', name: '이차함수의 그래프 변환', grade: 'middle_3', category: 'concept', part: 'func', description: 'y=ax²+q: y=ax²를 y축 방향으로 q만큼 평행이동. 꼭짓점(0,q). y=a(x-p)²: y=ax²를 x축 방향으로 p만큼 평행이동. 꼭짓점(p,0). y=a(x-p)²+q: 꼭짓점(p,q), 축 x=p. a>0이면 아래로 볼록, a<0이면 위로 볼록. |a|가 클수록 폭이 좁다.', parentId: 'M3-FUNC-01', prerequisites: ['M3-FUNC-01'] },
  { id: 'M3-FUNC-03', name: '이차함수의 식 구하기', grade: 'middle_3', category: 'computation', part: 'func', description: '꼭짓점(p,q)과 한 점이 주어질 때: y=a(x-p)²+q에 대입하여 a 결정. 축과 두 점이 주어질 때: 표준형 이용. 세 점이 주어질 때: y=ax²+bx+c에 세 점 대입→연립방정식. x절편 α, β와 한 점: y=a(x-α)(x-β).', parentId: 'M3-FUNC-02', prerequisites: ['M3-FUNC-02'] },
  { id: 'M3-FUNC-04', name: '이차함수의 최댓값과 최솟값', grade: 'middle_3', category: 'concept', part: 'func', description: 'y=a(x-p)²+q에서 a>0이면 x=p일 때 최솟값 q, 최댓값 없음. a<0이면 x=p일 때 최댓값 q, 최솟값 없음. y=ax²+bx+c를 y=a(x-p)²+q로 변환(완전제곱식). 정의역이 제한될 때의 최대·최소 구하기.', parentId: 'M3-FUNC-02', prerequisites: ['M3-FUNC-02'] },
  { id: 'M3-GEO-03', name: '삼각비의 활용', grade: 'middle_3', category: 'computation', part: 'geo', description: '직각삼각형에서 변의 길이 구하기: sinA=대변/빗변, cosA=인접변/빗변, tanA=대변/인접변. 일반 삼각형의 넓이: S=½absinC. 높이 구하기: 건물·나무 높이를 앙각·탄젠트로 계산. 두 지점 사이 거리 구하기.', parentId: 'M3-GEO-01', prerequisites: ['M3-GEO-01'] },
  { id: 'M3-GEO-04', name: '원주각과 원에 내접하는 사각형', grade: 'middle_3', category: 'concept', part: 'geo', description: '원주각: 원 위의 한 점에서 호를 보는 각. 같은 호에 대한 원주각은 모두 같다. 중심각=2×원주각. 반원에 대한 원주각=90°. 원에 내접하는 사각형: 대각의 합=180°. 접선과 현이 이루는 각=그 호에 대한 원주각(접선-현 정리).', parentId: 'M3-GEO-02', prerequisites: ['M3-GEO-02'] },
  { id: 'M3-STA-03', name: '상자그림과 산점도', grade: 'middle_3', category: 'concept', part: 'data', description: '상자그림(box plot): 최솟값, Q1(제1사분위수), Q2(중앙값), Q3(제3사분위수), 최댓값으로 자료 분포 표현. IQR=Q3-Q1. 이상값(outlier) 판단. 산점도: 두 변량의 순서쌍을 좌표평면에 점으로 표현. 양의 상관, 음의 상관, 상관없음 판단.', parentId: 'M3-STA-01', prerequisites: ['M3-STA-01'] },
];

// =============================================
// 고등학교 1학년 - 공통수학1 (high_1)
// =============================================

export const HIGH_1_CONCEPTS: ConceptSeedData[] = [
  { id: 'H1-ALG-01', name: '다항식 정리와 연산', grade: 'high_1', category: 'computation', part: 'algebra', description: '내림차순 정리, 사칙연산, 곱셈 공식((a±b)³, (a+b+c)²)', parentId: 'M3-ALG-01', prerequisites: ['M3-ALG-01'] },
  { id: 'H1-ALG-02', name: '다항식의 나눗셈', grade: 'high_1', category: 'computation', part: 'algebra', description: 'A=BQ+R, 조립제법(호너의 방법), deg(R)<deg(B)', parentId: 'H1-ALG-01', prerequisites: ['H1-ALG-01'] },
  { id: 'H1-ALG-03', name: '나머지정리', grade: 'high_1', category: 'concept', part: 'algebra', description: 'P(x)를 (x-a)로 나눈 나머지 = P(a)', parentId: 'H1-ALG-02', prerequisites: ['H1-ALG-02'] },
  { id: 'H1-ALG-04', name: '인수정리', grade: 'high_1', category: 'concept', part: 'algebra', description: 'P(a)=0이면 (x-a)는 P(x)의 인수. 고차방정식 해결의 열쇠', parentId: 'H1-ALG-03', prerequisites: ['H1-ALG-03'] },
  { id: 'H1-ALG-05', name: '인수분해 (고급)', grade: 'high_1', category: 'computation', part: 'algebra', description: '고차식·세제곱(a³±b³) 인수분해, 치환, 복이차식, 대칭식', parentId: 'H1-ALG-04', prerequisites: ['M3-ALG-02', 'H1-ALG-04'] },
  { id: 'H1-ALG-06', name: '복소수', grade: 'high_1', category: 'concept', part: 'algebra', description: 'i²=-1, a+bi 형태, 실수부·허수부, 복소수의 상등', parentId: 'M3-NUM-02', prerequisites: ['M3-NUM-02'] },
  { id: 'H1-ALG-07', name: '복소수의 사칙연산', grade: 'high_1', category: 'computation', part: 'algebra', description: '덧뺄셈·곱셈·나눗셈(켤레복소수 이용 분모 실수화)', parentId: 'H1-ALG-06', prerequisites: ['H1-ALG-06'] },
  { id: 'H1-ALG-08', name: '이차방정식의 판별식', grade: 'high_1', category: 'concept', part: 'algebra', description: 'D=b²-4ac, D>0 서로 다른 두 실근, D=0 중근, D<0 두 허근', parentId: 'H1-ALG-06', prerequisites: ['M3-ALG-03', 'H1-ALG-06'] },
  { id: 'H1-ALG-09', name: '근과 계수의 관계', grade: 'high_1', category: 'concept', part: 'algebra', description: 'α+β=-b/a, αβ=c/a. 근을 구하지 않고 대칭식 값 계산', parentId: 'H1-ALG-08', prerequisites: ['H1-ALG-08'] },
  { id: 'H1-ALG-10', name: '고차방정식', grade: 'high_1', category: 'computation', part: 'algebra', description: '삼차·사차 방정식, 인수정리+조립제법으로 차수 낮추기, 상반방정식', parentId: 'H1-ALG-05', prerequisites: ['H1-ALG-05', 'H1-ALG-04'] },
  { id: 'H1-ALG-17', name: '연립이차방정식', grade: 'high_1', category: 'computation', part: 'algebra', description: '일차+이차 연립(대입법), 이차+이차 연립(소거법)', parentId: 'H1-ALG-10', prerequisites: ['H1-ALG-10', 'M2-ALG-04'] },
  { id: 'H1-ALG-11', name: '이차부등식', grade: 'high_1', category: 'computation', part: 'algebra', description: 'ax²+bx+c>0 풀이(그래프 이용), 절대부등식(D<0)', parentId: 'M2-ALG-03', prerequisites: ['M3-FUNC-01', 'M2-ALG-03'] },
  { id: 'H1-ALG-12', name: '연립부등식', grade: 'high_1', category: 'computation', part: 'algebra', description: '여러 부등식의 공통 해, 수직선 영역 표시', parentId: 'H1-ALG-11', prerequisites: ['H1-ALG-11'] },
  { id: 'H1-ALG-13', name: '절대값 방정식·부등식', grade: 'high_1', category: 'computation', part: 'algebra', description: '|ax+b|=c, |ax+b|<c, 경우 나누기', parentId: 'M2-ALG-03', prerequisites: ['M2-ALG-03'] },
  { id: 'H1-ALG-14', name: '이차함수의 최대·최소', grade: 'high_1', category: 'concept', part: 'func', description: '정의역 제한 시 최대/최소, 꼭짓점과 구간 관계', parentId: 'M3-FUNC-01', prerequisites: ['M3-FUNC-01'] },
  { id: 'H1-ALG-15', name: '이차함수와 이차방정식', grade: 'high_1', category: 'concept', part: 'func', description: '그래프와 x축의 교점 = 방정식의 근, 판별식의 기하학적 의미', parentId: 'H1-ALG-14', prerequisites: ['H1-ALG-08', 'M3-FUNC-01'] },
  { id: 'H1-ALG-16', name: '이차함수와 이차부등식', grade: 'high_1', category: 'concept', part: 'func', description: '그래프를 이용한 부등식 풀이, x축 위/아래 영역', parentId: 'H1-ALG-15', prerequisites: ['H1-ALG-11', 'H1-ALG-15'] },
  { id: 'H1-STA-01', name: '집합의 뜻과 표현', grade: 'high_1', category: 'concept', part: 'data', description: '원소, 집합, 원소나열법, 조건제시법, ∈', parentId: null, prerequisites: [] },
  { id: 'H1-STA-02', name: '부분집합', grade: 'high_1', category: 'concept', part: 'data', description: '부분집합, 진부분집합, 공집합, ⊂/⊃/∅', parentId: 'H1-STA-01', prerequisites: ['H1-STA-01'] },
  { id: 'H1-STA-03', name: '집합의 연산', grade: 'high_1', category: 'concept', part: 'data', description: '교집합(∩), 합집합(∪), 여집합, 차집합', parentId: 'H1-STA-01', prerequisites: ['H1-STA-01'] },
  { id: 'H1-STA-04', name: '드모르간 법칙', grade: 'high_1', category: 'concept', part: 'data', description: '(A∪B)ᶜ=Aᶜ∩Bᶜ, (A∩B)ᶜ=Aᶜ∪Bᶜ', parentId: 'H1-STA-03', prerequisites: ['H1-STA-03'] },
  { id: 'H1-STA-05', name: '명제와 조건', grade: 'high_1', category: 'concept', part: 'data', description: '참/거짓 판별, p→q, 진리집합', parentId: 'H1-STA-01', prerequisites: ['H1-STA-01'] },
  { id: 'H1-STA-06', name: '역·이·대우', grade: 'high_1', category: 'concept', part: 'data', description: '명제의 역/이/대우 관계, 대우를 이용한 증명', parentId: 'H1-STA-05', prerequisites: ['H1-STA-05'] },
  { id: 'H1-STA-07', name: '필요조건·충분조건', grade: 'high_1', category: 'concept', part: 'data', description: 'p⊂q이면 p는 충분, q는 필요. 필요충분조건', parentId: 'H1-STA-05', prerequisites: ['H1-STA-05', 'H1-STA-02'] },
  { id: 'H1-STA-10', name: '합의 법칙과 곱의 법칙', grade: 'high_1', category: 'concept', part: 'data', description: '배반사건의 합, 연속사건의 곱, 포함-배제 원리, 수형도', parentId: 'M2-STA-01', prerequisites: ['M2-STA-01'] },
  { id: 'H1-STA-08', name: '순열', grade: 'high_1', category: 'computation', part: 'data', description: 'nPr=n!/(n-r)!, 팩토리얼(n!), 0!=1', parentId: 'H1-STA-10', prerequisites: ['H1-STA-10'] },
  { id: 'H1-STA-09', name: '조합', grade: 'high_1', category: 'computation', part: 'data', description: 'nCr=n!/r!(n-r)!, nCr=nC(n-r), 파스칼 삼각형', parentId: 'H1-STA-08', prerequisites: ['H1-STA-08'] },
  { id: 'H1-STA-11', name: '순열의 활용', grade: 'high_1', category: 'computation', part: 'data', description: '이웃하는 순열(묶음), 이웃하지 않는 순열(칸막이)', parentId: 'H1-STA-08', prerequisites: ['H1-STA-08'] },
  { id: 'H1-STA-12', name: '조합의 활용', grade: 'high_1', category: 'computation', part: 'data', description: '직선·삼각형·사각형 개수, 분할, 평행사변형(mC2×nC2)', parentId: 'H1-STA-09', prerequisites: ['H1-STA-09'] },
  { id: 'H1-ALG-18', name: '행렬의 뜻과 표현', grade: 'high_1', category: 'concept', part: 'algebra', description: '수를 직사각형 배열, 성분(aᵢⱼ), m×n 행렬, 데이터 구조화', parentId: null, prerequisites: [] },
  { id: 'H1-ALG-19', name: '행렬의 덧셈·뺄셈·실수배', grade: 'high_1', category: 'computation', part: 'algebra', description: '같은 위치 성분끼리 연산, 교환·결합법칙 성립, 영행렬', parentId: 'H1-ALG-18', prerequisites: ['H1-ALG-18'] },
  { id: 'H1-ALG-20', name: '행렬의 곱셈', grade: 'high_1', category: 'computation', part: 'algebra', description: '행과 열의 내적, AB≠BA(비가환성), 영인자 존재', parentId: 'H1-ALG-19', prerequisites: ['H1-ALG-19'] },
  { id: 'H1-ALG-21', name: '단위행렬', grade: 'high_1', category: 'concept', part: 'algebra', description: 'AE=EA=A, 곱셈의 항등원, 모든 행렬과 교환 가능', parentId: 'H1-ALG-20', prerequisites: ['H1-ALG-20'] },
  { id: 'H1-ALG-22', name: '역행렬', grade: 'high_1', category: 'concept', part: 'algebra', description: 'AA⁻¹=E, 2×2 역행렬 공식, ad-bc≠0 존재조건(행렬식)', parentId: 'H1-ALG-21', prerequisites: ['H1-ALG-21'] },
  { id: 'H1-ALG-23', name: '케일리-해밀턴 정리', grade: 'high_1', category: 'concept', part: 'algebra', description: 'A²-(a+d)A+(ad-bc)E=O, 고차식→1차식 환원(심화)', parentId: 'H1-ALG-22', prerequisites: ['H1-ALG-22'] },
];

// =============================================
// 전체 개념 목록
// =============================================

export const ALL_CONCEPTS: ConceptSeedData[] = [
  ...ELEMENTARY_3_CONCEPTS,
  ...ELEMENTARY_4_CONCEPTS,
  ...ELEMENTARY_5_CONCEPTS,
  ...ELEMENTARY_6_CONCEPTS,
  ...MIDDLE_1_CONCEPTS,
  ...MIDDLE_2_CONCEPTS,
  ...MIDDLE_3_CONCEPTS,
  ...HIGH_1_CONCEPTS,
];

// =============================================
// 학년 간 연계 흐름 (가이드 문서 기준)
// =============================================

export const CROSS_GRADE_CHAINS: Record<string, string[]> = {
  '분수 계통': ['E3-NUM-05', 'E4-NUM-07', 'E5-NUM-06', 'E5-NUM-08', 'E5-NUM-13', 'E6-NUM-03', 'M1-NUM-04', 'M1-NUM-05'],
  '소수 계통': ['E3-NUM-06', 'E4-NUM-11', 'E5-NUM-14', 'E6-NUM-05', 'M2-NUM-01', 'M2-NUM-02'],
  '도형 계통': ['E3-GEO-01', 'E4-GEO-01', 'E5-GEO-03', 'E6-GEO-04', 'M1-GEO-03', 'M2-GEO-01', 'M2-GEO-07', 'M3-GEO-01'],
  '그래프 계통': ['E3-STA-01', 'E4-STA-01', 'E4-STA-02', 'E6-STA-01', 'M1-STA-01', 'M1-STA-02', 'M1-STA-03', 'M3-STA-01', 'M3-STA-03'],
  '방정식 계통': ['E5-ALG-01', 'E6-ALG-03', 'M1-ALG-02', 'M1-ALG-04', 'M2-ALG-04', 'M2-ALG-06', 'M3-ALG-03', 'M3-ALG-06', 'M3-ALG-07', 'H1-ALG-08', 'H1-ALG-10', 'H1-ALG-17'],
  '함수 계통': ['E4-ALG-01', 'E5-ALG-01', 'M1-FUNC-01', 'M1-FUNC-02', 'M2-FUNC-01', 'M2-FUNC-02', 'M2-FUNC-03', 'M2-FUNC-04', 'M3-FUNC-01', 'M3-FUNC-02', 'M3-FUNC-03', 'M3-FUNC-04', 'H1-ALG-14', 'H1-ALG-15'],
  '다항식·인수분해 계통': ['M1-ALG-03', 'M2-ALG-02', 'M3-ALG-01', 'M3-ALG-04', 'M3-ALG-02', 'M3-ALG-05', 'H1-ALG-01', 'H1-ALG-02', 'H1-ALG-03', 'H1-ALG-04', 'H1-ALG-05'],
  '부등식 계통': ['M2-ALG-03', 'M2-ALG-05', 'H1-ALG-11', 'H1-ALG-12', 'H1-ALG-13', 'H1-ALG-16'],
  '수 체계 계통': ['E3-NUM-05', 'E3-NUM-06', 'E4-NUM-07', 'M1-NUM-04', 'M3-NUM-01', 'M3-NUM-03', 'M3-NUM-04', 'M3-NUM-02', 'H1-ALG-06', 'H1-ALG-07'],
  '경우의 수·확률 계통': ['E5-NUM-16', 'M2-STA-01', 'M2-STA-02', 'H1-STA-10', 'H1-STA-08', 'H1-STA-09'],
  '행렬 계통': ['H1-ALG-18', 'H1-ALG-19', 'H1-ALG-20', 'H1-ALG-21', 'H1-ALG-22', 'H1-ALG-23'],
  '덧셈·뺄셈 계통': ['E3-NUM-01', 'E3-NUM-02', 'E4-NUM-05', 'E4-NUM-06'],
  '곱셈·나눗셈 계통': ['E3-NUM-03', 'E3-NUM-04', 'E4-NUM-05', 'E4-NUM-06', 'E5-NUM-13', 'E5-NUM-14', 'E6-NUM-03', 'E6-NUM-05'],
  '원과 회전체 계통': ['E3-GEO-02', 'E6-GEO-03', 'E6-GEO-04', 'E6-GEO-05', 'M1-GEO-05', 'M1-GEO-06', 'M3-GEO-02', 'M3-GEO-04'],
  '삼각형·사각형 계통': ['M1-GEO-02', 'M1-GEO-08', 'M2-GEO-03', 'M2-GEO-04', 'M2-GEO-05', 'M2-GEO-06', 'M2-GEO-08'],
  '입체도형 계통': ['M1-GEO-06', 'M1-GEO-07'],
};
