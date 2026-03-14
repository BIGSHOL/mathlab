import { PlaceValueParams } from '../types';
import { svgWrap, rect, text, COLORS } from '../shared/svg-utils';

/** 수 모형 SVG 생성 (백의 자리=큰 사각형, 십의 자리=막대, 일의 자리=작은 정사각형) */
export function renderPlaceValue(params: PlaceValueParams): string {
  const { hundreds, tens, ones } = params;
  const parts: string[] = [];
  let xOffset = 0;
  const gap = 12;

  // 백의 자리: 큰 사각형 (10×10 격자)
  const hundredSize = 50;
  for (let i = 0; i < hundreds; i++) {
    const x = xOffset;
    // 10×10 격자
    parts.push(rect(x, 0, hundredSize, hundredSize, { fill: COLORS.primary, stroke: '#333', strokeWidth: 1 }));
    parts.push(`<rect x="${x}" y="0" width="${hundredSize}" height="${hundredSize}" fill="${COLORS.primary}" opacity="0.25"/>`);
    // 격자선
    for (let g = 1; g < 10; g++) {
      const gx = x + (hundredSize / 10) * g;
      const gy = (hundredSize / 10) * g;
      parts.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${hundredSize}" stroke="#333" stroke-width="0.3"/>`);
      parts.push(`<line x1="${x}" y1="${gy}" x2="${x + hundredSize}" y2="${gy}" stroke="#333" stroke-width="0.3"/>`);
    }
    parts.push(text(x + hundredSize / 2, hundredSize + 14, '100', { fontSize: 10 }));
    xOffset += hundredSize + gap;
  }

  // 십의 자리: 세로 막대 (1×10 격자)
  const tenW = 8;
  const tenH = hundredSize;
  if (tens > 0 && hundreds > 0) xOffset += 4;
  for (let i = 0; i < tens; i++) {
    const x = xOffset;
    parts.push(rect(x, 0, tenW, tenH, { fill: COLORS.green, stroke: '#333', strokeWidth: 0.8 }));
    parts.push(`<rect x="${x}" y="0" width="${tenW}" height="${tenH}" fill="${COLORS.green}" opacity="0.3"/>`);
    // 격자선
    for (let g = 1; g < 10; g++) {
      const gy = (tenH / 10) * g;
      parts.push(`<line x1="${x}" y1="${gy}" x2="${x + tenW}" y2="${gy}" stroke="#333" stroke-width="0.3"/>`);
    }
    xOffset += tenW + 3;
  }
  if (tens > 0) {
    parts.push(text(xOffset - (tens * (tenW + 3)) / 2, tenH + 14, `${tens}0`, { fontSize: 10 }));
  }

  // 일의 자리: 작은 정사각형
  const oneSize = 8;
  if (ones > 0 && (hundreds > 0 || tens > 0)) xOffset += 8;
  const onesStartX = xOffset;
  for (let i = 0; i < ones; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const x = onesStartX + col * (oneSize + 2);
    const y = row * (oneSize + 2);
    parts.push(rect(x, y, oneSize, oneSize, { fill: COLORS.secondary, stroke: '#333', strokeWidth: 0.8 }));
    parts.push(`<rect x="${x}" y="${y}" width="${oneSize}" height="${oneSize}" fill="${COLORS.secondary}" opacity="0.3"/>`);
  }
  if (ones > 0) {
    const onesW = Math.min(ones, 5) * (oneSize + 2);
    parts.push(text(onesStartX + onesW / 2, tenH + 14, `${ones}`, { fontSize: 10 }));
    xOffset = onesStartX + onesW;
  }

  const totalW = xOffset + 5;
  const totalH = hundredSize + 24;

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
