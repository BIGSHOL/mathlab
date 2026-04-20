import { PolygonDiagram, Point } from '@/types/diagram';
import {
  polygon,
  strokedPolygon,
  renderLabels,
  polygonCentroid,
  outlineCurve,
} from '../primitives';
import * as prim from '../primitives';
import {
  midpoint,
  labelOffset,
  rightAnglePath,
} from '../utils';

/**
 * 임의 N각형 렌더러 (5각형, 6각형, L자, T자, 계단형 등)
 *
 * - regions로 부분 영역 색칠 + 라벨 자동 배치 (centroid)
 * - splitLines로 도형 내부에 보조선 그리기
 * - rightAngleMarks로 직각 표시
 * - showLengths로 변별 길이 자동 표시 (변 중앙 외측)
 * - labels로 임의 위치 텍스트 (정밀 제어)
 * - outlineCurve로 도형 외곽 점선 곡선 (교과서 풍 데코)
 */
export function renderPolygon(spec: PolygonDiagram): string {
  const vertices = spec.vertices ?? [];
  if (vertices.length < 3) {
    return '<text x="0" y="0" font-size="12" fill="#999">잘못된 다각형: 꼭짓점이 3개 미만</text>';
  }

  const { labels, showLengths, regions, splitLines, rightAngleMarks, fill, outlineCurve: outlineOpt } = spec;
  const parts: string[] = [];
  const center = polygonCentroid(vertices);

  // 외곽 점선 곡선 (도형 뒤)
  if (outlineOpt) {
    parts.push(outlineCurve(vertices, {
      inflate: outlineOpt.inflate ?? 14,
      color: outlineOpt.color ?? '#999',
      dashArray: outlineOpt.dashArray ?? '4,3',
    }));
  }

  // 영역 fill (부분 영역) — splitLines로 분할되는 부분
  if (regions && regions.length > 0) {
    for (const region of regions) {
      if (!region.vertexIndices || region.vertexIndices.length < 3) continue;
      const regionVerts = region.vertexIndices
        .map((i) => vertices[i])
        .filter((v): v is Point => v !== undefined);
      if (regionVerts.length < 3) continue;
      if (region.fill) {
        parts.push(strokedPolygon(regionVerts, { fill: region.fill, stroke: 'none' }));
      }
    }
  } else if (fill) {
    // 단순 fill 사용
    parts.push(strokedPolygon(vertices, { fill, stroke: 'none' }));
  }

  // 도형 본체 (테두리)
  parts.push(polygon(vertices));

  // 분할선 (보조선)
  if (splitLines) {
    for (const sl of splitLines) {
      if (sl.from < 0 || sl.from >= vertices.length || sl.to < 0 || sl.to >= vertices.length) continue;
      parts.push(prim.line(vertices[sl.from], vertices[sl.to], {
        strokeWidth: 1.2,
        dashed: sl.style === 'dashed',
        color: sl.color ?? '#000000',
      }));
    }
  }

  // 영역 라벨 (centroid + 옵션 offset)
  if (regions && regions.length > 0) {
    for (const region of regions) {
      if (!region.label) continue;
      const regionVerts = region.vertexIndices
        .map((i) => vertices[i])
        .filter((v): v is Point => v !== undefined);
      if (regionVerts.length < 3) continue;
      const c = polygonCentroid(regionVerts);
      const ox = region.labelOffset?.[0] ?? 0;
      const oy = region.labelOffset?.[1] ?? 0;
      parts.push(prim.text(c[0] + ox, c[1] + oy, region.label, { fontSize: 14, fontWeight: 'bold' }));
    }
  }

  // 직각 표시
  if (rightAngleMarks) {
    const n = vertices.length;
    for (const idx of rightAngleMarks) {
      if (idx < 0 || idx >= n) continue;
      const v = vertices[idx];
      const prev = vertices[(idx - 1 + n) % n];
      const next = vertices[(idx + 1) % n];
      parts.push(prim.path(rightAnglePath(v, prev, next, 12)));
    }
  }

  // 변의 길이 표시
  if (showLengths) {
    for (const { edge, value } of showLengths) {
      const [from, to] = edge;
      if (from < 0 || from >= vertices.length || to < 0 || to >= vertices.length) continue;
      const mid = midpoint(vertices[from], vertices[to]);
      const offset = labelOffset(mid, center, 16);
      parts.push(prim.text(offset[0], offset[1], value, { fontSize: 13 }));
    }
  }

  // 사용자 정의 라벨 (정밀 좌표) — 위치를 직접 지정한 경우만 표시
  if (labels && labels.length > 0) {
    parts.push(renderLabels(labels));
  } else if (spec.vertexLabels) {
    // 자동 꼭짓점 라벨 (vertexLabels가 명시된 경우만)
    const defaultLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < vertices.length; i++) {
      const labelText = spec.vertexLabels[i] ?? defaultLabels[i] ?? `V${i}`;
      const pos = labelOffset(vertices[i], center, 20);
      parts.push(prim.text(pos[0], pos[1], labelText, { fontWeight: 'bold' }));
    }
  }

  return parts.join('\n');
}
