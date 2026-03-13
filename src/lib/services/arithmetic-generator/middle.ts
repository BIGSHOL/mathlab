import { ArithmeticCategory, ArithmeticLevel, GeneratedProblem, Gen } from './types';
import {
  rand, shuffle, generateChoices, BOX, BOX_SM, pickVar,
  fmtMono, fmtLinear, fmtQuadratic, fmtSqrt, fmtFactor,
  monoChoices, linearChoices, quadChoices, sqrtChoices, factoringChoices,
  absParen, absSigned, absRn
} from './utils';

// --- Integer helpers (중1) ---

export function makeIntOp(opSymbol: string, opFn: (a: number, b: number) => number, min: number, max: number, cat: ArithmeticCategory): Gen {
  const fmt = (n: number) => n < 0 ? `(${n})` : `(+${n})`;
  return (level) => {
    const a = (rand(0, 1) ? 1 : -1) * rand(min, max);
    const b = (rand(0, 1) ? 1 : -1) * rand(min, max);
    const answer = opFn(a, b);
    return { content: `$${fmt(a)} ${opSymbol} ${fmt(b)} = ${BOX}$`, answer: String(answer), choices: generateChoices(answer), category: cat, level };
  };
}

export function makeIntDiv(min: number, max: number, cat: ArithmeticCategory): Gen {
  const fmt = (n: number) => n < 0 ? `(${n})` : `(+${n})`;
  return (level) => {
    const b = (rand(0, 1) ? 1 : -1) * rand(2, Math.min(max, 12));
    const answer = (rand(0, 1) ? 1 : -1) * rand(min, max);
    const a = b * answer;
    return { content: `$${fmt(a)} \\div ${fmt(b)} = ${BOX}$`, answer: String(answer), choices: generateChoices(answer), category: cat, level };
  };
}

// --- 중1: 절댓값 (5개 세분화) ---

const absMax = (lv: ArithmeticLevel) => lv === 'easy' ? 10 : lv === 'medium' ? 15 : 20;

export function genAbsBasic(level: ArithmeticLevel): GeneratedProblem {
  const a = absRn(absMax(level));
  const answer = Math.abs(a);
  const type = rand(0, level === 'easy' ? 1 : 2);
  let content: string;
  if (type === 0) {
    content = `$|${absSigned(a)}| = ${BOX}$`;
  } else if (type === 1) {
    const c = rand(1, 5);
    const ans = Math.abs(a) + c;
    return {
      content: `$|${absSigned(a)}| + ${c} = ${BOX}$`,
      answer: String(ans),
      choices: generateChoices(ans),
      category: 'abs_basic', level,
    };
  } else {
    const c = Math.abs(a) + rand(1, 5);
    const ans = c - Math.abs(a);
    return {
      content: `$${c} - |${absSigned(a)}| = ${BOX}$`,
      answer: String(ans),
      choices: generateChoices(ans),
      category: 'abs_basic', level,
    };
  }
  return {
    content,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'abs_basic', level,
  };
}

export function genAbsAdd(level: ArithmeticLevel): GeneratedProblem {
  const max = absMax(level);
  const a = absRn(max), b = absRn(max);
  const type = rand(0, 1);
  let content: string;
  let answer: number;
  if (type === 0) {
    answer = Math.abs(a + b);
    content = `$|${absSigned(a)} + ${absParen(b)}| = ${BOX}$`;
  } else {
    answer = Math.abs(a) + Math.abs(b);
    content = `$|${absSigned(a)}| + |${absSigned(b)}| = ${BOX}$`;
  }
  return {
    content, answer: String(answer),
    choices: generateChoices(answer),
    category: 'abs_add', level,
  };
}

