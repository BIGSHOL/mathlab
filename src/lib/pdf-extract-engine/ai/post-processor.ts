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

  // 1.5) 수식 밖 LaTeX 커맨드 정리 (\textrm{}, \text{}, \mathrm{} / \therefore / \qquad 등)
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
      // 텍스트 래퍼 제거
      .replace(/\\textrm\{([^}]*)\}/g, '$1')
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\mathrm\{([^}]*)\}/g, '$1')
      .replace(/\\textbf\{([^}]*)\}/g, '**$1**')
      .replace(/\\textit\{([^}]*)\}/g, '*$1*')
      // 논리 기호 → 유니코드 (수식 바깥에서도 자연스럽게 보이도록)
      .replace(/\\therefore\b/g, '∴')
      .replace(/\\because\b/g, '∵')
      // 스페이싱 커맨드 → 실제 공백
      .replace(/\\qquad\b/g, '  ')
      .replace(/\\quad\b/g, ' ')
      .replace(/\\[;,:!]/g, ' ')
      // 생략 기호 → 유니코드 (수식 바깥에서 렌더링 안정)
      .replace(/\\ldots\b/g, '…')
      .replace(/\\cdots\b/g, '…')
      .replace(/\\dots\b/g, '…')
      // `[N단계]`, `[$n$단계]` 같은 패턴 → **bold** (사각 박스 렌더링 방지)
      //  마크다운 링크 `[text](url)` / 이미지 `![alt](url)`는 제외
      .replace(/(?<!!)\[([^\]\n]*단계)\](?!\()/g, '**$1**')
      // \text{\textcircled{N}} 중첩 → \text{①} (수식 내부 보호 위해 \text 유지)
      .replace(/\\text\{\\textcircled\{(\d+)\}\}/g, (_m, n: string) => {
        const num = Number(n);
        if (num >= 1 && num <= 20) return `\\text{${String.fromCharCode(0x2460 + num - 1)}}`;
        return _m;
      })
      // \textcircled{N} (1~20) → 유니코드 ①②③…
      .replace(/\\textcircled\{(\d+)\}/g, (_m, n: string) => {
        const num = Number(n);
        if (num >= 1 && num <= 20) return String.fromCharCode(0x2460 + num - 1);
        return _m;
      })
      // \textcircled{한글음절 가~하} → ㉮㉯㉰…, \textcircled{자음 ㄱ~ㅎ} → ㉠㉡㉢…
      .replace(/\\textcircled\{([가-힣])\}/g, (_m, ch: string) => {
        const map: Record<string, string> = {
          '가':'㉮','나':'㉯','다':'㉰','라':'㉱','마':'㉲',
          '바':'㉳','사':'㉴','아':'㉵','자':'㉶','차':'㉷',
          '카':'㉸','타':'㉹','파':'㉺','하':'㉻',
        };
        return map[ch] || _m;
      })
      .replace(/\\textcircled\{([ㄱ-ㅎ])\}/g, (_m, ch: string) => {
        const map: Record<string, string> = {
          'ㄱ':'㉠','ㄴ':'㉡','ㄷ':'㉢','ㄹ':'㉣','ㅁ':'㉤',
          'ㅂ':'㉥','ㅅ':'㉦','ㅇ':'㉧','ㅈ':'㉨','ㅊ':'㉩',
          'ㅋ':'㉪','ㅌ':'㉫','ㅍ':'㉬','ㅎ':'㉭',
        };
        return map[ch] || _m;
      });

    // 1.7.5) "=로 시작하는 줄에 LaTeX 커맨드 있는데 $ 없음" → $...$로 감싸기
    //         (이전 수식의 연장인 케이스 자동 감지)
    {
      const LATEX_CMD_IN_LINE = /\\(frac|tfrac|sqrt|times|div|cdot|pm|mp|leq|geq|neq|therefore|because|pi|angle)\b/;
      t = t.split('\n').map(line => {
        const trimmed = line.trim();
        if (!/^=/.test(trimmed)) return line;
        if (!LATEX_CMD_IN_LINE.test(line)) return line;
        if (line.includes('$')) return line;
        const ws = line.match(/^\s*/)?.[0] || '';
        return `${ws}$${line.slice(ws.length)}$`;
      }).join('\n');
    }
    out = t.replace(/\u0000MB(\d+)\u0000/g, (_, i) => blocks[Number(i)] ?? '');
  }

  // 1.6) 빈 수식 `$ $` / `$  $` 제거 (수식 바깥, 공백/탭만 포함된 경우)
  //      줄바꿈은 제외 — 별개 수식 간 경계일 수 있음
  {
    const blocks: string[] = [];
    let t = out
      .replace(/\$\$[\s\S]*?\$\$/g, (m) => `\u0000MB${blocks.push(m) - 1}\u0000`)
      .replace(/\$[^$\n]*\$/g, (m) => `\u0000MB${blocks.push(m) - 1}\u0000`);
    t = t.replace(/\$[ \t]{1,6}\$/g, ' ');
    out = t.replace(/\u0000MB(\d+)\u0000/g, (_, i) => blocks[Number(i)] ?? '');
  }

  // 1.7) 보기/결론 라인 홀수 $ 보정
  //   (a) 보기 라인 (①②③…, ㄱ./ㄴ./…) + 끝 $ 누락 → 뒤에 $ 추가
  //   (b) ∴/∵로 시작하는 라인 + 앞 $ 누락 (끝에만 $) → 앞에 $ 추가
  //   (c) =로 시작하는 라인 + 앞 $ 누락 (끝에만 $) → 앞에 $ 추가 (연속식 복원)
  out = out.split('\n').map(line => {
    const count = (line.match(/\$/g) || []).length;
    if (count === 0 || count % 2 === 0) return line;

    // (a) 보기/한글 기호로 시작
    if (/^[①②③④⑤⑥⑦⑧⑨⑩㉠㉡㉢㉣㉤㉮㉯㉰㉱㉲㉳]|^[ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ]\./.test(line)) {
      const trimmed = line.trimEnd();
      if (!trimmed.endsWith('$')) return trimmed + '$';
      return line;
    }
    // (b) ∴/∵/\therefore/\because 시작 + 끝 $ → 앞 $ 추가
    const therMatch = line.match(/^(\s*)([∴∵])\s*(.+)$/);
    if (therMatch) {
      const [, ws, sym, rest] = therMatch;
      if (rest.trimEnd().endsWith('$') && !rest.startsWith('$')) {
        return `${ws}${sym} $${rest}`;
      }
    }
    // (c) =로 시작 + 끝 $ → 앞 $ 추가
    if (/^\s*=/.test(line) && line.trimEnd().endsWith('$')) {
      const ws = line.match(/^\s*/)?.[0] || '';
      return `${ws}$${line.slice(ws.length)}`;
    }
    return line;
  }).join('\n');

  // 1.8) 블록 수식 $$...$$ + 인라인 $\begin{aligned}...\end{aligned}$ 내부 \frac → \tfrac
  //      displaystyle/aligned 환경에서 분수 거대화 방지
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (full, inner: string) => {
    if (!/\\frac\b/.test(inner)) return full;
    return `$$${inner.replace(/\\frac\b/g, '\\tfrac')}$$`;
  });
  // 인라인 $\begin{aligned|array|cases|...}...\end{...}$ 도 처리
  out = out.replace(/\$(\\begin\{(?:aligned|array|cases|matrix|pmatrix|bmatrix|vmatrix|gathered|split)\}[\s\S]*?\\end\{(?:aligned|array|cases|matrix|pmatrix|bmatrix|vmatrix|gathered|split)\})\$/g, (_full, inner: string) => {
    if (!/\\frac\b/.test(inner)) return `$${inner}$`;
    return `$${inner.replace(/\\frac\b/g, '\\tfrac')}$`;
  });

  // 1.9) 연속 $$$+ 해체: 4개→ `$$\n\n$$`, 3개→ `$$\n$`
  out = out
    .replace(/\${4,}/g, '$$\n\n$$')
    .replace(/\${3}/g, '$$\n$');

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
 * 객관식 정답이 "값"(예: "9", "36", "120")으로 들어온 경우, choices와 대조해
 * 해당 보기 번호(①②③④⑤)로 변환.
 * - 이미 ①②③/ㄱㄴㄷ/㉠㉡㉢ 형식이면 그대로 반환
 * - 매칭 실패 시 원본 그대로
 */
export function resolveMultipleChoiceAnswer(answer: string, choices: string[] | null | undefined): string {
  if (!answer || !Array.isArray(choices) || choices.length === 0) return answer;
  const trimmed = answer.trim();
  // 올바른 형식은 건드리지 않음
  if (/^[①②③④⑤⑥⑦⑧⑨⑩,\s]+$/.test(trimmed)) return trimmed;
  if (/^[ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ,\s]+$/.test(trimmed)) return trimmed;
  if (/^[㉠㉡㉢㉣㉤㉮㉯㉰㉱㉲,\s]+$/.test(trimmed)) return trimmed;

  const normalize = (s: string) => s
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
    .replace(/\$/g, '')
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Za-z\-+\/\\{}.()]/g, '');
  const normAns = normalize(trimmed);
  if (!normAns) return trimmed;
  const idx = choices.findIndex(c => normalize(c) === normAns);
  if (idx < 0) return trimmed;
  return '①②③④⑤⑥⑦⑧⑨⑩'[idx] || trimmed;
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
