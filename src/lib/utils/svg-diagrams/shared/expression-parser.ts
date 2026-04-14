/**
 * 안전한 수식 평가기 — function-graph 용
 *
 * 기존 구현(`new Function('x', sanitized)`)의 보안 문제를 해결하기 위해
 * 재귀 하강 파서로 제한된 문법만 파싱/평가한다.
 *
 * 지원 문법:
 *   - 상수: 숫자 리터럴, `pi`, `e`
 *   - 변수: `x`
 *   - 연산자: `+ - * / ^` (단항 `-`, `+` 포함)
 *   - 괄호: `( )`
 *   - 함수: abs, sqrt, sin, cos, tan, log, ln, exp
 *   - 암묵적 곱셈은 지원하지 않음 (예: `2x`는 `2*x`로 적어야 함)
 *
 * 파싱 실패/알 수 없는 식별자는 예외로 처리되어 상위 렌더러가 점을 건너뛴다.
 */

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; op: '+' | '-' | '*' | '/' | '^' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' }
  | { kind: 'eof' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const s = src.replace(/\*\*/g, '^').replace(/\s+/g, '');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c >= '0' && c <= '9' || c === '.') {
      let j = i;
      while (j < s.length && (s[j] >= '0' && s[j] <= '9' || s[j] === '.')) j++;
      const num = Number(s.slice(i, j));
      if (!isFinite(num)) throw new Error(`invalid number at ${i}`);
      tokens.push({ kind: 'num', value: num });
      i = j;
      continue;
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      let j = i;
      while (j < s.length && ((s[j] >= 'a' && s[j] <= 'z') || (s[j] >= 'A' && s[j] <= 'Z') || (s[j] >= '0' && s[j] <= '9') || s[j] === '_')) j++;
      tokens.push({ kind: 'ident', name: s.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      tokens.push({ kind: 'op', op: c });
      i++;
      continue;
    }
    if (c === '(') { tokens.push({ kind: 'lparen' }); i++; continue; }
    if (c === ')') { tokens.push({ kind: 'rparen' }); i++; continue; }
    if (c === ',') { tokens.push({ kind: 'comma' }); i++; continue; }
    throw new Error(`unexpected char '${c}' at ${i}`);
  }
  tokens.push({ kind: 'eof' });
  return tokens;
}

/** 허용된 함수 — 단항 (prototype 오염 방지: Object.create(null)) */
const UNARY_FUNCS: Record<string, (v: number) => number> = Object.assign(Object.create(null), {
  abs: Math.abs,
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log10 ?? ((v: number) => Math.log(v) / Math.LN10),
  ln: Math.log,
  exp: Math.exp,
});

/** 허용된 상수 (prototype 오염 방지: Object.create(null)) */
const CONSTANTS: Record<string, number> = Object.assign(Object.create(null), {
  pi: Math.PI,
  e: Math.E,
});

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'var' }
  | { kind: 'const'; name: string }
  | { kind: 'unary'; op: '-' | '+'; operand: Node }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Node; right: Node }
  | { kind: 'call'; name: string; arg: Node };

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}
  private peek(): Token { return this.tokens[this.pos]; }
  private next(): Token { return this.tokens[this.pos++]; }
  expectEof(): void {
    const t = this.peek();
    if (t.kind !== 'eof') throw new Error(`unexpected trailing token: ${t.kind}`);
  }

  /** expr = term (('+' | '-') term)* */
  parseExpr(): Node {
    let left = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t.kind === 'op' && (t.op === '+' || t.op === '-')) {
        this.next();
        const right = this.parseTerm();
        left = { kind: 'binary', op: t.op, left, right };
      } else break;
    }
    return left;
  }

  /** term = factor (('*' | '/') factor)* */
  private parseTerm(): Node {
    let left = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (t.kind === 'op' && (t.op === '*' || t.op === '/')) {
        this.next();
        const right = this.parseFactor();
        left = { kind: 'binary', op: t.op, left, right };
      } else break;
    }
    return left;
  }

  /** factor = unary ('^' factor)?  (right-associative) */
  private parseFactor(): Node {
    const base = this.parseUnary();
    const t = this.peek();
    if (t.kind === 'op' && t.op === '^') {
      this.next();
      const exp = this.parseFactor();
      return { kind: 'binary', op: '^', left: base, right: exp };
    }
    return base;
  }

  /** unary = ('+' | '-')? primary */
  private parseUnary(): Node {
    const t = this.peek();
    if (t.kind === 'op' && (t.op === '+' || t.op === '-')) {
      this.next();
      const operand = this.parseUnary();
      return { kind: 'unary', op: t.op, operand };
    }
    return this.parsePrimary();
  }

  /** primary = num | ident ('(' expr ')')? | '(' expr ')' */
  private parsePrimary(): Node {
    const t = this.next();
    if (t.kind === 'num') return { kind: 'num', value: t.value };
    if (t.kind === 'lparen') {
      const e = this.parseExpr();
      const closing = this.next();
      if (closing.kind !== 'rparen') throw new Error('missing ")"');
      return e;
    }
    if (t.kind === 'ident') {
      const next = this.peek();
      if (next.kind === 'lparen') {
        this.next();
        const arg = this.parseExpr();
        const closing = this.next();
        if (closing.kind !== 'rparen') throw new Error('missing ")" in call');
        return { kind: 'call', name: t.name, arg };
      }
      if (t.name === 'x') return { kind: 'var' };
      if (t.name in CONSTANTS) return { kind: 'const', name: t.name };
      throw new Error(`unknown identifier "${t.name}"`);
    }
    throw new Error(`unexpected token: ${t.kind}`);
  }
}

function evalNode(node: Node, x: number): number {
  switch (node.kind) {
    case 'num': return node.value;
    case 'var': return x;
    case 'const': return CONSTANTS[node.name];
    case 'unary': {
      const v = evalNode(node.operand, x);
      return node.op === '-' ? -v : v;
    }
    case 'binary': {
      const l = evalNode(node.left, x);
      const r = evalNode(node.right, x);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '^': return Math.pow(l, r);
      }
      return NaN;
    }
    case 'call': {
      const fn = UNARY_FUNCS[node.name];
      if (!fn) throw new Error(`unknown function "${node.name}"`);
      return fn(evalNode(node.arg, x));
    }
  }
}

/**
 * 수식 문자열을 컴파일하여 재사용 가능한 평가 함수를 반환.
 * 파싱 실패 시 throw. 호출자가 try/catch로 감싸 points를 건너뛴다.
 */
export function compileExpression(expr: string): (x: number) => number {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  const ast = parser.parseExpr();
  parser.expectEof();
  return (x: number) => evalNode(ast, x);
}

/** 1회성 평가 — 기존 evaluateExpression 대체 */
export function evaluateExpression(expr: string, x: number): number {
  const fn = compileExpression(expr);
  return fn(x);
}
