import { CoordinatePlaneParams } from '../types';
import { svgWrap, line, circle, arrowHead, katexLabel, COLORS, createCoordinateMapper } from '../shared/svg-utils';

/** 좌표평면 SVG 생성 */
export function renderCoordinatePlane(params: CoordinatePlaneParams): string {
  const { xRange, yRange, gridStep = 1, points = [], lines: lineSegments = [] } = params;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  const cellSize = 30;
  const xCells = Math.round((xMax - xMin) / gridStep);
  const yCells = Math.round((yMax - yMin) / gridStep);
  const gridW = xCells * cellSize;
  const gridH = yCells * cellSize;
  const pad = 30;
  const totalW = gridW + pad * 2;
  const totalH = gridH + pad * 2;

  // 좌표 → 픽셀 변환
  const { toX, toY } = createCoordinateMapper({
    xMin, xMax, yMin, yMax,
    width: gridW, height: gridH,
    padLeft: pad, padTop: pad,
  });

  const parts: string[] = [];

  // 격자
  for (let i = 0; i <= xCells; i++) {
    const x = pad + i * cellSize;
    parts.push(line(x, pad, x, pad + gridH, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
  }
  for (let i = 0; i <= yCells; i++) {
    const y = pad + i * cellSize;
    parts.push(line(pad, y, pad + gridW, y, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
  }

  // x축, y축
  const originX = toX(0);
  const originY = toY(0);
  const axisColor = '#333';

  // x축
  if (yMin <= 0 && yMax >= 0) {
    parts.push(line(pad - 10, originY, pad + gridW + 15, originY, { stroke: axisColor, strokeWidth: 1.5 }));
    parts.push(arrowHead(pad + gridW + 15, originY, 0, 6));
    parts.push(katexLabel(pad + gridW + 20, originY, 'x', { fontSize: 13, anchor: 'start' }));
  }
  // y축
  if (xMin <= 0 && xMax >= 0) {
    parts.push(line(originX, pad + gridH + 10, originX, pad - 15, { stroke: axisColor, strokeWidth: 1.5 }));
    parts.push(arrowHead(originX, pad - 15, -90, 6));
    parts.push(katexLabel(originX, pad - 20, 'y', { fontSize: 13 }));
  }

  // 축 눈금 라벨
  for (let v = xMin; v <= xMax; v += gridStep) {
    if (v === 0) continue;
    const x = toX(v);
    if (yMin <= 0 && yMax >= 0) {
      parts.push(line(x, originY - 3, x, originY + 3, { stroke: axisColor }));
    }
    parts.push(katexLabel(x, (yMin <= 0 && yMax >= 0 ? originY : pad + gridH) + 16, v.toString(), { fontSize: 11 }));
  }
  for (let v = yMin; v <= yMax; v += gridStep) {
    if (v === 0) continue;
    const y = toY(v);
    if (xMin <= 0 && xMax >= 0) {
      parts.push(line(originX - 3, y, originX + 3, y, { stroke: axisColor }));
    }
    parts.push(katexLabel((xMin <= 0 && xMax >= 0 ? originX : pad) - 14, y, v.toString(), { fontSize: 11 }));
  }
  // 원점 O
  if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
    parts.push(katexLabel(originX - 12, originY + 14, 'O', { fontSize: 12 }));
  }

  // 직선/선분
  const lineColors = [COLORS.primary, COLORS.red, COLORS.green, COLORS.purple];
  lineSegments.forEach((seg, i) => {
    const color = seg.color || lineColors[i % lineColors.length];
    const dash = seg.style === 'dashed' ? '6,4' : seg.style === 'dotted' ? '2,3' : undefined;
    for (let j = 0; j < seg.points.length - 1; j++) {
      const p1 = seg.points[j];
      const p2 = seg.points[j + 1];
      parts.push(line(toX(p1.x), toY(p1.y), toX(p2.x), toY(p2.y), {
        stroke: color, strokeWidth: 2, dashArray: dash,
      }));
    }
  });

  // 벡터 (화살표 선분)
  if (params.vectors) {
    for (const vec of params.vectors) {
      const vfrom = vec.from;
      const vto = vec.to;
      const vColor = vec.color || COLORS.purple;
      const fx = toX(vfrom.x), fy = toY(vfrom.y);
      const tx = toX(vto.x), ty = toY(vto.y);
      parts.push(line(fx, fy, tx, ty, { stroke: vColor, strokeWidth: 2 }));
      // 화살촉
      const angle = Math.atan2(ty - fy, tx - fx) * (180 / Math.PI);
      parts.push(arrowHead(tx, ty, angle, 7));
      // 시작점
      parts.push(circle(fx, fy, 3, { fill: vColor, stroke: vColor }));
      if (vec.label) {
        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2;
        parts.push(katexLabel(mx + 10, my - 10, vec.label, { fontSize: 11 }));
      }
    }
  }

  // 점
  points.forEach((p) => {
    const px = toX(p.x);
    const py = toY(p.y);
    parts.push(circle(px, py, 4, { fill: COLORS.red, stroke: COLORS.red }));
    if (p.label) {
      parts.push(katexLabel(px + 10, py - 10, p.label, { fontSize: 11, anchor: 'start' }));
    }
  });

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
