export type ArithmeticCategory =
  // 초1
  | 'add_1digit'       // 한 자리 덧셈
  | 'sub_1digit'       // 한 자리 뺄셈
  // 초2
  | 'add_2digit'       // 두 자리 덧셈
  | 'sub_2digit'       // 두 자리 뺄셈
  | 'mul_table'        // 곱셈구구
  | 'unit_convert'     // 단위 변환
  // 초3
  | 'add_3digit'       // 세 자리 덧셈
  | 'sub_3digit'       // 세 자리 뺄셈
  | 'mul_2x1'          // (두 자리)×(한 자리)
  | 'div_basic'        // 나눗셈 기초
  | 'div_remainder'    // 나머지 있는 나눗셈
  | 'time_calc'        // 시간 계산
  // 초4
  | 'mul_large'        // 큰 수 곱셈
  | 'div_large'        // 큰 수 나눗셈
  | 'frac_add_same'    // 분수 덧셈 (동분모)
  | 'frac_sub_same'    // 분수 뺄셈 (동분모)
  | 'dec_add'          // 소수 덧셈
  | 'dec_sub'          // 소수 뺄셈
  | 'angle_calc'       // 각도 구하기
  | 'sequence_pattern' // 규칙 찾기
  // 초5
  | 'mixed_calc'       // 혼합 계산
  | 'frac_add_diff'    // 분수 덧셈 (이분모)
  | 'frac_sub_diff'    // 분수 뺄셈 (이분모)
  | 'frac_mul'         // 분수 곱셈
  | 'dec_mul'          // 소수 곱셈
  | 'gcd_lcm'          // 최대공약수/최소공배수
  | 'avg_calc'         // 평균 구하기
  | 'area_calc'        // 넓이 구하기
  // 초6
  | 'frac_div'         // 분수 나눗셈
  | 'dec_div'          // 소수 나눗셈
  | 'ratio_calc'       // 비와 비율
  | 'percent_calc'     // 백분율 계산
  | 'circle_area'      // 원의 넓이/둘레
  | 'frac_all'         // ★ 분수 종합
  | 'dec_all'          // ★ 소수 종합
  // 중1
  | 'int_add'          // 정수 덧셈
  | 'int_sub'          // 정수 뺄셈
  | 'int_mul'          // 정수 곱셈
  | 'int_div'          // 정수 나눗셈
  | 'int_all'          // ★ 정수 종합
  | 'abs_basic'        // 절댓값 기본
  | 'abs_add'          // 절댓값 덧셈
  | 'abs_sub'          // 절댓값 뺄셈
  | 'abs_mul'          // 절댓값 곱셈
  | 'abs_mixed'        // 절댓값 혼합
  | 'abs_all'          // ★ 절댓값 종합
  | 'pf_exponent'      // 소인수분해 - 지수 구하기
  | 'pf_find'          // 소인수분해 - 빈칸 채우기
  | 'pf_value'         // 소인수분해 - 값 구하기
  | 'pf_all'           // ★ 소인수분해 종합
  | 'proportion'       // 정비례/반비례
  | 'quadrant'         // 사분면 판별
  // 중2
  | 'exp_calc'         // 거듭제곱 계산
  | 'exp_law'          // 지수법칙
  | 'mono_mul'         // 단항식 곱셈
  | 'mono_div'         // 단항식 나눗셈
  | 'poly_add'         // 다항식 덧셈
  | 'poly_sub'         // 다항식 뺄셈
  | 'linear_eq'        // 일차방정식 풀기
  | 'pythagoras'       // 피타고라스 정리
  | 'similarity'       // 닮음비 활용
  | 'poly_all'         // ★ 다항식 종합
  // 중3
  | 'poly_mul'         // 다항식 곱셈
  | 'mul_formula'      // 곱셈공식
  | 'factoring'        // 인수분해
  | 'sqrt_simplify'    // 제곱근 간소화
  | 'sqrt_add'         // 제곱근 덧뺄셈
  | 'sqrt_mul'         // 제곱근 곱셈
  | 'sqrt_rationalize' // 분모의 유리화
  | 'sqrt_all'         // ★ 제곱근 종합
  | 'discriminant'     // 판별식 계산
  | 'trig_value'       // 삼각비 값
  | 'trig_calc'        // 삼각비 사칙연산
  | 'inscribed_angle'  // 원주각
  | 'median_calc'      // 중앙값 구하기
  | 'mode_calc'        // 최빈값 구하기
  | 'deviation_sum'    // 편차의 합
  | 'variance_calc';   // 분산 구하기

