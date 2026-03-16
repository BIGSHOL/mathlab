import { PieChartParams } from '../types';
import { svgWrap, text, katexLabel, COLORS } from '../shared/svg-utils';

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.green, COLORS.purple, COLORS.red, COLORS.yellow, COLORS.gray];

/** 원그래프 SVG 생성 (초6) */
export function renderPieChart(params: PieChartParams): string {
  const segments = Array.isArray(params.segments) ? params.segments : [];
  if (segments.length === 0) return svgWrap(text(60, 30, '데이터 없음', { fontSize: 12 }), 120, 60);

  const title = params.title;
  const showPercent = params.showPercent !== false;
  const showValue = !!params.showValue;

  const r = 70;
  const cx = r + 30;
  const topPad = title ? 28 : 10;
  const cy = topPad + r;
  const legendW = 90;
  const totalW = cx + r + 20 + legendW;
  const totalH = topPad + r * 2 + 20;

  // 총합 계산
  const total = segments.reduce((s, seg) => s + Math.max(0, Number(seg.value) || 0), 0);
  if (total === 0) return svgWrap(text(60, 30, '합계 0', { fontSize: 12 }), 120, 60);

  const parts: string[] = [];

  // 제목
  if (title) {
    parts.push(text(cx, 12, title, { fontSize: 13, fontWeight: 'bold' }));
  }

  // 파이 조각
  let currentAngle = -Math.PI / 2; // 12시 시작
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const val = Math.max(0, Number(seg.value) || 0);
    const ratio = val / total;
    const angleSpan = ratio * 2 * Math.PI;
    const color = seg.color || PIE_COLORS[i % PIE_COLORS.length];

    if (ratio > 0) {
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSpan;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angleSpan > Math.PI ? 1 : 0;

      if (ratio >= 0.999) {
        // 100% — 원 전체
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.5" stroke="${color}" stroke-width="1.5"/>`);
      } else {
        const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        parts.push(`<path d="${d}" fill="${color}" fill-opacity="0.5" stroke="white" stroke-width="1.5"/>`);
      }

      // 라벨 (파이 바깥)
      const midAngle = startAngle + angleSpan / 2;
      const labelR = r + 18;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      const pct = Math.round(ratio * 100);
      let labelStr = '';
      if (showPercent) labelStr = `${pct}\\%`;
      if (showValue) labelStr = labelStr ? `${labelStr}\\;(${val})` : val.toString();
      if (labelStr) {
        parts.push(katexLabel(lx, ly, labelStr, { fontSize: 10 }));
      }
    }
    currentAngle += angleSpan;
  }

  // 외곽선
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#555" stroke-width="1.5"/>`);

  // 범례 (오른쪽)
  const legendX = cx + r + 24;
  const legendStartY = topPad + 10;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const color = seg.color || PIE_COLORS[i % PIE_COLORS.length];
    const ly = legendStartY + i * 20;
    parts.push(`<rect x="${legendX}" y="${ly - 5}" width="12" height="12" rx="2" fill="${color}" fill-opacity="0.6"/>`);
    parts.push(text(legendX + 18, ly + 1, seg.label, { fontSize: 10, fill: '#333', anchor: 'start' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
