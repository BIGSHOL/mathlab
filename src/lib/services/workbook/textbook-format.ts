/**
 * 워크북 출력용 풍부 본문(textbook-rich) 후처리
 *
 * Gemini가 생성한 본문에 세 가지 깨짐이 있어 처리:
 *
 * 1) JSON parser가 LaTeX 백슬래시를 control 문자로 잘못 해석한 경우 복원
 *    - AI가 응답을 "\\frac" 대신 "\frac"으로 보내면 JSON parser가 \f를 폼피드(0x0C)로 해석.
 *    - 결과: 본문에 <폼피드>rac, <탭>ext 등이 들어가고 KaTeX는 "rac", "ext"로 인식 → 빨간 에러.
 *    - 복원: 탭(0x09)→\t, VT(0x0B)→\v, FF(0x0C)→\f, BS(0x08)→\b
 *
 * 2) 수식 박스 `$...$` 밖에 노출된 LaTeX 명령어 자동 wrap
 *    - AI가 \text{%}, \frac{a}{b} 등을 $ 없이 평문에 둔 경우, 인접 표현과 함께 묶어 $...$로 감쌈
 *    - bracket을 brace로 잘못 쓴 경우(\frac[a]{b})도 복구
 *
 * 3) 한 문단으로 흐르는 본문에 paragraph break 자동 삽입 (마크다운 `\n\n`)
 *    - (1)~(9), ①②…⑨, ⓐⓑ…ⓞ 앞에 \n\n
 *    - "예) " 앞에 \n\n
 */

// 안전하게 control char regex를 RegExp constructor로 생성 (편집기/transformer 호환)
const RE_TAB = new RegExp(String.fromCharCode(0x09), 'g');
const RE_VT = new RegExp(String.fromCharCode(0x0b), 'g');
const RE_FF = new RegExp(String.fromCharCode(0x0c), 'g');
const RE_BS = new RegExp(String.fromCharCode(0x08), 'g');

export function formatRichTextbookContent(text: string): string {
  if (!text) return text;

  // 1) Control char → 백슬래시 + 첫글자로 복원 (LaTeX 명령어 정상화)
  let out = text
    .replace(RE_TAB, '\\t')  // \text, \times, \theta, \tau, \tan
    .replace(RE_VT, '\\v')   // \varepsilon, \vec, \varphi
    .replace(RE_FF, '\\f')   // \frac, \forall, \fbox
    .replace(RE_BS, '\\b');  // \bar, \beta, \binom

  // 2) bracket → brace 복구
  out = out.replace(/\\frac\[([^\]]+)\]\{([^}]+)\}/g, '\\frac{$1}{$2}');

  // 2.5) KaTeX `%` escape — `\text{%}`는 LaTeX comment 마커 충돌로 빨간 에러.
  //      $...$ 안에서만 `%` → `\%`로 변환 (수식 바깥의 % 부호는 그대로 둠).
  out = out.replace(/\$([^$\n]+)\$/g, (_m, inner: string) => {
    const escaped = inner.replace(/(?<!\\)%/g, '\\%');
    return `$${escaped}$`;
  });

  // 2.6) 수식 박스 `$...$` 밖에 노출된 `\text{...}` 는 백슬래시·중괄호 제거하고 평문화.
  //      AI가 한국어 설명을 \text{한국어} 안에 넣은 케이스 (예: \text{괄호를 풀 때...})
  //      $..$ 영역만 보호한 채 밖에서만 unwrap.
  {
    const segs = out.split(/(\$[^$\n]+\$)/g);
    for (let i = 0; i < segs.length; i += 2) {
      // 단순 \text{내용} 한 단계만 unwrap (중첩 brace는 무시)
      segs[i] = segs[i].replace(/\\text\{([^{}]+)\}/g, '$1');
      // 단순 \frac{a}{b} (a, b 모두 중첩 brace 없는 단순값) → $\frac{a}{b}$ wrap
      // 보수적: 인접 토큰과 묶지 않고 \frac{}{} 자체만 wrap
      segs[i] = segs[i].replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$$\\frac{$1}{$2}$$');
    }
    out = segs.join('');
  }

  // 3) (1) (2) ... (9) 앞 — 단, 줄 시작이 아닐 때만
  out = out.replace(/(?<!^)(?<!\n)(?<!\n\n)(\([1-9]\))/g, '\n\n$1');

  // 4) 원숫자 ①~⑨ 앞
  out = out.replace(/(?<!^)(?<!\n)(?<!\n\n)([①②③④⑤⑥⑦⑧⑨])/g, '\n\n$1');

  // 5) 원알파벳 ⓐ~ⓞ 앞 (소문자만)
  out = out.replace(/(?<!^)(?<!\n)(?<!\n\n)([ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞ])/g, '\n\n$1');

  // 6) "예) " 앞 (예시 시작) — 문장 끝 직후만
  out = out.replace(/([.!?])\s*(예\))/g, '$1\n\n$2');

  // 7) 3개 이상 연속 줄바꿈 → 2개로 정리
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

