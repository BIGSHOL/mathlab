import { FunctionGraphParams } from '../types';
import { svgWrap, line, text, circle, arrowHead, COLORS } from '../shared/svg-utils';

/** 함수 그래프 SVG 생성 (좌표평면 + 함수 곡선) */
export function renderFunctionGraph(params: FunctionGraphParams): string {
  const { xRange, yRange, gridStep = 1, functions: funcs, points = [] } = params;
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

  const toX = (v: number) => pad + ((v - xMin) / (xMax - xMin)) * gridW;
  const toY = (v: number) => pad + ((yMax - v) / (yMax - yMin)) * gridH;

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

  // 축
  const originX = toX(0);
  const originY = toY(0);

  if (yMin <= 0 && yMax >= 0) {
    parts.push(line(pad - 10, originY, pad + gridW + 15, originY, { stroke: '#333', strokeWidth: 1.5 }));
    parts.push(arrowHead(pad + gridW + 15, originY, 0, 6));
    parts.push(text(pad + gridW + 20, originY, 'x', { fontSize: 13, fontWeight: 'bold' }));
  }
  if (xMin <= 0 && xMax >= 0) {
    parts.push(line(originX, pad + gridH + 10, originX, pad - 15, { stroke: '#333', strokeWidth: 1.5 }));
    parts.push(arrowHead(originX, pad - 15, -90, 6));
    parts.push(text(originX, pad - 20, 'y', { fontSize: 13, fontWeight: 'bold' }));
  }

  // 눈금
  for (let v = xMin; v <= xMax; v += gridStep) {
    if (v === 0) continue;
    const x = toX(v);
    if (yMin <= 0 && yMax >= 0) {
      parts.push(line(x, originY - 3, x, originY + 3, { stroke: '#333' }));
    }
    parts.push(text(x, (yMin <= 0 && yMax >= 0 ? originY : pad + gridH) + 16, v.toString(), { fontSize: 10 }));
  }
  for (let v = yMin; v <= yMax; v += gridStep) {
    if (v === 0) continue;
    const y = toY(v);
    if (xMin <= 0 && xMax >= 0) {
      parts.push(line(originX - 3, y, originX + 3, y, { stroke: '#333' }));
    }
    parts.push(text((xMin <= 0 && xMax >= 0 ? originX : pad) - 14, y, v.toString(), { fontSize: 10 }));
  }
  if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
    parts.push(text(originX - 12, originY + 14, 'O', { fontSize: 11, fontWeight: 'bold' }));
  }

  // 함수 곡선
  const funcColors = [COLORS.primary, COLORS.red, COLORS.green, COLORS.purple];
  for (let fi = 0; fi < funcs.length; fi++) {
    const fn = funcs[fi];
    const color = fn.color || funcColors[fi % funcColors.length];
    const step = (xMax - xMin) / 200;
    const pathParts: string[] = [];
    let started = false;

    for (let xVal = xMin; xVal <= xMax; xVal += step) {
      try {
        const yVal = evaluateExpression(fn.expression, xVal);
        if (!isFinite(yVal) || yVal < yMin - 5 || yVal > yMax + 5) {
          started = false;
          continue;
        }
        const px = toX(xVal);
        const py = toY(yVal);
        pathParts.push(started ? `L ${px} ${py}` : `M ${px} ${py}`);
        started = true;
      } catch {
        started = false;
      }
    }

    if (pathParts.length > 0) {
      parts.push(`<path d="${pathParts.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`);
    }

    // 함수 라벨
    if (fn.label) {
      const labelX = pad + gridW - 10;
      const labelY = pad + 16 + fi * 18;
      parts.push(text(labelX, labelY, fn.label, { fontSize: 11, fill: color, anchor: 'end', fontWeight: 'bold' }));
    }
  }

  // 점
  for (const p of points) {
    const px = toX(p.x);
    const py = toY(p.y);
    parts.push(circle(px, py, 4, { fill: COLORS.red, stroke: COLORS.red }));
    if (p.label) {
      parts.push(text(px + 10, py - 10, p.label, { fontSize: 11, anchor: 'start', fontWeight: 'bold', fill: COLORS.red }));
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 간단한 수식 평가 (x 변수 지원) */
function evaluateExpression(expr: string, x: number): number {
  // 안전한 수식 평가: x, 기본 연산, Math 함수만 허용
  const sanitized = expr
    .replace(/\^/g, '**')
    .replace(/abs/g, 'Math.abs')
    .replace(/sqrt/g, 'Math.sqrt')
    .replace(/sin/g, 'Math.sin')
    .replace(/cos/g, 'Math.cos')
    .replace(/tan/g, 'Math.tan')
    .replace(/log/g, 'Math.log')
    .replace(/pi/g, 'Math.PI');

  // eslint-disable-next-line no-new-func
  const fn = new Function('x', `return (${sanitized})`);
  return fn(x);
}
