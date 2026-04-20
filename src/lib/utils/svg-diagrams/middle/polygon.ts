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
import { svgWrap, renderRightAngleMark, polygon as svgPolygon, text as svgText, katexLabel, TEXTBOOK_STYLE } from '../shared/svg-utils';

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

/**
 * 일반 각도 호 (직각이 아닌 각도를 표시할 때 사용)
 * — SVG A 명령으로 꼭짓점 v 중심 원호. sweep 방향은 외적으로 결정하여
 *   항상 내각(두 변 사이) 쪽으로 호가 그려지도록 함.
 */
function renderAngleArc(
  vx: number,
  vy: number,
  dx1: number, dy1: number,
  dx2: number, dy2: number,
  radius = 14,
): string {
  const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
  const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
  const u1x = dx1 / l1, u1y = dy1 / l1;
  const u2x = dx2 / l2, u2y = dy2 / l2;
  const ax = vx + u1x * radius;
  const ay = vy + u1y * radius;
  const bx = vx + u2x * radius;
  const by = vy + u2y * radius;
  const cross = u1x * u2y - u1y * u2x;
  const sweep = cross > 0 ? 1 : 0;
  return `<path d="M ${ax} ${ay} A ${radius} ${radius} 0 0 ${sweep} ${bx} ${by}" fill="none" stroke="${TEXTBOOK_STYLE.AUX_STROKE}" stroke-width="1"/>`;
}

/**
 * 변 라벨/꼭짓점 라벨에서 수학 표기법 자동 감지.
 * - `$...$` 감싸진 것은 내부 내용을 KaTeX 수식으로 처리
 * - 숫자만 있으면 plain text
 * - 문자(a,b,x,y...) 또는 수식 기호(+,-,=,^,_) 포함 시 KaTeX로 렌더 → italic 자동
 */
function renderLengthLabel(x: number, y: number, value: string, fontSize = 13): string {
  if (!value) return '';
  const trimmed = value.trim();
  // 1) `$...$` 명시적 수식
  if (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 2) {
    return katexLabel(x, y, trimmed.slice(1, -1), { fontSize });
  }
  // 2) 순수 숫자 (소수점/분수 포함)
  if (/^[\d.,\s]+$/.test(trimmed)) {
    return svgText(x, y, trimmed, { fontSize });
  }
  // 3) 문자/수식 기호 → KaTeX (변수 italic, 지수, 분수 등 지원)
  return katexLabel(x, y, trimmed, { fontSize });
}

