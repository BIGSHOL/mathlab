import { FractionCircleParams } from '../types';
import { svgWrap, text, COLORS } from '../shared/svg-utils';

/** 분수 원 SVG 생성 (n등분, k칸 색칠) */
export function renderFractionCircle(params: FractionCircleParams): string {
  const { totalParts, coloredParts, color = COLORS.primary, label } = params;
  const cx = 60;
  const cy = 60;
  const r = 50;
  const totalW = 120;
  const totalH = label ? 140 : 120;
  const parts: string[] = [];

  if (totalParts <= 1) {
    // 전체 원
    const fill = coloredParts >= 1 ? color : 'none';
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#333" stroke-width="1.5" opacity="0.3"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="1.5"/>`);
  } else {
    // n등분 파이
    const angleStep = (2 * Math.PI) / totalParts;
    for (let i = 0; i < totalParts; i++) {
      const startAngle = -Math.PI / 2 + i * angleStep;
      const endAngle = startAngle + angleStep;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angleStep > Math.PI ? 1 : 0;

      const fill = i < coloredParts ? color : 'white';
      const opacity = i < coloredParts ? '0.35' : '1';
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      parts.push(`<path d="${d}" fill="${fill}" stroke="#333" stroke-width="1.5" opacity="${opacity}"/>`);
    }
    // 외곽선 다시
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="1.5"/>`);
  }

  // 중앙 점
  parts.push(`<circle cx="${cx}" cy="${cy}" r="2" fill="#333"/>`);

  // 레이블
  if (label) {
    parts.push(text(cx, totalH - 8, label, { fontSize: 13, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