export function genAbsSub(level: ArithmeticLevel): GeneratedProblem {
  const max = absMax(level);
  const a = absRn(max), b = absRn(max);
  const type = rand(0, level === 'easy' ? 1 : 2);
  let content: string;
  let answer: number;
  if (type === 0) {
    answer = Math.abs(a - b);
    content = `$|${absSigned(a)} - ${absParen(b)}| = ${BOX}$`;
  } else if (type === 1) {
    const big = Math.max(Math.abs(a), Math.abs(b));
    const small = Math.min(Math.abs(a), Math.abs(b));
    answer = big - small;
    const sa = (rand(0, 1) ? 1 : -1) * big;
    const sb = (rand(0, 1) ? 1 : -1) * small;
    content = `$|${absSigned(sa)}| - |${absSigned(sb)}| = ${BOX}$`;
  } else {
    answer = Math.abs(Math.abs(a) - Math.abs(b));
    content = `$|\\,|${absSigned(a)}| - |${absSigned(b)}|\\,| = ${BOX}$`;
  }
  return {
    content, answer: String(answer),
    choices: generateChoices(answer),
    category: 'abs_sub', level,
  };
}

export function genAbsMul(level: ArithmeticLevel): GeneratedProblem {
  const a = (rand(0, 1) ? 1 : -1) * rand(2, level === 'hard' ? 12 : 9);
  const b = (rand(0, 1) ? 1 : -1) * rand(2, level === 'hard' ? 12 : 9);
  const type = rand(0, 1);
  let content: string;
  let answer: number;
  if (type === 0) {
    answer = Math.abs(a) * Math.abs(b);
    content = `$|${absSigned(a)}| \\times |${absSigned(b)}| = ${BOX}$`;
  } else {
    answer = Math.abs(a * b);
    content = `$|${absSigned(a)} \\times ${absParen(b)}| = ${BOX}$`;
  }
  return {
    content, answer: String(answer),
    choices: generateChoices(answer),
    category: 'abs_mul', level,
  };
}

export function genAbsMixed(level: ArithmeticLevel): GeneratedProblem {
  const max = absMax(level);
  const type = rand(0, level === 'easy' ? 1 : 3);
  let content: string;
  let answer: number;
  if (type === 0) {
    const a = absRn(max), b = absRn(max), c = absRn(8);
    answer = Math.abs(a) + Math.abs(b) - Math.abs(c);
    content = `$|${absSigned(a)}| + |${absSigned(b)}| - |${absSigned(c)}| = ${BOX}$`;
  } else if (type === 1) {
    const a = rand(1, max), b = rand(1, max);
    const sa = (rand(0, 1) ? -a : a), sb = (rand(0, 1) ? -b : b);
    answer = -a + b;
    content = `$-|${absSigned(sa)}| + |${absSigned(sb)}| = ${BOX}$`;
  } else if (type === 2) {
    const a = (rand(0, 1) ? 1 : -1) * rand(2, 6);
    const b = (rand(0, 1) ? 1 : -1) * rand(2, 6);
    const c = absRn(max);
    answer = Math.abs(a) * Math.abs(b) + Math.abs(c);
    content = `$|${absSigned(a)}| \\times |${absSigned(b)}| + |${absSigned(c)}| = ${BOX}$`;
  } else {
    const a = absRn(max), b = absRn(max), c = absRn(8);
    answer = Math.abs(a + b) - Math.abs(c);
    content = `$|${absSigned(a)} + ${absParen(b)}| - |${absSigned(c)}| = ${BOX}$`;
  }
  return {
    content, answer: String(answer),
    choices: generateChoices(answer),
    category: 'abs_mixed', level,
  };
}

// --- 중1: 소인수분해 (3개 세분화) ---

const PF_PRIMES = [2, 3, 5, 7, 11, 13];

function pfChoices(answer: number, min = 1, max = 6): string[] {
  const s = new Set<number>();
  s.add(answer);
  while (s.size < 4) { const v = rand(min, max); if (v !== answer) s.add(v); }
  return shuffle([...s]).map(String);
}

export function genPfExponent(level: ArithmeticLevel): GeneratedProblem {
  const p = PF_PRIMES[rand(0, level === 'hard' ? 5 : 3)];
  const exp = rand(2, level === 'hard' ? 4 : 3);
  const other = PF_PRIMES.filter(x => x !== p)[rand(0, 2)];
  const n = Math.pow(p, exp) * other;
  return {
    content: `$${n}$ 을 소인수분해할 때, $${p}$ 의 지수는 $${BOX}$`,
    answer: String(exp),
    choices: pfChoices(exp),
    category: 'pf_exponent', level,
  };
}

