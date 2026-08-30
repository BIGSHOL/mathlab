import { ScatterPlotParams } from '../types';
import { svgWrap, line, circle, text, katexLabel, arrowHead, COLORS, createCoordinateMapper, TEXTBOOK_STYLE } from '../shared/svg-utils';

/** 산점도 SVG 생성 (중3) */
export function renderScatterPlot(params: ScatterPlotParams): string {
  const points = Array.isArray(params.points) ? params.points : [];
  const xRange = Array.isArray(params.xRange) ? params.xRange : [0, 10];
  const yRange = Array.isArray(params.yRange) ? params.yRange : [0, 10];
  const [xMin, xMax] = [Number(xRange[0]) || 0, Number(xRange[1]) || 10];
  const [yMin, yMax] = [Number(yRange[0]) || 0, Number(yRange[1]) || 10];
  const gridStep = Math.max(0.1, Number(params.gridStep) || 1);
  const title = params.title;
  const xLabel = params.xLabel;
  const yLabel = params.yLabel;
  const showTrend = !!params.showTrendLine;
  const trendColor = params.trendLineColor || COLORS.red;

  const cellSize = 30;
  const xCells = Math.round((xMax - xMin) / gridStep);
  const yCells = Math.round((yMax - yMin) / gridStep);
  const gridW = xCells * cellSize;
  const gridH = yCells * cellSize;
  const pad = 35;
  const topPad = title ? 28 : 10;
  const totalW = pad + gridW + 30 + (yLabel ? 15 : 0);
  const totalH = topPad + gridH + pad + (xLabel ? 18 : 0);
  const leftPad = pad + (yLabel ? 15 : 0);

  const { toX, toY } = createCoordinateMapper({
    xMin, xMax, yMin, yMax,
    width: gridW, height: gridH,
    padLeft: leftPad, padTop: topPad,
  });

  const parts: string[] = [];

  // 제목
  if (title) {
    parts.push(text(leftPad + gridW / 2, 12, title, { fontSize: 13, fontWeight: 'bold' }));
  }

  // 격자
  for (let i = 0; i <= xCells; i++) {
    const x = leftPad + i * cellSize;
    parts.push(line(x, topPad, x, topPad + gridH, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
  }
  for (let i = 0; i <= yCells; i++) {
    const y = topPad + i * cellSize;
    parts.push(line(leftPad, y, leftPad + gridW, y, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
  }

  // x축
  const originY = yMin <= 0 && yMax >= 0 ? toY(0) : topPad + gridH;
  parts.push(line(leftPad - 5, originY, leftPad + gridW + 10, originY, { strokeWidth: 1.5 }));
  parts.push(arrowHead(leftPad + gridW + 10, originY, 0, 6));
  if (xLabel) {
    parts.push(text(leftPad + gridW / 2, totalH - 4, xLabel, { fontSize: 10, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
  }

  // y축
  const originX = xMin <= 0 && xMax >= 0 ? toX(0) : leftPad;
  parts.push(line(originX, topPad + gridH + 5, originX, topPad - 10, { strokeWidth: 1.5 }));
  parts.push(arrowHead(originX, topPad - 10, -90, 6));
  if (yLabel) {
    parts.push(text(8, topPad + gridH / 2, yLabel, { fontSize: 10, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
  }

  // 축 눈금
  for (let v = xMin; v <= xMax; v += gridStep) {
    const x = toX(v);
    if (Math.abs(v) > 0.001) {
      parts.push(line(x, originY - 3, x, originY + 3, { strokeWidth: 1 }));
      parts.push(katexLabel(x, originY + 14, v.toString(), { fontSize: 10 }));
    }
  }
  for (let v = yMin; v <= yMax; v += gridStep) {
    const y = toY(v);
    if (Math.abs(v) > 0.001) {
      parts.push(line(originX - 3, y, originX + 3, y, { strokeWidth: 1 }));
      parts.push(katexLabel(originX - 14, y, v.toString(), { fontSize: 10, anchor: 'end' }));
    }
  }
  // 원점
  if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
    parts.push(katexLabel(originX - 10, originY + 12, 'O', { fontSize: 11 }));
  }

  // 추세선 (최소제곱법)
  if (showTrend && points.length >= 2) {
    const validPts = points.filter(p => !isNaN(Number(p.x)) && !isNaN(Number(p.y)));
    if (validPts.length >= 2) {
      const n = validPts.length;
      const sumX = validPts.reduce((s, p) => s + Number(p.x), 0);
      const sumY = validPts.reduce((s, p) => s + Number(p.y), 0);
      const sumXY = validPts.reduce((s, p) => s + Number(p.x) * Number(p.y), 0);
      const sumX2 = validPts.reduce((s, p) => s + Number(p.x) ** 2, 0);
      const denom = n * sumX2 - sumX ** 2;
      if (Math.abs(denom) > 0.001) {
        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;
        const tx1 = toX(xMin);
        const ty1 = toY(slope * xMin + intercept);
        const tx2 = toX(xMax);
        const ty2 = toY(slope * xMax + intercept);
        parts.push(line(tx1, ty1, tx2, ty2, { stroke: trendColor, strokeWidth: 1.5, dashArray: '6,4' }));
      }
    }
  }

  // 점 렌더링
  for (const p of points) {
    const px = toX(Number(p.x) || 0);
    const py = toY(Number(p.y) || 0);
    parts.push(circle(px, py, 3.5, { fill: COLORS.primary, stroke: COLORS.primary }));
    if (p.label) {
      parts.push(katexLabel(px + 8, py - 8, p.label, { fontSize: 10, anchor: 'start' }));
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
