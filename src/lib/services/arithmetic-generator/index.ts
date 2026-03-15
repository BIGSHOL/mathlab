import { ArithmeticCategory, ArithmeticLevel, GeneratedProblem, Gen } from './types';
import { rand } from './utils';
import * as elementary from './elementary';
import * as middle from './middle';

export * from './types';
export * from './utils';
export * from './elementary';
export * from './middle';

// --- 종합(ALL) 생성기 헬퍼 ---

function makeAllGen(cats: ArithmeticCategory[], allCat: ArithmeticCategory): Gen {
  return (level: ArithmeticLevel) => {
    const cat = cats[rand(0, cats.length - 1)];
    const p = GENERATORS[cat](level);
    return { ...p, category: allCat };
  };
}

// --- GENERATORS ---

const GENERATORS: Record<ArithmeticCategory, Gen> = {
  // 초1
  add_1digit: elementary.makeAdd(1, 9, 'add_1digit'),
  sub_1digit: elementary.makeSub(1, 9, 'sub_1digit'),
  // 초2
  add_2digit: elementary.makeAdd(10, 99, 'add_2digit'),
  sub_2digit: elementary.makeSub(10, 99, 'sub_2digit'),
  mul_table: elementary.makeMul(2, 9, 2, 9, 'mul_table'),
  unit_convert: elementary.genUnitConvert,
  // 초3
  add_3digit: elementary.makeAdd(100, 999, 'add_3digit'),
  sub_3digit: elementary.makeSub(100, 999, 'sub_3digit'),
  mul_2x1: elementary.makeMul(10, 99, 2, 9, 'mul_2x1'),
  div_basic: elementary.makeDiv(2, 9, 2, 9, 'div_basic'),
  div_remainder: elementary.genDivRemainder,
  time_calc: elementary.genTimeCalc,
  // 초4
  mul_large: elementary.makeMul(100, 999, 10, 99, 'mul_large'),
  div_large: elementary.makeDiv(10, 50, 10, 50, 'div_large'),
  frac_add_same: elementary.makeFracAdd(true, 'frac_add_same'),
  frac_sub_same: elementary.makeFracSub(true, 'frac_sub_same'),
  dec_add: elementary.makeDecOp('+', (a, b) => a + b, 'dec_add'),
  dec_sub: elementary.makeDecOp('-', (a, b) => a - b, 'dec_sub'),
  angle_calc: elementary.genAngleCalc,
  sequence_pattern: elementary.genSequencePattern,
  // 초5
  mixed_calc: elementary.genMixedCalc,
  frac_add_diff: elementary.makeFracAdd(false, 'frac_add_diff'),
  frac_sub_diff: elementary.makeFracSub(false, 'frac_sub_diff'),
  frac_mul: elementary.genFracMul,
  dec_mul: elementary.makeDecOp('\\times', (a, b) => a * b, 'dec_mul'),
  gcd_lcm: elementary.genGcdLcm,
  avg_calc: elementary.genAvgCalc,
  area_calc: elementary.genAreaCalc,
  // 초6
  frac_div: elementary.genFracDiv,
  dec_div: elementary.genDecDiv,
  ratio_calc: elementary.genRatioCalc,
  percent_calc: elementary.genPercentCalc,
  circle_area: elementary.genCircleArea,
  frac_all: (lv) => makeAllGen(['frac_add_same', 'frac_sub_same', 'frac_add_diff', 'frac_sub_diff', 'frac_mul', 'frac_div'], 'frac_all')(lv),
  dec_all: (lv) => makeAllGen(['dec_add', 'dec_sub', 'dec_mul', 'dec_div'], 'dec_all')(lv),
  // 중1
  int_add: middle.makeIntOp('+', (a, b) => a + b, 1, 20, 'int_add'),
  int_sub: middle.makeIntOp('-', (a, b) => a - b, 1, 20, 'int_sub'),
  int_mul: middle.makeIntOp('\\times', (a, b) => a * b, 1, 12, 'int_mul'),
  int_div: middle.makeIntDiv(1, 12, 'int_div'),
  int_all: (lv) => makeAllGen(['int_add', 'int_sub', 'int_mul', 'int_div'], 'int_all')(lv),
  abs_basic: middle.genAbsBasic,
  abs_add: middle.genAbsAdd,
  abs_sub: middle.genAbsSub,
  abs_mul: middle.genAbsMul,
  abs_mixed: middle.genAbsMixed,
  abs_all: (lv) => makeAllGen(['abs_basic', 'abs_add', 'abs_sub', 'abs_mul', 'abs_mixed'], 'abs_all')(lv),
  pf_exponent: middle.genPfExponent,
  pf_find: middle.genPfFind,
  pf_value: middle.genPfValue,
  pf_all: middle.genPfAll,
  proportion: middle.genProportion,
  quadrant: middle.genQuadrant,
  // 중2
  exp_calc: middle.genExpCalc,
  exp_law: middle.genExpLaw,
  mono_mul: middle.genMonoMul,
  mono_div: middle.genMonoDiv,
  poly_add: middle.genPolyAdd,
  poly_sub: middle.genPolySub,
  linear_eq: middle.genLinearEq,
  pythagoras: middle.genPythagoras,
  similarity: middle.genSimilarity,
  poly_all: (lv) => makeAllGen(['mono_mul', 'mono_div', 'poly_add', 'poly_sub', 'poly_mul'], 'poly_all')(lv),
  // 중3
  poly_mul: middle.genPolyMul,
  mul_formula: middle.genMulFormula,
  factoring: middle.genFactoring,
  sqrt_simplify: middle.genSqrtSimplify,
  sqrt_add: middle.genSqrtAdd,
  sqrt_mul: middle.genSqrtMul,
  sqrt_rationalize: middle.genSqrtRationalize,
  sqrt_all: (lv) => makeAllGen(['sqrt_simplify', 'sqrt_add', 'sqrt_mul', 'sqrt_rationalize'], 'sqrt_all')(lv),
  discriminant: middle.genDiscriminant,
  trig_value: middle.genTrigValue,
  trig_calc: middle.genTrigCalc,
  inscribed_angle: middle.genInscribedAngle,
  median_calc: middle.genMedianCalc,
  mode_calc: middle.genModeCalc,
  deviation_sum: middle.genDeviationSum,
  variance_calc: middle.genVarianceCalc,
};

export function generateProblems(
  category: ArithmeticCategory,
  level: ArithmeticLevel,
  count: number,
): GeneratedProblem[] {
  const gen = GENERATORS[category];
  const seen = new Set<string>();
  const results: GeneratedProblem[] = [];
  const maxAttempts = count * 10;
  let attempts = 0;

  while (results.length < count && attempts < maxAttempts) {
    const p = gen(level);
    attempts++;
    if (seen.has(p.content)) continue;
    seen.add(p.content);
    results.push(p);
  }

  // 유니크 조합이 부족하면 나머지는 그대로 채움
  while (results.length < count) {
    results.push(gen(level));
  }

  return results;
}
