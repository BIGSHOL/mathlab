import { HistogramParams } from '../types';
import { svgWrap, line, text, katexLabel, arrowHead, COLORS, createCoordinateMapper, TEXTBOOK_STYLE } from '../shared/svg-utils';

/** 히스토그램 SVG 생성 (중1) */
export function renderHistogram(params: HistogramParams): string {
  const bins = Array.isArray(params.bins) ? params.bins : [];
  if (bins.length === 0) return svgWrap(text(60, 30, '데이터 없음', { fontSize: 12 }), 120, 60);

  const title = params.title;
  const xLabel = params.xLabel;
  const yLabel = params.yLabel;
  const showPoly = !!params.showFrequencyPolygon;
  const color = params.color || COLORS.primary;

  // 범위 계산
  const xMin = Math.min(...bins.map(b => Number(b.range?.[0]) || 0));
  const xMax = Math.max(...bins.map(b => Number(b.range?.[1]) || 0));
  const maxFreq = Math.max(...bins.map(b => Number(b.frequency) || 0), 1);
  const yStep = Math.ceil(maxFreq / 5);
  const yTicks = Math.ceil(maxFreq / yStep);
  const yMaxVal = yTicks * yStep;

  const chartH = 150;
  const chartW = 240;
  const leftPad = yLabel ? 55 : 45;
  const bottomPad = 40;
  const topPad = title ? 28 : 10;
  const totalW = leftPad + chartW + 20;
  const totalH = topPad + chartH + bottomPad + (xLabel ? 18 : 0);

  const { toX, toY } = createCoordinateMapper({
    xMin, xMax, yMin: 0, yMax: yMaxVal,
    width: chartW, height: chartH,
    padLeft: leftPad, padTop: topPad,
  });

  const parts: string[] = [];

  // 제목
  if (title) {
    parts.push(text(totalW / 2, 12, title, { fontSize: 13, fontWeight: 'bold' }));
  }

  // 격자선 + y축 눈금
  for (let i = 0; i <= yTicks; i++) {
    const val = i * yStep;
    const y = toY(val);
    parts.push(line(leftPad, y, leftPad + chartW, y, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
    parts.push(katexLabel(leftPad - 14, y, val.toString(), { fontSize: 11, anchor: 'end' }));
  }

  // y축
  parts.push(line(leftPad, toY(yMaxVal) - 10, leftPad, topPad + chartH, { strokeWidth: 1.5 }));
  parts.push(arrowHead(leftPad, toY(yMaxVal) - 10, -90, 6));
  if (yLabel) {
    parts.push(text(12, topPad + chartH / 2, yLabel, { fontSize: 10, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
  }

  // x축
  parts.push(line(leftPad, topPad + chartH, leftPad + chartW + 10, topPad + chartH, { strokeWidth: 1.5 }));
  parts.push(arrowHead(leftPad + chartW + 10, topPad + chartH, 0, 6));
  if (xLabel) {
    parts.push(text(leftPad + chartW / 2, totalH - 4, xLabel, { fontSize: 10, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
  }

  // 히스토그램 막대 (서로 붙어있음)
  const polyPoints: [number, number][] = [];
  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    const lo = Number(bin.range?.[0]) || 0;
    const hi = Number(bin.range?.[1]) || 0;
    const freq = Math.max(0, Number(bin.frequency) || 0);
    const x1 = toX(lo);
    const x2 = toX(hi);
    const y = toY(freq);
    const h = topPad + chartH - y;

    parts.push(`<rect x="${x1.toFixed(1)}" y="${y.toFixed(1)}" width="${(x2 - x1).toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" fill-opacity="0.4" stroke="${color}" stroke-width="1"/>`);

    // x축 경계값
    if (i === 0) {
      parts.push(katexLabel(x1, topPad + chartH + 14, lo.toString(), { fontSize: 10 }));
    }
    parts.push(katexLabel(x2, topPad + chartH + 14, hi.toString(), { fontSize: 10 }));

    // 도수분포다각형 좌표
    polyPoints.push([(x1 + x2) / 2, y]);
  }

  // 도수분포다각형
  if (showPoly && polyPoints.length > 1) {
    // 양 끝 0 추가
    const polyAll: [number, number][] = [];
    if (bins.length > 0) {
      const firstBin = bins[0];
      const binW = (Number(firstBin.range?.[1]) || 0) - (Number(firstBin.range?.[0]) || 0);
      polyAll.push([polyPoints[0][0] - binW, topPad + chartH]);
    }
    polyAll.push(...polyPoints);
    if (bins.length > 0) {
      const lastBin = bins[bins.length - 1];
      const binW = (Number(lastBin.range?.[1]) || 0) - (Number(lastBin.range?.[0]) || 0);
      polyAll.push([polyPoints[polyPoints.length - 1][0] + binW, topPad + chartH]);
    }

    for (let i = 0; i < polyAll.length - 1; i++) {
      parts.push(line(polyAll[i][0], polyAll[i][1], polyAll[i + 1][0], polyAll[i + 1][1], {
        stroke: COLORS.red, strokeWidth: 1.5,
      }));
    }
    // 꼭짓점 점
    for (const [px, py] of polyPoints) {
      parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.5" fill="${COLORS.red}"/>`);
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
