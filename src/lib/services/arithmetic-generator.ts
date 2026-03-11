/**
 * 연산 문제 무제한 자동 생성 엔진
 * 학년별 세부 연산 유형으로 분류 (난이도 대신 유형 자체가 수준을 결정)
 */

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
  // 중1
  | 'int_add'          // 정수 덧셈
  | 'int_sub'          // 정수 뺄셈
  | 'int_mul'          // 정수 곱셈
  | 'int_div'          // 정수 나눗셈
  | 'abs_calc'         // 절댓값 계산
  | 'prime_factor'     // 소인수분해
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
  // 중3
  | 'poly_mul'         // 다항식 곱셈
  | 'mul_formula'      // 곱셈공식
  | 'factoring'        // 인수분해
  | 'sqrt_simplify'    // 제곱근 간소화
  | 'sqrt_add'         // 제곱근 덧뺄셈
  | 'sqrt_mul'         // 제곱근 곱셈
  | 'sqrt_rationalize' // 분모의 유리화
  | 'discriminant'     // 판별식 계산
  | 'trig_value'       // 삼각비 값
  | 'inscribed_angle'  // 원주각
  | 'median_calc'      // 중앙값 구하기
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

// --- Utilities ---

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function generateChoices(correct: number, count = 4): string[] {
  const choices = new Set<number>();
  choices.add(correct);
  const offset = Math.max(3, Math.abs(correct) > 10 ? Math.ceil(Math.abs(correct) * 0.3) : 5);
  while (choices.size < count) {
    const wrong = correct + rand(-offset, offset);
    if (wrong !== correct) choices.add(wrong);
  }
  return shuffle([...choices]).map(String);
}

function generateFractionChoices(num: number, den: number, count = 4): string[] {
  const choices = new Set<string>();
  const g = gcd(Math.abs(num), den);
  choices.add(`$\\frac{${num / g}}{${den / g}}$`);
  while (choices.size < count) {
    const n = num + rand(-3, 3);
    const d = den + rand(-1, 1);
    if (d > 0 && !(n === num && d === den)) {
      const g2 = gcd(Math.abs(n), d);
      choices.add(`$\\frac{${n / g2}}{${d / g2}}$`);
    }
  }
  return shuffle([...choices]);
}

const BOX = '\\boxed{\\phantom{000}}';

// --- Algebraic formatting helpers ---

function fmtMono(c: number, e: number): string {
  if (e === 0) return `${c}`;
  const cStr = c === 1 ? '' : c === -1 ? '-' : `${c}`;
  return e === 1 ? `${cStr}x` : `${cStr}x^{${e}}`;
}

function fmtLinear(a: number, b: number): string {
  const aStr = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
  if (b === 0) return aStr;
  return b > 0 ? `${aStr} + ${b}` : `${aStr} - ${Math.abs(b)}`;
}

function fmtQuadratic(bCoeff: number, c: number): string {
  let s = 'x^2';
  if (bCoeff === 1) s += ' + x';
  else if (bCoeff === -1) s += ' - x';
  else if (bCoeff > 0) s += ` + ${bCoeff}x`;
  else if (bCoeff < 0) s += ` - ${Math.abs(bCoeff)}x`;
  if (c > 0) s += ` + ${c}`;
  else if (c < 0) s += ` - ${Math.abs(c)}`;
  return s;
}

function fmtSqrt(c: number, base: number): string {
  if (c === 1) return `\\sqrt{${base}}`;
  return `${c}\\sqrt{${base}}`;
}

function fmtFactor(root: number): string {
  if (root > 0) return `(x - ${root})`;
  if (root < 0) return `(x + ${Math.abs(root)})`;
  return 'x';
}

// --- Choice generators for algebraic expressions ---

function monoChoices(c: number, e: number): string[] {
  const choices = new Set<string>();
  choices.add(`$${fmtMono(c, e)}$`);
  while (choices.size < 4) {
    const dc = rand(-2, 3), de = rand(-1, 2);
    const nc = c + dc, ne = e + de;
    if (nc > 0 && ne >= 0 && !(dc === 0 && de === 0)) choices.add(`$${fmtMono(nc, ne)}$`);
  }
  return shuffle([...choices]);
}

function linearChoices(a: number, b: number): string[] {
  const choices = new Set<string>();
  choices.add(`$${fmtLinear(a, b)}$`);
  while (choices.size < 4) {
    const da = rand(-2, 2), db = rand(-3, 3);
    const na = a + da, nb = b + db;
    if (na !== 0 && !(da === 0 && db === 0)) choices.add(`$${fmtLinear(na, nb)}$`);
  }
  return shuffle([...choices]);
}

function quadChoices(bCoeff: number, c: number): string[] {
  const choices = new Set<string>();
  choices.add(`$${fmtQuadratic(bCoeff, c)}$`);
  while (choices.size < 4) {
    const db = rand(-2, 2), dc = rand(-3, 3);
    if (db !== 0 || dc !== 0) choices.add(`$${fmtQuadratic(bCoeff + db, c + dc)}$`);
  }
  return shuffle([...choices]);
}

function sqrtChoices(c: number, base: number): string[] {
  const choices = new Set<string>();
  choices.add(`$${fmtSqrt(c, base)}$`);
  while (choices.size < 4) {
    const dc = rand(-2, 3), db = rand(-1, 3);
    const nc = c + dc, nb = base + db;
    if (nc > 0 && nb > 1 && !(dc === 0 && db === 0)) choices.add(`$${fmtSqrt(nc, nb)}$`);
  }
  return shuffle([...choices]);
}