export function genPfFind(level: ArithmeticLevel): GeneratedProblem {
  const count = level === 'hard' ? 3 : 2;
  const used = new Set<number>();
  const factors: { p: number; e: number }[] = [];
  for (let i = 0; i < count; i++) {
    let p: number;
    do { p = PF_PRIMES[rand(0, level === 'hard' ? 4 : 3)]; } while (used.has(p));
    used.add(p);
    factors.push({ p, e: rand(1, level === 'hard' ? 3 : 2) });
  }
  factors.sort((a, b) => a.p - b.p);

  const type = rand(0, 1);
  if (type === 0) {
    // 소인수 찾기: 21 = □ × 7 → □ = ?
    const hideIdx = rand(0, factors.length - 1);
    const answer = factors[hideIdx].p;
    const n = factors.reduce((acc, f) => acc * Math.pow(f.p, f.e), 1);
    const parts = factors.map((f, i) =>
      i === hideIdx ? `${BOX}${f.e > 1 ? `^{${f.e}}` : ''}` :
      `${f.p}${f.e > 1 ? `^{${f.e}}` : ''}`
    );
    return {
      content: `$${n} = ${parts.join(' \\times ')}$`,
      answer: String(answer),
      choices: pfChoices(answer, 2, 13),
      category: 'pf_find', level,
    };
  } else {
    // 지수 찾기: 72 = 2^□ × 3² → □ = ?
    const hideIdx = rand(0, factors.length - 1);
    const answer = factors[hideIdx].e;
    const n = factors.reduce((acc, f) => acc * Math.pow(f.p, f.e), 1);
    const parts = factors.map((f, i) =>
      i === hideIdx ? `${f.p}^{${BOX_SM}}` :
      `${f.p}${f.e > 1 ? `^{${f.e}}` : ''}`
    );
    return {
      content: `$${n} = ${parts.join(' \\times ')}$`,
      answer: String(answer),
      choices: pfChoices(answer),
      category: 'pf_find', level,
    };
  }
}

