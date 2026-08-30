import katex from 'katex';

/**
 * 공통 SVG 유틸리티 — 교과서 스타일 토큰 일치 (DiagramSpec primitives.ts와 동일).
 *
 * 교과서 스타일 기본값:
 * - MAIN stroke: #3B82F6 (브랜드 블루)
 * - LABEL color: #1E40AF (진한 블루, italic)
 * - AUX stroke: #60A5FA (보조 블루)
 * - GRID: #E5E7EB, AXIS: #334155
 *
 * 새 도형/프리셋 추가 시 이 모듈의 유틸을 사용하여 색상을 하드코딩하지 말 것.
 * 반드시 커스텀 색이 필요하면 함수 옵션에 stroke/fill을 명시적으로 전달.
 */
export const TEXTBOOK_STYLE = {
  MAIN_STROKE: '#3B82F6',
  MAIN_STROKE_WIDTH: 1.8,
  AUX_STROKE: '#60A5FA',
  AUX_STROKE_WIDTH: 1,
  LABEL_COLOR: '#1E40AF',
  LABEL_FONT_STYLE: 'italic',
  PLAIN_TEXT_COLOR: '#334155',
  GRID_COLOR: '#E5E7EB',
  AXIS_COLOR: '#334155',
  POINT_COLOR: '#1E40AF',
  FILL_TINT: '#EFF6FF',
  FILL_OPACITY: 0.35,
  FONT_FAMILY: "'Pretendard', system-ui, sans-serif",
  // 측정 표기용 점선 호 색상 — 본선(파랑)과 시각적으로 구분하기 위해 검정 고정
  MEASUREMENT_ARC_COLOR: '#000000',
} as const;

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
  const stroke = opts.stroke || TEXTBOOK_STYLE.MAIN_STROKE;
  const sw = opts.strokeWidth || TEXTBOOK_STYLE.MAIN_STROKE_WIDTH;
  const dash = opts.dashArray ? ` stroke-dasharray="${opts.dashArray}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash} stroke-linecap="round"/>`;
}

export function circle(
  cx: number, cy: number, r: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): string {
  const fill = opts.fill || 'none';
  const stroke = opts.stroke || TEXTBOOK_STYLE.MAIN_STROKE;
  const sw = opts.strokeWidth || TEXTBOOK_STYLE.MAIN_STROKE_WIDTH;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

export function rect(
  x: number, y: number, w: number, h: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number; rx?: number } = {}
): string {
  const fill = opts.fill || 'none';
  const stroke = opts.stroke || TEXTBOOK_STYLE.MAIN_STROKE;
  const sw = opts.strokeWidth || TEXTBOOK_STYLE.MAIN_STROKE_WIDTH;
  const rx = opts.rx ? ` rx="${opts.rx}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${rx}/>`;
}

/**
 * 텍스트 — 교과서 스타일 기본(라벨은 italic + 진한 블루). 정자체·회색이 필요하면 plain=true.
 */
export function text(
  x: number, y: number, content: string,
  opts: { anchor?: string; fontSize?: number; fill?: string; fontWeight?: string; fontStyle?: string; dominantBaseline?: string; plain?: boolean } = {}
): string {
  const anchor = opts.anchor || 'middle';
  const fs = opts.fontSize || 13;
  const defaultFill = opts.plain ? TEXTBOOK_STYLE.PLAIN_TEXT_COLOR : TEXTBOOK_STYLE.LABEL_COLOR;
  const fill = opts.fill || defaultFill;
  const fw = opts.fontWeight ? ` font-weight="${opts.fontWeight}"` : '';
  const defaultFontStyle = opts.plain ? undefined : TEXTBOOK_STYLE.LABEL_FONT_STYLE;
  const fst = (opts.fontStyle ?? defaultFontStyle) ? ` font-style="${opts.fontStyle ?? defaultFontStyle}"` : '';
  const db = opts.dominantBaseline || 'central';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${fs}" fill="${fill}"${fw}${fst} dominant-baseline="${db}">${escapeXml(content)}</text>`;
}

