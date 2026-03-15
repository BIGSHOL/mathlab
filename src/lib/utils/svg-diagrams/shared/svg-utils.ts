/** 공통 SVG 유틸리티 */

export function svgWrap(
  content: string,
  width: number,
  height: number,
  padding = 10
): string {
  const vw = width + padding * 2;
  const vh = height + padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" style="font-family: 'Pretendard', sans-serif; font-size: 14px;">
  <g transform="translate(${padding}, ${padding})">
    ${content}
  </g>
</svg>`;
}

export function line(
  x1: number, y1: number, x2: number, y2: number,
  opts: { stroke?: string; strokeWidth?: number; dashArray?: string } = {}
): string {
  const stroke = opts.stroke || '#333';
  const sw = opts.strokeWidth || 1.5;
  const dash = opts.dashArray ? ` stroke-dasharray="${opts.dashArray}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`;
}

export function circle(
  cx: number, cy: number, r: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): string {
  const fill = opts.fill || 'none';
  const stroke = opts.stroke || '#333';
  const sw = opts.strokeWidth || 1.5;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

export function rect(
  x: number, y: number, w: number, h: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number; rx?: number } = {}
): string {
  const fill = opts.fill || 'none';
  const stroke = opts.stroke || '#333';
  const sw = opts.strokeWidth || 1.5;
  const rx = opts.rx ? ` rx="${opts.rx}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${rx}/>`;
}

export function text(
  x: number, y: number, content: string,
  opts: { anchor?: string; fontSize?: number; fill?: string; fontWeight?: string } = {}
): string {
  const anchor = opts.anchor || 'middle';
  const fs = opts.fontSize || 13;
  const fill = opts.fill || '#333';
  const fw = opts.fontWeight ? ` font-weight="${opts.fontWeight}"` : '';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${fs}" fill="${fill}"${fw} dominant-baseline="central">${escapeXml(content)}</text>`;
}

export function polygon(
  points: [number, number][],
  opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): string {
  const fill = opts.fill || 'none';
  const stroke = opts.stroke || '#333';
  const sw = opts.strokeWidth || 1.5;
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

export function path(d: string, opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}): string {
  const fill = opts.fill || 'none';
  const stroke = opts.stroke || '#333';
  const sw = opts.strokeWidth || 1.5;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

export function arrowHead(x: number, y: number, angle: number, size = 6): string {
  const rad = (angle * Math.PI) / 180;
  const x1 = x - size * Math.cos(rad - 0.4);
  const y1 = y - size * Math.sin(rad - 0.4);
  const x2 = x - size * Math.cos(rad + 0.4);
  const y2 = y - size * Math.sin(rad + 0.4);
  return `<polygon points="${x},${y} ${x1},${y1} ${x2},${y2}" fill="#333"/>`;
}

export function arrow(
  x1: number, y1: number, x2: number, y2: number,
  opts: { label?: string; stroke?: string } = {}
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  let result = line(x1, y1, x2, y2, { stroke: opts.stroke });
  result += arrowHead(x2, y2, angle);
  if (opts.label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 8;
    result += text(mx, my, opts.label, { fontSize: 11 });
  }
  return result;
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 분수를 유니코드로 표현 (SVG text용) */
export function fractionText(num: number, den: number): string {
  return `${num}⁄${den}`; // fraction slash U+2044
}

/** 색상 기본값 */
export const COLORS = {
  primary: '#3B82F6',   // blue
  secondary: '#F97316', // orange
  green: '#10B981',
  purple: '#7C3AED',
  red: '#EF4444',
  yellow: '#F59E0B',
  gray: '#9CA3AF',
};