/** PolygonParams → SVG 문자열 */
export function renderPolygon(params: PolygonParams): string {
  // 방어 — vertices 2D 좌표 튜플로 변환. 편집기는 `{x, y, label}` 형태로 저장하므로
  // inline label을 별도 배열에 병렬 보관해 렌더링 시 사용.
  const raw = params.vertices ?? [];
  let vertices: Point[] = [];
  const inlineLabels: (string | undefined)[] = [];
  for (const v of raw) {
    if (Array.isArray(v)) {
      vertices.push([v[0], v[1]]);
      inlineLabels.push(undefined);
    } else if (v && typeof v === 'object' && 'x' in v && 'y' in v) {
      vertices.push(toTuple(v));
      const vv = v as { label?: unknown };
      inlineLabels.push(
        typeof vv.label === 'string' && vv.label.trim() ? vv.label.trim() : undefined,
      );
    }
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
  parts.push(svgPolygon(vertices, { fill: 'none', stroke: TEXTBOOK_STYLE.MAIN_STROKE, strokeWidth: TEXTBOOK_STYLE.MAIN_STROKE_WIDTH }));

  // 분할선 (보조선)
  if (params.splitLines) {
    for (const sl of params.splitLines) {
      if (sl.from < 0 || sl.from >= vertices.length || sl.to < 0 || sl.to >= vertices.length) continue;
      const a = vertices[sl.from];
      const b = vertices[sl.to];
      const dash = sl.style === 'dashed' ? ' stroke-dasharray="5,4"' : '';
      const stroke = sl.color ?? TEXTBOOK_STYLE.MAIN_STROKE;
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

  // 각 표시 —
  //  · 오목 꼭짓점(270°) → 스킵
  //  · 내각 ≈ 90° (±3°) → 직각 사각 표시
  //  · 그 외 → 일반 각도 호
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
      // 각이등분선 probe — 폴리곤 내부면 볼록 꼭짓점
      const probe: Point = [
        v[0] + (dx1 / l1) * sz + (dx2 / l2) * sz,
        v[1] + (dy1 / l1) * sz + (dy2 / l2) * sz,
      ];
      const isConvex = pointInPolygon(probe, vertices);
      if (!isConvex) continue; // 오목 꼭짓점 스킵

      // 내각(두 변 사이)의 cosine — |cosθ| < 0.05 ≈ 90°±3°
      const cosA = (dx1 * dx2 + dy1 * dy2) / (l1 * l2);
      if (Math.abs(cosA) < 0.05) {
        // 직각 사각 표시
        parts.push(renderRightAngleMark(v[0], v[1], prev[0], prev[1], next[0], next[1], sz));
      } else {
        // 일반 각도 호
        parts.push(renderAngleArc(v[0], v[1], dx1, dy1, dx2, dy2, 14));
      }
    }
  }

  // 변의 길이 표시 — 외측 법선 방향 + KaTeX 자동 렌더 (변수는 italic)
  //  · curve가 truthy면 교과서 스타일: 호의 apex에 라벨이 올라타고, 라벨 폭만큼 호 중앙을 비움
  //    (quadratic Bezier를 de Casteljau로 두 piece로 split)
  let maxCurveReach = 0; // padding 보정용 — 라벨이 외측으로 얼마나 뻗는지 추적
  if (params.showLengths) {
    for (const { edge, value, curve } of params.showLengths) {
      const [from, to] = edge;
      if (from < 0 || from >= vertices.length || to < 0 || to >= vertices.length) continue;
      const a = vertices[from];
      const b = vertices[to];

      if (curve) {
        const opts = typeof curve === 'object' ? curve : {};
        const baseInflate = opts.inflate ?? 12;
        // 교과서 측정 표기 — 본선과 동일 주블루 + 점선 + 살짝 굵게 (가독성)
        const color = opts.color ?? TEXTBOOK_STYLE.MAIN_STROKE;
        const dashArray = opts.dashArray ?? '5,3';
        const strokeWidth = 1.4;

        // 변의 외측 법선 방향 (오목 폴리곤 대응)
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

        // 라벨 크기 추정 — 수식/커맨드 정리 후 문자 수 기반
        const labelHeight = 16; // fontSize 13 + 약간 여유
        const cleanLabel = value
          .replace(/\$/g, '')
          .replace(/\\[a-zA-Z]+/g, 'X')
          .replace(/[{}]/g, '');
        const estLabelWidth = Math.max(18, cleanLabel.length * 8);

        // 라벨 bbox를 변 법선 방향으로 투영한 반길이 —
        // 가로 변(|outY|=1) → labelHeight/2, 세로 변(|outX|=1) → estLabelWidth/2
        // 짧은 세로 변 + 긴 라벨 조합에서 라벨이 도형 내부로 침범하지 않도록 inflate 자동 확대
        const halfPerpExtent =
          (estLabelWidth / 2) * Math.abs(outX) + (labelHeight / 2) * Math.abs(outY);
        const arcInflate = Math.max(baseInflate, halfPerpExtent + 4);

        // 라벨이 외측으로 뻗는 최대 거리 (padding 계산용)
        maxCurveReach = Math.max(maxCurveReach, arcInflate + halfPerpExtent);

        // 제어점: apex가 외측 `arcInflate`만큼 나오도록 (control은 apex의 2배 위치)
        const cpx = mx + outX * arcInflate * 2;
        const cpy = my + outY * arcInflate * 2;

        // 호 길이 근사 → curve parameter space로 gap 변환
        const arcLen = len + arcInflate;
        const gapParam = Math.min(0.6, Math.max(0.18, (estLabelWidth + 8) / arcLen));
        const t1 = 0.5 - gapParam / 2;
        const t2 = 0.5 + gapParam / 2;

        // de Casteljau split at t1 — 왼쪽 piece (A → P1, control Q1)
        const q1x = a[0] + (cpx - a[0]) * t1;
        const q1y = a[1] + (cpy - a[1]) * t1;
        const r1x = cpx + (b[0] - cpx) * t1;
        const r1y = cpy + (b[1] - cpy) * t1;
        const p1x = q1x + (r1x - q1x) * t1;
        const p1y = q1y + (r1y - q1y) * t1;

        // de Casteljau split at t2 — 오른쪽 piece (P2 → B, control R2)
        const q2x = a[0] + (cpx - a[0]) * t2;
        const q2y = a[1] + (cpy - a[1]) * t2;
        const r2x = cpx + (b[0] - cpx) * t2;
        const r2y = cpy + (b[1] - cpy) * t2;
        const p2x = q2x + (r2x - q2x) * t2;
        const p2y = q2y + (r2y - q2y) * t2;

        // 두 점선 piece (중간은 라벨이 앉을 자리 → 비움) — 교과서 스타일 통일
        parts.push(
          `<path d="M ${a[0]} ${a[1]} Q ${q1x} ${q1y} ${p1x} ${p1y}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-linecap="round"/>`,
        );
        parts.push(
          `<path d="M ${p2x} ${p2y} Q ${r2x} ${r2y} ${b[0]} ${b[1]}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-linecap="round"/>`,
        );

        // 라벨은 호의 apex (P(0.5) = midpoint + n * inflate) 에 정확히 앉음
        const apexX = mx + outX * arcInflate;
        const apexY = my + outY * arcInflate;
        parts.push(renderLengthLabel(apexX, apexY, value, 13));
      } else {
        // 호 없음 — 기존대로 변 외측 법선 방향으로 라벨만 배치
        const [lx, ly] = edgeLabelOffset(a, b, vertices, 18);
        parts.push(renderLengthLabel(lx, ly, value, 13));
      }
    }
  }

  // 사용자 정의 라벨 — KaTeX 자동 렌더
  if (params.labels && params.labels.length > 0) {
    for (const l of params.labels) {
      const pos = Array.isArray(l.position) ? l.position : toTuple(l.position as { x: number; y: number });
      const [lx, ly] = pos;
      parts.push(renderLengthLabel(lx - minX, ly - minY, l.text, l.fontSize ?? 13));
    }
  }

  // 꼭짓점 라벨 — KaTeX (A, B, C도 수학 기울임으로 표기)
  //  · 편집기 inline label (각 vertex의 `label` 필드) 이 사용자의 최신 의도이므로 최우선
  //  · 그다음 `params.vertexLabels[i]`
  //  · 둘 다 없고 `params.vertexLabels`가 배열로 명시된 경우에 한해 A, B, C... 자동 채움
  const hasExplicitVertexLabels = Array.isArray(params.vertexLabels);
  const hasInlineLabels = inlineLabels.some(Boolean);
  if (hasExplicitVertexLabels || hasInlineLabels) {
    const [cx, cy] = polygonCentroid(vertices);
    const defaults = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    for (let i = 0; i < vertices.length; i++) {
      const lbl =
        inlineLabels[i] ||
        params.vertexLabels?.[i] ||
        (hasExplicitVertexLabels ? defaults[i] : undefined);
      if (!lbl) continue;
      const v = vertices[i];
      const dx = v[0] - cx;
      const dy = v[1] - cy;
      const dl = Math.sqrt(dx * dx + dy * dy) || 1;
      const lx = v[0] + (dx / dl) * 20;
      const ly = v[1] + (dy / dl) * 20;
      parts.push(katexLabel(lx, ly, lbl, { fontSize: 13 }));
    }
  }

  // padding 동적 계산 — 라벨/outlineCurve가 viewBox 경계에 걸려 잘리는 것 방지
  const hasLengths = Array.isArray(params.showLengths) && params.showLengths.length > 0;
  const hasCustomLabels = Array.isArray(params.labels) && params.labels.length > 0;
  let padding = 20;
  // 변 라벨은 외측 18~28px + 텍스트 반경 ~12 ≈ 여유 32
  if (hasLengths || hasCustomLabels) padding = Math.max(padding, 32);
  // 꼭짓점 라벨(foreignObject KaTeX)은 외측 20px + 텍스트 반경 ~20 ≈ 여유 44
  if (hasExplicitVertexLabels || hasInlineLabels) padding = Math.max(padding, 44);
  // outlineCurve의 inflate 거리만큼 외측으로 부풀음
  if (params.outlineCurve) {
    padding = Math.max(padding, 20 + (params.outlineCurve.inflate ?? 14) + 10);
  }
  // showLengths curve에서 라벨이 동적으로 외측으로 밀려나간 경우 (짧은 변 + 긴 라벨)
  if (maxCurveReach > 0) {
    padding = Math.max(padding, Math.ceil(maxCurveReach) + 8);
  }
  return svgWrap(parts.join('\n    '), width, height, padding);
}
