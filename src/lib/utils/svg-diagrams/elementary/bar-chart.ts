import { BarChartParams } from '../types';
import { svgWrap, line, rect, text, katexLabel, arrowHead, COLORS } from '../shared/svg-utils';

/** 막대그래프 SVG 생성 (초4) */
export function renderBarChart(params: BarChartParams): string {
  const categories = Array.isArray(params.categories) ? params.categories : [];
  const values = Array.isArray(params.values) ? params.values.map(Number) : [];
  const n = Math.min(categories.length, values.length);
  if (n === 0) return svgWrap(text(60, 30, '데이터 없음', { fontSize: 12 }), 120, 60);

  const horizontal = !!params.horizontal;
  const barColor = params.barColor || COLORS.primary;
  const title = params.title;
  const yLabel = params.yLabel;
  const xLabel = params.xLabel;

  const maxVal = params.yMax || Math.max(...values, 1);
  const yStep = params.yStep || Math.ceil(maxVal / 5);
  const yTicks = Math.ceil(maxVal / yStep);

  const parts: string[] = [];

  if (!horizontal) {
    // ── 세로 막대그래프 ──
    const barW = 30;
    const barGap = 20;
    const chartH = 150;
    const leftPad = yLabel ? 55 : 45;
    const bottomPad = 40;
    const topPad = title ? 28 : 10;
    const chartW = n * (barW + barGap) + barGap;
    const totalW = leftPad + chartW + 20;
    const totalH = topPad + chartH + bottomPad + (xLabel ? 18 : 0);

    const toY = (v: number) => topPad + chartH - (v / maxVal) * chartH;

    // 제목
    if (title) {
      parts.push(text(totalW / 2, 12, title, { fontSize: 13, fontWeight: 'bold' }));
    }

    // 격자선 + y축 눈금
    for (let i = 0; i <= yTicks; i++) {
      const val = i * yStep;
      if (val > maxVal) break;
      const y = toY(val);
      parts.push(line(leftPad, y, leftPad + chartW, y, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
      parts.push(katexLabel(leftPad - 14, y, val.toString(), { fontSize: 11, anchor: 'end' }));
    }

    // y축
    parts.push(line(leftPad, toY(maxVal) - 10, leftPad, topPad + chartH, { strokeWidth: 1.5 }));
    parts.push(arrowHead(leftPad, toY(maxVal) - 10, -90, 6));
    if (yLabel) {
      parts.push(text(12, topPad + chartH / 2, yLabel, { fontSize: 10, fill: '#666' }));
    }

    // x축
    parts.push(line(leftPad, topPad + chartH, leftPad + chartW, topPad + chartH, { strokeWidth: 1.5 }));
    if (xLabel) {
      parts.push(text(leftPad + chartW / 2, totalH - 4, xLabel, { fontSize: 10, fill: '#666' }));
    }

    // 막대
    for (let i = 0; i < n; i++) {
      const val = Math.max(0, values[i]);
      const x = leftPad + barGap + i * (barW + barGap);
      const y = toY(val);
      const h = topPad + chartH - y;
      parts.push(rect(x, y, barW, h, { fill: barColor, stroke: barColor, strokeWidth: 1 }));
      parts.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${barColor}" fill-opacity="0.5" stroke="${barColor}" stroke-width="1"/>`);
      // 범주 라벨
      parts.push(text(x + barW / 2, topPad + chartH + 16, categories[i], { fontSize: 10, fill: '#333' }));
    }

    return svgWrap(parts.join('\n    '), totalW, totalH);
  } else {
    // ── 가로 막대그래프 ──
    const barH = 24;
    const barGap = 14;
    const chartW = 180;
    const leftPad = 70;
    const topPad = title ? 28 : 10;
    const chartH = n * (barH + barGap) + barGap;
    const totalW = leftPad + chartW + 30;
    const totalH = topPad + chartH + 30;

    const toX = (v: number) => leftPad + (v / maxVal) * chartW;

    if (title) {
      parts.push(text(totalW / 2, 12, title, { fontSize: 13, fontWeight: 'bold' }));
    }

    // 격자선 + x축 눈금
    for (let i = 0; i <= yTicks; i++) {
      const val = i * yStep;
      if (val > maxVal) break;
      const x = toX(val);
      parts.push(line(x, topPad, x, topPad + chartH, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
      parts.push(katexLabel(x, topPad + chartH + 14, val.toString(), { fontSize: 11 }));
    }

    // x축
    parts.push(line(leftPad, topPad + chartH, leftPad + chartW + 10, topPad + chartH, { strokeWidth: 1.5 }));
    parts.push(arrowHead(leftPad + chartW + 10, topPad + chartH, 0, 6));
    // y축
    parts.push(line(leftPad, topPad, leftPad, topPad + chartH, { strokeWidth: 1.5 }));

    // 막대
    for (let i = 0; i < n; i++) {
      const val = Math.max(0, values[i]);
      const y = topPad + barGap + i * (barH + barGap);
      const w = (val / maxVal) * chartW;
      parts.push(`<rect x="${leftPad}" y="${y}" width="${w}" height="${barH}" fill="${barColor}" fill-opacity="0.5" stroke="${barColor}" stroke-width="1"/>`);
      // 범주 라벨 (왼쪽)
      parts.push(text(leftPad - 6, y + barH / 2, categories[i], { fontSize: 10, fill: '#333', anchor: 'end' }));
    }

    return svgWrap(parts.join('\n    '), totalW, totalH);
  }
}
