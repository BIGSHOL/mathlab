import katex from 'katex';

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
  opts: { anchor?: string; fontSize?: number; fill?: string; fontWeight?: string; fontStyle?: string; dominantBaseline?: string } = {}
): string {
  const anchor = opts.anchor || 'middle';
  const fs = opts.fontSize || 13;
  const fill = opts.fill || '#333';
  const fw = opts.fontWeight ? ` font-weight="${opts.fontWeight}"` : '';
  const fst = opts.fontStyle ? ` font-style="${opts.fontStyle}"` : '';
  const db = opts.dominantBaseline || 'central';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${fs}" fill="${fill}"${fw}${fst} dominant-baseline="${db}">${escapeXml(content)}</text>`;
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

/**
 * foreignObject + KaTeX로 수식 렌더링 — 문제 본문과 완전히 동일한 글씨체
 * @param x 중심 x좌표
 * @param topY foreignObject 상단 y좌표
 * @param latex KaTeX 수식 문자열 (예: "\\frac{3}{8}", "1", "x")
 * @param opts w/h: foreignObject 크기, fontSize: 기본 폰트 크기
 */
export function katexFO(
  x: number, topY: number,
  latex: string,
  opts: { w?: number; h?: number; fontSize?: number; anchor?: 'start' | 'middle' | 'end' } = {}
): string {
  const fs = opts.fontSize || 14;
  const w = opts.w || 50;
  const h = opts.h || 40;
  const anchor = opts.anchor || 'middle';
  const leftX = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x : x - w;
  const justify = anchor === 'middle' ? 'center' : anchor === 'start' ? 'flex-start' : 'flex-end';
  const html = katex.renderToString(latex, { throwOnError: false, output: 'html' });
  return `<foreignObject x="${leftX.toFixed(1)}" y="${topY.toFixed(1)}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:flex-start;justify-content:${justify};height:100%;font-size:${fs}px;">${html}</div></foreignObject>`;
}

/** katexFO 센터 정렬 — y가 텍스트 중심 (기존 text() 대체용) */
export function katexLabel(
  x: number, cy: number,
  latex: string,
  opts: { fontSize?: number; anchor?: 'start' | 'middle' | 'end' } = {}
): string {
  const fs = opts.fontSize || 13;
  const h = fs * 1.8;
  const w = Math.max(20, latex.length * fs * 0.65 + 8);
  return katexFO(x, cy - h / 2, latex, { w, h, fontSize: fs, anchor: opts.anchor });
}

/** fractionFO — katexFO 래퍼 (분수 전용, 크기 자동 계산) */
export function fractionFO(
  x: number, topY: number,
  numer: string, denom: string,
  opts: { fontSize?: number } = {}
): string {
  const fs = opts.fontSize || 14;
  const maxLen = Math.max(numer.length, denom.length);
  const w = Math.max(30, maxLen * fs * 0.8 + 16);
  const h = fs * 3;
  return katexFO(x, topY, `\\frac{${numer}}{${denom}}`, { w, h, fontSize: fs });
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

/** 데이터셋 색상 순환 배열 (차트/그래프 공용) */
export const DATASET_COLORS = [COLORS.primary, COLORS.red, COLORS.green, COLORS.purple, COLORS.secondary];

/** 빗금(사선) 패턴 SVG defs — fraction-circle, fraction-rect 등 공용 */
export function hatchPatternDef(id: string, color: string, opacity = 0.6): string {
  return `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${color}" stroke-width="1.5" stroke-opacity="${opacity}"/></pattern></defs>`;
}

/**
 * 좌표 변환 팩토리 — 데이터 좌표 → SVG 좌표
 * coordinate-plane, function-graph, histogram, scatter-plot, bar-chart, number-line 등 공용
 */
export function createCoordinateMapper(opts: {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  width: number; height: number;
  padLeft?: number; padTop?: number;
}) {
  const padLeft = opts.padLeft ?? 0;
  const padTop = opts.padTop ?? 0;
  const xRange = opts.xMax - opts.xMin || 1;
  const yRange = opts.yMax - opts.yMin || 1;

  return {
    toX: (v: number) => padLeft + ((v - opts.xMin) / xRange) * opts.width,
    toY: (v: number) => padTop + ((opts.yMax - v) / yRange) * opts.height,
  };
}

/**
 * 점 배열을 캔버스에 맞게 스케일링
 * shapes.ts의 triangle, quadrilateral에서 반복되던 패턴 통합
 */
export function fitPointsToCanvas(
  points: { x: number; y: number }[],
  targetSize: number,
  padding: number
): { scale: number; toSvg: (p: { x: number; y: number }) => [number, number] } {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min(targetSize / rangeX, targetSize / rangeY);

  return {
    scale,
    toSvg: (p) => [padding + (p.x - minX) * scale, padding + (p.y - minY) * scale],
  };
}
