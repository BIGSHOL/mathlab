import { Point, DiagramLabel } from '@/types/diagram';

/**
 * 교과서 스타일 SVG 토큰 — 모든 프리셋 도형의 기본값.
 * - 주 색상: 브랜드 블루 (#3B82F6)
 * - 보조 색상: 동일 블루의 낮은 투명도 (각도 호/보조선)
 * - 폰트: Pretendard italic (수학 변수)
 * - 채움: 없음(none) 또는 블루 5% 투명
 */
export const STYLE = {
  MAIN_STROKE: '#3B82F6',
  MAIN_STROKE_WIDTH: 1.8,
  AUX_STROKE: '#60A5FA',
  AUX_STROKE_WIDTH: 1,
  DASHED: '6,4',
  FONT_SIZE: 14,
  FONT_FAMILY: "'Pretendard', system-ui, -apple-system, sans-serif",
  LABEL_COLOR: '#1E40AF',
  LABEL_STYLE: 'italic',
  ANGLE_ARC_COLOR: '#60A5FA',
  GRID_COLOR: '#E5E7EB',
  AXIS_COLOR: '#334155',
  POINT_RADIUS: 3,
  POINT_COLOR: '#1E40AF',
  FILL_TINT: '#EFF6FF',
  FILL_OPACITY: 0.35,
} as const;

/** SVG 선분 */
export function line(
  from: Point,
  to: Point,
  options?: { strokeWidth?: number; dashed?: boolean; color?: string },
): string {
  const sw = options?.strokeWidth ?? STYLE.MAIN_STROKE_WIDTH;
  const color = options?.color ?? STYLE.MAIN_STROKE;
  const dash = options?.dashed ? ` stroke-dasharray="${STYLE.DASHED}"` : '';
  return `<line x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}" stroke="${color}" stroke-width="${sw}"${dash} stroke-linecap="round"/>`;
}

/** SVG 원 */
export function circle(
  cx: number,
  cy: number,
  r: number,
  options?: { fill?: string; strokeWidth?: number; dashed?: boolean },
): string {
  const sw = options?.strokeWidth ?? STYLE.MAIN_STROKE_WIDTH;
  const fill = options?.fill ?? 'none';
  const dash = options?.dashed ? ` stroke-dasharray="${STYLE.DASHED}"` : '';
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${STYLE.MAIN_STROKE}" stroke-width="${sw}"${dash}/>`;
}

/** SVG 점 (채워진 원) */
export function dot(x: number, y: number, r?: number, color?: string): string {
  return `<circle cx="${x}" cy="${y}" r="${r ?? STYLE.POINT_RADIUS}" fill="${color ?? STYLE.POINT_COLOR}"/>`;
}

/**
 * SVG 텍스트 라벨 — 교과서 스타일(italic + LABEL_COLOR) 기본값.
 * 명시적으로 다른 스타일이 필요하면 options로 재정의.
 */
export function text(
  x: number,
  y: number,
  content: string,
  options?: { fontSize?: number; anchor?: string; baseline?: string; fontWeight?: string; color?: string; italic?: boolean; plain?: boolean },
): string {
  const fs = options?.fontSize ?? STYLE.FONT_SIZE;
  const anchor = options?.anchor ?? 'middle';
  const baseline = options?.baseline ?? 'middle';
  const fw = options?.fontWeight ? ` font-weight="${options.fontWeight}"` : '';
  // plain=true이면 기본 검정/정자체 (주석·단위 텍스트용), 그 외에는 교과서 스타일 기본값
  const defaultColor = options?.plain ? '#334155' : STYLE.LABEL_COLOR;
  const color = options?.color ?? defaultColor;
  const fill = ` fill="${color}"`;
  const italic = !options?.plain && (options?.italic ?? true);
  const fs2 = italic ? ' font-style="italic"' : '';
  return `<text x="${x}" y="${y}" font-size="${fs}" font-family="${STYLE.FONT_FAMILY}" text-anchor="${anchor}" dominant-baseline="${baseline}"${fw}${fs2}${fill}>${escapeXml(content)}</text>`;
}

/**
 * 교과서 스타일 직각 표시 마커 — 꼭짓점(v)에서 인접 변(p1, p2) 방향으로 작은 정사각형.
 * 모든 도형에서 동일한 모양·굵기·색을 보장하기 위해 중앙 primitive로 제공.
 */
