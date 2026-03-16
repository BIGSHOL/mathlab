import { FractionCircleParams } from '../types';
import { svgWrap, text, COLORS, hatchPatternDef } from '../shared/svg-utils';

/** 단일 분수 원 렌더링 (cx, cy 기준) */
function renderSingleCircle(
  cx: number, cy: number, r: number,
  totalParts: number,
  coloredSet: Set<number>, hatchedSet: Set<number>,
  globalHatching: boolean,
  color: string, patternId: string
): string {
  const parts: string[] = [];

  if (totalParts <= 1) {
    const isColored = coloredSet.has(0);
    const isHatched = hatchedSet.has(0) || (isColored && globalHatching);
    if (isHatched) {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${isColored ? color : 'white'}" fill-opacity="${isColored ? 0.2 : 1}" stroke="#555" stroke-width="1.5"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${patternId})" stroke="none"/>`);
    } else {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${isColored ? color : 'white'}" fill-opacity="${isColored ? 0.3 : 1}" stroke="#555" stroke-width="1.5"/>`);
    }
  } else {
    // 배경 원 (흰색)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="#555" stroke-width="1.5"/>`);

    // 파이 조각
    const angleStep = (2 * Math.PI) / totalParts;
    for (let i = 0; i < totalParts; i++) {
      const isColored = coloredSet.has(i);
      const isHatched = hatchedSet.has(i) || (isColored && globalHatching);

      if (isColored || isHatched) {
        const startAngle = -Math.PI / 2 + i * angleStep;
        const endAngle = startAngle + angleStep;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = angleStep > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

        if (isHatched) {
          if (isColored) {
            parts.push(`<path d="${d}" fill="${color}" fill-opacity="0.15" stroke="none"/>`);
          }
          parts.push(`<path d="${d}" fill="url(#${patternId})" stroke="none"/>`);
        } else if (isColored) {
          parts.push(`<path d="${d}" fill="${color}" fill-opacity="0.35" stroke="none"/>`);
        }
      }
    }

    // 분할선 (중심에서 원주까지)
    for (let i = 0; i < totalParts; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      parts.push(`<line x1="${cx}" y1="${cy}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="#555" stroke-width="1"/>`);
    }

    // 외곽선 다시 그리기
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#555" stroke-width="1.5"/>`);
  }

  // 중앙 점
  parts.push(`<circle cx="${cx}" cy="${cy}" r="1.5" fill="#555"/>`);

  return parts.join('\n    ');
}

/** 분수 원 SVG 생성 — 여러 개의 N등분 원 지원 */
export function renderFractionCircle(params: FractionCircleParams): string {
  const totalParts = Math.max(1, Math.round(Number(params.totalParts) || 1));
  const coloredParts = Math.max(0, Math.round(Number(params.coloredParts) || 0));
  const hatchedParts = Math.max(0, Math.round(Number(params.hatchedParts) || 0));
  const globalHatching = !!params.hatching;
  const count = Math.max(1, Math.min(10, Math.round(Number(params.count) || 1)));
  const color = params.color || COLORS.primary;
  const label = params.label;
  const patternId = 'hatch-fc-' + color.replace('#', '');

  // 개별 조각 모드 vs 개수 모드
  const hasSliceMode = Array.isArray(params.coloredSlices) && params.coloredSlices.length > 0;
  const globalColoredSlices = new Set(hasSliceMode ? params.coloredSlices!.map(Number) : []);
  const globalHatchedSlices = new Set(Array.isArray(params.hatchedSlices) ? params.hatchedSlices.map(Number) : []);

  const r = 35;
  const gap = 16;
  const diameter = r * 2;
  const totalW = count * diameter + (count - 1) * gap;
  const totalH = label ? diameter + 28 : diameter;
  const parts: string[] = [];

  // 빗금 패턴 정의
  const needsHatch = hatchedParts > 0 || globalHatching || globalHatchedSlices.size > 0;
  if (needsHatch) {
    parts.push(hatchPatternDef(patternId, color));
  }

  for (let g = 0; g < count; g++) {
    const cx = r + g * (diameter + gap);
    const cy = r;

    // 이 원의 색칠/빗금 set 구성
    const localColored = new Set<number>();
    const localHatched = new Set<number>();

    if (hasSliceMode) {
      // 개별 조각 모드: 글로벌 인덱스 → 로컬 인덱스
      for (let i = 0; i < totalParts; i++) {
        if (globalColoredSlices.has(g * totalParts + i)) localColored.add(i);
        if (globalHatchedSlices.has(g * totalParts + i)) localHatched.add(i);
      }
    } else {
      // 개수 모드: 앞에서부터 N개
      for (let i = 0; i < Math.min(totalParts, coloredParts); i++) localColored.add(i);
      for (let i = 0; i < Math.min(totalParts, hatchedParts); i++) localHatched.add(i);
    }

    parts.push(renderSingleCircle(cx, cy, r, totalParts, localColored, localHatched, globalHatching, color, patternId));
  }

  if (label) {
    parts.push(text(totalW / 2, totalH - 6, label, { fontSize: 12, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