function factoringChoices(r1: number, r2: number): string[] {
  const fmt = (a: number, b: number) => `$${fmtFactor(a)}${fmtFactor(b)}$`;
  const choices = new Set<string>();
  choices.add(fmt(r1, r2));
  while (choices.size < 4) {
    const d1 = rand(-2, 2), d2 = rand(-2, 2);
    if (d1 === 0 && d2 === 0) continue;
    const w1 = r1 + d1, w2 = r2 + d2;
    if (w1 === 0 || w2 === 0) continue;
    choices.add(fmt(w1, w2));
  }
  return shuffle([...choices]);
}

// --- Factory helpers (초등) ---

type Gen = (level: ArithmeticLevel) => GeneratedProblem;

function makeAdd(min: number, max: number, cat: ArithmeticCategory): Gen {
  return (level) => {
    const a = rand(min, max), b = rand(min, max);
    return { content: `$${a} + ${b} = ${BOX}$`, answer: String(a + b), choices: generateChoices(a + b), category: cat, level };
  };
}

function makeSub(min: number, max: number, cat: ArithmeticCategory): Gen {
  return (level) => {
    let a = rand(min, max), b = rand(min, max);
    if (a < b) [a, b] = [b, a];
    return { content: `$${a} - ${b} = ${BOX}$`, answer: String(a - b), choices: generateChoices(a - b), category: cat, level };
  };
}

function makeMul(minA: number, maxA: number, minB: number, maxB: number, cat: ArithmeticCategory): Gen {
  return (level) => {
    const a = rand(minA, maxA), b = rand(minB, maxB);
    return { content: `$${a} \\times ${b} = ${BOX}$`, answer: String(a * b), choices: generateChoices(a * b), category: cat, level };
  };
}

function makeDiv(minDiv: number, maxDiv: number, minAns: number, maxAns: number, cat: ArithmeticCategory): Gen {
  return (level) => {
    const b = rand(minDiv, maxDiv), answer = rand(minAns, maxAns), a = b * answer;
    return { content: `$${a} \\div ${b} = ${BOX}$`, answer: String(answer), choices: generateChoices(answer), category: cat, level };
  };
}

// --- Integer helpers (중1) ---

function makeIntOp(opSymbol: string, opFn: (a: number, b: number) => number, min: number, max: number, cat: ArithmeticCategory): Gen {
  const fmt = (n: number) => n < 0 ? `(${n})` : `(+${n})`;
  return (level) => {
    const a = (rand(0, 1) ? 1 : -1) * rand(min, max);
    const b = (rand(0, 1) ? 1 : -1) * rand(min, max);
    const answer = opFn(a, b);
    return { content: `$${fmt(a)} ${opSymbol} ${fmt(b)} = ${BOX}$`, answer: String(answer), choices: generateChoices(answer), category: cat, level };
  };
}

function makeIntDiv(min: number, max: number, cat: ArithmeticCategory): Gen {
  const fmt = (n: number) => n < 0 ? `(${n})` : `(+${n})`;
  return (level) => {
    const b = (rand(0, 1) ? 1 : -1) * rand(2, Math.min(max, 12));
    const answer = (rand(0, 1) ? 1 : -1) * rand(min, max);
    const a = b * answer;
    return { content: `$${fmt(a)} \\div ${fmt(b)} = ${BOX}$`, answer: String(answer), choices: generateChoices(answer), category: cat, level };
  };
}

// --- Fraction generators ---

function makeFracAdd(sameDen: boolean, cat: ArithmeticCategory): Gen {
  return (level) => {
    const maxDen = sameDen ? 10 : 12;
    const d1 = rand(2, maxDen);
    const d2 = sameDen ? d1 : rand(2, maxDen);
    const n1 = rand(1, d1 - 1), n2 = rand(1, d2 - 1);
    const commonD = d1 * d2 / gcd(d1, d2);
    const resultNum = n1 * (commonD / d1) + n2 * (commonD / d2);
    const g = gcd(Math.abs(resultNum), commonD);
    return {
      content: `$\\frac{${n1}}{${d1}} + \\frac{${n2}}{${d2}} = ${BOX}$`,
      answer: `$\\frac{${resultNum / g}}{${commonD / g}}$`,
      choices: generateFractionChoices(resultNum, commonD),
      category: cat, level,
    };
  };
}

function makeFracSub(sameDen: boolean, cat: ArithmeticCategory): Gen {
  return (level) => {
    const maxDen = sameDen ? 10 : 12;
    const d1 = rand(2, maxDen);
    const d2 = sameDen ? d1 : rand(2, maxDen);
    let n1 = rand(1, d1 - 1), n2 = rand(1, d2 - 1);
    const commonD = d1 * d2 / gcd(d1, d2);
    let resultNum = n1 * (commonD / d1) - n2 * (commonD / d2);
    if (resultNum < 0) { [n1, n2] = [n2, n1]; resultNum = -resultNum; }
    const g = gcd(Math.abs(resultNum), commonD);
    return {
      content: `$\\frac{${n1}}{${d1}} - \\frac{${n2}}{${d2}} = ${BOX}$`,
      answer: `$\\frac{${resultNum / g}}{${commonD / g}}$`,
      choices: generateFractionChoices(resultNum, commonD),
      category: cat, level,
    };
  };
}

function genFracMul(level: ArithmeticLevel): GeneratedProblem {
  const d1 = rand(2, 10), d2 = rand(2, 10);
  const n1 = rand(1, d1), n2 = rand(1, d2);
  const resultNum = n1 * n2, resultDen = d1 * d2;
  const g = gcd(resultNum, resultDen);
  return {
    content: `$\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}} = ${BOX}$`,
    answer: `$\\frac{${resultNum / g}}{${resultDen / g}}$`,
    choices: generateFractionChoices(resultNum, resultDen),
    category: 'frac_mul', level,
  };
}

