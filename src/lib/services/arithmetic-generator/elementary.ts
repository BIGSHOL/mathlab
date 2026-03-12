import { ArithmeticCategory, ArithmeticLevel, GeneratedProblem, Gen } from './types';
import { rand, gcd, lcm, generateChoices, generateFractionChoices, generateDecimalChoices, BOX } from './utils';

// --- Factory helpers (초등) ---

export function makeAdd(min: number, max: number, cat: ArithmeticCategory): Gen {
  return (level) => {
    const a = rand(min, max), b = rand(min, max);
    return { content: `$${a} + ${b} = ${BOX}$`, answer: String(a + b), choices: generateChoices(a + b), category: cat, level };
  };
}

export function makeSub(min: number, max: number, cat: ArithmeticCategory): Gen {
  return (level) => {
    let a = rand(min, max), b = rand(min, max);
    if (a < b) [a, b] = [b, a];
    return { content: `$${a} - ${b} = ${BOX}$`, answer: String(a - b), choices: generateChoices(a - b), category: cat, level };
  };
}

export function makeMul(minA: number, maxA: number, minB: number, maxB: number, cat: ArithmeticCategory): Gen {
  return (level) => {
    const a = rand(minA, maxA), b = rand(minB, maxB);
    return { content: `$${a} \\times ${b} = ${BOX}$`, answer: String(a * b), choices: generateChoices(a * b), category: cat, level };
  };
}

export function makeDiv(minDiv: number, maxDiv: number, minAns: number, maxAns: number, cat: ArithmeticCategory): Gen {
  return (level) => {
    const b = rand(minDiv, maxDiv), answer = rand(minAns, maxAns), a = b * answer;
    return { content: `$${a} \\div ${b} = ${BOX}$`, answer: String(answer), choices: generateChoices(answer), category: cat, level };
  };
}