// 하위 호환용 (API 레벨 파라미터)
export type ArithmeticLevel = 'easy' | 'medium' | 'hard';

export interface GeneratedProblem {
  content: string;
  answer: string;
  choices: string[];
  category: ArithmeticCategory;
  level: ArithmeticLevel;
}

export type Gen = (level: ArithmeticLevel) => GeneratedProblem;

export const CATEGORY_LABELS: Record<ArithmeticCategory, string> = {
  add_1digit: '한 자리 덧셈',
  sub_1digit: '한 자리 뺄셈',
  add_2digit: '두 자리 덧셈',
  sub_2digit: '두 자리 뺄셈',
  mul_table: '곱셈구구',
  unit_convert: '단위 변환',
  add_3digit: '세 자리 덧셈',
  sub_3digit: '세 자리 뺄셈',
  mul_2x1: '(두 자리)×(한 자리)',
  div_basic: '나눗셈 기초',
  div_remainder: '나머지 구하기',
  time_calc: '시간 계산',
  mul_large: '큰 수 곱셈',
  div_large: '큰 수 나눗셈',
  frac_add_same: '분수 덧셈(동분모)',
  frac_sub_same: '분수 뺄셈(동분모)',
  dec_add: '소수 덧셈',
  dec_sub: '소수 뺄셈',
  angle_calc: '각도 구하기',
  sequence_pattern: '규칙 찾기',
  mixed_calc: '혼합 계산',
  frac_add_diff: '분수 덧셈(이분모)',
  frac_sub_diff: '분수 뺄셈(이분모)',
  frac_mul: '분수 곱셈',
  dec_mul: '소수 곱셈',
  gcd_lcm: '최대공약수/최소공배수',
  avg_calc: '평균 구하기',
  area_calc: '넓이 구하기',
  frac_div: '분수 나눗셈',
  dec_div: '소수 나눗셈',
  ratio_calc: '비와 비율',
  percent_calc: '백분율 계산',
  circle_area: '원의 넓이/둘레',
  frac_all: '★ 분수 종합',
  dec_all: '★ 소수 종합',
  int_add: '정수 덧셈',
  int_sub: '정수 뺄셈',
  int_mul: '정수 곱셈',
  int_div: '정수 나눗셈',
  int_all: '★ 정수 종합',
  abs_basic: '절댓값 기본',
  abs_add: '절댓값 덧셈',
  abs_sub: '절댓값 뺄셈',
  abs_mul: '절댓값 곱셈',
  abs_mixed: '절댓값 혼합',
  abs_all: '★ 절댓값 종합',
  pf_exponent: '소인수분해-지수',
  pf_find: '소인수분해-빈칸',
  pf_value: '소인수분해-값',
  pf_all: '★ 소인수분해 종합',
  proportion: '정비례/반비례',
  quadrant: '사분면 판별',
  exp_calc: '거듭제곱 계산',
  exp_law: '지수법칙',
  mono_mul: '단항식 곱셈',
  mono_div: '단항식 나눗셈',
  poly_add: '다항식 덧셈',
  poly_sub: '다항식 뺄셈',
  linear_eq: '일차방정식',
  pythagoras: '피타고라스 정리',
  similarity: '닮음비 활용',
  poly_all: '★ 다항식 종합',
  poly_mul: '다항식 곱셈',
  mul_formula: '곱셈공식',
  factoring: '인수분해',
  sqrt_simplify: '제곱근 간소화',
  sqrt_add: '제곱근 덧뺄셈',
  sqrt_mul: '제곱근 곱셈',
  sqrt_rationalize: '분모의 유리화',
  sqrt_all: '★ 제곱근 종합',
  discriminant: '판별식 계산',
  trig_value: '삼각비 값',
  trig_calc: '삼각비 사칙연산',
  inscribed_angle: '원주각',
  median_calc: '중앙값 구하기',
  mode_calc: '최빈값 구하기',
  deviation_sum: '편차의 합',
  variance_calc: '분산 구하기',
};