function genFracDiv(level: ArithmeticLevel): GeneratedProblem {
  const d1 = rand(2, 10), d2 = rand(2, 10);
  const n1 = rand(1, d1), n2 = rand(1, d2);
  const resultNum = n1 * d2, resultDen = d1 * n2;
  const g = gcd(resultNum, resultDen);
  return {
    content: `$\\frac{${n1}}{${d1}} \\div \\frac{${n2}}{${d2}} = ${BOX}$`,
    answer: `$\\frac{${resultNum / g}}{${resultDen / g}}$`,
    choices: generateFractionChoices(resultNum, resultDen),
    category: 'frac_div', level,
  };
}

// --- Decimal generators ---

function makeDecOp(opSymbol: string, opFn: (a: number, b: number) => number, cat: ArithmeticCategory, decimals = 1): Gen {
  return (level) => {
    const factor = Math.pow(10, decimals);
    let a = rand(1, 50 * factor) / factor;
    let b = rand(1, 50 * factor) / factor;
    if (opSymbol === '-' && a < b) [a, b] = [b, a];
    const answer = parseFloat(opFn(a, b).toFixed(decimals));
    return {
      content: `$${a} ${opSymbol} ${b} = ${BOX}$`,
      answer: String(answer),
      choices: generateChoices(Math.round(answer * factor)).map((c) => String(Number(c) / factor)),
      category: cat, level,
    };
  };
}

function genDecDiv(level: ArithmeticLevel): GeneratedProblem {
  const b = rand(2, 20);
  const answer = rand(1, 50);
  const a = parseFloat((b * answer * 0.1).toFixed(1));
  const divisor = parseFloat((b * 0.1).toFixed(1));
  return {
    content: `$${a} \\div ${divisor} = ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'dec_div', level,
  };
}

// --- 초3: 나머지 있는 나눗셈 ---

function genDivRemainder(level: ArithmeticLevel): GeneratedProblem {
  const divisor = rand(3, 9);
  const quotient = rand(2, 12);
  const remainder = rand(1, divisor - 1);
  const dividend = divisor * quotient + remainder;
  return {
    content: `$${dividend} \\div ${divisor}$ 의 나머지 $= ${BOX}$`,
    answer: String(remainder),
    choices: generateChoices(remainder),
    category: 'div_remainder', level,
  };
}

// --- 초5: 혼합 계산 ---

function genMixedCalc(level: ArithmeticLevel): GeneratedProblem {
  const a = rand(2, 15), b = rand(2, 9), c = rand(2, 9);
  const patterns = [
    { content: `$${a} + ${b} \\times ${c} = ${BOX}$`, answer: a + b * c },
    { content: `$${a} - ${b} \\times ${c} = ${BOX}$`, answer: a - b * c },
    { content: `$${a} \\times ${b} + ${c} = ${BOX}$`, answer: a * b + c },
    { content: `$${a} \\times ${b} - ${c} = ${BOX}$`, answer: a * b - c },
    { content: `$(${a} + ${b}) \\times ${c} = ${BOX}$`, answer: (a + b) * c },
    { content: `$${a} \\times (${b} + ${c}) = ${BOX}$`, answer: a * (b + c) },
  ];
  const p = patterns[rand(0, patterns.length - 1)];
  return { content: p.content, answer: String(p.answer), choices: generateChoices(p.answer), category: 'mixed_calc', level };
}

// --- 초6: 비와 비율 ---

function genRatioCalc(level: ArithmeticLevel): GeneratedProblem {
  const a = rand(2, 8), b = rand(2, 8);
  const k = rand(2, 5);
  const left = a * k;
  const answer = b * k;
  return {
    content: `$${a} : ${b} = ${left} : ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'ratio_calc', level,
  };
}

// --- 초6: 백분율 계산 ---

function genPercentCalc(level: ArithmeticLevel): GeneratedProblem {
  const percents = [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90];
  const p = percents[rand(0, percents.length - 1)];
  const base = rand(2, 20) * 10;
  const answer = base * p / 100;
  return {
    content: `$${base}$의 $${p}\\%$ $= ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'percent_calc', level,
  };
}

// --- 중1: 절댓값 계산 ---

function genAbsCalc(level: ArithmeticLevel): GeneratedProblem {
  const fmt = (n: number) => n < 0 ? `(${n})` : `(+${n})`;
  const a = (rand(0, 1) ? 1 : -1) * rand(1, 15);
  const b = (rand(0, 1) ? 1 : -1) * rand(1, 15);
  const answer = Math.abs(a + b);
  return {
    content: `$|${fmt(a)} + ${fmt(b)}| = ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'abs_calc', level,
  };
}

// --- 중2: 거듭제곱 ---