export function polygon(
  points: [number, number][],
  opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): string {
  const fill = opts.fill || 'none';
  const stroke = opts.stroke || TEXTBOOK_STYLE.MAIN_STROKE;
  const sw = opts.strokeWidth || TEXTBOOK_STYLE.MAIN_STROKE_WIDTH;
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

export function path(d: string, opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}): string {
  const fill = opts.fill || 'none';
  const stroke = opts.stroke || TEXTBOOK_STYLE.MAIN_STROKE;
  const sw = opts.strokeWidth || TEXTBOOK_STYLE.MAIN_STROKE_WIDTH;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

export function arrowHead(x: number, y: number, angle: number, size = 6, color: string = TEXTBOOK_STYLE.MAIN_STROKE): string {
  const rad = (angle * Math.PI) / 180;
  const x1 = x - size * Math.cos(rad - 0.4);
  const y1 = y - size * Math.sin(rad - 0.4);
  const x2 = x - size * Math.cos(rad + 0.4);
  const y2 = y - size * Math.sin(rad + 0.4);
  return `<polygon points="${x},${y} ${x1},${y1} ${x2},${y2}" fill="${color}"/>`;
}

/**
 * 교과서 스타일 직각 표시 마커 — 꼭짓점 v에서 인접 변(p1, p2) 방향으로 정사각형.
 * DiagramSpec의 rightAngleMark()와 동일 로직 (두 시스템의 시각 일치 보장).
 */
export function rightAngleMark(
  v: [number, number],
  p1: [number, number],
  p2: [number, number],
  opts: { size?: number; color?: string; strokeWidth?: number } = {}
): string {
  const size = opts.size ?? 10;
  const color = opts.color ?? TEXTBOOK_STYLE.MAIN_STROKE;
  const sw = opts.strokeWidth ?? TEXTBOOK_STYLE.AUX_STROKE_WIDTH;
  const len = (a: [number, number], b: [number, number]) => Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u1x = (p1[0] - v[0]) / len(v, p1);
  const u1y = (p1[1] - v[1]) / len(v, p1);
  const u2x = (p2[0] - v[0]) / len(v, p2);
  const u2y = (p2[1] - v[1]) / len(v, p2);
  const a: [number, number] = [v[0] + u1x * size, v[1] + u1y * size];
  const b: [number, number] = [v[0] + u1x * size + u2x * size, v[1] + u1y * size + u2y * size];
  const c: [number, number] = [v[0] + u2x * size, v[1] + u2y * size];
  return `<polyline points="${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`;
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
/**
 * 한글 런을 `\text{...}`로 자동 래핑 — KaTeX의 unicodeTextInMathMode 경고 제거.
 * 프리셋/렌더러가 `'직각'`, `'y=2x (정비례)'` 같은 한글 혼합 라벨을 그대로 전달해도
 * KaTeX math mode 안에서 한글만 text mode로 안전하게 렌더링됨.
 * - `\text{꼭짓점}(1,-2)` → 한글은 text 모드, 괄호·숫자는 math 모드
 * - 이미 `\text{...}`로 감싸진 한글은 중복 래핑되지 않도록 바깥쪽 백슬래시 체크는 생략 (KaTeX가 중첩 허용)
 */
function wrapKoreanForKatex(latex: string): string {
  // Hangul 자모(\u3131-\u318E) + 완성형 음절(\uAC00-\uD7A3)
  return latex.replace(/[\u3131-\u318E\uAC00-\uD7A3]+/g, (run) => `\\text{${run}}`);
}

/**
 * 사용자 친화적인 수학 유니코드 기호를 KaTeX가 이해하는 LaTeX 명령으로 치환.
 * 프리셋/AI 생성 라벨에서 ½·√·π 등 직관적 기호를 쓸 수 있도록 자동 변환.
 */
function normalizeUnicodeMath(latex: string): string {
  // 이미 LaTeX 명령(\frac, \sqrt 등)이 포함되어 있으면 중복 변환 안 하는 편이 안전
  let s = latex;
  // 분수
  s = s.replace(/½/g, '\\frac{1}{2}').replace(/⅓/g, '\\frac{1}{3}').replace(/⅔/g, '\\frac{2}{3}');
  s = s.replace(/¼/g, '\\frac{1}{4}').replace(/¾/g, '\\frac{3}{4}');
  s = s.replace(/⅕/g, '\\frac{1}{5}').replace(/⅙/g, '\\frac{1}{6}').replace(/⅛/g, '\\frac{1}{8}');
  // 지수·첨자 유니코드
  s = s.replace(/²/g, '^{2}').replace(/³/g, '^{3}').replace(/⁴/g, '^{4}').replace(/⁵/g, '^{5}');
  s = s.replace(/°/g, '^{\\circ}');
  // 제곱근: √x → \sqrt{x}, √2 → \sqrt{2}, √(...) → \sqrt{...}
  s = s.replace(/√\(([^()]+)\)/g, '\\sqrt{$1}');
  s = s.replace(/√([A-Za-z0-9]+)/g, '\\sqrt{$1}');
  // 특수 기호
  s = s.replace(/π/g, '\\pi').replace(/∞/g, '\\infty');
  s = s.replace(/≤/g, '\\leq').replace(/≥/g, '\\geq').replace(/≠/g, '\\neq');
  s = s.replace(/×/g, '\\times').replace(/÷/g, '\\div').replace(/±/g, '\\pm');
  return s;
}

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
  const html = katex.renderToString(wrapKoreanForKatex(normalizeUnicodeMath(latex)), { throwOnError: false, output: 'html' });
  return `<foreignObject x="${leftX.toFixed(1)}" y="${topY.toFixed(1)}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:${justify};height:100%;font-size:${fs}px;">${html}</div></foreignObject>`;
}

/** katexFO 센터 정렬 — y가 텍스트 중심 (기존 text() 대체용) */
export function katexLabel(
  x: number, cy: number,
  latex: string,
  opts: { fontSize?: number; anchor?: 'start' | 'middle' | 'end' } = {}
): string {
  const fs = opts.fontSize || 13;
  const hasFrac = /\\frac/.test(latex);
  const h = hasFrac ? fs * 3.2 : fs * 1.8;
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

// ── 기하 표시 헬퍼 ──────────────────────────────────

/**
 * 직각 표시 (□) — 꼭짓점에서 인접 두 점 방향으로 작은 정사각형
 */
export function renderRightAngleMark(
  px: number, py: number,
  prevX: number, prevY: number,
  nextX: number, nextY: number,
  size = 8,
): string {
  const d1x = prevX - px, d1y = prevY - py;
  const d2x = nextX - px, d2y = nextY - py;
  const len1 = Math.sqrt(d1x * d1x + d1y * d1y) || 1;
  const len2 = Math.sqrt(d2x * d2x + d2y * d2y) || 1;
  const ux1 = d1x / len1 * size, uy1 = d1y / len1 * size;
  const ux2 = d2x / len2 * size, uy2 = d2y / len2 * size;
  return `<polyline points="${px + ux1},${py + uy1} ${px + ux1 + ux2},${py + uy1 + uy2} ${px + ux2},${py + uy2}" fill="none" stroke="#333" stroke-width="1"/>`;
}

/**
 * 합동 표시 — 변의 중점에 빗금 (tick marks) 1~3개
 */
export function renderCongruenceMarks(
  x1: number, y1: number,
  x2: number, y2: number,
  ticks: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // 빗금 방향: 변에 수직
  const nx = -dy / len, ny = dx / len;
  const tickLen = 6;
  const spacing = 4;
  const parts: string[] = [];
  for (let i = 0; i < ticks; i++) {
    const offset = (i - (ticks - 1) / 2) * spacing;
    // 변 방향으로 offset
    const cx = mx + (dx / len) * offset;
    const cy = my + (dy / len) * offset;
    const tx1 = cx + nx * tickLen;
    const ty1 = cy + ny * tickLen;
    const tx2 = cx - nx * tickLen;
    const ty2 = cy - ny * tickLen;
    parts.push(`<line x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" stroke="#333" stroke-width="1.5"/>`);
  }
  return parts.join('');
}

/**
 * 평행 표시 — 변의 중점에 화살표 1~2개
 */
export function renderParallelMarks(
  x1: number, y1: number,
  x2: number, y2: number,
  arrows: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  const spacing = 5;
  const parts: string[] = [];
  for (let i = 0; i < arrows; i++) {
    const offset = (i - (arrows - 1) / 2) * spacing;
    const cx = mx + ux * offset;
    const cy = my + uy * offset;
    // 작은 화살촉 (변 방향으로)
    const headLen = 4;
    const headW = 3;
    const tipX = cx + ux * headLen;
    const tipY = cy + uy * headLen;
    const b1x = cx - uy * headW;
    const b1y = cy + ux * headW;
    const b2x = cx + uy * headW;
    const b2y = cy - ux * headW;
    parts.push(`<polygon points="${tipX},${tipY} ${b1x},${b1y} ${b2x},${b2y}" fill="#333"/>`);
  }
  return parts.join('');
}
