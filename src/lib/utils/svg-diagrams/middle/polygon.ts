/**
 * 임의 N각형 렌더러 — 계단형, L자, T자, ㄷ자, 집 모양, 오각형 등
 *
 * 지원 기능:
 * - fill: 단색 채움
 * - regions: 분할선으로 나뉜 영역별 색상 + 라벨 (① ② 등)
 * - splitLines: 내부 보조선 (실선/점선)
 * - rightAngleMarks: N개 꼭짓점에 직각 표시 (오목 꼭짓점도 도형 내부로 그려짐)
 * - showLengths: 변별 길이 라벨 (변의 외측 법선 방향으로 자동 배치)
 * - labels: 임의 좌표 라벨 (정밀 제어)
 * - outlineCurve: 도형 외곽을 감싸는 점선 곡선 (교과서 풍 데코)
 */

import { PolygonParams } from '../types';
import { svgWrap, renderRightAngleMark, polygon as svgPolygon, text as svgText } from '../shared/svg-utils';

type Point = [number, number];

/** Point2D {x,y} → [x,y] 튜플 변환 */
function toTuple(p: { x: number; y: number }): Point {
  return [p.x, p.y];
}

/** point-in-polygon (ray casting) */
function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersects =
      (yi > p[1]) !== (yj > p[1]) &&
      p[0] < ((xj - xi) * (p[1] - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** 변의 외측 법선 방향으로 라벨 위치 (오목 다각형 대응) */
function edgeLabelOffset(a: Point, b: Point, polygon: Point[], offset = 16): Point {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const probe: Point = [mx + nx, my + ny];
  const outX = pointInPolygon(probe, polygon) ? -nx : nx;
  const outY = pointInPolygon(probe, polygon) ? -ny : ny;
  return [mx + outX * offset, my + outY * offset];
}

/** 다각형 centroid */
function polygonCentroid(pts: Point[]): Point {
  if (pts.length === 0) return [0, 0];
  let sx = 0, sy = 0;
  for (const [x, y] of pts) {
    sx += x; sy += y;
  }
  return [sx / pts.length, sy / pts.length];
}

/**
 * 외곽 점선 곡선 (quadratic Bezier, 각 변마다 외측 법선 방향으로 부풀림)
 */
function outlineCurvePath(vertices: Point[], inflate: number): string {
  if (vertices.length < 3) return '';
  const segs: string[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const probe: Point = [mx + nx, my + ny];
    const outX = pointInPolygon(probe, vertices) ? -nx : nx;
    const outY = pointInPolygon(probe, vertices) ? -ny : ny;
    const cpx = mx + outX * inflate;
    const cpy = my + outY * inflate;
    if (i === 0) segs.push(`M ${a[0]} ${a[1]}`);
    segs.push(`Q ${cpx} ${cpy} ${b[0]} ${b[1]}`);
  }
  segs.push('Z');
  return segs.join(' ');
}

/** PolygonParams → SVG 문자열 */
export function renderPolygon(params: PolygonParams): string {
  // 방어 — vertices 2D 좌표 튜플로 변환
  const raw = params.vertices ?? [];
  let vertices: Point[] = [];
  for (const v of raw) {
    if (Array.isArray(v)) vertices.push([v[0], v[1]]);
    else if (v && typeof v === 'object' && 'x' in v && 'y' in v) vertices.push(toTuple(v));
  }
  if (vertices.length < 3) {
    return svgWrap(`<text x="10" y="20" font-size="12" fill="#999">도형 꼭짓점이 3개 미만입니다</text>`, 200, 50);
  }

  // 좌표 정규화 — 음수나 아주 작은 좌표는 padding으로 쉬프트
  const xs = vertices.map((v) => v[0]);
  const ys = vertices.map((v) => v[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const height = Math.max(...ys) - minY;
  // minX, minY가 음수이거나 0이 아니면 이동
  if (minX !== 0 || minY !== 0) {
    vertices = vertices.map(([x, y]) => [x - minX, y - minY]);
  }

  const parts: string[] = [];

  // 외곽 점선 곡선 (도형 뒤)
  if (params.outlineCurve) {
    const d = outlineCurvePath(vertices, params.outlineCurve.inflate ?? 14);
    const color = params.outlineCurve.color ?? '#999';
    const dash = params.outlineCurve.dashArray ?? '4,3';
    parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="${dash}"/>`);
  }

  // 영역 fill
  if (params.regions && params.regions.length > 0) {
    for (const region of params.regions) {
      if (!region.vertexIndices || region.vertexIndices.length < 3) continue;
      const regVerts = region.vertexIndices
        .map((i) => vertices[i])
        .filter((v): v is Point => v !== undefined);
      if (regVerts.length < 3) continue;
      if (region.fill) {
        parts.push(svgPolygon(regVerts, { fill: region.fill, stroke: 'none' }));
      }
    }
  } else if (params.fill) {
    parts.push(svgPolygon(vertices, { fill: params.fill, stroke: 'none' }));
  }

  // 도형 본체 (테두리만)
  parts.push(svgPolygon(vertices, { fill: 'none', stroke: '#333', strokeWidth: 1.5 }));

  // 분할선 (보조선)
  if (params.splitLines) {
    for (const sl of params.splitLines) {
      if (sl.from < 0 || sl.from >= vertices.length || sl.to < 0 || sl.to >= vertices.length) continue;
      const a = vertices[sl.from];
      const b = vertices[sl.to];
      const dash = sl.style === 'dashed' ? ' stroke-dasharray="5,4"' : '';
      const stroke = sl.color ?? '#555';
      parts.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${stroke}" stroke-width="1.2"${dash}/>`);
    }
  }

  // 영역 라벨 (centroid)
  if (params.regions && params.regions.length > 0) {
    for (const region of params.regions) {
      if (!region.label) continue;
      const regVerts = region.vertexIndices
        .map((i) => vertices[i])
        .filter((v): v is Point => v !== undefined);
      if (regVerts.length < 3) continue;
      const [cx, cy] = polygonCentroid(regVerts);
      let ox = 0, oy = 0;
      const off = region.labelOffset;
      if (Array.isArray(off)) { ox = off[0] ?? 0; oy = off[1] ?? 0; }
      else if (off && typeof off === 'object') {
        const o = off as { x?: number; y?: number };
        ox = o.x ?? 0; oy = o.y ?? 0;
      }
      parts.push(svgText(cx + ox, cy + oy, region.label, { fontSize: 14, fontWeight: 'bold' }));
    }
  }

  // 직각 표시 — 오목 꼭짓점에서도 도형 내부로 그려지도록 probe 판별
  if (params.rightAngleMarks) {
    const n = vertices.length;
    for (const idx of params.rightAngleMarks) {
      if (idx < 0 || idx >= n) continue;
      const v = vertices[idx];
      const prev = vertices[(idx - 1 + n) % n];
      const next = vertices[(idx + 1) % n];
      const sz = 8;
      const dx1 = prev[0] - v[0], dy1 = prev[1] - v[1];
      const dx2 = next[0] - v[0], dy2 = next[1] - v[1];
      const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
      const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
      const probe: Point = [
        v[0] + (dx1 / l1) * sz + (dx2 / l2) * sz,
        v[1] + (dy1 / l1) * sz + (dy2 / l2) * sz,
      ];
      const inward = pointInPolygon(probe, vertices);
      const p1 = inward ? prev : next;
      const p2 = inward ? next : prev;
      parts.push(renderRightAngleMark(v[0], v[1], p1[0], p1[1], p2[0], p2[1], sz));
    }
  }

  // 변의 길이 표시 — 외측 법선 방향
  if (params.showLengths) {
    for (const { edge, value } of params.showLengths) {
      const [from, to] = edge;
      if (from < 0 || from >= vertices.length || to < 0 || to >= vertices.length) continue;
      const [lx, ly] = edgeLabelOffset(vertices[from], vertices[to], vertices, 16);
      parts.push(svgText(lx, ly, value, { fontSize: 13 }));
    }
  }

  // 사용자 정의 라벨
  if (params.labels && params.labels.length > 0) {
    for (const l of params.labels) {
      const pos = Array.isArray(l.position) ? l.position : toTuple(l.position as { x: number; y: number });
      const [lx, ly] = pos;
      parts.push(svgText(lx - minX, ly - minY, l.text, { fontSize: l.fontSize ?? 13 }));
    }
  }

  // 꼭짓점 라벨
  if (params.vertexLabels) {
    const [cx, cy] = polygonCentroid(vertices);
    const defaults = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    for (let i = 0; i < vertices.length; i++) {
      const lbl = params.vertexLabels[i] ?? defaults[i] ?? `V${i}`;
      if (!lbl) continue;
      const v = vertices[i];
      // 꼭짓점에서 centroid 반대방향으로 18px
      const dx = v[0] - cx;
      const dy = v[1] - cy;
      const dl = Math.sqrt(dx * dx + dy * dy) || 1;
      const lx = v[0] + (dx / dl) * 18;
      const ly = v[1] + (dy / dl) * 18;
      parts.push(svgText(lx, ly, lbl, { fontSize: 13, fontWeight: 'bold' }));
    }
  }

  return svgWrap(parts.join('\n    '), width, height, 20);
}