function genExpCalc(level: ArithmeticLevel): GeneratedProblem {
  const base = rand(2, 9);
  const exp = rand(2, 4);
  const answer = Math.pow(base, exp);
  return {
    content: `$${base}^{${exp}} = ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'exp_calc', level,
  };
}

// --- 중2: 지수법칙 ---

function genExpLaw(level: ArithmeticLevel): GeneratedProblem {
  const base = rand(2, 5);
  const type = rand(0, 2);
  let content: string, answer: number;
  if (type === 0) {
    // aᵐ × aⁿ = aᵐ⁺ⁿ
    const m = rand(2, 5), n = rand(2, 5);
    content = `$${base}^{${m}} \\times ${base}^{${n}} = ${base}^{${BOX}}$`;
    answer = m + n;
  } else if (type === 1) {
    // aᵐ ÷ aⁿ = aᵐ⁻ⁿ
    const n = rand(2, 4), m = n + rand(1, 4);
    content = `$${base}^{${m}} \\div ${base}^{${n}} = ${base}^{${BOX}}$`;
    answer = m - n;
  } else {
    // (aᵐ)ⁿ = aᵐⁿ
    const m = rand(2, 4), n = rand(2, 3);
    content = `$(${base}^{${m}})^{${n}} = ${base}^{${BOX}}$`;
    answer = m * n;
  }
  return { content, answer: String(answer), choices: generateChoices(answer), category: 'exp_law', level };
}

// --- 중2: 단항식 곱셈/나눗셈 ---

function genMonoMul(level: ArithmeticLevel): GeneratedProblem {
  const c1 = rand(2, 6), c2 = rand(2, 6);
  const e1 = rand(1, 3), e2 = rand(1, 3);
  const ansC = c1 * c2, ansE = e1 + e2;
  return {
    content: `$${fmtMono(c1, e1)} \\times ${fmtMono(c2, e2)} = ${BOX}$`,
    answer: `$${fmtMono(ansC, ansE)}$`,
    choices: monoChoices(ansC, ansE),
    category: 'mono_mul', level,
  };
}

function genMonoDiv(level: ArithmeticLevel): GeneratedProblem {
  const ansC = rand(2, 6), ansE = rand(1, 3);
  const c2 = rand(2, 5), e2 = rand(1, 3);
  const c1 = ansC * c2, e1 = ansE + e2;
  return {
    content: `$${fmtMono(c1, e1)} \\div ${fmtMono(c2, e2)} = ${BOX}$`,
    answer: `$${fmtMono(ansC, ansE)}$`,
    choices: monoChoices(ansC, ansE),
    category: 'mono_div', level,
  };
}

// --- 중2: 다항식 덧셈/뺄셈 ---

function genPolyAdd(level: ArithmeticLevel): GeneratedProblem {
  const a1 = rand(1, 6), b1 = rand(1, 9);
  const a2 = rand(1, 6), b2 = rand(1, 9);
  const ansA = a1 + a2, ansB = b1 + b2;
  return {
    content: `$(${fmtLinear(a1, b1)}) + (${fmtLinear(a2, b2)}) = ${BOX}$`,
    answer: `$${fmtLinear(ansA, ansB)}$`,
    choices: linearChoices(ansA, ansB),
    category: 'poly_add', level,
  };
}

function genPolySub(level: ArithmeticLevel): GeneratedProblem {
  const a1 = rand(3, 8), b1 = rand(1, 9);
  const a2 = rand(1, a1 - 1), b2 = rand(1, 9);
  const ansA = a1 - a2, ansB = b1 - b2;
  return {
    content: `$(${fmtLinear(a1, b1)}) - (${fmtLinear(a2, b2)}) = ${BOX}$`,
    answer: `$${fmtLinear(ansA, ansB)}$`,
    choices: linearChoices(ansA, ansB),
    category: 'poly_sub', level,
  };
}

// --- 중2: 일차방정식 풀기 ---

function genLinearEq(level: ArithmeticLevel): GeneratedProblem {
  const answer = rand(-5, 10);
  const a = rand(2, 6);
  const b = rand(-9, 9);
  const rhs = a * answer + b;
  let lhs = `${a}x`;
  if (b > 0) lhs += ` + ${b}`;
  else if (b < 0) lhs += ` - ${Math.abs(b)}`;
  return {
    content: `$${lhs} = ${rhs}$ 일 때, $x = ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'linear_eq', level,
  };
}

// --- 중3: 다항식 곱셈 ---

function genPolyMul(level: ArithmeticLevel): GeneratedProblem {
  const a = rand(1, 6), b = rand(1, 6);
  const bCoeff = a + b, c = a * b;
  return {
    content: `$(x + ${a})(x + ${b}) = ${BOX}$`,
    answer: `$${fmtQuadratic(bCoeff, c)}$`,
    choices: quadChoices(bCoeff, c),
    category: 'poly_mul', level,
  };
}

// --- 중3: 곱셈공식 ---

function genMulFormula(level: ArithmeticLevel): GeneratedProblem {
  const type = rand(0, 2);
  const a = rand(1, 6);
  let content: string, bCoeff: number, c: number;
  if (type === 0) {
    content = `$(x + ${a})^2 = ${BOX}$`;
    bCoeff = 2 * a; c = a * a;
  } else if (type === 1) {
    content = `$(x - ${a})^2 = ${BOX}$`;
    bCoeff = -2 * a; c = a * a;
  } else {
    content = `$(x + ${a})(x - ${a}) = ${BOX}$`;
    bCoeff = 0; c = -(a * a);
  }
  return {
    content,
    answer: `$${fmtQuadratic(bCoeff, c)}$`,
    choices: quadChoices(bCoeff, c),
    category: 'mul_formula', level,
  };
}

// --- 중3: 인수분해 ---

function genFactoring(level: ArithmeticLevel): GeneratedProblem {
  let r1 = rand(-6, 6), r2 = rand(-6, 6);
  while (r1 === 0) r1 = rand(-6, 6);
  while (r2 === 0) r2 = rand(-6, 6);
  // x² - (r1+r2)x + r1*r2 = (x-r1)(x-r2)
  const bCoeff = -(r1 + r2), c = r1 * r2;
  const [s1, s2] = r1 <= r2 ? [r1, r2] : [r2, r1];
  const answer = `${fmtFactor(s1)}${fmtFactor(s2)}`;
  return {
    content: `$${fmtQuadratic(bCoeff, c)} = ${BOX}$`,
    answer: `$${answer}$`,
    choices: factoringChoices(s1, s2),
    category: 'factoring', level,
  };
}

