import { QuadrilateralDiagram, Point } from '@/types/diagram';
import { polygon, strokedPolygon, renderLabels, polygonCentroid, outlineCurve } from '../primitives';
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
  const vertices = spec.vertices ?? [[0, 150], [150, 150], [150, 0], [0, 0]];
  const { labels, showAngles, angleValues, showLengths, diagonals, splitDiagonal, fill, outlineCurve: outlineOpt } = spec;
  const parts: string[] = [];
  const center: Point = [
    (vertices[0][0] + vertices[1][0] + vertices[2][0] + vertices[3][0]) / 4,
    (vertices[0][1] + vertices[1][1] + vertices[2][1] + vertices[3][1]) / 4,
  ];

  // 외곽 점선 곡선 (도형 뒤에 그리기)
  if (outlineOpt) {
    parts.push(outlineCurve(vertices, {
      inflate: outlineOpt.inflate ?? 14,
      color: outlineOpt.color ?? '#999',
      dashArray: outlineOpt.dashArray ?? '4,3',
    }));
  }

  // splitDiagonal: 대각선으로 두 영역을 색칠하고 라벨 표시
  if (splitDiagonal) {
    const i = splitDiagonal.from;
    const j = splitDiagonal.to;
    if (i >= 0 && i < 4 && j >= 0 && j < 4 && i !== j) {
      // 두 영역 추출 (대각선이 i↔j일 때)
      const regionA = collectRegion(vertices as Point[], i, j);
      const regionB = collectRegion(vertices as Point[], j, i);
      if (splitDiagonal.fillA) {
        parts.push(strokedPolygon(regionA, { fill: splitDiagonal.fillA, stroke: 'none' }));
      }
      if (splitDiagonal.fillB) {
        parts.push(strokedPolygon(regionB, { fill: splitDiagonal.fillB, stroke: 'none' }));
      }
    }
  } else if (fill) {
    // 단순 fill 사용
    parts.push(strokedPolygon(vertices as Point[], { fill, stroke: 'none' }));
  }

  // 사각형 본체 (테두리만, fill은 위에서 처리)
  parts.push(polygon(vertices));

  // splitDiagonal: 분할선 그리기 (본체 위에)
  if (splitDiagonal) {
    const i = splitDiagonal.from;
    const j = splitDiagonal.to;
    if (i >= 0 && i < 4 && j >= 0 && j < 4 && i !== j) {
      parts.push(prim.line(vertices[i], vertices[j], {
        strokeWidth: 1.2,
        dashed: splitDiagonal.style === 'dashed',
      }));
      // 영역 라벨 (centroid)
      const regionA = collectRegion(vertices as Point[], i, j);
      const regionB = collectRegion(vertices as Point[], j, i);
      if (splitDiagonal.labelA) {
        const c = polygonCentroid(regionA);
        parts.push(prim.text(c[0], c[1], splitDiagonal.labelA, { fontSize: 14, fontWeight: 'bold' }));
      }
      if (splitDiagonal.labelB) {
        const c = polygonCentroid(regionB);
        parts.push(prim.text(c[0], c[1], splitDiagonal.labelB, { fontSize: 14, fontWeight: 'bold' }));
      }
    }
  }

  // 대각선
  if (diagonals) {
    if (Array.isArray(diagonals)) {
      for (const d of diagonals) {
        parts.push(prim.line(vertices[d.from], vertices[d.to], { strokeWidth: 1, dashed: d.style === 'dashed' }));
        if (d.label) {
          const mid: Point = [(vertices[d.from][0] + vertices[d.to][0]) / 2, (vertices[d.from][1] + vertices[d.to][1]) / 2];
          parts.push(prim.text(mid[0] + 8, mid[1] - 8, d.label, { fontSize: 12 }));
        }
      }
    } else {
      parts.push(prim.line(vertices[0], vertices[2], { strokeWidth: 1, dashed: true }));
      parts.push(prim.line(vertices[1], vertices[3], { strokeWidth: 1, dashed: true }));
    }
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

  // 직각 표시 (명시적)
  if (spec.rightAngleMarks) {
    for (const idx of spec.rightAngleMarks) {
      if (idx < 0 || idx > 3) continue;
      const v = vertices[idx];
      const prev = vertices[(idx + 3) % 4];
      const next = vertices[(idx + 1) % 4];
      parts.push(prim.path(rightAnglePath(v, prev, next, 12)));
    }
  }

  // 합동 표시
  if (spec.congruenceMarks) {
    for (const cm of spec.congruenceMarks) {
      const mid = midpoint(vertices[cm.from], vertices[cm.to]);
      const dx = vertices[cm.to][0] - vertices[cm.from][0];
      const dy = vertices[cm.to][1] - vertices[cm.from][1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const tickLen = 6;
      const spacing = 4;
      for (let t = 0; t < cm.ticks; t++) {
        const offset = (t - (cm.ticks - 1) / 2) * spacing;
        const cx2 = mid[0] + (dx / len) * offset;
        const cy2 = mid[1] + (dy / len) * offset;
        parts.push(prim.line(
          [cx2 + nx * tickLen, cy2 + ny * tickLen],
          [cx2 - nx * tickLen, cy2 - ny * tickLen],
          { strokeWidth: 1.5 }
        ));
      }
    }
  }

  // 평행 표시
  if (spec.parallelMarks) {
    for (const pm of spec.parallelMarks) {
      const mid = midpoint(vertices[pm.from], vertices[pm.to]);
      const dx = vertices[pm.to][0] - vertices[pm.from][0];
      const dy = vertices[pm.to][1] - vertices[pm.from][1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const spacing = 5;
      for (let a = 0; a < pm.arrows; a++) {
        const offset = (a - (pm.arrows - 1) / 2) * spacing;
        const cx2 = mid[0] + ux * offset;
        const cy2 = mid[1] + uy * offset;
        const headLen = 4;
        const headW = 3;
        const tipX = cx2 + ux * headLen;
        const tipY = cy2 + uy * headLen;
        const b1: Point = [cx2 - uy * headW, cy2 + ux * headW];
        const b2: Point = [cx2 + uy * headW, cy2 - ux * headW];
        const pts = `${tipX},${tipY} ${b1[0]},${b1[1]} ${b2[0]},${b2[1]}`;
        parts.push(`<polygon points="${pts}" fill="${prim.STYLE.MAIN_STROKE}"/>`);
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

  // 꼭짓점 라벨 — vertexLabels가 명시되었거나 사용자가 labels 배열을 주었을 때만 그림
  if (labels && labels.length > 0) {
    parts.push(renderLabels(labels));
  } else if (spec.vertexLabels) {
    const defaultLabels = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < 4; i++) {
      const pos = labelOffset(vertices[i], center, 20);
      parts.push(prim.text(pos[0], pos[1], defaultLabels[i], { fontWeight: 'bold' }));
    }
  }

  return parts.join('\n');
}

/**
 * 4-꼭짓점 사각형에서 i→j 대각선 한쪽 영역의 꼭짓점들을 시계방향으로 수집.
 * 예: 4각형 [0,1,2,3]에서 (0,2)면 영역A=[0,1,2], 영역B=[2,3,0]
 */
function collectRegion(vertices: Point[], start: number, end: number): Point[] {
  const n = vertices.length;
  const result: Point[] = [];
  let i = start;
  while (true) {
    result.push(vertices[i]);
    if (i === end) break;
    i = (i + 1) % n;
  }
  return result;
}