/** 현재 생성기가 구현된 연산 유형 */
export const IMPLEMENTED_CATEGORIES: Set<ArithmeticCategory> = new Set([
  // 초1
  'add_1digit', 'sub_1digit',
  // 초2
  'add_2digit', 'sub_2digit', 'mul_table', 'unit_convert',
  // 초3
  'add_3digit', 'sub_3digit', 'mul_2x1', 'div_basic', 'div_remainder', 'time_calc',
  // 초4
  'mul_large', 'div_large', 'frac_add_same', 'frac_sub_same', 'dec_add', 'dec_sub',
  'angle_calc', 'sequence_pattern',
  // 초5
  'mixed_calc', 'frac_add_diff', 'frac_sub_diff', 'frac_mul', 'dec_mul',
  'gcd_lcm', 'avg_calc', 'area_calc',
  // 초6
  'frac_div', 'dec_div', 'ratio_calc', 'percent_calc', 'circle_area',
  'frac_all', 'dec_all',
  // 중1
  'int_add', 'int_sub', 'int_mul', 'int_div', 'int_all',
  'abs_basic', 'abs_add', 'abs_sub', 'abs_mul', 'abs_mixed', 'abs_all',
  'pf_exponent', 'pf_find', 'pf_value', 'pf_all',
  'proportion', 'quadrant',
  // 중2
  'exp_calc', 'exp_law', 'mono_mul', 'mono_div', 'poly_add', 'poly_sub', 'linear_eq',
  'pythagoras', 'similarity', 'poly_all',
  // 중3
  'poly_mul', 'mul_formula', 'factoring',
  'sqrt_simplify', 'sqrt_add', 'sqrt_mul', 'sqrt_rationalize', 'sqrt_all',
  'discriminant', 'trig_value', 'trig_calc', 'inscribed_angle', 'median_calc', 'mode_calc', 'deviation_sum', 'variance_calc',
]);

export const LEVEL_LABELS: Record<ArithmeticLevel, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

/** 카테고리 → 학년 라벨 매핑 */
export const CATEGORY_GRADE: Record<ArithmeticCategory, string> = {
  add_1digit: '초1', sub_1digit: '초1',
  add_2digit: '초2', sub_2digit: '초2', mul_table: '초2', unit_convert: '초2',
  add_3digit: '초3', sub_3digit: '초3', mul_2x1: '초3', div_basic: '초3', div_remainder: '초3', time_calc: '초3',
  mul_large: '초4', div_large: '초4', frac_add_same: '초4', frac_sub_same: '초4', dec_add: '초4', dec_sub: '초4', angle_calc: '초4', sequence_pattern: '초4',
  mixed_calc: '초5', frac_add_diff: '초5', frac_sub_diff: '초5', frac_mul: '초5', dec_mul: '초5', gcd_lcm: '초5', avg_calc: '초5', area_calc: '초5',
  frac_div: '초6', dec_div: '초6', ratio_calc: '초6', percent_calc: '초6', circle_area: '초6', frac_all: '초6', dec_all: '초6',
  int_add: '중1', int_sub: '중1', int_mul: '중1', int_div: '중1', int_all: '중1',
  abs_basic: '중1', abs_add: '중1', abs_sub: '중1', abs_mul: '중1', abs_mixed: '중1', abs_all: '중1',
  pf_exponent: '중1', pf_find: '중1', pf_value: '중1', pf_all: '중1', proportion: '중1', quadrant: '중1',
  exp_calc: '중2', exp_law: '중2', mono_mul: '중2', mono_div: '중2', poly_add: '중2', poly_sub: '중2', linear_eq: '중2', pythagoras: '중2', similarity: '중2', poly_all: '중2',
  poly_mul: '중3', mul_formula: '중3', factoring: '중3',
  sqrt_simplify: '중3', sqrt_add: '중3', sqrt_mul: '중3', sqrt_rationalize: '중3', sqrt_all: '중3',
  discriminant: '중3', trig_value: '중3', trig_calc: '중3', inscribed_angle: '중3', median_calc: '중3', mode_calc: '중3', deviation_sum: '중3', variance_calc: '중3',
};
