/**
 * 연산 문제 무제한 자동 생성 엔진
 * 사칙연산/분수/소수 등 연산 문제를 프로시저럴하게 생성
 */

export type ArithmeticCategory =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'mixed'
  | 'fraction_add'
  | 'fraction_sub'
  | 'fraction_mul'
  | 'fraction_div'
  | 'decimal';

export type ArithmeticLevel = 'easy' | 'medium' | 'hard';

export interface GeneratedProblem {
  content: string;
  answer: string;
  choices: string[];
  category: ArithmeticCategory;
  level: ArithmeticLevel;
}

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
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function generateChoices(correct: number, count: number = 4): string[] {
  const choices = new Set<number>();
  choices.add(correct);
  const offset = Math.max(3, Math.abs(correct) > 10 ? Math.ceil(Math.abs(correct) * 0.3) : 5);
  while (choices.size < count) {
    const wrong = correct + rand(-offset, offset);
    if (wrong !== correct) choices.add(wrong);
  }
  return shuffle([...choices]).map(String);
}

function generateFractionChoices(numCorrect: number, denCorrect: number, count: number = 4): string[] {
  const choices = new Set<string>();
  const g = gcd(Math.abs(numCorrect), denCorrect);
  choices.add(`${numCorrect / g}/${denCorrect / g}`);
  while (choices.size < count) {
    const n = numCorrect + rand(-3, 3);
    const d = denCorrect + rand(-1, 1);
    if (d > 0 && !(n === numCorrect && d === denCorrect)) {
      const g2 = gcd(Math.abs(n), d);
      choices.add(`${n / g2}/${d / g2}`);
    }
  }
  return shuffle([...choices]);
}

const RANGE: Record<ArithmeticLevel, [number, number]> = {
  easy: [1, 20],
  medium: [10, 100],
  hard: [50, 999],
};

function genAddition(level: ArithmeticLevel): GeneratedProblem {
  const [min, max] = RANGE[level];
  const a = rand(min, max), b = rand(min, max);
  const answer = a + b;
  return {
    content: `${a} + ${b} = ?`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'addition',
    level,
  };
}

function genSubtraction(level: ArithmeticLevel): GeneratedProblem {
  const [min, max] = RANGE[level];
  let a = rand(min, max), b = rand(min, max);
  if (a < b) [a, b] = [b, a];
  const answer = a - b;
  return {
    content: `${a} - ${b} = ?`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'subtraction',
    level,
  };
}

function genMultiplication(level: ArithmeticLevel): GeneratedProblem {
  const ranges: Record<ArithmeticLevel, [number, number]> = {
    easy: [2, 9],
    medium: [2, 20],
    hard: [10, 50],
  };
  const [min, max] = ranges[level];
  const a = rand(min, max), b = rand(min, max);
  const answer = a * b;
  return {
    content: `${a} × ${b} = ?`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'multiplication',
    level,
  };
}

function genDivision(level: ArithmeticLevel): GeneratedProblem {
  const ranges: Record<ArithmeticLevel, [number, number]> = {
    easy: [2, 9],
    medium: [2, 15],
    hard: [2, 30],
  };
  const [min, max] = ranges[level];
  const b = rand(min, max);
  const answer = rand(min, max);
  const a = b * answer;
  return {
    content: `${a} ÷ ${b} = ?`,
    answer: String(answer),
    choices: generateChoices(answer),
    category: 'division',
    level,
  };
}

function genFractionAdd(level: ArithmeticLevel): GeneratedProblem {
  const maxDen = level === 'easy' ? 6 : level === 'medium' ? 12 : 20;
  const d1 = rand(2, maxDen), d2 = rand(2, maxDen);
  const n1 = rand(1, d1 - 1), n2 = rand(1, d2 - 1);
  const commonD = d1 * d2 / gcd(d1, d2);
  const resultNum = n1 * (commonD / d1) + n2 * (commonD / d2);
  const g = gcd(Math.abs(resultNum), commonD);
  return {
    content: `\\frac{${n1}}{${d1}} + \\frac{${n2}}{${d2}} = ?`,
    answer: `${resultNum / g}/${commonD / g}`,
    choices: generateFractionChoices(resultNum, commonD),
    category: 'fraction_add',
    level,
  };
}

