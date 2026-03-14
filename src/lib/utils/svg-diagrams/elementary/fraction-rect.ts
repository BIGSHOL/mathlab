import { FractionRectParams } from '../types';
import { svgWrap, rect, text, COLORS } from '../shared/svg-utils';

/** 분수 사각형 SVG 생성 (rows × cols 격자, 특정 셀 색칠) */
export function renderFractionRect(params: FractionRectParams): string {
  const { rows, cols, coloredCells = [], color = COLORS.primary, label } = params;
  const cellW = 40;
  const cellH = 40;
  const gridW = cols * cellW;
  const gridH = rows * cellH;
  const totalW = gridW;
  const totalH = label ? gridH + 24 : gridH;
  const parts: string[] = [];

  // 색칠된 셀을 Set으로
  const coloredSet = new Set(coloredCells);
  // coloredParts가 숫자면 앞에서부터 색칠
  const autoColor = coloredCells.length === 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const x = c * cellW;
      const y = r * cellH;
      const isColored = autoColor ? false : coloredSet.has(idx);
      parts.push(rect(x, y, cellW, cellH, {
        fill: isColored ? color : 'white',
        stroke: '#333',
        strokeWidth: 1.5,
      }));
      if (isColored) {
        // 반투명 오버레이
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${color}" opacity="0.3"/>`);
      }
    }
  }

  // 레이블
  if (label) {
    parts.push(text(gridW / 2, gridH + 16, label, { fontSize: 13, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
