import { LineGraphParams } from '../types';
import { svgWrap, line, circle, text, katexLabel, arrowHead, COLORS, TEXTBOOK_STYLE } from '../shared/svg-utils';

const DATASET_COLORS = [COLORS.primary, COLORS.red, COLORS.green, COLORS.purple, COLORS.secondary];

/** 꺾은선그래프 SVG 생성 (초4) */
export function renderLineGraph(params: LineGraphParams): string {
  const categories = Array.isArray(params.categories) ? params.categories : [];
  const datasets = Array.isArray(params.datasets) ? params.datasets : [];
  if (categories.length === 0 || datasets.length === 0) {
    return svgWrap(text(60, 30, '데이터 없음', { fontSize: 12 }), 120, 60);
  }

  const title = params.title;
  const yLabel = params.yLabel;
  const xLabel = params.xLabel;
  const showDots = params.showDots !== false;

  // 최대값 계산
  let dataMax = 0;
  for (const ds of datasets) {
    const vals = Array.isArray(ds.values) ? ds.values.map(Number) : [];
    for (const v of vals) if (v > dataMax) dataMax = v;
  }
  const maxVal = params.yMax || Math.max(dataMax, 1);
  const yStep = params.yStep || Math.ceil(maxVal / 5);
  const yTicks = Math.ceil(maxVal / yStep);
  const n = categories.length;

  const barGap = 50;
  const chartH = 150;
  const leftPad = yLabel ? 55 : 45;
  const bottomPad = 40;
  const topPad = title ? 28 : 10;
  const chartW = (n - 1) * barGap + barGap * 2;
  const totalW = leftPad + chartW + 20 + (datasets.length > 1 ? 80 : 0);
  const totalH = topPad + chartH + bottomPad + (xLabel ? 18 : 0);

  const toX = (i: number) => leftPad + barGap + i * barGap;
  const toY = (v: number) => topPad + chartH - (v / maxVal) * chartH;

  const parts: string[] = [];

  // 제목
  if (title) {
    parts.push(text(leftPad + chartW / 2, 12, title, { fontSize: 13, fontWeight: 'bold' }));
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
    parts.push(text(12, topPad + chartH / 2, yLabel, { fontSize: 10, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
  }

  // x축
  parts.push(line(leftPad, topPad + chartH, leftPad + chartW, topPad + chartH, { strokeWidth: 1.5 }));
  if (xLabel) {
    parts.push(text(leftPad + chartW / 2, totalH - 4, xLabel, { fontSize: 10, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
  }

  // x축 범주 라벨
  for (let i = 0; i < n; i++) {
    const x = toX(i);
    parts.push(line(x, topPad + chartH - 3, x, topPad + chartH + 3, { strokeWidth: 1 }));
    parts.push(text(x, topPad + chartH + 16, categories[i], { fontSize: 10, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
  }

  // 데이터셋별 꺾은선
  for (let di = 0; di < datasets.length; di++) {
    const ds = datasets[di];
    const vals = Array.isArray(ds.values) ? ds.values.map(Number) : [];
    const color = ds.color || DATASET_COLORS[di % DATASET_COLORS.length];

    // 선 연결
    for (let i = 0; i < Math.min(vals.length, n) - 1; i++) {
      parts.push(line(toX(i), toY(vals[i]), toX(i + 1), toY(vals[i + 1]), { stroke: color, strokeWidth: 2 }));
    }

    // 점
    if (showDots) {
      for (let i = 0; i < Math.min(vals.length, n); i++) {
        parts.push(circle(toX(i), toY(vals[i]), 3.5, { fill: color, stroke: 'white', strokeWidth: 1.5 }));
      }
    }
  }

  // 범례 (여러 데이터셋일 때)
  if (datasets.length > 1) {
    const legendX = leftPad + chartW + 8;
    for (let di = 0; di < datasets.length; di++) {
      const ds = datasets[di];
      const color = ds.color || DATASET_COLORS[di % DATASET_COLORS.length];
      const ly = topPad + 10 + di * 18;
      parts.push(line(legendX, ly, legendX + 16, ly, { stroke: color, strokeWidth: 2 }));
      parts.push(circle(legendX + 8, ly, 2.5, { fill: color, stroke: color }));
      if (ds.label) {
        parts.push(text(legendX + 22, ly, ds.label, { fontSize: 9, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR, anchor: 'start' }));
      }
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