export function genPfValue(level: ArithmeticLevel): GeneratedProblem {
  const count = level === 'hard' ? 3 : 2;
  const used = new Set<number>();
  const factors: { p: number; e: number }[] = [];
  for (let i = 0; i < count; i++) {
    let p: number;
    do { p = PF_PRIMES[rand(0, level === 'hard' ? 4 : 3)]; } while (used.has(p));
    used.add(p);
    factors.push({ p, e: rand(1, level === 'hard' ? 3 : 2) });
  }
  factors.sort((a, b) => a.p - b.p);
  const answer = factors.reduce((acc, f) => acc * Math.pow(f.p, f.e), 1);
  const expr = factors.map(f => `${f.p}${f.e > 1 ? `^{${f.e}}` : ''}`).join(' \\times ');
  return {
    content: `$${expr} = ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'pf_value', level,
  };
}

export function genPfAll(level: ArithmeticLevel): GeneratedProblem {
  const gen = [genPfExponent, genPfFind, genPfValue][rand(0, 2)];
  const p = gen(level);
  return { ...p, category: 'pf_all' };
}

// --- 중1: 정비례/반비례 ---

export function genProportion(level: ArithmeticLevel): GeneratedProblem {
  const type = rand(0, level === 'hard' ? 4 : 3);

  if (type === 0) {
    const k = rand(2, level === 'hard' ? 10 : 6);
    const x = rand(2, level === 'hard' ? 8 : 5);
    const y = k * x;
    return {
      content: `$y = ${k}x$ 일 때, $x = ${x}$ 이면 $y = ${BOX}$`,
      answer: String(y),
      choices: generateChoices(y),
      category: 'proportion', level,
    };
  }
  if (type === 1) {
    const k = rand(2, level === 'hard' ? 10 : 6);
    const x = rand(2, level === 'hard' ? 8 : 5);
    const kVal = k * x;
    return {
      content: `$y = \\dfrac{${kVal}}{x}$ 일 때, $x = ${x}$ 이면 $y = ${BOX}$`,
      answer: String(k),
      choices: generateChoices(k),
      category: 'proportion', level,
    };
  }
  if (type === 2) {
    const k = rand(2, level === 'hard' ? 10 : 6);
    const x = rand(2, 6);
    const y = k * x;
    return {
      content: `정비례 $y=ax$ 에서 $x=${x}, y=${y}$ 이면 $a = ${BOX}$`,
      answer: String(k),
      choices: generateChoices(k),
      category: 'proportion', level,
    };
  }
  if (type === 3) {
    const k = rand(2, level === 'hard' ? 8 : 5);
    const x = rand(2, 7);
    const y = k * x;
    return {
      content: `$y = ${k}x$ 일 때, $y = ${y}$ 이면 $x = ${BOX}$`,
      answer: String(x),
      choices: generateChoices(x),
      category: 'proportion', level,
    };
  }
  const x = rand(2, 6);
  const y = rand(2, 6);
  const k = x * y;
  return {
    content: `반비례 $y=\\frac{k}{x}$ 에서 $x=${x}, y=${y}$ 이면 $k = ${BOX}$`,
    answer: String(k),
    choices: generateChoices(k),
    category: 'proportion', level,
  };
}

// --- 중1: 사분면 판별 ---

export function genQuadrant(level: ArithmeticLevel): GeneratedProblem {
  const type = rand(0, level === 'hard' ? 3 : 2);

  const makeCoords = (q: number): [number, number] => {
    switch (q) {
      case 1: return [rand(1, 10), rand(1, 10)];
      case 2: return [-rand(1, 10), rand(1, 10)];
      case 3: return [-rand(1, 10), -rand(1, 10)];
      default: return [rand(1, 10), -rand(1, 10)];
    }
  };

  if (type === 0) {
    const quadrant = rand(1, 4);
    const [x, y] = makeCoords(quadrant);
    return {
      content: `점 $(${x},\\ ${y})$ 는 제 $${BOX}$ 사분면`,
      answer: String(quadrant),
      choices: shuffle(['1', '2', '3', '4']),
      category: 'quadrant', level,
    };
  }
  if (type === 1) {
    const isXAxis = Math.random() < 0.5;
    const v = rand(1, 10) * (Math.random() < 0.5 ? 1 : -1);
    const x = isXAxis ? v : 0;
    const y = isXAxis ? 0 : v;
    const answer = isXAxis ? 'x' : 'y';
    return {
      content: `점 $(${x},\\ ${y})$ 는 $${BOX}$ 축 위의 점`,
      answer,
      choices: shuffle(['x', 'y']),
      category: 'quadrant', level,
    };
  }
  if (type === 2) {
    const q = rand(1, 4);
    const [x, y] = makeCoords(q);
    const nx = -x;
    const newQ = nx > 0 && y > 0 ? 1 : nx < 0 && y > 0 ? 2 : nx < 0 && y < 0 ? 3 : 4;
    return {
      content: `점 $(${x},\\ ${y})$ 를 $y$ 축 대칭하면 제 $${BOX}$ 사분면`,
      answer: String(newQ),
      choices: shuffle(['1', '2', '3', '4']),
      category: 'quadrant', level,
    };
  }
  const q = rand(1, 4);
  const [x, y] = makeCoords(q);
  const ny = -y;
  const newQ = x > 0 && ny > 0 ? 1 : x < 0 && ny > 0 ? 2 : x < 0 && ny < 0 ? 3 : 4;
  return {
    content: `점 $(${x},\\ ${y})$ 를 $x$ 축 대칭하면 제 $${BOX}$ 사분면`,
    answer: String(newQ),
    choices: shuffle(['1', '2', '3', '4']),
    category: 'quadrant', level,
  };
}

// --- 중2: 거듭제곱 ---

export function genExpCalc(level: ArithmeticLevel): GeneratedProblem {
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

export function genExpLaw(level: ArithmeticLevel): GeneratedProblem {
  const base = rand(2, 5);
  const type = rand(0, 2);
  let content: string, answer: number;
  if (type === 0) {
    const m = rand(2, 5), n = rand(2, 5);
    content = `$${base}^{${m}} \\times ${base}^{${n}} = ${base}^{${BOX_SM}}$`;
    answer = m + n;
  } else if (type === 1) {
    const n = rand(2, 4), m = n + rand(1, 4);
    content = `$${base}^{${m}} \\div ${base}^{${n}} = ${base}^{${BOX_SM}}$`;
    answer = m - n;
  } else {
    const m = rand(2, 4), n = rand(2, 3);
    content = `$(${base}^{${m}})^{${n}} = ${base}^{${BOX_SM}}$`;
    answer = m * n;
  }
  return { content, answer: String(answer), choices: generateChoices(answer), category: 'exp_law', level };
}

// --- 중2: 단항식 곱셈/나눗셈 ---

export function genMonoMul(level: ArithmeticLevel): GeneratedProblem {
  const v = pickVar();
  const c1 = rand(2, 6), c2 = rand(2, 6);
  const e1 = rand(1, 3), e2 = rand(1, 3);
  const ansC = c1 * c2, ansE = e1 + e2;
  return {
    content: `$${fmtMono(c1, e1, v)} \\times ${fmtMono(c2, e2, v)} = ${BOX}$`,
    answer: `$${fmtMono(ansC, ansE, v)}$`,
    choices: monoChoices(ansC, ansE, v),
    category: 'mono_mul', level,
  };
}

export function genMonoDiv(level: ArithmeticLevel): GeneratedProblem {
  const v = pickVar();
  const ansC = rand(2, 6), ansE = rand(1, 3);
  const c2 = rand(2, 5), e2 = rand(1, 3);
  const c1 = ansC * c2, e1 = ansE + e2;
  return {
    content: `$${fmtMono(c1, e1, v)} \\div ${fmtMono(c2, e2, v)} = ${BOX}$`,
    answer: `$${fmtMono(ansC, ansE, v)}$`,
    choices: monoChoices(ansC, ansE, v),
    category: 'mono_div', level,
  };
}

// --- 중2: 다항식 덧셈/뺄셈 ---

export function genPolyAdd(level: ArithmeticLevel): GeneratedProblem {
  const v = pickVar();
  const a1 = rand(1, 6), b1 = rand(1, 9);
  const a2 = rand(1, 6), b2 = rand(1, 9);
  const ansA = a1 + a2, ansB = b1 + b2;
  return {
    content: `$(${fmtLinear(a1, b1, v)}) + (${fmtLinear(a2, b2, v)}) = ${BOX}$`,
    answer: `$${fmtLinear(ansA, ansB, v)}$`,
    choices: linearChoices(ansA, ansB, v),
    category: 'poly_add', level,
  };
}

export function genPolySub(level: ArithmeticLevel): GeneratedProblem {
  const v = pickVar();
  const a1 = rand(3, 8), b1 = rand(1, 9);
  const a2 = rand(1, a1 - 1), b2 = rand(1, 9);
  const ansA = a1 - a2, ansB = b1 - b2;
  return {
    content: `$(${fmtLinear(a1, b1, v)}) - (${fmtLinear(a2, b2, v)}) = ${BOX}$`,
    answer: `$${fmtLinear(ansA, ansB, v)}$`,
    choices: linearChoices(ansA, ansB, v),
    category: 'poly_sub', level,
  };
}

// --- 중2: 일차방정식 풀기 ---

export function genLinearEq(level: ArithmeticLevel): GeneratedProblem {
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

// --- 중2: 피타고라스 정리 ---

export function genPythagoras(level: ArithmeticLevel): GeneratedProblem {
  const triples: [number, number, number][] = [
    [3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25],
  ];
  const triple = triples[rand(0, level === 'hard' ? 4 : 2)];
  const missing = rand(0, 2);
  const values = [...triple];
  const answer = values[missing];
  values[missing] = -1;
  const known = values.filter(v => v !== -1);
  if (missing === 2) {
    return {
      content: `직각삼각형 $a=${known[0]}$, $b=${known[1]}$ 일 때 $c = ${BOX}$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'pythagoras', level,
    };
  }
  const otherLabel = missing === 0 ? 'a' : 'b';
  const knownLabel = missing === 0 ? 'b' : 'a';
  return {
    content: `직각삼각형 $${knownLabel}=${known[0]}$, $c=${triple[2]}$ 일 때 $${otherLabel} = ${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'pythagoras', level,
  };
}

// --- 중2: 닮음비 활용 ---

export function genSimilarity(level: ArithmeticLevel): GeneratedProblem {
  const ratio1 = rand(2, level === 'hard' ? 5 : 3);
  const ratio2 = rand(ratio1 + 1, level === 'hard' ? 8 : 6);
  const side = rand(2, 10) * ratio1;
  const answer = (side / ratio1) * ratio2;
  return {
    content: `닮음비 $${ratio1}:${ratio2}$, 한 변 $${side}$ cm 일 때 대응변 $= ${BOX}\\text{cm}$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'similarity', level,
  };
}

