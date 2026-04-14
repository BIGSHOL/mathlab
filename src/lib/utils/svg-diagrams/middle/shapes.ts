import { CircleParams, TriangleParams, QuadrilateralParams, RegularPolygonParams, ShapeStyle, Point2D } from '../types';
import { svgWrap, line, circle as svgCircle, katexLabel, COLORS, renderRightAngleMark, renderCongruenceMarks, renderParallelMarks } from '../shared/svg-utils';
import {
  computeIncenter, computeCircumcenter, computeCentroid, computeOrthocenter,
  computeInradius, computeCircumradius, footOfPerpendicular, midpoint as geoMidpoint,
  type Pt,
} from '../shared/geometry-math';

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
      // 360° wrap 보정 — endAngle < startAngle이면 +360 정규화
      let arcDiff = arc.endAngle - arc.startAngle;
      while (arcDiff < 0) arcDiff += 360;
      const largeArc = arcDiff > 180 ? 1 : 0;
      // sweep-flag=0: SVG에서 반시계(visual CCW) — 수학 좌표계와 일치
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
      parts.push(`<path d="${d}" fill="none" stroke="${arcColor}" stroke-width="${arcStrokeW}"/>`);
      if (arc.label) {
        const midAngle = (-(arc.startAngle + arc.endAngle) / 2 * Math.PI) / 180;
        const mx = cx + (r + 20) * Math.cos(midAngle);
        const my = cy + (r + 20) * Math.sin(midAngle);
        parts.push(katexLabel(mx, my, arc.label, { fontSize: 11 }));
      }
    }
  }

  // 현(chord)
  if (params.chords) {
    for (const chord of params.chords) {
      const chordColor = chord.color || '#333';
      const startRad = (-chord.startAngle * Math.PI) / 180;
      const endRad = (-chord.endAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      parts.push(line(x1, y1, x2, y2, { stroke: chordColor, strokeWidth: 1.5 }));
      if (chord.label) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        parts.push(katexLabel(mx + 8, my - 8, chord.label, { fontSize: 10 }));
      }
    }
  }

  // 반지름선(radiusLine)
  if (params.radiusLines) {
    for (const rl of params.radiusLines) {
      const rlColor = rl.color || '#333';
      const rad = (-rl.angle * Math.PI) / 180;
      const ex = cx + r * Math.cos(rad);
      const ey = cy + r * Math.sin(rad);
      parts.push(line(cx, cy, ex, ey, { stroke: rlColor, strokeWidth: 1.5 }));
      if (rl.label) {
        const mx = (cx + ex) / 2;
        const my = (cy + ey) / 2;
        parts.push(katexLabel(mx + 8, my - 8, rl.label, { fontSize: 10 }));
      }
    }
  }

  // 접선(tangentLine)
  if (params.tangentLines) {
    for (const tl of params.tangentLines) {
      const tlColor = tl.color || COLORS.green;
      const tangentLen = tl.length || 60;
      const rad = (-tl.angle * Math.PI) / 180;
      // 접점
      const px = cx + r * Math.cos(rad);
      const py = cy + r * Math.sin(rad);
      // 접선 방향 (반지름에 수직)
      const tx = -Math.sin(rad);
      const ty = -Math.cos(rad);
      const t1x = px + tx * tangentLen;
      const t1y = py + ty * tangentLen;
      const t2x = px - tx * tangentLen;
      const t2y = py - ty * tangentLen;
      // 반지름선
      parts.push(line(cx, cy, px, py, { stroke: '#999', strokeWidth: 1, dashArray: '3,2' }));
      // 접선
      parts.push(line(t1x, t1y, t2x, t2y, { stroke: tlColor, strokeWidth: 1.5 }));
      // 직각 표시
      parts.push(renderRightAngleMark(px, py, cx, cy, t1x, t1y, 6));
      if (tl.label) {
        parts.push(katexLabel(t1x + 6, t1y - 6, tl.label, { fontSize: 10 }));
      }
    }
  }

  // 중심각(centralAngle)
  if (params.centralAngles) {
    for (const ca of params.centralAngles) {
      const caColor = ca.color || COLORS.secondary;
      const startRad = (-ca.startAngle * Math.PI) / 180;
      const endRad = (-ca.endAngle * Math.PI) / 180;
      // 반지름 2개
      const sx = cx + r * Math.cos(startRad), sy = cy + r * Math.sin(startRad);
      const ex = cx + r * Math.cos(endRad), ey = cy + r * Math.sin(endRad);
      parts.push(line(cx, cy, sx, sy, { stroke: caColor, strokeWidth: 1.5 }));
      parts.push(line(cx, cy, ex, ey, { stroke: caColor, strokeWidth: 1.5 }));
      // 섹터 채움
      let diff = ca.endAngle - ca.startAngle;
      if (diff < 0) diff += 360;
      const largeArc = diff > 180 ? 1 : 0;
      const sectorD = `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey} Z`;
      parts.push(`<path d="${sectorD}" fill="${caColor}" fill-opacity="0.12" stroke="none"/>`);
      // 각도 호
      const arcR = 20;
      const asx = cx + arcR * Math.cos(startRad), asy = cy + arcR * Math.sin(startRad);
      const aex = cx + arcR * Math.cos(endRad), aey = cy + arcR * Math.sin(endRad);
      parts.push(`<path d="M ${asx} ${asy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${aex} ${aey}" fill="none" stroke="${caColor}" stroke-width="1.5"/>`);
      if (ca.label) {
        const midAngle = (-(ca.startAngle + ca.endAngle) / 2 * Math.PI) / 180;
        const lx = cx + 30 * Math.cos(midAngle);
        const ly = cy + 30 * Math.sin(midAngle);
        parts.push(katexLabel(lx, ly, ca.label, { fontSize: 10 }));
      }
    }
  }

  // 원주각(inscribedAngle)
  if (params.inscribedAngles) {
    for (const ia of params.inscribedAngles) {
      const vRad = (-ia.vertexAngle * Math.PI) / 180;
      const sRad = (-ia.startAngle * Math.PI) / 180;
      const eRad = (-ia.endAngle * Math.PI) / 180;
      const vx = cx + r * Math.cos(vRad), vy = cy + r * Math.sin(vRad);
      const sx = cx + r * Math.cos(sRad), sy = cy + r * Math.sin(sRad);
      const ex = cx + r * Math.cos(eRad), ey = cy + r * Math.sin(eRad);
      // 꼭짓점에서 호 양 끝으로 두 현
      parts.push(line(vx, vy, sx, sy, { stroke: COLORS.red, strokeWidth: 1.5 }));
      parts.push(line(vx, vy, ex, ey, { stroke: COLORS.red, strokeWidth: 1.5 }));
      // 꼭짓점 점
      parts.push(svgCircle(vx, vy, 3, { fill: COLORS.red, stroke: COLORS.red }));
      // 각도 호
      const a1 = Math.atan2(sy - vy, sx - vx);
      const a2 = Math.atan2(ey - vy, ex - vx);
      const arcR = 16;
      const as1x = vx + arcR * Math.cos(a1), as1y = vy + arcR * Math.sin(a1);
      const as2x = vx + arcR * Math.cos(a2), as2y = vy + arcR * Math.sin(a2);
      let angleDiff = ((a2 - a1) * 180 / Math.PI + 360) % 360;
      if (angleDiff > 180) angleDiff = 360 - angleDiff;
      const la = angleDiff > 180 ? 1 : 0;
      parts.push(`<path d="M ${as1x} ${as1y} A ${arcR} ${arcR} 0 ${la} 1 ${as2x} ${as2y}" fill="none" stroke="${COLORS.red}" stroke-width="1"/>`);
      if (ia.label) {
        const midA = (a1 + a2) / 2;
        const lx = vx + 24 * Math.cos(midA);
        const ly = vy + 24 * Math.sin(midA);
        parts.push(katexLabel(lx, ly, ia.label, { fontSize: 10 }));
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

  const toSvg = (p: Point2D | Pt): [number, number] => [
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

  // 기하 Pt 변환
  const geoVerts: [Pt, Pt, Pt] = [
    { x: verts[0].x, y: verts[0].y },
    { x: verts[1].x, y: verts[1].y },
    { x: verts[2].x, y: verts[2].y },
  ];

  // 보조선
  if (params.auxiliaryLines) {
    const auxColor = '#999';
    for (const auxType of params.auxiliaryLines) {
      for (let i = 0; i < 3; i++) {
        const v = geoVerts[i];
        const p1 = geoVerts[(i + 1) % 3];
        const p2 = geoVerts[(i + 2) % 3];
        let target: Pt | null = null;

        switch (auxType) {
          case 'medians':
            target = geoMidpoint(p1, p2);
            break;
          case 'altitudes':
            target = footOfPerpendicular(v, p1, p2);
            break;
          case 'angle_bisectors': {
            // 내심 방향 — 대변을 내분하는 점
            const d1 = Math.sqrt((v.x - p1.x) ** 2 + (v.y - p1.y) ** 2);
            const d2 = Math.sqrt((v.x - p2.x) ** 2 + (v.y - p2.y) ** 2);
            const ratio = d2 / (d1 + d2 || 1);
            target = { x: p1.x + ratio * (p2.x - p1.x), y: p1.y + ratio * (p2.y - p1.y) };
            break;
          }
          case 'perpendicular_bisectors': {
            const mid = geoMidpoint(p1, p2);
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            // 수직이등분선: 중점에서 수직 방향으로 충분히 연장
            const ext = 80;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const from = toSvg({ x: mid.x - nx * ext, y: mid.y - ny * ext });
            const to = toSvg({ x: mid.x + nx * ext, y: mid.y + ny * ext });
            parts.push(line(from[0], from[1], to[0], to[1], { stroke: auxColor, strokeWidth: 1, dashArray: '4,3' }));
            target = null; // 이미 그림
            break;
          }
        }

        if (target) {
          const from = toSvg(v);
          const to = toSvg(target);
          parts.push(line(from[0], from[1], to[0], to[1], { stroke: auxColor, strokeWidth: 1, dashArray: '4,3' }));
        }
      }
    }
  }

  // 외접원
  if (params.circumscribedCircle) {
    const cc = computeCircumcenter(...geoVerts);
    const cr = computeCircumradius(...geoVerts);
    const [ccx, ccy] = toSvg(cc);
    const scaledR = cr * scale;
    parts.push(svgCircle(ccx, ccy, scaledR, { stroke: COLORS.purple, strokeWidth: 1.5 }));
  }

  // 내접원
  if (params.inscribedCircle) {
    const ic = computeIncenter(...geoVerts);
    const ir = computeInradius(...geoVerts);
    const [icx, icy] = toSvg(ic);
    const scaledR = ir * scale;
    parts.push(svgCircle(icx, icy, scaledR, { stroke: COLORS.green, strokeWidth: 1.5 }));
  }

  // 특수점
  if (params.specialPoints) {
    const pointMap: Record<string, { fn: () => Pt; label: string; color: string }> = {
      incenter: { fn: () => computeIncenter(...geoVerts), label: 'I', color: COLORS.green },
      circumcenter: { fn: () => computeCircumcenter(...geoVerts), label: 'O', color: COLORS.purple },
      centroid: { fn: () => computeCentroid(...geoVerts), label: 'G', color: COLORS.secondary },
      orthocenter: { fn: () => computeOrthocenter(...geoVerts), label: 'H', color: COLORS.red },
    };
    for (const sp of params.specialPoints) {
      const info = pointMap[sp];
      if (!info) continue;
      const pt = info.fn();
      const [spx, spy] = toSvg(pt);
      parts.push(svgCircle(spx, spy, 3, { fill: info.color, stroke: info.color }));
      parts.push(katexLabel(spx + 10, spy - 8, info.label, { fontSize: 11 }));
    }
  }

  // 직각 표시
  if (params.rightAngleMarks) {
    for (const idx of params.rightAngleMarks) {
      if (idx < 0 || idx > 2) continue;
      const [px, py] = pts[idx];
      const [prevX, prevY] = pts[(idx + 2) % 3];
      const [nextX, nextY] = pts[(idx + 1) % 3];
      parts.push(renderRightAngleMark(px, py, prevX, prevY, nextX, nextY));
    }
  }

  // 합동 표시
  if (params.congruenceMarks) {
    for (const cm of params.congruenceMarks) {
      const [x1, y1] = pts[cm.from];
      const [x2, y2] = pts[cm.to];
      parts.push(renderCongruenceMarks(x1, y1, x2, y2, cm.ticks));
    }
  }

  // 평행 표시
  if (params.parallelMarks) {
    for (const pm of params.parallelMarks) {
      const [x1, y1] = pts[pm.from];
      const [x2, y2] = pts[pm.to];
      parts.push(renderParallelMarks(x1, y1, x2, y2, pm.arrows));
    }
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

  // 대각선 (배열 형태)
  if (params.diagonals && Array.isArray(params.diagonals)) {
    for (const diag of params.diagonals) {
      const [x1, y1] = pts[diag.from];
      const [x2, y2] = pts[diag.to];
      const dashArr = diag.style === 'dashed' ? '4,3' : undefined;
      parts.push(line(x1, y1, x2, y2, { stroke: COLORS.gray, strokeWidth: 1, dashArray: dashArr }));
      if (diag.label) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        parts.push(katexLabel(mx + 8, my - 8, diag.label, { fontSize: 10 }));
      }
    }
  }

  // 직각 표시
  if (params.rightAngleMarks && params.rightAngleMarks.length > 0) {
    for (const idx of params.rightAngleMarks) {
      if (idx < 0 || idx > 3) continue;
      const [px, py] = pts[idx];
      const [prevX, prevY] = pts[(idx + 3) % 4];
      const [nextX, nextY] = pts[(idx + 1) % 4];
      parts.push(renderRightAngleMark(px, py, prevX, prevY, nextX, nextY));
    }
  } else if (params.type === 'rectangle' || params.type === 'square') {
    // fallback: rectangle/square는 기본적으로 모든 꼭짓점에 직각 표시
    for (let i = 0; i < 4; i++) {
      const [px, py] = pts[i];
      const [prevX, prevY] = pts[(i + 3) % 4];
      const [nextX, nextY] = pts[(i + 1) % 4];
      parts.push(renderRightAngleMark(px, py, prevX, prevY, nextX, nextY));
    }
  }

  // 합동 표시
  if (params.congruenceMarks) {
    for (const cm of params.congruenceMarks) {
      const [x1, y1] = pts[cm.from];
      const [x2, y2] = pts[cm.to];
      parts.push(renderCongruenceMarks(x1, y1, x2, y2, cm.ticks));
    }
  }

  // 평행 표시
  if (params.parallelMarks) {
    for (const pm of params.parallelMarks) {
      const [x1, y1] = pts[pm.from];
      const [x2, y2] = pts[pm.to];
      parts.push(renderParallelMarks(x1, y1, x2, y2, pm.arrows));
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
