import { FunctionGraphParams } from '../types';
import { svgWrap, line, circle, arrowHead, katexLabel, COLORS, createCoordinateMapper } from '../shared/svg-utils';

/** 함수 그래프 SVG 생성 (좌표평면 + 함수 곡선) */
export function renderFunctionGraph(params: FunctionGraphParams): string {
  const { xRange, yRange, gridStep = 1, functions: funcs, points = [] } = params;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  // 범위가 너무 넓으면 눈금 간격 자동 조정 (최대 ~15셀로 제한)
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;
  const effectiveGridStep = Math.max(
    gridStep,
    Math.ceil(Math.max(xSpan, ySpan) / 15),
  );

  const cellSize = 30;
  const xCells = Math.round(xSpan / effectiveGridStep);
  const yCells = Math.round(ySpan / effectiveGridStep);
  const gridW = xCells * cellSize;
  const gridH = yCells * cellSize;
  const pad = 30;
  const totalW = gridW + pad * 2;
  const totalH = gridH + pad * 2;

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

  // 축
  const originX = toX(0);
  const originY = toY(0);

  if (yMin <= 0 && yMax >= 0) {
    parts.push(line(pad - 10, originY, pad + gridW + 15, originY, { stroke: '#333', strokeWidth: 1.5 }));
    parts.push(arrowHead(pad + gridW + 15, originY, 0, 6));
    parts.push(katexLabel(pad + gridW + 20, originY, 'x', { fontSize: 13, anchor: 'start' }));
  }
  if (xMin <= 0 && xMax >= 0) {
    parts.push(line(originX, pad + gridH + 10, originX, pad - 15, { stroke: '#333', strokeWidth: 1.5 }));
    parts.push(arrowHead(originX, pad - 15, -90, 6));
    parts.push(katexLabel(originX, pad - 20, 'y', { fontSize: 13 }));
  }

  // 눈금 — hideTickLabels=true면 눈금선만 표시하고 숫자 생략 (개념적 스케치)
  const hideTicks = params.hideTickLabels === true;
  for (let v = xMin; v <= xMax; v += effectiveGridStep) {
    if (v === 0) continue;
    const x = toX(v);
    if (yMin <= 0 && yMax >= 0) {
      parts.push(line(x, originY - 3, x, originY + 3, { stroke: '#333' }));
    }
    if (!hideTicks) {
      const ty = (yMin <= 0 && yMax >= 0 ? originY : pad + gridH) + 16;
      parts.push(katexLabel(x, ty, v.toString(), { fontSize: 11 }));
    }
  }
  for (let v = yMin; v <= yMax; v += effectiveGridStep) {
    if (v === 0) continue;
    const y = toY(v);
    if (xMin <= 0 && xMax >= 0) {
      parts.push(line(originX - 3, y, originX + 3, y, { stroke: '#333' }));
    }
    if (!hideTicks) {
      const tx = (xMin <= 0 && xMax >= 0 ? originX : pad) - 14;
      parts.push(katexLabel(tx, y, v.toString(), { fontSize: 11 }));
    }
  }
  if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
    parts.push(katexLabel(originX - 12, originY + 14, 'O', { fontSize: 12 }));
  }

  // 클리핑 영역 — 함수 곡선이 격자 바깥으로 나가지 않도록
  parts.push(`<defs><clipPath id="fn-clip"><rect x="${pad}" y="${pad}" width="${gridW}" height="${gridH}"/></clipPath></defs>`);
  parts.push(`<g clip-path="url(#fn-clip)">`);

  // 함수 곡선
  for (let fi = 0; fi < funcs.length; fi++) {
    const fn = funcs[fi];
    const color = fn.color || '#333';
    const dashAttr = fn.dashed ? ' stroke-dasharray="6 4"' : '';
    const step = (xMax - xMin) / 200;
    const pathParts: string[] = [];
    let started = false;

    for (let xVal = xMin; xVal <= xMax; xVal += step) {
      try {
        const yVal = evaluateExpression(fn.expression, xVal);
        if (!isFinite(yVal)) {
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
      parts.push(`<path d="${pathParts.join(' ')}" fill="none" stroke="${color}" stroke-width="2"${dashAttr}/>`);
    }
  }

  // 영역 음영 (shadedRegions) — 클립 영역 안에 그림
  if (params.shadedRegions) {
    for (const sr of params.shadedRegions) {
      const fi = sr.functionIndex;
      if (fi < 0 || fi >= funcs.length) continue;
      const fn = funcs[fi];
      const color = sr.color || COLORS.primary;
      const opacity = sr.opacity ?? 0.15;
      const step = (xMax - xMin) / 200;
      const regionParts: string[] = [];
      const xFrom = Math.max(sr.xFrom, xMin);
      const xTo = Math.min(sr.xTo, xMax);
      // 시작점: x축 위
      regionParts.push(`M ${toX(xFrom)} ${toY(0)}`);
      for (let xVal = xFrom; xVal <= xTo; xVal += step) {
        try {
          const yVal = evaluateExpression(fn.expression, xVal);
          if (isFinite(yVal)) {
            regionParts.push(`L ${toX(xVal)} ${toY(yVal)}`);
          }
        } catch { /* skip */ }
      }
      // 끝점에서 x축으로 내려옴
      regionParts.push(`L ${toX(xTo)} ${toY(0)} Z`);
      parts.push(`<path d="${regionParts.join(' ')}" fill="${color}" fill-opacity="${opacity}" stroke="none"/>`);
    }
  }

  parts.push('</g>');

  // 점근선 (asymptotes)
  if (params.asymptotes) {
    for (const asym of params.asymptotes) {
      const asymColor = asym.color || '#EF4444';
      if (asym.type === 'vertical') {
        const ax = toX(asym.value);
        parts.push(line(ax, pad, ax, pad + gridH, { stroke: asymColor, strokeWidth: 1, dashArray: '6,4' }));
      } else {
        const ay = toY(asym.value);
        parts.push(line(pad, ay, pad + gridW, ay, { stroke: asymColor, strokeWidth: 1, dashArray: '6,4' }));
      }
    }
  }

  // 함수 라벨 — 각 곡선 위에 배치
  for (let fi = 0; fi < funcs.length; fi++) {
    const fn = funcs[fi];
    if (!fn.label) continue;

    // 곡선 중간~우측 적절한 위치에 라벨 배치
    let placed = false;
    const tryXPositions = [0.7, 0.6, 0.8, 0.5, 0.3];
    for (const ratio of tryXPositions) {
      const xVal = xMin + (xMax - xMin) * ratio;
      try {
        const yVal = evaluateExpression(fn.expression, xVal);
        if (isFinite(yVal) && yVal >= yMin && yVal <= yMax) {
          const lx = toX(xVal);
          const ly = toY(yVal);
          // 라벨 배경 (가독성)
          parts.push(`<rect x="${lx + 4}" y="${ly - 18}" width="${fn.label.length * 7 + 8}" height="16" fill="white" fill-opacity="0.85" rx="2"/>`);
          parts.push(katexLabel(lx + 8, ly - 10, fn.label, { fontSize: 10, anchor: 'start' }));
          placed = true;
          break;
        }
      } catch { /* skip */ }
    }
    if (!placed) {
      // fallback: 우측 상단
      parts.push(katexLabel(pad + gridW + 8, pad + 14 + fi * 18, fn.label, { fontSize: 11, anchor: 'start' }));
    }
  }

  // 점
  for (const p of points) {
    const px = toX(p.x);
    const py = toY(p.y);
    parts.push(circle(px, py, 4, { fill: COLORS.red, stroke: COLORS.red }));
    if (p.label) {
      parts.push(katexLabel(px + 10, py - 10, p.label, { fontSize: 11, anchor: 'start' }));
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
