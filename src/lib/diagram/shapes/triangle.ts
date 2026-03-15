import { TriangleDiagram, Point } from '@/types/diagram';
import { polygon, renderLabels } from '../primitives';
import * as prim from '../primitives';
import {
  vertexAngle,
  angleBetween,
  toDegrees,
  arcPath,
  rightAnglePath,
  midpoint,
  labelOffset,
} from '../utils';

export function renderTriangle(spec: TriangleDiagram): string {
  const { vertices, labels, showAngles, angleValues, showLengths, rightAngle } = spec;
  const parts: string[] = [];

  // 삼각형 본체
  parts.push(polygon(vertices));

  // 직각 표시
  if (rightAngle !== undefined && rightAngle >= 0 && rightAngle < 3) {
    const v = vertices[rightAngle];
    const prev = vertices[(rightAngle + 2) % 3];
    const next = vertices[(rightAngle + 1) % 3];
    parts.push(prim.path(rightAnglePath(v, prev, next, 14)));
  }

  // 각도 호 표시
  if (showAngles && showAngles.length > 0) {
    for (let i = 0; i < showAngles.length; i++) {
      const idx = showAngles[i];
      if (idx === rightAngle) continue; // 직각은 이미 표시
      const v = vertices[idx];
      const prev = vertices[(idx + 2) % 3];
      const next = vertices[(idx + 1) % 3];
      const a1 = angleBetween(v, next);
      const a2 = angleBetween(v, prev);
      parts.push(prim.path(arcPath(v[0], v[1], 18, toDegrees(a1), toDegrees(a2))));

      // 각도 값 표시
      if (angleValues && angleValues[i]) {
        const midAngle = (a1 + a2) / 2;
        const lx = v[0] + Math.cos(midAngle) * 28;
        const ly = v[1] + Math.sin(midAngle) * 28;
        parts.push(prim.text(lx, ly, angleValues[i], { fontSize: 12 }));
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
    // 기본 라벨 (A, B, C)
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
