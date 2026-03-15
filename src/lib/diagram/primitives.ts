import { Point, DiagramLabel } from '@/types/diagram';

/** SVG 스타일 상수 */
export const STYLE = {
  MAIN_STROKE: '#000000',
  MAIN_STROKE_WIDTH: 2,
  AUX_STROKE_WIDTH: 1,
  DASHED: '6,4',
  FONT_SIZE: 14,
  FONT_FAMILY: 'system-ui, -apple-system, sans-serif',
  ANGLE_ARC_COLOR: '#333333',
  GRID_COLOR: '#e0e0e0',
  AXIS_COLOR: '#000000',
  POINT_RADIUS: 3,
  POINT_COLOR: '#000000',
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

/** SVG 텍스트 라벨 */
export function text(
  x: number,
  y: number,
  content: string,
  options?: { fontSize?: number; anchor?: string; baseline?: string; fontWeight?: string },
): string {
  const fs = options?.fontSize ?? STYLE.FONT_SIZE;
  const anchor = options?.anchor ?? 'middle';
  const baseline = options?.baseline ?? 'middle';
  const fw = options?.fontWeight ? ` font-weight="${options.fontWeight}"` : '';
  return `<text x="${x}" y="${y}" font-size="${fs}" font-family="${STYLE.FONT_FAMILY}" text-anchor="${anchor}" dominant-baseline="${baseline}"${fw}>${escapeXml(content)}</text>`;
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
