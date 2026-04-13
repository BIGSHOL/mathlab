/**
 * <보기> 블록의 그리드 열 수를 파싱/수정하는 공용 유틸.
 *
 * 마크다운 content 내 blockquote 첫 줄에 `<보기:cols=N>` 마커가 있을 수 있다.
 *   > <보기:cols=3>
 *   > ㄱ. $6$
 *   ...
 * cols: 1 | 2 | 3 | 'auto' — 기본값(마커 없음) = 2열
 */

export type BoxCols = 'auto' | 1 | 2 | 3;
export const DEFAULT_BOX_COLS: BoxCols = 2;

/** blockquote 첫 줄 텍스트에서 cols 지정자 추출 */
export function parseBoxCols(headerLine: string): BoxCols | null {
  const m = headerLine.match(/<보기(?::cols=(auto|1|2|3))?>/);
  if (!m) return null;
  if (!m[1]) return DEFAULT_BOX_COLS;
  if (m[1] === 'auto') return 'auto';
  return Number(m[1]) as 1 | 2 | 3;
}

/** 항목 개수로 자동 열 수 계산 (items.length >= 6 → 3열, >= 3 → 2열, 그 외 → 1열) */
export function autoCols(itemCount: number): 1 | 2 | 3 {
  if (itemCount >= 6) return 3;
  if (itemCount >= 3) return 2;
  return 1;
}

/** 실제 렌더 시 사용할 열 수 결정 */
export function resolveCols(cols: BoxCols, itemCount: number): 1 | 2 | 3 {
  if (cols === 'auto') return autoCols(itemCount);
  return cols;
}

/**
 * content 마크다운에서 첫 번째 <보기> 블록의 cols를 읽어온다.
 * 없으면 null.
 */
export function readBoxColsFromContent(content: string): BoxCols | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const stripped = line.replace(/^>\s?/, '');
    if (/<보기/.test(stripped)) {
      return parseBoxCols(stripped);
    }
  }
  return null;
}

/**
 * content 마크다운의 첫 <보기> 헤더를 새 cols로 치환.
 * <보기> 블록이 없거나 헤더 없으면 content 그대로 반환.
 */
export function writeBoxColsToContent(content: string, cols: BoxCols | null): string {
  const lines = content.split('\n');
  const newMarker = cols === null || cols === DEFAULT_BOX_COLS
    ? '<보기>'
    : cols === 'auto'
    ? '<보기:cols=auto>'
    : `<보기:cols=${cols}>`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prefix = line.match(/^>\s?/)?.[0] ?? '';
    const rest = line.slice(prefix.length);
    if (/<보기(?::cols=(?:auto|1|2|3))?>/.test(rest)) {
      // 기존 마커 치환
      lines[i] = prefix + rest.replace(/<보기(?::cols=(?:auto|1|2|3))?>/, newMarker);
      return lines.join('\n');
    }
  }
  return content;
}
