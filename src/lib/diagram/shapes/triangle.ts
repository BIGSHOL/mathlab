import { TriangleDiagram, Point } from '@/types/diagram';
import { polygon, renderLabels } from '../primitives';
import * as prim from '../primitives';
import {
  vertexAngle as _vertexAngle,
  angleBetween,
  toDegrees,
  arcPath,
  rightAnglePath,
  midpoint,
  labelOffset,
  distance,
} from '../utils';
import {
  computeIncenter, computeCircumcenter, computeCentroid, computeOrthocenter,
  computeInradius, computeCircumradius, footOfPerpendicular,
  midpoint as geoMidpoint,
  type Pt,
} from '@/lib/utils/svg-diagrams/shared/geometry-math';

/** Point → Pt 변환 */
function toPt(p: Point): Pt { return { x: p[0], y: p[1] }; }
/** Pt → Point 변환 */
function toPoint(p: Pt): Point { return [p.x, p.y]; }

export function renderTriangle(spec: TriangleDiagram): string {
  const vertices = spec.vertices ?? [[0, 150], [150, 150], [0, 0]];
  const { labels, showAngles, angleValues, showLengths, rightAngle } = spec;
  const parts: string[] = [];
  const gv: [Pt, Pt, Pt] = [toPt(vertices[0]), toPt(vertices[1]), toPt(vertices[2])];

  // 보조선 (삼각형 뒤에 그리기)
  if (spec.auxiliaryLines) {
    for (const auxType of spec.auxiliaryLines) {
      for (let i = 0; i < 3; i++) {
        const v = gv[i];
        const p1 = gv[(i + 1) % 3];
        const p2 = gv[(i + 2) % 3];
        let target: Pt | null = null;

        switch (auxType) {
          case 'medians':
            target = geoMidpoint(p1, p2);
            break;
          case 'altitudes':
            target = footOfPerpendicular(v, p1, p2);
            break;
          case 'angle_bisectors': {
            const d1 = Math.sqrt((v.x - p1.x) ** 2 + (v.y - p1.y) ** 2);
            const d2 = Math.sqrt((v.x - p2.x) ** 2 + (v.y - p2.y) ** 2);
            const ratio = d2 / (d1 + d2 || 1);
            target = { x: p1.x + ratio * (p2.x - p1.x), y: p1.y + ratio * (p2.y - p1.y) };
            break;
          }
          case 'perpendicular_bisectors': {
            const mid = geoMidpoint(p1, p2);
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const ext = 80;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len, ny = dx / len;
            parts.push(prim.line(
              toPoint({ x: mid.x - nx * ext, y: mid.y - ny * ext }),
              toPoint({ x: mid.x + nx * ext, y: mid.y + ny * ext }),
              { dashed: true, strokeWidth: 1, color: '#999' }
            ));
            target = null;
            break;
          }
        }

        if (target) {
          parts.push(prim.line(toPoint(v), toPoint(target), { dashed: true, strokeWidth: 1, color: '#999' }));
        }
      }
    }
  }

  // 외접원
  if (spec.circumscribedCircle) {
    const cc = computeCircumcenter(...gv);
    const cr = computeCircumradius(...gv);
    parts.push(prim.circle(cc.x, cc.y, cr, { dashed: true }));
  }

  // 내접원
  if (spec.inscribedCircle) {
    const ic = computeIncenter(...gv);
    const ir = computeInradius(...gv);
    parts.push(prim.circle(ic.x, ic.y, ir, { dashed: true }));
  }

  // 삼각형 본체
  parts.push(polygon(vertices));

  // 직각 표시
  if (rightAngle !== undefined && rightAngle >= 0 && rightAngle < 3) {
    const v = vertices[rightAngle];
    const prev = vertices[(rightAngle + 2) % 3];
    const next = vertices[(rightAngle + 1) % 3];
    parts.push(prim.path(rightAnglePath(v, prev, next, 14)));
  }

  // 특수점
  if (spec.specialPoints) {
    const pointMap: Record<string, { fn: () => Pt; label: string }> = {
      incenter: { fn: () => computeIncenter(...gv), label: 'I' },
      circumcenter: { fn: () => computeCircumcenter(...gv), label: 'O' },
      centroid: { fn: () => computeCentroid(...gv), label: 'G' },
      orthocenter: { fn: () => computeOrthocenter(...gv), label: 'H' },
    };
    for (const sp of spec.specialPoints) {
      const info = pointMap[sp];
      if (!info) continue;
      const pt = info.fn();
      parts.push(prim.dot(pt.x, pt.y, 3));
      parts.push(prim.text(pt.x + 10, pt.y - 8, info.label, { fontSize: 12, fontWeight: 'bold' }));
    }
  }

  // 각도 호 표시
  if (showAngles && showAngles.length > 0) {
    for (let i = 0; i < showAngles.length; i++) {
      const idx = showAngles[i];
      if (idx === rightAngle) continue;
      const v = vertices[idx];
      const prev = vertices[(idx + 2) % 3];
      const next = vertices[(idx + 1) % 3];
      const a1 = angleBetween(v, next);
      const a2 = angleBetween(v, prev);
      parts.push(prim.path(arcPath(v[0], v[1], 18, toDegrees(a1), toDegrees(a2))));

      if (angleValues && angleValues[i]) {
        const midAngle = (a1 + a2) / 2;
        const lx = v[0] + Math.cos(midAngle) * 28;
        const ly = v[1] + Math.sin(midAngle) * 28;
        parts.push(prim.text(lx, ly, angleValues[i], { fontSize: 12 }));
      }
    }
  }

  // 외각 연장선 + 외각 호
  if (spec.exteriorAngles) {
    for (const ext of spec.exteriorAngles) {
      const { vertex: vi, extendFrom: fi, value, extensionLength = 50 } = ext;
      if (vi < 0 || vi > 2 || fi < 0 || fi > 2 || vi === fi) continue;

      const vPt = vertices[vi];      // 꼭짓점
      const fPt = vertices[fi];      // 연장할 변의 반대쪽 점

      // 연장 방향: fPt → vPt를 넘어서 연장
      const dx = vPt[0] - fPt[0];
      const dy = vPt[1] - fPt[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const extEnd: Point = [vPt[0] + ux * extensionLength, vPt[1] + uy * extensionLength];

      // 연장선 (점선)
      parts.push(prim.line(vPt, extEnd, { dashed: true, strokeWidth: 1.5, color: '#666' }));

      // 외각 호: 연장선 끝 방향 ~ 다른 변 방향 사이의 호
      const otherIdx = [0, 1, 2].find(i => i !== vi && i !== fi)!;
      const oPt = vertices[otherIdx];
      const extAngle = angleBetween(vPt, extEnd);
      const otherAngle = angleBetween(vPt, oPt);
      parts.push(prim.path(arcPath(vPt[0], vPt[1], 22, toDegrees(otherAngle), toDegrees(extAngle)), { color: '#E65100' }));

      // 외각 값 라벨
      if (value) {
        const midAngle = (extAngle + otherAngle) / 2;
        const lx = vPt[0] + Math.cos(midAngle) * 34;
        const ly = vPt[1] + Math.sin(midAngle) * 34;
        parts.push(prim.text(lx, ly, value, { fontSize: 12, color: '#E65100' }));
      }
    }
  }

  // 변의 길이 표시
  if (showLengths) {
    const center: Point = [
      (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3,
      (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3,
    ];
    for (const { edge, value } of showLengths) {
      const mid = midpoint(vertices[edge[0]], vertices[edge[1]]);
      const offset = labelOffset(mid, center, 16);
      parts.push(prim.text(offset[0], offset[1], value, { fontSize: 13 }));
    }
  }

  // 꼭짓점 라벨
  if (labels && labels.length > 0) {
    parts.push(renderLabels(labels));
  } else {
    const center: Point = [
      (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3,
      (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3,
    ];
    const defaultLabels = ['A', 'B', 'C'];
    for (let i = 0; i < 3; i++) {
      const pos = labelOffset(vertices[i], center, 20);
      parts.push(prim.text(pos[0], pos[1], defaultLabels[i], { fontWeight: 'bold' }));
    }
  }

  return parts.join('\n');
}
