import { VennDiagramParams } from '../types';
import { svgWrap, katexLabel, COLORS } from '../shared/svg-utils';

const DEFAULT_SET_COLORS = [COLORS.primary, COLORS.red, COLORS.green];

/** 원소 목록을 여러 줄로 렌더링 (overflow 방지) */
function elementsMultiline(
  cx: number, cy: number, elements: string[],
  opts: { fontSize?: number; maxPerLine?: number } = {}
): string[] {
  const fs = opts.fontSize || 10;
  const maxPerLine = opts.maxPerLine || 3;
  const lineH = fs * 2;
  const lines: string[][] = [];
  for (let i = 0; i < elements.length; i += maxPerLine) {
    lines.push(elements.slice(i, i + maxPerLine));
  }
  const totalH = lines.length * lineH;
  const startY = cy - totalH / 2 + lineH / 2;
  return lines.map((chunk, idx) =>
    katexLabel(cx, startY + idx * lineH, chunk.join(',\\; '), { fontSize: fs })
  );
}

/** 벤 다이어그램 SVG 생성 (2~3집합, 쌍별 교집합 지원) */
export function renderVennDiagram(params: VennDiagramParams): string {
  const { sets, intersection, intersectionAB, intersectionBC, intersectionAC, universal } = params;
  // 최대 3개로 제한
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
      parts.push(katexLabel(totalW - 24, 28, 'U', { fontSize: 13 }));
      if (universal.elements?.length) {
        parts.push(katexLabel(totalW - 30, totalH - 28, universal.elements.join(',\\; '), { fontSize: 10, anchor: 'end' }));
      }
    }

    const colorA = sets[0]?.color || DEFAULT_SET_COLORS[0];
    const colorB = sets[1]?.color || DEFAULT_SET_COLORS[1];

    // 원 A
    parts.push(`<circle cx="${cx1}" cy="${cy}" r="${r}" fill="${colorA}" opacity="0.15" stroke="${colorA}" stroke-width="1.5"/>`);
    parts.push(katexLabel(cx1 - 30, cy - r - 10, sets[0]?.label || 'A', { fontSize: 13 }));
    if (sets[0]?.elements?.length) {
      // A만의 원소: 교집합 반대편(왼쪽)에 배치 (줄바꿈)
      parts.push(...elementsMultiline(cx1 - 32, cy, sets[0].elements, { fontSize: 10 }));
    }

    // 원 B
    if (n >= 2) {
      parts.push(`<circle cx="${cx2}" cy="${cy}" r="${r}" fill="${colorB}" opacity="0.15" stroke="${colorB}" stroke-width="1.5"/>`);
      parts.push(katexLabel(cx2 + 30, cy - r - 10, sets[1]?.label || 'B', { fontSize: 13 }));
      if (sets[1]?.elements?.length) {
        // B만의 원소: 교집합 반대편(오른쪽)에 배치 (줄바꿈)
        parts.push(...elementsMultiline(cx2 + 32, cy, sets[1].elements, { fontSize: 10 }));
      }
    }

    // 교집합
    if (intersection?.elements?.length) {
      parts.push(...elementsMultiline((cx1 + cx2) / 2, cy, intersection.elements, { fontSize: 10 }));
    }

    return svgWrap(parts.join('\n    '), totalW, totalH);
  }

  // 3집합 벤 다이어그램
  const totalW = 300;
  const totalH = 280;
  const r = 60;
  const centers: [number, number][] = [
    [120, 90],  // A
    [180, 90],  // B
    [150, 145], // C
  ];

  if (universal) {
    parts.push(`<rect x="10" y="10" width="${totalW - 20}" height="${totalH - 20}" fill="none" stroke="#333" stroke-width="1.5" rx="4"/>`);
    parts.push(katexLabel(totalW - 24, 28, 'U', { fontSize: 13 }));
    if (universal.elements?.length) {
      parts.push(katexLabel(totalW - 30, totalH - 28, universal.elements.join(',\\; '), { fontSize: 10, anchor: 'end' }));
    }
  }

  // 3개 원
  for (let i = 0; i < 3; i++) {
    const [cx, cy] = centers[i];
    const color = sets[i]?.color || DEFAULT_SET_COLORS[i];
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="1.5"/>`);
    const labelOffsets: [number, number][] = [[-40, -r - 10], [40, -r - 10], [0, r + 16]];
    const [ox, oy] = labelOffsets[i];
    parts.push(katexLabel(cx + ox, cy + oy, sets[i]?.label || String.fromCharCode(65 + i), { fontSize: 13 }));
    // 집합 고유 원소 — 교집합 반대편에 배치 (줄바꿈)
    if (sets[i]?.elements?.length) {
      const centroid = [(centers[0][0] + centers[1][0] + centers[2][0]) / 3, (centers[0][1] + centers[1][1] + centers[2][1]) / 3];
      const dx = cx - centroid[0];
      const dy = cy - centroid[1];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const elX = cx + (dx / d) * 35;
      const elY = cy + (dy / d) * 35;
      parts.push(...elementsMultiline(elX, elY, sets[i].elements!, { fontSize: 9, maxPerLine: 3 }));
    }
  }

  // 쌍별 교집합
  if (intersectionAB?.elements?.length) {
    const mx = (centers[0][0] + centers[1][0]) / 2;
    const my = (centers[0][1] + centers[1][1]) / 2 - 15;
    parts.push(...elementsMultiline(mx, my, intersectionAB.elements, { fontSize: 9, maxPerLine: 2 }));
  }
  if (intersectionBC?.elements?.length) {
    const mx = (centers[1][0] + centers[2][0]) / 2 + 12;
    const my = (centers[1][1] + centers[2][1]) / 2 + 8;
    parts.push(...elementsMultiline(mx, my, intersectionBC.elements, { fontSize: 9, maxPerLine: 2 }));
  }
  if (intersectionAC?.elements?.length) {
    const mx = (centers[0][0] + centers[2][0]) / 2 - 12;
    const my = (centers[0][1] + centers[2][1]) / 2 + 8;
    parts.push(...elementsMultiline(mx, my, intersectionAC.elements, { fontSize: 9, maxPerLine: 2 }));
  }

  // 전체 교집합 (A∩B∩C)
  if (intersection?.elements?.length) {
    const icx = (centers[0][0] + centers[1][0] + centers[2][0]) / 3;
    const icy = (centers[0][1] + centers[1][1] + centers[2][1]) / 3;
    parts.push(...elementsMultiline(icx, icy, intersection.elements, { fontSize: 9, maxPerLine: 2 }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
