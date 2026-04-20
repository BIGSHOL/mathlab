import { Point } from '@/types/diagram';

/** 두 점 사이 거리 */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}

/** 두 점 사이 중점 */
export function midpoint(a: Point, b: Point): Point {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** a에서 b로의 각도 (라디안) */
export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

/** 세 점으로 이루어진 꼭짓점(vertex)에서의 각도 (라디안)
 *  vertex에서 p1, p2로 가는 두 벡터 사이의 각도 */
export function vertexAngle(p1: Point, vertex: Point, p2: Point): number {
  const a1 = angleBetween(vertex, p1);
  const a2 = angleBetween(vertex, p2);
  let angle = Math.abs(a1 - a2);
  if (angle > Math.PI) angle = 2 * Math.PI - angle;
  return angle;
}

/** 라디안 → 도 */
export function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** 도 → 라디안 */
export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** SVG arc path의 d 속성 생성 (원호) */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const start = toRadians(startAngleDeg);
  const end = toRadians(endAngleDeg);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  let diff = endAngleDeg - startAngleDeg;
  if (diff < 0) diff += 360;
  const largeArc = diff > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/** 각도 호 표시 SVG path (꼭짓점에서 작은 호) */
export function angleArcPath(
  vertex: Point,
  p1: Point,
  p2: Point,
  radius: number = 20,
): string {
  const a1 = angleBetween(vertex, p1);
  const a2 = angleBetween(vertex, p2);
  return arcPath(vertex[0], vertex[1], radius, toDegrees(a1), toDegrees(a2));
}

/** 직각 표시 사각형 SVG path */
export function rightAnglePath(
  vertex: Point,
  p1: Point,
  p2: Point,
  size: number = 12,
): string {
  const a1 = angleBetween(vertex, p1);
  const a2 = angleBetween(vertex, p2);
  const dx1 = Math.cos(a1) * size;
  const dy1 = Math.sin(a1) * size;
  const dx2 = Math.cos(a2) * size;
  const dy2 = Math.sin(a2) * size;
  const corner1: Point = [vertex[0] + dx1, vertex[1] + dy1];
  const mid: Point = [vertex[0] + dx1 + dx2, vertex[1] + dy1 + dy2];
  const corner2: Point = [vertex[0] + dx2, vertex[1] + dy2];
  return `M ${corner1[0]} ${corner1[1]} L ${mid[0]} ${mid[1]} L ${corner2[0]} ${corner2[1]}`;
}

/** 바운딩 박스 계산 */
export function boundingBox(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** viewBox 문자열 생성 (패딩 포함) */
export function computeViewBox(
  points: Point[],
  padding: number = 40,
): string {
  const bb = boundingBox(points);
  return `${bb.minX - padding} ${bb.minY - padding} ${bb.width + padding * 2} ${bb.height + padding * 2}`;
}

/** 라벨 위치 자동 계산: 도형 중심에서 바깥쪽으로 오프셋 */
export function labelOffset(
  point: Point,
  center: Point,
  offset: number = 18,
): Point {
  const angle = angleBetween(center, point);
  return [point[0] + Math.cos(angle) * offset, point[1] + Math.sin(angle) * offset];
}

/** 점이 다각형 내부에 있는지 판별 (ray casting) */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
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

/**
 * 변(edge)의 외측 법선 방향으로 라벨 위치 계산.
 * 오목(concave) 다각형에서도 정확하게 외측을 향하게 해주는 centroid 기반의 개선판.
 *
 * - edge [a, b]의 중점 m
 * - 법선 후보 n1=(-dy,dx), n2=(dy,-dx) 중에서 "도형 외부로 향하는" 것 선택
 * - 판별: m + n1을 point-in-polygon으로 검사 → 외부면 n1, 내부면 n2
 */
export function edgeLabelOffset(
  a: Point,
  b: Point,
  polygon: Point[],
  offset: number = 16,
): Point {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // 법선 후보 (단위벡터)
  const nx = -dy / len;
  const ny = dx / len;
  // 1px 짜리 probe로 내/외 판별 (offset이 너무 크면 오목부 폭을 넘어갈 수 있음)
  const probe: Point = [mx + nx, my + ny];
  const outwardX = pointInPolygon(probe, polygon) ? -nx : nx;
  const outwardY = pointInPolygon(probe, polygon) ? -ny : ny;
  return [mx + outwardX * offset, my + outwardY * offset];
}
