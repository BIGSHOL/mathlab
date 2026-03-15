import { FractionCircleParams } from '../types';
import { svgWrap, text, COLORS } from '../shared/svg-utils';

/** 단일 분수 원 렌더링 (cx, cy 기준) */
function renderSingleCircle(
  cx: number, cy: number, r: number,
  totalParts: number, coloredParts: number, color: string
): string {
  const parts: string[] = [];

  if (totalParts <= 1) {
    const fill = coloredParts >= 1 ? color : 'white';
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" fill-opacity="${coloredParts >= 1 ? 0.3 : 1}" stroke="#555" stroke-width="1.5"/>`);
  } else {
    // 배경 원 (흰색)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="#555" stroke-width="1.5"/>`);

    // 색칠된 파이 조각
    const angleStep = (2 * Math.PI) / totalParts;
    for (let i = 0; i < coloredParts && i < totalParts; i++) {
      const startAngle = -Math.PI / 2 + i * angleStep;
      const endAngle = startAngle + angleStep;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angleStep > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      parts.push(`<path d="${d}" fill="${color}" fill-opacity="0.35" stroke="none"/>`);
    }

    // 분할선 (중심에서 원주까지)
    for (let i = 0; i < totalParts; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      parts.push(`<line x1="${cx}" y1="${cy}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="#555" stroke-width="1"/>`);
    }

    // 외곽선 다시 그리기 (분할선 위에)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#555" stroke-width="1.5"/>`);
  }

  // 중앙 점
  parts.push(`<circle cx="${cx}" cy="${cy}" r="1.5" fill="#555"/>`);

  return parts.join('\n    ');
}

/** 분수 원 SVG 생성 — 여러 개의 N등분 원 지원 */
export function renderFractionCircle(params: FractionCircleParams): string {
  // 파라미터 방어적 처리
  const totalParts = Math.max(1, Math.round(Number(params.totalParts) || 1));
  const coloredParts = Math.max(0, Math.round(Number(params.coloredParts) || 0));
  const count = Math.max(1, Math.min(10, Math.round(Number(params.count) || 1)));
  const color = params.color || COLORS.primary;
  const label = params.label;

  const r = 35; // 원 반지름
  const gap = 16; // 원 사이 간격
  const diameter = r * 2;
  const totalW = count * diameter + (count - 1) * gap;
  const totalH = label ? diameter + 28 : diameter;
  const parts: string[] = [];

  for (let i = 0; i < count; i++) {
    const cx = r + i * (diameter + gap);
    const cy = r;
    // 마지막 원에서 coloredParts가 totalParts보다 크면 넘침 처리
    const remainingColored = Math.max(0, coloredParts - i * totalParts);
    const thisColored = Math.min(totalParts, remainingColored);
    parts.push(renderSingleCircle(cx, cy, r, totalParts, thisColored, color));
  }

  // 레이블
  if (label) {
    parts.push(text(totalW / 2, totalH - 6, label, { fontSize: 12, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
