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