// --- 중3: 제곱근 ---

const SQUARE_FREE = [2, 3, 5, 6, 7, 10, 11, 13];

function genSqrtSimplify(level: ArithmeticLevel): GeneratedProblem {
  const base = SQUARE_FREE[rand(0, SQUARE_FREE.length - 1)];
  const coeff = rand(2, 5);
  const n = coeff * coeff * base;
  return {
    content: `$\\sqrt{${n}} = ${BOX}$`,
    answer: `$${fmtSqrt(coeff, base)}$`,
    choices: sqrtChoices(coeff, base),
    category: 'sqrt_simplify', level,
  };
}

function genSqrtAdd(level: ArithmeticLevel): GeneratedProblem {
  const base = SQUARE_FREE[rand(0, 5)];
  const c1 = rand(1, 6), c2 = rand(1, 6);
  const ans = c1 + c2;
  return {
    content: `$${fmtSqrt(c1, base)} + ${fmtSqrt(c2, base)} = ${BOX}$`,
    answer: `$${fmtSqrt(ans, base)}$`,
    choices: sqrtChoices(ans, base),
    category: 'sqrt_add', level,
  };
}

function genSqrtMul(level: ArithmeticLevel): GeneratedProblem {
  const a = rand(2, 9), b = rand(2, 9);
  const product = a * b;
  const sqrtP = Math.sqrt(product);
  if (Number.isInteger(sqrtP)) {
    return {
      content: `$\\sqrt{${a}} \\times \\sqrt{${b}} = ${BOX}$`,
      answer: String(sqrtP),
      choices: generateChoices(sqrtP),
      category: 'sqrt_mul', level,
    };
  }
  let simpCoeff = 1, simpBase = product;
  for (let i = Math.floor(Math.sqrt(product)); i >= 2; i--) {
    if (product % (i * i) === 0) { simpCoeff = i; simpBase = product / (i * i); break; }
  }
  return {
    content: `$\\sqrt{${a}} \\times \\sqrt{${b}} = ${BOX}$`,
    answer: `$${fmtSqrt(simpCoeff, simpBase)}$`,
    choices: sqrtChoices(simpCoeff, simpBase),
    category: 'sqrt_mul', level,
  };
}

// --- 중3: 분모의 유리화 ---

function genSqrtRationalize(level: ArithmeticLevel): GeneratedProblem {
  const base = SQUARE_FREE[rand(0, 5)]; // 2,3,5,6,7,10
  const k = rand(1, 5);
  const numerator = k * base;
  // numerator/√base = k*base/√base = k√base
  return {
    content: `$\\frac{${numerator}}{\\sqrt{${base}}} = ${BOX}$`,
    answer: `$${fmtSqrt(k, base)}$`,
    choices: sqrtChoices(k, base),
    category: 'sqrt_rationalize', level,
  };
}

// --- 중3: 판별식 ---

function genDiscriminant(level: ArithmeticLevel): GeneratedProblem {
  const a = rand(1, 3);
  const b = rand(-8, 8);
  const c = rand(-6, 6);
  const disc = b * b - 4 * a * c;
  let eq = a === 1 ? 'x^2' : `${a}x^2`;
  if (b === 1) eq += ' + x';
  else if (b === -1) eq += ' - x';
  else if (b > 0) eq += ` + ${b}x`;
  else if (b < 0) eq += ` - ${Math.abs(b)}x`;
  if (c > 0) eq += ` + ${c}`;
  else if (c < 0) eq += ` - ${Math.abs(c)}`;
  eq += ' = 0';
  return {
    content: `$${eq}$ 에서 $b^2 - 4ac = ${BOX}$`,
    answer: String(disc),
    choices: generateChoices(disc),
    category: 'discriminant', level,
  };
}

// --- 초2: 단위 변환 ---

function genUnitConvert(level: ArithmeticLevel): GeneratedProblem {
  const units: [string, string, number][] = [
    ['m', 'cm', 100], ['km', 'm', 1000], ['L', 'mL', 1000], ['kg', 'g', 1000],
  ];
  const [from, to, factor] = units[rand(0, units.length - 1)];
  const val = rand(1, level === 'hard' ? 20 : 9);
  const answer = val * factor;
  return {
    content: `$${val}\\text{${from}} = ${BOX}\\text{${to}}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'unit_convert', level,
  };
}

// --- 초3: 시간 계산 ---

function genTimeCalc(level: ArithmeticLevel): GeneratedProblem {
  const h = rand(1, 5);
  const m = rand(1, 59);
  const total = h * 60 + m;
  return {
    content: `$${h}$시간 $${m}$분 $= ${BOX}$분`,
    answer: String(total),
    choices: generateChoices(total),
    category: 'time_calc', level,
  };
}

// --- 초4: 각도 구하기 ---

function genAngleCalc(level: ArithmeticLevel): GeneratedProblem {
  const a1 = rand(20, 80);
  const a2 = rand(20, 80);
  const answer = 180 - a1 - a2;
  if (answer <= 0) return genAngleCalc(level); // retry if invalid
  return {
    content: `삼각형의 두 각이 $${a1}°$, $${a2}°$일 때 나머지 한 각은 $${BOX}°$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'angle_calc', level,
  };
}

// --- 초4: 규칙 찾기 ---