export function makeFracAdd(sameDen: boolean, cat: ArithmeticCategory): Gen {
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

export function makeFracSub(sameDen: boolean, cat: ArithmeticCategory): Gen {
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

export function makeDecOp(opSymbol: string, opFn: (a: number, b: number) => number, cat: ArithmeticCategory, decimals = 1): Gen {
  return (level) => {
    const factor = Math.pow(10, decimals);
    let a = rand(1, 50 * factor) / factor;
    let b = rand(1, 50 * factor) / factor;
    if (opSymbol === '-' && a < b) [a, b] = [b, a];
    const answer = parseFloat(opFn(a, b).toFixed(decimals));
    return {
      content: `$${a} ${opSymbol} ${b} = ${BOX}$`,
      answer: String(answer),
      choices: generateDecimalChoices(answer),
      category: cat, level,
    };
  };
}

// --- 초2: 단위 변환 ---

export function genUnitConvert(level: ArithmeticLevel): GeneratedProblem {
  const units: [string, string, number][] = [
    ['m', 'cm', 100], ['km', 'm', 1000], ['L', 'mL', 1000], ['kg', 'g', 1000],
  ];
  const type = rand(0, level === 'hard' ? 3 : 2);

  if (type === 0) {
    // 큰 단위 → 작은 단위
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
  if (type === 1) {
    // 작은 단위 → 큰 단위 (정수 답만)
    const [from, to, factor] = units[rand(0, units.length - 1)];
    const val = rand(1, level === 'hard' ? 20 : 9);
    const small = val * factor;
    return {
      content: `$${small}\\text{${to}} = ${BOX}\\text{${from}}$`,
      answer: String(val),
      choices: generateChoices(val),
      category: 'unit_convert', level,
    };
  }
  if (type === 2) {
    // 혼합 단위: 2m 30cm = □cm
    const [from, to, factor] = units[rand(0, units.length - 1)];
    const big = rand(1, level === 'hard' ? 10 : 5);
    const small = rand(1, factor - 1);
    const answer = big * factor + small;
    return {
      content: `$${big}\\text{${from}}$ $${small}\\text{${to}} = ${BOX}\\text{${to}}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'unit_convert', level,
    };
  }
  // 큰 단위 → 작은 단위 (다른 단위쌍)
  const extraUnits: [string, string, number][] = [
    ['cm', 'mm', 10], ['m', 'mm', 1000],
  ];
  const [from2, to2, factor2] = extraUnits[rand(0, extraUnits.length - 1)];
  const val2 = rand(1, level === 'hard' ? 15 : 8);
  const answer2 = val2 * factor2;
  return {
    content: `$${val2}\\text{${from2}} = ${BOX}\\text{${to2}}$`,
    answer: String(answer2),
    choices: generateChoices(answer2),
    category: 'unit_convert', level,
  };
}

// --- 초3: 나머지 있는 나눗셈 ---

export function genDivRemainder(level: ArithmeticLevel): GeneratedProblem {
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

// --- 초3: 시간 계산 ---

export function genTimeCalc(level: ArithmeticLevel): GeneratedProblem {
  const type = rand(0, level === 'hard' ? 4 : 3);

  if (type === 0) {
    // 시간+분 → 분 변환
    const h = rand(1, 5);
    const m = rand(1, 59);
    const total = h * 60 + m;
    return {
      content: `$${h}\\text{시간 }${m}\\text{분}$ $= ${BOX}\\text{분}$`,
      answer: String(total),
      choices: generateChoices(total),
      category: 'time_calc', level,
    };
  }
  if (type === 1) {
    // 분 → 시간, 분 변환 (시간 구하기)
    const h = rand(1, 5);
    const m = rand(1, 59);
    const total = h * 60 + m;
    return {
      content: `$${total}\\text{분}$ $= ${BOX}\\text{시간 }${m}\\text{분}$`,
      answer: String(h),
      choices: generateChoices(h),
      category: 'time_calc', level,
    };
  }
  if (type === 2) {
    // 시간 덧셈
    const h1 = rand(1, 4); const m1 = rand(10, 50);
    const h2 = rand(1, 3); const m2 = rand(10, 50);
    const totalMin = (h1 * 60 + m1) + (h2 * 60 + m2);
    const ansH = Math.floor(totalMin / 60);
    const ansM = totalMin % 60;
    return {
      content: `$${h1}\\text{시간 }${m1}\\text{분} + ${h2}\\text{시간 }${m2}\\text{분}$ $= ${BOX}\\text{시간 }${ansM}\\text{분}$`,
      answer: String(ansH),
      choices: generateChoices(ansH),
      category: 'time_calc', level,
    };
  }
  if (type === 3) {
    // 시간 뺄셈
    const h1 = rand(3, 8); const m1 = rand(20, 59);
    const h2 = rand(1, h1 - 1); const m2 = rand(0, m1 - 1);
    const diff = (h1 * 60 + m1) - (h2 * 60 + m2);
    const ansH = Math.floor(diff / 60);
    const ansM = diff % 60;
    return {
      content: `$${h1}\\text{시간 }${m1}\\text{분} - ${h2}\\text{시간 }${m2}\\text{분}$ $= ${BOX}\\text{시간 }${ansM}\\text{분}$`,
      answer: String(ansH),
      choices: generateChoices(ansH),
      category: 'time_calc', level,
    };
  }
  // 초→분 변환
  const m = rand(1, 9);
  const s = rand(1, 59);
  const total = m * 60 + s;
  return {
    content: `$${m}\\text{분 }${s}\\text{초}$ $= ${BOX}\\text{초}$`,
    answer: String(total),
    choices: generateChoices(total),
    category: 'time_calc', level,
  };
}

// --- 초4: 각도 구하기 ---

export function genAngleCalc(level: ArithmeticLevel): GeneratedProblem {
  const a1 = rand(20, 80);
  const a2 = rand(20, 80);
  const answer = 180 - a1 - a2;
  if (answer <= 0) return genAngleCalc(level); // retry if invalid
  return {
    content: `삼각형 두 각 $${a1}°$, $${a2}°$일 때 나머지 각 $= ${BOX}°$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'angle_calc', level,
  };
}

// --- 초4: 규칙 찾기 ---

export function genSequencePattern(level: ArithmeticLevel): GeneratedProblem {
  const type = rand(0, level === 'hard' ? 4 : 2);

  if (type === 0) {
    // 등차수열 (증가)
    const start = rand(1, 20);
    const diff = rand(2, level === 'hard' ? 12 : 7);
    const terms = [start, start + diff, start + 2 * diff, start + 3 * diff];
    const answer = start + 4 * diff;
    return {
      content: `$${terms.join(',\\ ')},\\ ${BOX}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'sequence_pattern', level,
    };
  }
  if (type === 1) {
    // 등차수열 (감소)
    const diff = rand(2, level === 'hard' ? 8 : 5);
    const start = diff * 6 + rand(0, 10); // 충분히 큰 수에서 시작
    const terms = [start, start - diff, start - 2 * diff, start - 3 * diff];
    const answer = start - 4 * diff;
    return {
      content: `$${terms.join(',\\ ')},\\ ${BOX}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'sequence_pattern', level,
    };
  }
  if (type === 2) {
    // 곱셈 규칙 (×2, ×3 등)
    const ratio = rand(2, 3);
    const start = rand(1, level === 'hard' ? 5 : 3);
    const terms = [start, start * ratio, start * ratio * ratio, start * ratio * ratio * ratio];
    const answer = terms[3] * ratio;
    return {
      content: `$${terms.join(',\\ ')},\\ ${BOX}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'sequence_pattern', level,
    };
  }
  if (type === 3) {
    // 제곱수열: 1, 4, 9, 16, □
    const offset = rand(0, 5);
    const terms = [1 + offset, 4 + offset, 9 + offset, 16 + offset];
    const answer = 25 + offset;
    return {
      content: `$${terms.join(',\\ ')},\\ ${BOX}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'sequence_pattern', level,
    };
  }
  // 피보나치형: t[n] = t[n-1] + t[n-2]
  const a = rand(1, 5);
  const b = rand(1, 5);
  const t = [a, b, a + b, a + 2 * b, 2 * a + 3 * b];
  return {
    content: `$${t.slice(0, 4).join(',\\ ')},\\ ${BOX}$`,
    answer: String(t[4]),
    choices: generateChoices(t[4]),
    category: 'sequence_pattern', level,
  };
}

// --- 초5: 혼합 계산 ---

export function genMixedCalc(level: ArithmeticLevel): GeneratedProblem {
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

// --- 초5: 최대공약수/최소공배수 ---

export function genGcdLcm(level: ArithmeticLevel): GeneratedProblem {
  const type = rand(0, level === 'hard' ? 3 : 2);

  if (type === 0) {
    // 기본: GCD 구하기
    const a = rand(6, level === 'hard' ? 48 : 30);
    const b = rand(6, level === 'hard' ? 48 : 30);
    const answer = gcd(a, b);
    return {
      content: `$${a}$과(와) $${b}$의 최대공약수는 $${BOX}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'gcd_lcm', level,
    };
  }
  if (type === 1) {
    // 기본: LCM 구하기
    const a = rand(4, level === 'hard' ? 24 : 15);
    const b = rand(4, level === 'hard' ? 24 : 15);
    const answer = lcm(a, b);
    return {
      content: `$${a}$과(와) $${b}$의 최소공배수는 $${BOX}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'gcd_lcm', level,
    };
  }
  if (type === 2) {
    // GCD×LCM = a×b 관계 활용
    const a = rand(4, level === 'hard' ? 20 : 12);
    const b = rand(4, level === 'hard' ? 20 : 12);
    const g = gcd(a, b);
    const l = lcm(a, b);
    return {
      content: `$${a}$, $${b}$의 최대공약수 $${g}$일 때 최소공배수 $= ${BOX}$`,
      answer: String(l),
      choices: generateChoices(l),
      category: 'gcd_lcm', level,
    };
  }
  // 서술형: 공배수 중 특정 번째
  const a = rand(3, 8);
  const b = rand(3, 8);
  const l = lcm(a, b);
  const n = rand(2, 4);
  const answer = l * n;
  return {
    content: `$${a}$, $${b}$의 공배수 중 ${n}번째 $= ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'gcd_lcm', level,
  };
}

// --- 초5: 평균 구하기 ---

export function genAvgCalc(level: ArithmeticLevel): GeneratedProblem {
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

export function genAreaCalc(level: ArithmeticLevel): GeneratedProblem {
  const isTriangle = Math.random() < 0.5;
  const w = rand(3, level === 'hard' ? 20 : 12);
  const h = rand(3, level === 'hard' ? 20 : 12);
  if (isTriangle) {
    const base = w * 2; // ensure integer area
    const area = (base * h) / 2;
    return {
      content: `밑변 $${base}$, 높이 $${h}$인 삼각형 넓이 $= ${BOX}\\text{cm}^2$`,
      answer: String(area),
      choices: generateChoices(area),
      category: 'area_calc', level,
    };
  }
  const area = w * h;
  return {
    content: `가로 $${w}$, 세로 $${h}$인 직사각형 넓이 $= ${BOX}\\text{cm}^2$`,
    answer: String(area),
    choices: generateChoices(area),
    category: 'area_calc', level,
  };
}

// --- 초5/초6: 분수/소수 곱셈/나눗셈 ---

export function genFracMul(level: ArithmeticLevel): GeneratedProblem {
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

export function genFracDiv(level: ArithmeticLevel): GeneratedProblem {
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

export function genDecDiv(level: ArithmeticLevel): GeneratedProblem {
  const b = rand(2, 20);
  const answer = rand(1, 50);
  const a = parseFloat((b * answer * 0.1).toFixed(1));
  const divisor = parseFloat((b * 0.1).toFixed(1));
  return {
    content: `$${a} \\div ${divisor} = ${BOX}$`,
    answer: String(answer),
    choices: generateDecimalChoices(answer),
    category: 'dec_div', level,
  };
}

// --- 초6: 비와 비율 ---

export function genRatioCalc(level: ArithmeticLevel): GeneratedProblem {
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

export function genPercentCalc(level: ArithmeticLevel): GeneratedProblem {
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

// --- 초6: 원의 넓이/둘레 ---

export function genCircleArea(level: ArithmeticLevel): GeneratedProblem {
  const r = rand(2, level === 'hard' ? 12 : 8);
  const isArea = Math.random() < 0.5;
  if (isArea) {
    const coeff = r * r;
    return {
      content: `반지름 $${r}$인 원의 넓이 $= ${BOX}\\pi~\\text{cm}^2$`,
      answer: String(coeff),
      choices: generateChoices(coeff),
      category: 'circle_area', level,
    };
  }
  const coeff = 2 * r;
  return {
    content: `반지름 $${r}$인 원의 둘레 $= ${BOX}\\pi~\\text{cm}$`,
    answer: String(coeff),
    choices: generateChoices(coeff),
    category: 'circle_area', level,
  };
}
