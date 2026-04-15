/**
 * MathRenderer / EditableMathRenderer 공용 텍스트 전처리.
 * 두 렌더러가 동일한 입력에 대해 동일한 결과를 내도록 보장한다.
 *
 * - HTML entity 디코딩 (&nbsp; 등)
 * - 마크다운 이미지 title 파라미터 파싱 (width / align)
 * - 수식 사전 정규화: \(\) → $, $A$$B$ 글루 분리, \dfrac → \frac,
 *   유니코드 수학기호 (℃, ℉, Ω, …) → KaTeX 명령어
 *
 * 이 파일은 두 렌더러가 import 하므로, 한 곳만 수정하면 양쪽 동기화된다.
 */

/** HTML entity 디코딩 (rehype-raw 미사용 환경 대응) */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, '\u00A0')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

/** 마크다운 이미지 title 파싱: "50% center" → { width: '50%', align: 'center' } */
export function parseImageTitle(title: string | undefined): { width?: string; align?: string } {
  if (!title) return {};
  const parts = title.trim().split(/\s+/);
  let width: string | undefined;
  let align: string | undefined;
  for (const part of parts) {
    if (part.endsWith('%')) {
      const num = parseInt(part);
      if (num >= 10 && num <= 100) width = `${num}%`;
    } else if (['left', 'center', 'right'].includes(part)) {
      align = part;
    }
  }
  return { width, align };
}

/** KaTeX Main-Regular에 없는 유니코드 → LaTeX 명령어 */
const UNICODE_MATH_MAP: Array<[RegExp, string]> = [
  [/℃/g, '{}^\\circ\\mathrm{C}'],
  [/℉/g, '{}^\\circ\\mathrm{F}'],
  [/Ω/g, '\\Omega'],
  [/Å/g, '\\mathrm{\\AA}'],
  [/㎡/g, '\\mathrm{m}^2'],
  [/㎥/g, '\\mathrm{m}^3'],
  [/㎝/g, '\\mathrm{cm}'],
  [/㎜/g, '\\mathrm{mm}'],
  [/㎞/g, '\\mathrm{km}'],
  [/㎏/g, '\\mathrm{kg}'],
];

const MULTILINE_ENV = /\\begin\{(cases|align|aligned|array|matrix|pmatrix|bmatrix|vmatrix|split|gather|gathered)\}/;

/**
 * 수식 정규화 — KaTeX 입력 전 안전 변환.
 *  1) \(\) / \[\] → $...$ / $$...$$
 *  2) $A$$B$ → $A$ $B$ (5회 반복)
 *  3) 인라인 $...$에 multi-line 환경 → $$...$$ 승격
 *  4) $...$ / $$...$$ 내부 \dfrac → \frac, 유니코드 → LaTeX
 */
export function preprocessMathText(content: string): string {
  let out = content
    .replace(/\\\([\s\S]*?\\\)/g, (_m, p1) => `$${p1}$`)
    .replace(/\\\[[\s\S]*?\\\]/g, (_m, p1) => `$$$${p1}$$$$`);

  for (let i = 0; i < 5; i++) {
    const next = out.replace(/\$([^$\n]+)\$\$([^$\n]+)\$/g, (_m, a, b) => `$${a}$ $${b}$`);
    if (next === out) break;
    out = next;
  }

  out = out.replace(
    /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)(?<!\$)\$(?!\$)/g,
    (match, inner) => (MULTILINE_ENV.test(inner) ? `$$${inner}$$` : match),
  );

  out = out.replace(/\$(?!\$)((?:[^$\\]|\\.)*)\$/g, (_m, inner) => {
    let fixed = inner.replace(/\\dfrac(?![a-zA-Z])/g, '\\frac');
    for (const [re, repl] of UNICODE_MATH_MAP) fixed = fixed.replace(re, repl);
    return `$${fixed}$`;
  });

  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => {
    let fixed = inner.replace(/\\dfrac(?![a-zA-Z])/g, '\\frac');
    for (const [re, repl] of UNICODE_MATH_MAP) fixed = fixed.replace(re, repl);
    return `$$${fixed}$$`;
  });

  return out;
}