function genSequencePattern(level: ArithmeticLevel): GeneratedProblem {
  const start = rand(1, 20);
  const diff = rand(2, level === 'hard' ? 12 : 7);
  const terms = [start, start + diff, start + 2 * diff, start + 3 * diff];
  const answer = start + 4 * diff;
  return {
    content: `$${terms.join(',\\ ')} ,\\ ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'sequence_pattern', level,
  };
}

// --- 초5: 최대공약수/최소공배수 ---

function genGcdLcm(level: ArithmeticLevel): GeneratedProblem {
  const a = rand(6, level === 'hard' ? 48 : 30);
  const b = rand(6, level === 'hard' ? 48 : 30);
  const isGcd = Math.random() < 0.5;
  const answer = isGcd ? gcd(a, b) : lcm(a, b);
  const label = isGcd ? '최대공약수' : '최소공배수';
  return {
    content: `$${a}$과 $${b}$의 ${label}은 $${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'gcd_lcm', level,
  };
}

// --- 초5: 평균 구하기 ---

function genAvgCalc(level: ArithmeticLevel): GeneratedProblem {
  const n = rand(3, 5);
  const avg = rand(10, 50);
  const nums: number[] = [];
  let sum = avg * n;
  for (let i = 0; i < n - 1; i++) {
    const v = rand(Math.max(1, avg - 20), avg + 20);
    nums.push(v);
    sum -= v;
  }
  nums.push(sum);
  return {
    content: `$${nums.join(',\\ ')}$의 평균은 $${BOX}$`,
    answer: String(avg),
    choices: generateChoices(avg),
    category: 'avg_calc', level,
  };
}

// --- 초5: 넓이 구하기 ---

function genAreaCalc(level: ArithmeticLevel): GeneratedProblem {
  const isTriangle = Math.random() < 0.5;
  const w = rand(3, level === 'hard' ? 20 : 12);
  const h = rand(3, level === 'hard' ? 20 : 12);
  if (isTriangle) {
    const base = w * 2; // ensure integer area
    const area = (base * h) / 2;
    return {
      content: `밑변 $${base}$cm, 높이 $${h}$cm인 삼각형의 넓이는 $${BOX}$cm²`,
      answer: String(area),
      choices: generateChoices(area),
      category: 'area_calc', level,
    };
  }
  const area = w * h;
  return {
    content: `가로 $${w}$cm, 세로 $${h}$cm인 직사각형의 넓이는 $${BOX}$cm²`,
    answer: String(area),
    choices: generateChoices(area),
    category: 'area_calc', level,
  };
}

// --- 초6: 원의 넓이/둘레 ---

function genCircleArea(level: ArithmeticLevel): GeneratedProblem {
  const r = rand(2, level === 'hard' ? 12 : 8);
  const isArea = Math.random() < 0.5;
  if (isArea) {
    const coeff = r * r;
    return {
      content: `반지름 $${r}$cm인 원의 넓이는 $${BOX}\\pi$ cm²`,
      answer: String(coeff),
      choices: generateChoices(coeff),
      category: 'circle_area', level,
    };
  }
  const coeff = 2 * r;
  return {
    content: `반지름 $${r}$cm인 원의 둘레는 $${BOX}\\pi$ cm`,
    answer: String(coeff),
    choices: generateChoices(coeff),
    category: 'circle_area', level,
  };
}

// --- 중1: 소인수분해 ---

function genPrimeFactor(level: ArithmeticLevel): GeneratedProblem {
  const primes = [2, 3, 5, 7, 11, 13];
  const p = primes[rand(0, level === 'hard' ? 5 : 3)];
  const exp = rand(2, level === 'hard' ? 4 : 3);
  const other = primes.filter(x => x !== p)[rand(0, 2)];
  const n = Math.pow(p, exp) * other;
  return {
    content: `$${n}$을 소인수분해할 때, $${p}$의 지수는 $${BOX}$`,
    answer: String(exp),
    choices: generateChoices(exp, 1),
    category: 'prime_factor', level,
  };
}

// --- 중1: 정비례/반비례 ---

function genProportion(level: ArithmeticLevel): GeneratedProblem {
  const isDirect = Math.random() < 0.5;
  const k = rand(2, level === 'hard' ? 10 : 6);
  const x = rand(2, level === 'hard' ? 8 : 5);
  if (isDirect) {
    const y = k * x;
    return {
      content: `$y = ${k}x$일 때, $x = ${x}$이면 $y = ${BOX}$`,
      answer: String(y),
      choices: generateChoices(y),
      category: 'proportion', level,
    };
  }
  const kVal = k * x; // y = kVal/x
  return {
    content: `$y = \\dfrac{${kVal}}{x}$일 때, $x = ${x}$이면 $y = ${BOX}$`,
    answer: String(k),
    choices: generateChoices(k),
    category: 'proportion', level,
  };
}

// --- 중1: 사분면 판별 ---

function genQuadrant(level: ArithmeticLevel): GeneratedProblem {
  const quadrant = rand(1, 4);
  let x: number, y: number;
  switch (quadrant) {
    case 1: x = rand(1, 10); y = rand(1, 10); break;
    case 2: x = -rand(1, 10); y = rand(1, 10); break;
    case 3: x = -rand(1, 10); y = -rand(1, 10); break;
    default: x = rand(1, 10); y = -rand(1, 10); break;
  }
  return {
    content: `점 $(${x},\\ ${y})$는 제 $${BOX}$ 사분면`,
    answer: String(quadrant),
    choices: shuffle(['1', '2', '3', '4']),
    category: 'quadrant', level,
  };
}

// --- 중2: 피타고라스 정리 ---

function genPythagoras(level: ArithmeticLevel): GeneratedProblem {
  const triples: [number, number, number][] = [
    [3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25],
  ];
  const triple = triples[rand(0, level === 'hard' ? 4 : 2)];
  const missing = rand(0, 2); // which side to hide
  const values = [...triple];
  const answer = values[missing];
  values[missing] = -1; // placeholder
  const known = values.filter(v => v !== -1);
  if (missing === 2) {
    return {
      content: `직각삼각형에서 $a = ${known[0]}$, $b = ${known[1]}$일 때 빗변 $c = ${BOX}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'pythagoras', level,
    };
  }
  const otherLabel = missing === 0 ? 'a' : 'b';
  const knownLabel = missing === 0 ? 'b' : 'a';
  return {
    content: `직각삼각형에서 $${knownLabel} = ${known[0]}$, $c = ${triple[2]}$일 때 $${otherLabel} = ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'pythagoras', level,
  };
}

// --- 중2: 닮음비 활용 ---

function genSimilarity(level: ArithmeticLevel): GeneratedProblem {
  const ratio1 = rand(2, level === 'hard' ? 5 : 3);
  const ratio2 = rand(ratio1 + 1, level === 'hard' ? 8 : 6);
  const side = rand(2, 10) * ratio1; // ensure integer answer
  const answer = (side / ratio1) * ratio2;
  return {
    content: `닮음비 $${ratio1}:${ratio2}$인 두 도형에서 작은 도형의 한 변이 $${side}$cm일 때, 대응변은 $${BOX}$cm`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'similarity', level,
  };
}

// --- 중3: 삼각비 값 ---

function genTrigValue(level: ArithmeticLevel): GeneratedProblem {
  const angles = [30, 45, 60];
  const funcs = ['\\sin', '\\cos', '\\tan'];
  const angle = angles[rand(0, 2)];
  const func = funcs[rand(0, 2)];

  const trigTable: Record<string, Record<number, string>> = {
    '\\sin': { 30: '\\dfrac{1}{2}', 45: '\\dfrac{\\sqrt{2}}{2}', 60: '\\dfrac{\\sqrt{3}}{2}' },
    '\\cos': { 30: '\\dfrac{\\sqrt{3}}{2}', 45: '\\dfrac{\\sqrt{2}}{2}', 60: '\\dfrac{1}{2}' },
    '\\tan': { 30: '\\dfrac{1}{\\sqrt{3}}', 45: '1', 60: '\\sqrt{3}' },
  };

  const answer = trigTable[func][angle];
  // Generate wrong choices from other values in the table
  const allValues = new Set<string>();
  for (const f of funcs) {
    for (const a of angles) {
      allValues.add(trigTable[f][a]);
    }
  }
  const wrongChoices = [...allValues].filter(v => v !== answer);
  const choices = shuffle([`$${answer}$`, ...wrongChoices.slice(0, 3).map(v => `$${v}$`)]);

  return {
    content: `$${func} ${angle}° = ${BOX}$`,
    answer: `$${answer}$`,
    choices,
    category: 'trig_value', level,
  };
}

// --- 중3: 원주각 ---

function genInscribedAngle(level: ArithmeticLevel): GeneratedProblem {
  const type = rand(0, 2);
  if (type === 0) {
    // 중심각 → 원주각
    const central = rand(2, 89) * 2; // 짝수로 생성 → 정수 원주각
    const answer = central / 2;
    return {
      content: `중심각이 $${central}°$일 때, 같은 호에 대한 원주각은 $${BOX}°$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'inscribed_angle', level,
    };
  }
  if (type === 1) {
    // 원주각 → 중심각
    const inscribed = rand(10, 85);
    const answer = inscribed * 2;
    return {
      content: `원주각이 $${inscribed}°$일 때, 같은 호에 대한 중심각은 $${BOX}°$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'inscribed_angle', level,
    };
  }
  // 내접 사각형 대각
  const angle = rand(30, 150);
  const answer = 180 - angle;
  return {
    content: `원에 내접하는 사각형에서 한 각이 $${angle}°$일 때, 대각은 $${BOX}°$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'inscribed_angle', level,
  };
}

// --- 중3: 중앙값 ---

function genMedianCalc(level: ArithmeticLevel): GeneratedProblem {
  const n = level === 'hard' ? 7 : 5;
  const nums: number[] = [];
  for (let i = 0; i < n; i++) nums.push(rand(1, 30));
  const sorted = [...nums].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  return {
    content: `$${nums.join(',\\ ')}$의 중앙값은 $${BOX}$`,
    answer: String(median),
    choices: generateChoices(median),
    category: 'median_calc', level,
  };
}

// --- 중3: 분산 ---

function genVarianceCalc(level: ArithmeticLevel): GeneratedProblem {
  // 분산이 정수가 되도록 대칭 편차 생성
  const deviationSets = [
    [-2, -1, 1, 2],       // variance = (4+1+1+4)/4 = 2.5 → use 5 with 0
    [-3, -1, 1, 3],       // variance = (9+1+1+9)/4 = 5
    [-2, 0, 0, 2],        // variance = (4+0+0+4)/4 = 2
    [-4, -1, 1, 4],       // variance = (16+1+1+16)/4 = 8.5 → skip
    [-1, -1, 1, 1],       // variance = (1+1+1+1)/4 = 1
    [-3, -3, 3, 3],       // variance = (9+9+9+9)/4 = 9
    [-2, -2, 2, 2],       // variance = 4
  ];
  const intSets = deviationSets.filter(d => {
    const sumSq = d.reduce((s, v) => s + v * v, 0);
    return sumSq % d.length === 0;
  });
  const devs = intSets[rand(0, intSets.length - 1)];
  const mean = rand(5, 20);
  const data = shuffle(devs.map(d => mean + d));
  const variance = devs.reduce((s, v) => s + v * v, 0) / devs.length;
  return {
    content: `$${data.join(',\\ ')}$의 분산은 $${BOX}$`,
    answer: String(variance),
    choices: generateChoices(variance),
    category: 'variance_calc', level,
  };
}

// --- GENERATORS ---

const GENERATORS: Record<ArithmeticCategory, Gen> = {
  // 초1
  add_1digit: makeAdd(1, 9, 'add_1digit'),
  sub_1digit: makeSub(1, 9, 'sub_1digit'),
  // 초2
  add_2digit: makeAdd(10, 99, 'add_2digit'),
  sub_2digit: makeSub(10, 99, 'sub_2digit'),
  mul_table: makeMul(2, 9, 2, 9, 'mul_table'),
  unit_convert: genUnitConvert,
  // 초3
  add_3digit: makeAdd(100, 999, 'add_3digit'),
  sub_3digit: makeSub(100, 999, 'sub_3digit'),
  mul_2x1: makeMul(10, 99, 2, 9, 'mul_2x1'),
  div_basic: makeDiv(2, 9, 2, 9, 'div_basic'),
  div_remainder: genDivRemainder,
  time_calc: genTimeCalc,
  // 초4
  mul_large: makeMul(100, 999, 10, 99, 'mul_large'),
  div_large: makeDiv(10, 50, 10, 50, 'div_large'),
  frac_add_same: makeFracAdd(true, 'frac_add_same'),
  frac_sub_same: makeFracSub(true, 'frac_sub_same'),
  dec_add: makeDecOp('+', (a, b) => a + b, 'dec_add'),
  dec_sub: makeDecOp('-', (a, b) => a - b, 'dec_sub'),
  angle_calc: genAngleCalc,
  sequence_pattern: genSequencePattern,
  // 초5
  mixed_calc: genMixedCalc,
  frac_add_diff: makeFracAdd(false, 'frac_add_diff'),
  frac_sub_diff: makeFracSub(false, 'frac_sub_diff'),
  frac_mul: genFracMul,
  dec_mul: makeDecOp('\\times', (a, b) => a * b, 'dec_mul'),
  gcd_lcm: genGcdLcm,
  avg_calc: genAvgCalc,
  area_calc: genAreaCalc,
  // 초6
  frac_div: genFracDiv,
  dec_div: genDecDiv,
  ratio_calc: genRatioCalc,
  percent_calc: genPercentCalc,
  circle_area: genCircleArea,
  // 중1
  int_add: makeIntOp('+', (a, b) => a + b, 1, 20, 'int_add'),
  int_sub: makeIntOp('-', (a, b) => a - b, 1, 20, 'int_sub'),
  int_mul: makeIntOp('\\times', (a, b) => a * b, 1, 12, 'int_mul'),
  int_div: makeIntDiv(1, 12, 'int_div'),
  abs_calc: genAbsCalc,
  prime_factor: genPrimeFactor,
  proportion: genProportion,
  quadrant: genQuadrant,
  // 중2
  exp_calc: genExpCalc,
  exp_law: genExpLaw,
  mono_mul: genMonoMul,
  mono_div: genMonoDiv,
  poly_add: genPolyAdd,
  poly_sub: genPolySub,
  linear_eq: genLinearEq,
  pythagoras: genPythagoras,
  similarity: genSimilarity,
  // 중3
  poly_mul: genPolyMul,
  mul_formula: genMulFormula,
  factoring: genFactoring,
  sqrt_simplify: genSqrtSimplify,
  sqrt_add: genSqrtAdd,
  sqrt_mul: genSqrtMul,
  sqrt_rationalize: genSqrtRationalize,
  discriminant: genDiscriminant,
  trig_value: genTrigValue,
  inscribed_angle: genInscribedAngle,
  median_calc: genMedianCalc,
  variance_calc: genVarianceCalc,
};

// --- Labels ---

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
  int_add: '정수 덧셈',
  int_sub: '정수 뺄셈',
  int_mul: '정수 곱셈',
  int_div: '정수 나눗셈',
  abs_calc: '절댓값 계산',
  prime_factor: '소인수분해',
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
  poly_mul: '다항식 곱셈',
  mul_formula: '곱셈공식',
  factoring: '인수분해',
  sqrt_simplify: '제곱근 간소화',
  sqrt_add: '제곱근 덧뺄셈',
  sqrt_mul: '제곱근 곱셈',
  sqrt_rationalize: '분모의 유리화',
  discriminant: '판별식 계산',
  trig_value: '삼각비 값',
  inscribed_angle: '원주각',
  median_calc: '중앙값 구하기',
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
  // 중1
  'int_add', 'int_sub', 'int_mul', 'int_div', 'abs_calc',
  'prime_factor', 'proportion', 'quadrant',
  // 중2
  'exp_calc', 'exp_law', 'mono_mul', 'mono_div', 'poly_add', 'poly_sub', 'linear_eq',
  'pythagoras', 'similarity',
  // 중3
  'poly_mul', 'mul_formula', 'factoring',
  'sqrt_simplify', 'sqrt_add', 'sqrt_mul', 'sqrt_rationalize', 'discriminant',
  'trig_value', 'inscribed_angle', 'median_calc', 'variance_calc',
]);

export const LEVEL_LABELS: Record<ArithmeticLevel, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export function generateProblems(
  category: ArithmeticCategory,
  level: ArithmeticLevel,
  count: number,
): GeneratedProblem[] {
  const gen = GENERATORS[category];
  return Array.from({ length: count }, () => gen(level));
}
