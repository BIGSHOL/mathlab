import { CircleDiagram } from '@/types/diagram';
import * as prim from '../primitives';
import { toRadians } from '../utils';

export function renderCircle(spec: CircleDiagram): string {
  const { showRadius, showDiameter, chords, arcs, labels } = spec;
  const cx = spec.center?.[0] ?? 150;
  const cy = spec.center?.[1] ?? 150;
  const radius = spec.radius ?? 80;
  const parts: string[] = [];

  // 원 본체
  parts.push(prim.circle(cx, cy, radius));

  // 중심점
  parts.push(prim.dot(cx, cy));
  parts.push(prim.text(cx - 10, cy - 10, 'O', { fontSize: 13, fontWeight: 'bold' }));

  // 반지름 표시
  if (showRadius) {
    const ex = cx + radius;
    const ey = cy;
    parts.push(prim.line([cx, cy], [ex, ey], { strokeWidth: 1.5 }));
    parts.push(prim.text((cx + ex) / 2, cy - 10, 'r', { fontSize: 13 }));
  }

  // 지름 표시
  if (showDiameter) {
    parts.push(prim.line([cx - radius, cy], [cx + radius, cy], { strokeWidth: 1.5 }));
  }

  // 현(chord)
  if (chords) {
    for (const chord of chords) {
      const fromRad = toRadians(chord.from);
      const toRad = toRadians(chord.to);
      const p1: [number, number] = [cx + radius * Math.cos(fromRad), cy + radius * Math.sin(fromRad)];
      const p2: [number, number] = [cx + radius * Math.cos(toRad), cy + radius * Math.sin(toRad)];
      parts.push(prim.line(p1, p2));
      if (chord.label) {
        const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        parts.push(prim.text(mid[0], mid[1] - 8, chord.label, { fontSize: 12 }));
      }
    }
  }

  // 호(arc) 표시
  if (arcs) {
    for (const arc of arcs) {
      const { from, to, label } = arc;
      const arcR = radius + 8;
      const d = `${arcPathStr(cx, cy, arcR, from, to)}`;
      parts.push(prim.path(d, { strokeWidth: 2, color: '#2563eb' }));
      if (label) {
        const midAngle = toRadians((from + to) / 2);
        const lx = cx + (radius + 18) * Math.cos(midAngle);
        const ly = cy + (radius + 18) * Math.sin(midAngle);
        parts.push(prim.text(lx, ly, label, { fontSize: 12 }));
      }
    }
  }

  // 접선(tangentLine)
  if (spec.tangentLines) {
    for (const tl of spec.tangentLines) {
      const tangentLen = tl.length || 60;
      const rad = toRadians(tl.angle);
      const px = cx + radius * Math.cos(rad);
      const py = cy + radius * Math.sin(rad);
      const tx = -Math.sin(rad);
      const ty = Math.cos(rad);
      const t1: [number, number] = [px + tx * tangentLen, py + ty * tangentLen];
      const t2: [number, number] = [px - tx * tangentLen, py - ty * tangentLen];
      // 반지름선 (보조)
      parts.push(prim.line([cx, cy], [px, py], { dashed: true, strokeWidth: 1 }));
      // 접선
      parts.push(prim.line(t1, t2, { strokeWidth: 1.5 }));
      if (tl.label) {
        parts.push(prim.text(t1[0] + 6, t1[1] - 6, tl.label, { fontSize: 12 }));
      }
    }
  }

  // 반지름선(radiusLine)
  if (spec.radiusLines) {
    for (const rl of spec.radiusLines) {
      const rad = toRadians(rl.angle);
      const ex = cx + radius * Math.cos(rad);
      const ey = cy + radius * Math.sin(rad);
      parts.push(prim.line([cx, cy], [ex, ey], { strokeWidth: 1.5 }));
      if (rl.label) {
        const mx = (cx + ex) / 2;
        const my = (cy + ey) / 2;
        parts.push(prim.text(mx + 8, my - 8, rl.label, { fontSize: 12 }));
      }
    }
  }

  // 중심각(centralAngle)
  if (spec.centralAngles) {
    for (const ca of spec.centralAngles) {
      const sRad = toRadians(ca.startAngle);
      const eRad = toRadians(ca.endAngle);
      const sx = cx + radius * Math.cos(sRad), sy = cy + radius * Math.sin(sRad);
      const ex2 = cx + radius * Math.cos(eRad), ey2 = cy + radius * Math.sin(eRad);
      parts.push(prim.line([cx, cy], [sx, sy], { strokeWidth: 1.5 }));
      parts.push(prim.line([cx, cy], [ex2, ey2], { strokeWidth: 1.5 }));
      // 섹터 채움
      let diff = ca.endAngle - ca.startAngle;
      if (diff < 0) diff += 360;
      const largeArc = diff > 180 ? 1 : 0;
      const sectorD = `M ${cx} ${cy} L ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex2} ${ey2} Z`;
      parts.push(`<path d="${sectorD}" fill="#3b82f6" fill-opacity="0.1" stroke="none"/>`);
      // 각도 호
      const arcR = 18;
      parts.push(prim.path(arcPathStr(cx, cy, arcR, ca.startAngle, ca.endAngle), { strokeWidth: 1.5, color: '#333' }));
      if (ca.label) {
        const midA = toRadians((ca.startAngle + ca.endAngle) / 2);
        parts.push(prim.text(cx + 28 * Math.cos(midA), cy + 28 * Math.sin(midA), ca.label, { fontSize: 12 }));
      }
    }
  }

  // 원주각(inscribedAngle)
  if (spec.inscribedAngles) {
    for (const ia of spec.inscribedAngles) {
      const vRad = toRadians(ia.vertexAngle);
      const sRad = toRadians(ia.startAngle);
      const eRad = toRadians(ia.endAngle);
      const vx = cx + radius * Math.cos(vRad), vy = cy + radius * Math.sin(vRad);
      const sx = cx + radius * Math.cos(sRad), sy = cy + radius * Math.sin(sRad);
      const ex2 = cx + radius * Math.cos(eRad), ey2 = cy + radius * Math.sin(eRad);
      parts.push(prim.line([vx, vy], [sx, sy], { strokeWidth: 1.5 }));
      parts.push(prim.line([vx, vy], [ex2, ey2], { strokeWidth: 1.5 }));
      parts.push(prim.dot(vx, vy, 3));
      if (ia.label) {
        const midA = toRadians((ia.startAngle + ia.endAngle) / 2);
        const lx = vx + 20 * Math.cos(midA);
        const ly = vy + 20 * Math.sin(midA);
        parts.push(prim.text(lx, ly, ia.label, { fontSize: 12 }));
      }
    }
  }

  // 라벨
  if (labels && labels.length > 0) {
    parts.push(prim.renderLabels(labels));
  }

  return parts.join('\n');
}

function arcPathStr(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const s = toRadians(startDeg);
  const e = toRadians(endDeg);
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  let diff = endDeg - startDeg;
  if (diff < 0) diff += 360;
  const large = diff > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}