export function rightAngleMark(
  v: Point,
  p1: Point,
  p2: Point,
  options?: { size?: number; color?: string; strokeWidth?: number },
): string {
  const size = options?.size ?? 10;
  const color = options?.color ?? STYLE.MAIN_STROKE;
  const sw = options?.strokeWidth ?? STYLE.AUX_STROKE_WIDTH;
  const len = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u1x = (p1[0] - v[0]) / len(v, p1);
  const u1y = (p1[1] - v[1]) / len(v, p1);
  const u2x = (p2[0] - v[0]) / len(v, p2);
  const u2y = (p2[1] - v[1]) / len(v, p2);
  const a: Point = [v[0] + u1x * size, v[1] + u1y * size];
  const b: Point = [v[0] + u1x * size + u2x * size, v[1] + u1y * size + u2y * size];
  const c: Point = [v[0] + u2x * size, v[1] + u2y * size];
  return `<polyline points="${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

/** SVG path */
export function path(
  d: string,
  options?: { fill?: string; strokeWidth?: number; color?: string; dashed?: boolean },
): string {
  const sw = options?.strokeWidth ?? STYLE.AUX_STROKE_WIDTH;
  const fill = options?.fill ?? 'none';
  const color = options?.color ?? STYLE.ANGLE_ARC_COLOR;
  const dash = options?.dashed ? ` stroke-dasharray="${STYLE.DASHED}"` : '';
  return `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${sw}"${dash}/>`;
}

/** SVG 다각형 */
export function polygon(
  points: Point[],
  options?: { fill?: string; strokeWidth?: number },
): string {
  const sw = options?.strokeWidth ?? STYLE.MAIN_STROKE_WIDTH;
  const fill = options?.fill ?? 'none';
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${STYLE.MAIN_STROKE}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

/** 라벨 배열 렌더링 */
export function renderLabels(labels: DiagramLabel[]): string {
  return labels
    .map((l) => text(l.position[0], l.position[1], l.text, { fontSize: l.fontSize }))
    .join('\n');
}

/** XML 특수 문자 이스케이프 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 영역 채우기 (반투명 폴리곤) */
export function filledRegion(
  points: Point[],
  color: string = '#3b82f6',
  opacity: number = 0.15,
): string {
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polygon points="${pts}" fill="${color}" fill-opacity="${opacity}" stroke="none"/>`;
}

/**
 * stroke 옵션을 받아 일반 polygon 그리기 (stroke 색상/굵기 커스터마이즈 가능).
 * 기존 polygon()은 stroke를 STYLE.MAIN_STROKE로 고정하므로 이 함수가 필요한 경우 별도 사용.
 */
export function strokedPolygon(
  points: Point[],
  options?: { fill?: string; stroke?: string; strokeWidth?: number; dashed?: boolean },
): string {
  const sw = options?.strokeWidth ?? STYLE.MAIN_STROKE_WIDTH;
  const fill = options?.fill ?? 'none';
  const stroke = options?.stroke ?? STYLE.MAIN_STROKE;
  const dash = options?.dashed ? ` stroke-dasharray="${STYLE.DASHED}"` : '';
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash} stroke-linejoin="round"/>`;
}

/** 다각형 꼭짓점들의 무게중심 (centroid) — 영역 라벨 자동 배치용 */
export function polygonCentroid(points: Point[]): Point {
  if (points.length === 0) return [0, 0];
  let sx = 0, sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  return [sx / points.length, sy / points.length];
}

/**
 * 도형 외곽을 따라가는 점선 곡선 (교과서 풍 데코) — quadratic Bezier로 각 변마다 외측 부풀림.
 * vertices: 도형 꼭짓점 (시계/반시계 방향). 닫힌 도형으로 가정.
 * inflate: 외측으로 부풀리는 정도 (px). 음수면 내측.
 *
 * 각 변의 외측 방향은 **변 자체의 법선 + point-in-polygon 판별**로 결정.
 * centroid 기반 폴백보다 오목(concave) 도형에서도 정확하게 외측으로 그려짐.
 */
export function outlineCurvePath(
  vertices: Point[],
  inflate: number = 12,
): string {
  if (vertices.length < 3) return '';

  const segments: string[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    // 변의 중점
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    // 법선 후보 (단위벡터)
    const edx = b[0] - a[0];
    const edy = b[1] - a[1];
    const elen = Math.sqrt(edx * edx + edy * edy) || 1;
    const nx = -edy / elen;
    const ny = edx / elen;
    // probe로 내/외 판별 (1px)
    const probeInside = pointInPolygonLocal([mx + nx, my + ny], vertices);
    const outX = probeInside ? -nx : nx;
    const outY = probeInside ? -ny : ny;
    // 컨트롤 포인트: 외측으로 inflate만큼
    const cpx = mx + outX * inflate;
    const cpy = my + outY * inflate;
    if (i === 0) segments.push(`M ${a[0]} ${a[1]}`);
    segments.push(`Q ${cpx} ${cpy} ${b[0]} ${b[1]}`);
  }
  segments.push('Z');
  return segments.join(' ');
}

/** 로컬 point-in-polygon (primitives 내부 전용, utils 순환 참조 방지) */
function pointInPolygonLocal(p: Point, poly: Point[]): boolean {
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

/** outlineCurvePath를 점선 path로 그리는 편의 함수 */
export function outlineCurve(
  vertices: Point[],
  options?: { inflate?: number; color?: string; dashArray?: string; strokeWidth?: number },
): string {
  const d = outlineCurvePath(vertices, options?.inflate ?? 12);
  if (!d) return '';
  const color = options?.color ?? '#999';
  const dash = options?.dashArray ?? '4,3';
  const sw = options?.strokeWidth ?? 1;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="${dash}"/>`;
}
