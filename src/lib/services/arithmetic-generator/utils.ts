export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

export function generateChoices(correct: number, count = 4, min = 1): string[] {
  const choices = new Set<number>();
  choices.add(correct);
  const offset = Math.max(3, Math.abs(correct) > 10 ? Math.ceil(Math.abs(correct) * 0.3) : 5);
  while (choices.size < count) {
    const wrong = correct + rand(-offset, offset);
    // 자연수 연산인 경우 min값(기본 1) 미만으로 내려가지 않도록 함
    if (wrong !== correct && (correct < min ? true : wrong >= min)) choices.add(wrong);
  }
  return shuffle([...choices]).map(String);
}

export function generateFractionChoices(num: number, den: number, count = 4): string[] {
  const choices = new Set<string>();
  const g = gcd(Math.abs(num), den);
  const nCorr = num / g;
  const dCorr = den / g;
  choices.add(`$\\frac{${nCorr}}{${dCorr}}$`);

  while (choices.size < count) {
    // 1. 분모는 유지하고 분자만 ±1, ±2 (가장 흔한 실수)
    // 2. 분자는 유지하고 분모만 ±1 (분수 크기 감각)
    // 3. 분자, 분모 둘 다 조금씩 변경
    const mode = rand(1, 3);
    let nW = num, dW = den;
    
    if (mode === 1) nW += rand(-2, 2);
    else if (mode === 2) dW += rand(-1, 1);
    else { nW += rand(-2, 2); dW += rand(-1, 1); }

    if (dW > 0 && nW !== 0) {
      const gW = gcd(Math.abs(nW), dW);
      const nFinal = nW / gW;
      const dFinal = dW / gW;
      if (!(nFinal === nCorr && dFinal === dCorr)) {
        choices.add(`$\\frac{${nFinal}}{${dFinal}}$`);
      }
    }
  }
  return shuffle([...choices]);
}

export function generateDecimalChoices(correct: number, count = 4): string[] {
  const choices = new Set<string>();
  // 소수점 아래 자릿수 파악
  const s = String(correct);
  const dotIdx = s.indexOf('.');
  const precision = dotIdx === -1 ? 0 : s.length - dotIdx - 1;
  
  choices.add(correct.toFixed(precision));

  while (choices.size < count) {
    let wrong: number;
    const type = rand(1, 3);
    
    if (type === 1) {
      // 끝자리 근처 값 가감 (0.1, 0.01 등)
      const diff = Math.pow(10, -precision) * rand(-3, 3);
      wrong = Number((correct + diff).toFixed(precision));
    } else if (type === 2 && precision > 0) {
      // 소수점 위치 오류 (예: 1.25 -> 12.5 또는 0.125)
      wrong = rand(0, 1) === 0 ? correct * 10 : correct / 10;
    } else {
      // 단순 값 변경
      wrong = correct + rand(-5, 5);
    }

    const wStr = wrong.toFixed(precision);
    if (wStr !== correct.toFixed(precision) && Number(wStr) > 0) {
      choices.add(wStr);
    }
  }
  return shuffle([...choices]);
}

export const BOX = '\\boxed{\\phantom{000}}';
export const BOX_SM = '\\boxed{\\phantom{0}}';

// --- Algebraic formatting helpers ---

const VARS = ['x', 'y', 'a', 'b', 'c', 'z'];
export function pickVar(): string { return VARS[rand(0, VARS.length - 1)]; }

export function fmtMono(c: number, e: number, v = 'x'): string {
  if (e === 0) return `${c}`;
  const cStr = c === 1 ? '' : c === -1 ? '-' : `${c}`;
  return e === 1 ? `${cStr}${v}` : `${cStr}${v}^{${e}}`;
}

export function fmtLinear(a: number, b: number, v = 'x'): string {
  const aStr = a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`;
  if (b === 0) return aStr;
  return b > 0 ? `${aStr} + ${b}` : `${aStr} - ${Math.abs(b)}`;
}

export function fmtQuadratic(bCoeff: number, c: number): string {
  let s = 'x^2';
  if (bCoeff === 1) s += ' + x';
  else if (bCoeff === -1) s += ' - x';
  else if (bCoeff > 0) s += ` + ${bCoeff}x`;
  else if (bCoeff < 0) s += ` - ${Math.abs(bCoeff)}x`;
  if (c > 0) s += ` + ${c}`;
  else if (c < 0) s += ` - ${Math.abs(c)}`;
  return s;
}

export function fmtSqrt(c: number, base: number): string {
  if (c === 1) return `\\sqrt{${base}}`;
  return `${c}\\sqrt{${base}}`;
}

export function fmtFactor(root: number): string {
  if (root > 0) return `(x - ${root})`;
  if (root < 0) return `(x + ${Math.abs(root)})`;
  return 'x';
}

// --- Choice generators for algebraic expressions ---

export function monoChoices(c: number, e: number, v = 'x'): string[] {
  const choices = new Set<string>();
  choices.add(`$${fmtMono(c, e, v)}$`);
  while (choices.size < 4) {
    const dc = rand(-2, 3), de = rand(-1, 2);
    const nc = c + dc, ne = e + de;
    if (nc > 0 && ne >= 0 && !(dc === 0 && de === 0)) choices.add(`$${fmtMono(nc, ne, v)}$`);
  }
  return shuffle([...choices]);
}

export function linearChoices(a: number, b: number, v = 'x'): string[] {
  const choices = new Set<string>();
  choices.add(`$${fmtLinear(a, b, v)}$`);
  while (choices.size < 4) {
    const da = rand(-2, 2), db = rand(-3, 3);
    const na = a + da, nb = b + db;
    if (na !== 0 && !(da === 0 && db === 0)) choices.add(`$${fmtLinear(na, nb, v)}$`);
  }
  return shuffle([...choices]);
}

export function quadChoices(bCoeff: number, c: number): string[] {
  const choices = new Set<string>();
  choices.add(`$${fmtQuadratic(bCoeff, c)}$`);
  while (choices.size < 4) {
    const db = rand(-2, 2), dc = rand(-3, 3);
    if (db !== 0 || dc !== 0) choices.add(`$${fmtQuadratic(bCoeff + db, c + dc)}$`);
  }
  return shuffle([...choices]);
}

export function sqrtChoices(c: number, base: number): string[] {
  const choices = new Set<string>();
  choices.add(`$${fmtSqrt(c, base)}$`);
  while (choices.size < 4) {
    const dc = rand(-2, 3), db = rand(-1, 3);
    const nc = c + dc, nb = base + db;
    if (nc > 0 && nb > 1 && !(dc === 0 && db === 0)) choices.add(`$${fmtSqrt(nc, nb)}$`);
  }
  return shuffle([...choices]);
}

export function factoringChoices(r1: number, r2: number): string[] {
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

// --- Abs helpers ---
export const absParen = (n: number) => n < 0 ? `(${n})` : `(+${n})`;
export const absSigned = (n: number) => n < 0 ? `${n}` : `+${n}`;
export const absRn = (max: number) => (rand(0, 1) ? 1 : -1) * rand(1, max);