function genFractionSub(level: ArithmeticLevel): GeneratedProblem {
  const maxDen = level === 'easy' ? 6 : level === 'medium' ? 12 : 20;
  const d1 = rand(2, maxDen), d2 = rand(2, maxDen);
  let n1 = rand(1, d1 - 1), n2 = rand(1, d2 - 1);
  // Ensure positive result
  const commonD = d1 * d2 / gcd(d1, d2);
  let resultNum = n1 * (commonD / d1) - n2 * (commonD / d2);
  if (resultNum < 0) {
    [n1, n2] = [n2, n1];
    resultNum = -resultNum;
  }
  const g = gcd(Math.abs(resultNum), commonD);
  return {
    content: `\\frac{${n1}}{${d1}} - \\frac{${n2}}{${d2}} = ?`,
    answer: `${resultNum / g}/${commonD / g}`,
    choices: generateFractionChoices(resultNum, commonD),
    category: 'fraction_sub',
    level,
  };
}

function genFractionMul(level: ArithmeticLevel): GeneratedProblem {
  const maxDen = level === 'easy' ? 6 : level === 'medium' ? 10 : 15;
  const d1 = rand(2, maxDen), d2 = rand(2, maxDen);
  const n1 = rand(1, d1), n2 = rand(1, d2);
  const resultNum = n1 * n2;
  const resultDen = d1 * d2;
  const g = gcd(resultNum, resultDen);
  return {
    content: `\\frac{${n1}}{${d1}} × \\frac{${n2}}{${d2}} = ?`,
    answer: `${resultNum / g}/${resultDen / g}`,
    choices: generateFractionChoices(resultNum, resultDen),
    category: 'fraction_mul',
    level,
  };
}

function genFractionDiv(level: ArithmeticLevel): GeneratedProblem {
  const maxDen = level === 'easy' ? 6 : level === 'medium' ? 10 : 15;
  const d1 = rand(2, maxDen), d2 = rand(2, maxDen);
  const n1 = rand(1, d1), n2 = rand(1, d2);
  const resultNum = n1 * d2;
  const resultDen = d1 * n2;
  const g = gcd(resultNum, resultDen);
  return {
    content: `\\frac{${n1}}{${d1}} ÷ \\frac{${n2}}{${d2}} = ?`,
    answer: `${resultNum / g}/${resultDen / g}`,
    choices: generateFractionChoices(resultNum, resultDen),
    category: 'fraction_div',
    level,
  };
}

function genDecimal(level: ArithmeticLevel): GeneratedProblem {
  const ops = ['+', '-', '×'] as const;
  const op = ops[rand(0, 2)];
  const decimals = level === 'easy' ? 1 : level === 'medium' ? 2 : 2;
  const factor = Math.pow(10, decimals);
  const a = rand(1, 50 * factor) / factor;
  const b = rand(1, 50 * factor) / factor;
  let answer: number;
  let content: string;
  switch (op) {
    case '+': answer = a + b; content = `${a} + ${b} = ?`; break;
    case '-': answer = Math.abs(a - b); content = `${Math.max(a, b)} - ${Math.min(a, b)} = ?`; break;
    case '×': answer = parseFloat((a * b).toFixed(decimals)); content = `${a} × ${b} = ?`; break;
  }
  const roundedAnswer = parseFloat(answer!.toFixed(decimals));
  return {
    content: content!,
    answer: String(roundedAnswer),
    choices: generateChoices(Math.round(roundedAnswer * factor)).map((c) => String(Number(c) / factor)),
    category: 'decimal',
    level,
  };
}

const GENERATORS: Record<ArithmeticCategory, (level: ArithmeticLevel) => GeneratedProblem> = {
  addition: genAddition,
  subtraction: genSubtraction,
  multiplication: genMultiplication,
  division: genDivision,
  mixed: (level) => {
    const basic = [genAddition, genSubtraction, genMultiplication, genDivision];
    return basic[rand(0, 3)](level);
  },
  fraction_add: genFractionAdd,
  fraction_sub: genFractionSub,
  fraction_mul: genFractionMul,
  fraction_div: genFractionDiv,
  decimal: genDecimal,
};

export const CATEGORY_LABELS: Record<ArithmeticCategory, string> = {
  addition: '덧셈',
  subtraction: '뺄셈',
  multiplication: '곱셈',
  division: '나눗셈',
  mixed: '혼합 연산',
  fraction_add: '분수 덧셈',
  fraction_sub: '분수 뺄셈',
  fraction_mul: '분수 곱셈',
  fraction_div: '분수 나눗셈',
  decimal: '소수 연산',
};

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
