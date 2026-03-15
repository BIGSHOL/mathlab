import { QuadrilateralDiagram, Point } from '@/types/diagram';
import { polygon, renderLabels } from '../primitives';
import * as prim from '../primitives';
import {
  angleBetween,
  toDegrees,
  arcPath,
  rightAnglePath,
  midpoint,
  labelOffset,
} from '../utils';

export function renderQuadrilateral(spec: QuadrilateralDiagram): string {
  const { vertices, labels, showAngles, angleValues, showLengths, diagonals } = spec;
  const parts: string[] = [];
  const center: Point = [
    (vertices[0][0] + vertices[1][0] + vertices[2][0] + vertices[3][0]) / 4,
    (vertices[0][1] + vertices[1][1] + vertices[2][1] + vertices[3][1]) / 4,
  ];

  // 사각형 본체
  parts.push(polygon(vertices));

  // 대각선
  if (diagonals) {
    parts.push(prim.line(vertices[0], vertices[2], { strokeWidth: 1, dashed: true }));
    parts.push(prim.line(vertices[1], vertices[3], { strokeWidth: 1, dashed: true }));
  }

  // 각도 표시
  if (showAngles && showAngles.length > 0) {
    for (let i = 0; i < showAngles.length; i++) {
      const idx = showAngles[i];
      const v = vertices[idx];
      const prev = vertices[(idx + 3) % 4];
      const next = vertices[(idx + 1) % 4];
      const a1 = angleBetween(v, next);
      const a2 = angleBetween(v, prev);

      // 직각인지 확인
      const angleDiff = Math.abs(toDegrees(Math.abs(a1 - a2)));
      const isRightAngle = Math.abs(angleDiff - 90) < 2 || Math.abs(angleDiff - 270) < 2;

      if (isRightAngle) {
        parts.push(prim.path(rightAnglePath(v, next, prev, 12)));
      } else {
        parts.push(prim.path(arcPath(v[0], v[1], 16, toDegrees(a1), toDegrees(a2))));
      }

      if (angleValues && angleValues[i]) {
        const midAngle = (a1 + a2) / 2;
        const lx = v[0] + Math.cos(midAngle) * 26;
        const ly = v[1] + Math.sin(midAngle) * 26;
        parts.push(prim.text(lx, ly, angleValues[i], { fontSize: 12 }));
      }
    }
  }

  // 변의 길이 표시
  if (showLengths) {
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
    const defaultLabels = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < 4; i++) {
      const pos = labelOffset(vertices[i], center, 20);
      parts.push(prim.text(pos[0], pos[1], defaultLabels[i], { fontWeight: 'bold' }));
    }
  }

  return parts.join('\n');
}