/**
 * 수식 박스 `$...$` 밖에 노출된 LaTeX 명령어를 자동 wrap.
 *
 * - \frac[a]{b} → \frac{a}{b} (bracket 오기 복구; KaTeX는 \frac에 brace만 허용)
 * - 평문 안의 \text{...}, \frac{...}{...}, \times 등을 인접 표현과 함께 $...$로 묶음
 *
 * 단, 이미 $...$ 안에 있는 부분은 보호.
 */
function wrapBareLatexInDollars(text: string): string {
  // (a) bracket → brace 복구
  let out = text.replace(/\\frac\[([^\]]+)\]\{([^}]+)\}/g, '\\frac{$1}{$2}');

  // (b) $...$ 영역을 인덱스로 분할: 짝수 인덱스는 $ 밖 (수정 대상), 홀수는 $ 안 (보호)
  const segments = out.split(/(\$[^$\n]+\$)/g);

  // 자주 깨지는 패턴 감지용
  const LATEX_CMD_RE = /\\(?:text|frac|times|div|sqrt|sum|int|cdot|leq|geq|neq|approx|pm|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|tau|phi|psi|omega|Delta|Theta|Sigma|Phi|Psi|Omega|overline|widehat|dots|ldots|cdots|circ|prime)\b/;

  for (let i = 0; i < segments.length; i += 2) {
    const seg = segments[i];
    if (!seg || !LATEX_CMD_RE.test(seg)) continue;

    // 인접 표현과 묶는 패턴:
    //   숫자/한글/영문/괄호 + LaTeX 토큰 (선택적으로 \\arg{...} 0~3회) + 인접 수식 토큰 0~여러회
    segments[i] = seg.replace(
      /(?:[\d.,a-zA-Z()\-+]*\\(?:text|frac|times|div|sqrt|sum|int|cdot|leq|geq|neq|approx|pm|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|tau|phi|psi|omega|Delta|Theta|Sigma|Phi|Psi|Omega|overline|widehat|dots|ldots|cdots|circ|prime)(?:\{[^}]*\}){0,3}(?:\s*\\(?:text|frac|times|div|cdot|leq|geq|sqrt|sum|int|approx|pm|circ)(?:\{[^}]*\}){0,3}|\s*[\d.,a-zA-Z()\-+=]+|\s*[一-龥가-힣]+)*)/g,
      (match) => {
        if (!match.trim()) return match;
        const lead = match.match(/^\s+/)?.[0] ?? '';
        const trail = match.match(/\s+$/)?.[0] ?? '';
        const body = match.slice(lead.length, match.length - trail.length);
        if (!body) return match;
        // 한글이 본문 마지막에 붙으면 분리 (한글은 수식 밖)
        const korTail = body.match(/[가-힣\s]+$/)?.[0] ?? '';
        const mathBody = korTail ? body.slice(0, body.length - korTail.length) : body;
        if (!mathBody) return match;
        return `${lead}$${mathBody}$${korTail}${trail}`;
      },
    );
  }

  return segments.join('');
}
