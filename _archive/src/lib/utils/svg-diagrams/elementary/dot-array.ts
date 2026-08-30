import { DotArrayParams } from '../types';
import { svgWrap, text, COLORS } from '../shared/svg-utils';

/** 점 배열 SVG 생성 (rows × cols 격자) */
export function renderDotArray(params: DotArrayParams): string {
  const { rows, cols, symbol = '●', label } = params;
  const gap = 24;
  const r = 6;
  const gridW = (cols - 1) * gap;
  const gridH = (rows - 1) * gap;
  const pad = 20;
  const totalW = gridW + pad * 2;
  const totalH = gridH + pad * 2 + (label ? 20 : 0);
  const parts: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = pad + col * gap;
      const cy = pad + row * gap;
      if (symbol === '●' || !symbol) {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLORS.primary}"/>`);
      } else {
        parts.push(text(cx, cy, symbol, { fontSize: 16 }));
      }
    }
  }

  if (label) {
    parts.push(text(totalW / 2, totalH - 8, label, { fontSize: 13, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