// --- 중3: 다항식 곱셈 ---

export function genPolyMul(level: ArithmeticLevel): GeneratedProblem {
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

export function genMulFormula(level: ArithmeticLevel): GeneratedProblem {
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

export function genFactoring(level: ArithmeticLevel): GeneratedProblem {
  let r1 = rand(-6, 6), r2 = rand(-6, 6);
  while (r1 === 0) r1 = rand(-6, 6);
  while (r2 === 0) r2 = rand(-6, 6);
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

export function genSqrtSimplify(level: ArithmeticLevel): GeneratedProblem {
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

export function genSqrtAdd(level: ArithmeticLevel): GeneratedProblem {
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

export function genSqrtMul(level: ArithmeticLevel): GeneratedProblem {
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

export function genSqrtRationalize(level: ArithmeticLevel): GeneratedProblem {
  const base = SQUARE_FREE[rand(0, 5)];
  const k = rand(1, 5);
  const numerator = k * base;
  return {
    content: `$\\frac{${numerator}}{\\sqrt{${base}}} = ${BOX}$`,
    answer: `$${fmtSqrt(k, base)}$`,
    choices: sqrtChoices(k, base),
    category: 'sqrt_rationalize', level,
  };
}

// --- 중3: 판별식 ---

export function genDiscriminant(level: ArithmeticLevel): GeneratedProblem {
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

// --- 중3: 삼각비 값 ---

export function genTrigValue(level: ArithmeticLevel): GeneratedProblem {
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

export function genInscribedAngle(level: ArithmeticLevel): GeneratedProblem {
  const type = rand(0, 2);
  if (type === 0) {
    const central = rand(2, 89) * 2;
    const answer = central / 2;
    return {
      content: `중심각 $${central}°$ 일 때 원주각 $= ${BOX}°$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'inscribed_angle', level,
    };
  }
  if (type === 1) {
    const inscribed = rand(10, 85);
    const answer = inscribed * 2;
    return {
      content: `원주각 $${inscribed}°$ 일 때 중심각 $= ${BOX}°$`,
      answer: String(answer),
      choices: generateChoices(answer),
      category: 'inscribed_angle', level,
    };
  }
  const angle = rand(30, 150);
  const answer = 180 - angle;
  return {
    content: `원 내접 사각형에서 한 각 $${angle}°$ 일 때 대각 $= ${BOX}°$`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'inscribed_angle', level,
  };
}

// --- 중3: 중앙값 ---

export function genMedianCalc(level: ArithmeticLevel): GeneratedProblem {
  const n = level === 'hard' ? 7 : 5;
  const nums: number[] = [];
  for (let i = 0; i < n; i++) nums.push(rand(1, 30));
  const sorted = [...nums].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  return {
    content: `$${nums.join(',\\ ')}$ 의 중앙값은 $${BOX}$`,
    answer: String(median),
    choices: generateChoices(median),
    category: 'median_calc', level,
  };
}

// --- 중3: 삼각비 사칙연산 ---

export function genTrigCalc(level: ArithmeticLevel): GeneratedProblem {
  const trigTable: Record<string, Record<number, string>> = {
    '\\sin': { 30: '\\dfrac{1}{2}', 45: '\\dfrac{\\sqrt{2}}{2}', 60: '\\dfrac{\\sqrt{3}}{2}' },
    '\\cos': { 30: '\\dfrac{\\sqrt{3}}{2}', 45: '\\dfrac{\\sqrt{2}}{2}', 60: '\\dfrac{1}{2}' },
    '\\tan': { 30: '\\dfrac{1}{\\sqrt{3}}', 45: '1', 60: '\\sqrt{3}' },
  };
  const angles = [30, 45, 60];
  const funcs = ['\\sin', '\\cos', '\\tan'];
  const ops = ['+', '-'] as const;

  const f1 = funcs[rand(0, 2)], a1 = angles[rand(0, 2)];
  const f2 = funcs[rand(0, 2)], a2 = angles[rand(0, 2)];
  const op = ops[rand(0, 1)];

  const t1 = trigTable[f1][a1], t2 = trigTable[f2][a2];
  const answerTex = `${t1} ${op} ${t2}`;

  // 간단한 선택지 생성
  const allVals = new Set<string>();
  for (const f of funcs) for (const a of angles) allVals.add(trigTable[f][a]);
  const wrongChoices = [...allVals].filter(v => v !== t1 && v !== t2);

  return {
    content: `$${f1} ${a1}° ${op} ${f2} ${a2}°$ $= ${BOX}$`,
    answer: `$${answerTex}$`,
    choices: shuffle([`$${answerTex}$`, ...wrongChoices.slice(0, 3).map(v => `$${v}$`)]),
    category: 'trig_calc', level,
  };
}

// --- 중3: 최빈값 ---

export function genModeCalc(level: ArithmeticLevel): GeneratedProblem {
  const n = level === 'hard' ? 9 : 7;
  const modeVal = rand(1, 20);
  const modeCount = rand(3, 4);
  const nums: number[] = [];
  // 최빈값을 modeCount번 넣기
  for (let i = 0; i < modeCount; i++) nums.push(modeVal);
  // 나머지는 modeCount - 1번 이하로 등장하는 값
  const used = new Set<number>([modeVal]);
  while (nums.length < n) {
    const v = rand(1, 30);
    if (v === modeVal) continue;
    const cnt = nums.filter(x => x === v).length;
    if (cnt >= modeCount - 1) continue;
    nums.push(v);
    used.add(v);
  }
  const shuffled = shuffle(nums);
  return {
    content: `$${shuffled.join(',\\ ')}$ 의 최빈값은 $${BOX}$`,
    answer: String(modeVal),
    choices: generateChoices(modeVal),
    category: 'mode_calc', level,
  };
}

// --- 중3: 편차의 합 ---

export function genDeviationSum(level: ArithmeticLevel): GeneratedProblem {
  const n = level === 'hard' ? 5 : 4;
  const mean = rand(5, 20);
  // n-1개 편차 생성, 마지막은 합이 0 되도록
  const devs: number[] = [];
  let sum = 0;
  for (let i = 0; i < n - 1; i++) {
    const d = rand(-5, 5);
    devs.push(d);
    sum += d;
  }
  devs.push(-sum); // 편차의 합 = 0

  // 문제 유형: 편차 중 하나를 빈칸으로
  const hideIdx = rand(0, n - 1);
  const knownDevs = devs.filter((_, i) => i !== hideIdx);
  const answer = devs[hideIdx];

  return {
    content: `평균 $${mean}$ 인 자료에서 편차가 $${knownDevs.join(',\\ ')}$ 이고 나머지 한 편차는 $${BOX}$`,
    answer: String(answer),
    choices: generateChoices(answer, 4, -20),
    category: 'deviation_sum', level,
  };
}

// --- 중3: 분산 ---

export function genVarianceCalc(level: ArithmeticLevel): GeneratedProblem {
  const deviationSets = [
    [-2, -1, 1, 2],
    [-3, -1, 1, 3],
    [-2, 0, 0, 2],
    [-1, -1, 1, 1],
    [-3, -3, 3, 3],
    [-2, -2, 2, 2],
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
    content: `$${data.join(',\\ ')}$ 의 분산은 $${BOX}$`,
    answer: String(variance),
    choices: generateChoices(variance),
    category: 'variance_calc', level,
  };
}
