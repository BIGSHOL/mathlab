import { CircleParams, TriangleParams, QuadrilateralParams, RegularPolygonParams, ShapeStyle, Point2D } from '../types';
import { svgWrap, line, circle as svgCircle, katexLabel, COLORS } from '../shared/svg-utils';

/** 빗금 패턴 defs (도형 공통) */
function shapeHatchDef(id: string, color: string): string {
  return `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${color}" stroke-width="1.5" stroke-opacity="0.55"/></pattern></defs>`;
}

/** ShapeStyle에서 fill 속성 문자열 생성 */
function shapeFillAttrs(style: ShapeStyle, patternId: string): { fillAttr: string; extraFill: string } {
  const fillColor = style.fill || '#EFF6FF';
  const fillOpacity = style.fillOpacity ?? 0.15;
  if (style.hatching) {
    return {
      fillAttr: `fill="${fillColor}" fill-opacity="${fillOpacity}"`,
      extraFill: `fill="url(#${patternId})"`,
    };
  }
  return { fillAttr: `fill="${fillColor}" fill-opacity="${fillOpacity > 0.5 ? fillOpacity : 0.35}"`, extraFill: '' };
}

// --- 원 ---
export function renderCircle(params: CircleParams): string {
  const r = params.radius || 60;
  const cx = params.cx || r + 30;
  const cy = params.cy || r + 30;
  const totalW = cx + r + 30;
  const totalH = cy + r + 30;
  const parts: string[] = [];
  const strokeColor = params.strokeColor || COLORS.primary;
  const patternId = 'hatch-circle';

  if (params.hatching) parts.push(shapeHatchDef(patternId, strokeColor));

  const { fillAttr, extraFill } = shapeFillAttrs(params, patternId);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" ${fillAttr} stroke="${strokeColor}" stroke-width="2"/>`);
  if (extraFill) parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" ${extraFill} stroke="none"/>`);
  parts.push(svgCircle(cx, cy, 2, { fill: '#333' })); // 중심점

  // 라벨
  if (params.labels) {
    for (const lbl of params.labels) {
      if (lbl.position === 'center') {
        // 원 중앙에 라벨
        parts.push(katexLabel(cx, cy, lbl.text, { fontSize: 12 }));
      } else {
        // 원 바깥에 라벨 (기본)
        const rad = (lbl.angle * Math.PI) / 180;
        const lx = cx + (r + 16) * Math.cos(rad);
        const ly = cy - (r + 16) * Math.sin(rad);
        parts.push(katexLabel(lx, ly, lbl.text, { fontSize: 12 }));
      }
    }
  }

  // 호
  if (params.arcs) {
    for (const arc of params.arcs) {
      const arcColor = arc.color || COLORS.red;
      const arcStrokeW = arc.strokeWidth || 4;
      const startRad = (-arc.startAngle * Math.PI) / 180;
      const endRad = (-arc.endAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const sweep = arc.endAngle - arc.startAngle > 180 ? 1 : 0;
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${sweep} 0 ${x2} ${y2}`;
      parts.push(`<path d="${d}" fill="none" stroke="${arcColor}" stroke-width="${arcStrokeW}"/>`);
      if (arc.label) {
        const midAngle = (-(arc.startAngle + arc.endAngle) / 2 * Math.PI) / 180;
        const mx = cx + (r + 20) * Math.cos(midAngle);
        const my = cy + (r + 20) * Math.sin(midAngle);
        parts.push(katexLabel(mx, my, arc.label, { fontSize: 11 }));
      }
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

// --- 삼각형 ---
export function renderTriangle(params: TriangleParams): string {
  const verts = params.vertices;
  const pad = 40;
  const strokeColor = params.strokeColor || COLORS.primary;
  const patternId = 'hatch-tri';

  const xs = verts.map(v => v.x);
  const ys = verts.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min(200 / rangeX, 200 / rangeY);

  const toSvg = (p: Point2D): [number, number] => [
    pad + (p.x - minX) * scale,
    pad + (p.y - minY) * scale,
  ];

  const pts = verts.map(toSvg);
  const totalW = rangeX * scale + pad * 2;
  const totalH = rangeY * scale + pad * 2;
  const parts: string[] = [];

  if (params.hatching) parts.push(shapeHatchDef(patternId, strokeColor));

  // 삼각형 면
  const fillColor = params.fill || '#EFF6FF';
  const fillOpacity = params.fillOpacity ?? 0.15;
  const ptsStr = pts.map(([x, y]) => `${x},${y}`).join(' ');
  parts.push(`<polygon points="${ptsStr}" fill="${fillColor}" fill-opacity="${fillOpacity > 0.5 ? fillOpacity : 0.35}" stroke="${strokeColor}" stroke-width="2"/>`);
  if (params.hatching) {
    parts.push(`<polygon points="${ptsStr}" fill="url(#${patternId})" stroke="none"/>`);
  }

  // 꼭짓점 라벨
  for (let i = 0; i < 3; i++) {
    const [px, py] = pts[i];
    const label = verts[i].label || '';
    if (label) {
      const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
      const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
      const dx = px - cx, dy = py - cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const lx = px + (dx / d) * 16;
      const ly = py + (dy / d) * 16;
      parts.push(katexLabel(lx, ly, label, { fontSize: 13 }));
    }
  }

  // 변 라벨
  if (params.sides) {
    for (const s of params.sides) {
      const [x1, y1] = pts[s.from];
      const [x2, y2] = pts[s.to];
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
      const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
      const dx = mx - cx, dy = my - cy;
      const dd = Math.sqrt(dx * dx + dy * dy) || 1;
      parts.push(katexLabel(mx + (dx / dd) * 14, my + (dy / dd) * 14, s.label, { fontSize: 11 }));
    }
  }

  // 각도 라벨
  if (params.angles) {
    for (const a of params.angles) {
      const [px, py] = pts[a.vertex];
      const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
      const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
      const dx = cx - px, dy = cy - py;
      const dd = Math.sqrt(dx * dx + dy * dy) || 1;
      parts.push(katexLabel(px + (dx / dd) * 20, py + (dy / dd) * 20, a.value, { fontSize: 10 }));
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

// --- 사각형 ---
export function renderQuadrilateral(params: QuadrilateralParams): string {
  const verts = params.vertices;
  const pad = 40;
  const strokeColor = params.strokeColor || COLORS.primary;
  const patternId = 'hatch-quad';

  const xs = verts.map(v => v.x);
  const ys = verts.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min(200 / rangeX, 200 / rangeY);

  const toSvg = (p: Point2D): [number, number] => [
    pad + (p.x - minX) * scale,
    pad + (p.y - minY) * scale,
  ];

  const pts = verts.map(toSvg);
  const totalW = rangeX * scale + pad * 2;
  const totalH = rangeY * scale + pad * 2;
  const parts: string[] = [];

  if (params.hatching) parts.push(shapeHatchDef(patternId, strokeColor));

  const fillColor = params.fill || '#EFF6FF';
  const fillOpacity = params.fillOpacity ?? 0.15;
  const ptsStr = pts.map(([x, y]) => `${x},${y}`).join(' ');
  parts.push(`<polygon points="${ptsStr}" fill="${fillColor}" fill-opacity="${fillOpacity > 0.5 ? fillOpacity : 0.35}" stroke="${strokeColor}" stroke-width="2"/>`);
  if (params.hatching) {
    parts.push(`<polygon points="${ptsStr}" fill="url(#${patternId})" stroke="none"/>`);
  }

  // 꼭짓점 라벨
  for (let i = 0; i < 4; i++) {
    const [px, py] = pts[i];
    const label = verts[i].label || '';
    if (label) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / 4;
      const cy = pts.reduce((s, p) => s + p[1], 0) / 4;
      const dx = px - cx, dy = py - cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      parts.push(katexLabel(px + (dx / d) * 16, py + (dy / d) * 16, label, { fontSize: 13 }));
    }
  }

  // 변 라벨
  if (params.sides) {
    for (const s of params.sides) {
      const [x1, y1] = pts[s.from];
      const [x2, y2] = pts[s.to];
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const cx = pts.reduce((sum, p) => sum + p[0], 0) / 4;
      const cy = pts.reduce((sum, p) => sum + p[1], 0) / 4;
      const dx = mx - cx, dy = my - cy;
      const dd = Math.sqrt(dx * dx + dy * dy) || 1;
      parts.push(katexLabel(mx + (dx / dd) * 14, my + (dy / dd) * 14, s.label, { fontSize: 11 }));
    }
  }

  // 직각 표시 (rectangle/square)
  if (params.type === 'rectangle' || params.type === 'square') {
    const sz = 8;
    for (let i = 0; i < 4; i++) {
      const [px, py] = pts[i];
      const [prevX, prevY] = pts[(i + 3) % 4];
      const [nextX, nextY] = pts[(i + 1) % 4];
      const d1x = prevX - px, d1y = prevY - py;
      const d2x = nextX - px, d2y = nextY - py;
      const len1 = Math.sqrt(d1x * d1x + d1y * d1y) || 1;
      const len2 = Math.sqrt(d2x * d2x + d2y * d2y) || 1;
      const ux1 = d1x / len1 * sz, uy1 = d1y / len1 * sz;
      const ux2 = d2x / len2 * sz, uy2 = d2y / len2 * sz;
      parts.push(`<polyline points="${px + ux1},${py + uy1} ${px + ux1 + ux2},${py + uy1 + uy2} ${px + ux2},${py + uy2}" fill="none" stroke="#333" stroke-width="1"/>`);
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

// --- 정다각형 ---
export function renderRegularPolygon(params: RegularPolygonParams): string {
  const n = params.sides;
  const r = 70;
  const cx = r + 30;
  const cy = r + 30;
  const totalW = cx + r + 30;
  const totalH = cy + r + 30;
  const parts: string[] = [];
  const strokeColor = params.strokeColor || COLORS.primary;
  const patternId = 'hatch-rpoly';

  if (params.hatching) parts.push(shapeHatchDef(patternId, strokeColor));

  // 꼭짓점 계산
  const verts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    verts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  // 다각형
  const fillColor = params.fill || '#EFF6FF';
  const fillOpacity = params.fillOpacity ?? 0.15;
  const ptsStr = verts.map(([x, y]) => `${x},${y}`).join(' ');
  parts.push(`<polygon points="${ptsStr}" fill="${fillColor}" fill-opacity="${fillOpacity > 0.5 ? fillOpacity : 0.35}" stroke="${strokeColor}" stroke-width="2"/>`);
  if (params.hatching) {
    parts.push(`<polygon points="${ptsStr}" fill="url(#${patternId})" stroke="none"/>`);
  }

  // 대각선
  if (params.diagonals) {
    if (Array.isArray(params.diagonals)) {
      // 개별 대각선 지정
      for (const d of params.diagonals) {
        const fi = Math.min(d.from, n - 1);
        const ti = Math.min(d.to, n - 1);
        const dash = d.style === 'dashed' ? '4,3' : undefined;
        parts.push(line(verts[fi][0], verts[fi][1], verts[ti][0], verts[ti][1], {
          stroke: COLORS.gray, strokeWidth: 1, dashArray: dash,
        }));
      }
    } else {
      // true → 모든 대각선 (기존 동작)
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue;
          parts.push(line(verts[i][0], verts[i][1], verts[j][0], verts[j][1], {
            stroke: COLORS.gray, strokeWidth: 1, dashArray: '4,3',
          }));
        }
      }
    }
  }

  // 꼭짓점 라벨
  if (params.labels) {
    for (const lbl of params.labels) {
      if (lbl.vertex < n) {
        const [vx, vy] = verts[lbl.vertex];
        const dx = vx - cx, dy = vy - cy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        parts.push(katexLabel(vx + (dx / d) * 16, vy + (dy / d) * 16, lbl.text, { fontSize: 13 }));
      }
    }
  }

  // 변 길이 라벨
  if (params.sideLength) {
    const [x1, y1] = verts[0];
    const [x2, y2] = verts[1];
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = mx - cx, dy = my - cy;
    const dd = Math.sqrt(dx * dx + dy * dy) || 1;
    parts.push(katexLabel(mx + (dx / dd) * 14, my + (dy / dd) * 14, params.sideLength, { fontSize: 11 }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
