import { VennDiagramParams } from '../types';
import { svgWrap, text, COLORS } from '../shared/svg-utils';

/** 벤 다이어그램 SVG 생성 (2~3집합) */
export function renderVennDiagram(params: VennDiagramParams): string {
  const { sets, intersection, universal } = params;
  const n = Math.min(sets.length, 3);
  const parts: string[] = [];

  if (n <= 2) {
    // 2집합 벤 다이어그램
    const totalW = 260;
    const totalH = 200;
    const r = 65;
    const cy = 90;
    const cx1 = 100;
    const cx2 = 160;

    // 전체집합 사각형
    if (universal) {
      parts.push(`<rect x="10" y="10" width="${totalW - 20}" height="${totalH - 20}" fill="none" stroke="#333" stroke-width="1.5" rx="4"/>`);
      parts.push(text(totalW - 24, 28, 'U', { fontSize: 13, fontWeight: 'bold' }));
      if (universal.elements?.length) {
        parts.push(text(totalW - 30, totalH - 28, universal.elements.join(', '), { fontSize: 10, anchor: 'end' }));
      }
    }

    // 원 A
    parts.push(`<circle cx="${cx1}" cy="${cy}" r="${r}" fill="${COLORS.primary}" opacity="0.15" stroke="${COLORS.primary}" stroke-width="1.5"/>`);
    parts.push(text(cx1 - 30, cy - r - 10, sets[0]?.label || 'A', { fontSize: 13, fontWeight: 'bold', fill: COLORS.primary }));
    if (sets[0]?.elements?.length) {
      parts.push(text(cx1 - 20, cy, sets[0].elements.join(', '), { fontSize: 10 }));
    }

    // 원 B
    if (n >= 2) {
      parts.push(`<circle cx="${cx2}" cy="${cy}" r="${r}" fill="${COLORS.red}" opacity="0.15" stroke="${COLORS.red}" stroke-width="1.5"/>`);
      parts.push(text(cx2 + 30, cy - r - 10, sets[1]?.label || 'B', { fontSize: 13, fontWeight: 'bold', fill: COLORS.red }));
      if (sets[1]?.elements?.length) {
        parts.push(text(cx2 + 20, cy, sets[1].elements.join(', '), { fontSize: 10 }));
      }
    }

    // 교집합
    if (intersection?.elements?.length) {
      parts.push(text((cx1 + cx2) / 2, cy, intersection.elements.join(', '), { fontSize: 10, fontWeight: 'bold' }));
    }

    return svgWrap(parts.join('\n    '), totalW, totalH);
  }

  // 3집합 벤 다이어그램
  const totalW = 300;
  const totalH = 260;
  const r = 60;
  const centers: [number, number][] = [
    [120, 90],  // A
    [180, 90],  // B
    [150, 145], // C
  ];
  const colors = [COLORS.primary, COLORS.red, COLORS.green];

  if (universal) {
    parts.push(`<rect x="10" y="10" width="${totalW - 20}" height="${totalH - 20}" fill="none" stroke="#333" stroke-width="1.5" rx="4"/>`);
    parts.push(text(totalW - 24, 28, 'U', { fontSize: 13, fontWeight: 'bold' }));
  }

  for (let i = 0; i < 3; i++) {
    const [cx, cy] = centers[i];
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[i]}" opacity="0.12" stroke="${colors[i]}" stroke-width="1.5"/>`);
    // 라벨 위치
    const labelOffsets: [number, number][] = [[-40, -r - 10], [40, -r - 10], [0, r + 16]];
    const [ox, oy] = labelOffsets[i];
    parts.push(text(cx + ox, cy + oy, sets[i]?.label || String.fromCharCode(65 + i), {
      fontSize: 13, fontWeight: 'bold', fill: colors[i],
    }));
    if (sets[i]?.elements?.length) {
      const elOffsets: [number, number][] = [[-25, 0], [25, 0], [0, 20]];
      const [ex, ey] = elOffsets[i];
      parts.push(text(cx + ex, cy + ey, sets[i].elements!.join(', '), { fontSize: 9 }));
    }
  }

  if (intersection?.elements?.length) {
    const icx = (centers[0][0] + centers[1][0] + centers[2][0]) / 3;
    const icy = (centers[0][1] + centers[1][1] + centers[2][1]) / 3;
    parts.push(text(icx, icy, intersection.elements.join(', '), { fontSize: 9, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
