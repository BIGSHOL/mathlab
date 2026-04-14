/**
 * AI 응답 후처리 유틸
 *
 * JSON 파싱 시 발생하는 이스케이프 충돌 복원, 코드 펜스 제거 등
 * 범용적으로 사용 가능한 후처리 함수 모음
 */

/**
 * JSON 파싱 후 LaTeX 이스케이프 복원
 *
 * JSON의 \t, \f, \b가 LaTeX 명령어(\times, \frac, \begin)와 충돌하는 문제 수정
 * 예: \times → JSON에서 \t → tab문자 + "imes" → 복원하여 \times
 */
export function fixLatexEscaping(text: string): string {
  if (!text) return text;
  return text
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\x08/g, '\\b')
    .replace(/\r(?!\n)/g, '\\r')
    // \\n 리터럴 → 실제 줄바꿈 (LaTeX 명령어 \nabla 등은 보호)
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    // \dfrac → \frac (인라인 수식에서 거대 분수 방지)
    .replace(/\\dfrac(?![a-zA-Z])/g, '\\frac');
}

/**
 * 수학 텍스트(본문/해설) 정규화 — AI가 놓치거나 잘못한 규칙을 후처리로 보정
 *
 * 적용 순서:
 *  1) fixLatexEscaping (이스케이프/\dfrac/literal \n)
 *  2) 인접 인라인 수식 글루 분리: "$A$$B$" → "$A$ $B$"
 *  3) 블록 수식 내 다단계 = 자동 감지 → aligned 환경으로 래핑
 *  4) $$ 내부 \dfrac → \frac (fixLatexEscaping이 이미 처리하지만 안전망)
 *  5) 연속 공백/3+ 줄바꿈 정리
 */
export function normalizeMathText(text: string): string {
  if (!text) return text;
  let out = fixLatexEscaping(text);

  // 1.5) 수식 밖에 남은 LaTeX 텍스트 커맨드 정리 (\textrm{}, \text{}, \mathrm{} 등)
  //      수식 내부는 보호
  {
    const blocks: string[] = [];
    let t = out
      .replace(/\$\$[\s\S]*?\$\$/g, (m) => {
        const i = blocks.push(m) - 1;
        return `\u0000MB${i}\u0000`;
      })
      .replace(/\$[^$\n]*\$/g, (m) => {
        const i = blocks.push(m) - 1;
        return `\u0000MB${i}\u0000`;
      });
    t = t
      .replace(/\\textrm\{([^}]*)\}/g, '$1')
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\mathrm\{([^}]*)\}/g, '$1')
      .replace(/\\textbf\{([^}]*)\}/g, '**$1**')
      .replace(/\\textit\{([^}]*)\}/g, '*$1*');
    out = t.replace(/\u0000MB(\d+)\u0000/g, (_, i) => blocks[Number(i)] ?? '');
  }

  // 2) 인접 인라인 수식 글루 분리 — 최대 5회 반복 ($A$$B$$C$... 연쇄 대응)
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/\$([^$\n]+)\$\$([^$\n]+)\$/g, (_m, a, b) => `$${a}$ $${b}$`);
    if (next === out) break;
    out = next;
  }

  // 3) 블록 수식 $$...$$ 내부에 "2줄 이상 + = 기호 포함" 이면 aligned 환경으로 자동 래핑
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (m, inner: string) => {
    // 이미 수학 환경 안에 있으면 스킵
    if (/\\begin\{(aligned|align|array|cases|matrix|pmatrix|bmatrix|vmatrix|gathered|split)\}/.test(inner)) {
      return m;
    }
    const lines = inner
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) return m;
    const eqLines = lines.filter((l) => /=/.test(l));
    if (eqLines.length < 2) return m;
    const amped = lines.map((l) => (l.startsWith('&') ? l : `&${l}`));
    return `$$\\begin{aligned}${amped.join(' \\\\ ')}\\end{aligned}$$`;
  });

  // 5) 연속 공백 정리 (단, $...$ 내부는 건드리지 않기 위해 플레이스홀더 사용)
  const mathBlocks: string[] = [];
  let protectedOut = out
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => {
      const idx = mathBlocks.push(m) - 1;
      return `\u0000MB${idx}\u0000`;
    })
    .replace(/\$[^$\n]*\$/g, (m) => {
      const idx = mathBlocks.push(m) - 1;
      return `\u0000MB${idx}\u0000`;
    });
  protectedOut = protectedOut
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  out = protectedOut.replace(/\u0000MB(\d+)\u0000/g, (_, i) => mathBlocks[Number(i)] ?? '');

  return out;
}

/**
 * 정답(answer) 필드 정규화
 *  - LaTeX 커맨드가 포함되어 있고 $ 로 감싸지지 않으면 자동으로 $...$ 래핑
 *  - 콤마로 여러 답 나열된 경우 각각 래핑
 */
/** LaTeX 커맨드(\로 시작하는 영문 단어) 또는 수식 기호(^{, _{) 감지 */
const LATEX_CMD_PATTERN = /\\[a-zA-Z]+|[\^_]\{/;
export function normalizeAnswerField(answer: string): string {
  if (!answer) return answer;
  const trimmed = answer.trim();
  if (!trimmed) return answer;
  if (trimmed.includes('$')) return trimmed; // 이미 래핑된 부분 있음 — 수동 검토 대상
  if (!LATEX_CMD_PATTERN.test(trimmed)) return trimmed;
  // 기호 나열이든 단일 수식이든 전체를 하나의 $...$로 감쌈.
  // 예: "\times, \times, \bigcirc" → "$\times, \times, \bigcirc$"
  //     "\frac{5}{4}"              → "$\frac{5}{4}$"
  return `$${trimmed}$`;
}

/**
 * Gemini 응답에서 JSON 코드 펜스 제거
 *
 * Gemini가 ```json ... ``` 또는 ``` ... ```로 감쌀 수 있음
 */
export function stripCodeFence(text: string): string {
  let result = text.trim();
  if (result.startsWith('```json')) {
    result = result.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (result.startsWith('```')) {
    result = result.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return result;
}

/**
 * 객체의 모든 문자열 필드에 fixText 함수 적용 (재귀)
 *
 * @param obj - 대상 객체
 * @param fixText - 텍스트 변환 함수
 * @param maxDepth - 최대 재귀 깊이 (기본: 5)
 */
export function deepFixText<T>(
  obj: T,
  fixText: (text: string) => string,
  maxDepth = 5,
): T {
  if (maxDepth <= 0) return obj;
  if (typeof obj === 'string') return fixText(obj) as T;
  if (Array.isArray(obj)) {
    return obj.map((item) => deepFixText(item, fixText, maxDepth - 1)) as T;
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepFixText(value, fixText, maxDepth - 1);
    }
    return result as T;
  }
  return obj;
}

/**
 * base64 이미지에서 data URL prefix 제거
 * "data:image/png;base64,..." → 순수 base64 문자열
 */
export function stripDataUrlPrefix(base64: string): string {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}

/**
 * base64 이미지 크기 추정 (바이트)
 */
export function estimateBase64Size(base64: string): number {
  const clean = stripDataUrlPrefix(base64);
  return (clean.length * 3) / 4;
}
