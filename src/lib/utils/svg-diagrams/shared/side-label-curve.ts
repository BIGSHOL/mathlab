/**
 * 변 길이 라벨 + 호(곡선) 데코 공통 렌더러.
 *
 * polygon / triangle / quadrilateral 등 다각형 계열 렌더러가 공통으로
 * 사용하는 "변 라벨 + 측정 표기용 호" 렌더 로직.
 *
 * 교과서 스타일 통일:
 *   - 호 없음: 라벨을 변의 외측 법선 방향으로 배치
 *   - 호 있음: 변 외측에 점선 호(Bezier)를 그리고, 호의 apex에 라벨을 앉힌다.
 *     (de Casteljau로 호를 두 조각으로 분할하여 라벨 자리만큼 중앙을 비움)
 */

import katex from 'katex';
import { TEXTBOOK_STYLE } from './svg-utils';

type Point = [number, number];
export type CurveOpt = boolean | { inflate?: number; color?: string; dashArray?: string };

/**
 * KaTeX로 라벨 렌더 — 변수는 자동 italic, 숫자는 정자체. (polygon.ts의 renderLengthLabel과 동치)
 */
function renderLengthLabel(x: number, y: number, value: string, fontSize = 13): string {
  if (!value) return '';
  const trimmed = value.trim();
  const asKatex = (inner: string) => {
    try {
      const html = katex.renderToString(inner, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
        strict: false,
      });
      const estW = Math.max(18, inner.replace(/\\[a-zA-Z]+/g, 'X').replace(/[{}]/g, '').length * 9);
      const h = fontSize + 6;
      return `<foreignObject x="${x - estW / 2}" y="${y - h / 2}" width="${estW}" height="${h}" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:${fontSize}px;font-family:${TEXTBOOK_STYLE.FONT_FAMILY};color:${TEXTBOOK_STYLE.LABEL_COLOR};">${html}</div></foreignObject>`;
    } catch {
      return `<text x="${x}" y="${y}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central" font-family="${TEXTBOOK_STYLE.FONT_FAMILY}" font-style="italic" fill="${TEXTBOOK_STYLE.LABEL_COLOR}">${inner}</text>`;
    }
  };
  // 1) $...$ 명시적 수식
  if (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 2) {
    return asKatex(trimmed.slice(1, -1));
  }
  // 2) 순수 숫자 (소수점/분수 포함)
  if (/^[\d.,\s]+$/.test(trimmed)) {
    return `<text x="${x}" y="${y}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central" font-family="${TEXTBOOK_STYLE.FONT_FAMILY}" fill="${TEXTBOOK_STYLE.LABEL_COLOR}">${trimmed}</text>`;
  }
  // 3) 문자/수식 기호 → KaTeX (italic 자동)
  return asKatex(trimmed);
}

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

/**
 * 변 라벨을 렌더링합니다. curve가 truthy이면 외측 점선 호 + apex 라벨,
 * 그렇지 않으면 변 외측 법선 방향으로 라벨만 배치.
 *
 * @param a        변의 시작 꼭짓점
 * @param b        변의 끝 꼭짓점
 * @param value    라벨 문자열 (변수/수식/숫자)
 * @param curve    호 옵션 (true | { inflate, color, dashArray })
 * @param polygon  외측 판별용 전체 꼭짓점 배열 (오목 다각형 대응)
 * @param fontSize 기본 13
 */
export function renderSideLabel(
  a: Point,
  b: Point,
  value: string,
  curve: CurveOpt | undefined,
  polygon: Point[],
  fontSize = 13,
): string[] {
  const out: string[] = [];
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

  if (curve) {
    const opts = typeof curve === 'object' ? curve : {};
    const baseInflate = opts.inflate ?? 12;
    // 호는 교과서 측정 표기이므로 본선(MAIN_STROKE)과 동일 블루로 그리되 점선 처리
    const color = opts.color ?? TEXTBOOK_STYLE.MAIN_STROKE;
    const dashArray = opts.dashArray ?? '5,3';
    const strokeWidth = 1.4;

    const labelHeight = fontSize + 3;
    const cleanLabel = value
      .replace(/\$/g, '')
      .replace(/\\[a-zA-Z]+/g, 'X')
      .replace(/[{}]/g, '');
    const estLabelWidth = Math.max(18, cleanLabel.length * 8);
    const halfPerpExtent =
      (estLabelWidth / 2) * Math.abs(outX) + (labelHeight / 2) * Math.abs(outY);
    const arcInflate = Math.max(baseInflate, halfPerpExtent + 4);

    const cpx = mx + outX * arcInflate * 2;
    const cpy = my + outY * arcInflate * 2;

    const arcLen = len + arcInflate;
    const gapParam = Math.min(0.6, Math.max(0.18, (estLabelWidth + 8) / arcLen));
    const t1 = 0.5 - gapParam / 2;
    const t2 = 0.5 + gapParam / 2;

    const q1x = a[0] + (cpx - a[0]) * t1;
    const q1y = a[1] + (cpy - a[1]) * t1;
    const r1x = cpx + (b[0] - cpx) * t1;
    const r1y = cpy + (b[1] - cpy) * t1;
    const p1x = q1x + (r1x - q1x) * t1;
    const p1y = q1y + (r1y - q1y) * t1;

    const q2x = a[0] + (cpx - a[0]) * t2;
    const q2y = a[1] + (cpy - a[1]) * t2;
    const r2x = cpx + (b[0] - cpx) * t2;
    const r2y = cpy + (b[1] - cpy) * t2;
    const p2x = q2x + (r2x - q2x) * t2;
    const p2y = q2y + (r2y - q2y) * t2;

    out.push(
      `<path d="M ${a[0]} ${a[1]} Q ${q1x} ${q1y} ${p1x} ${p1y}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-linecap="round"/>`,
    );
    out.push(
      `<path d="M ${p2x} ${p2y} Q ${r2x} ${r2y} ${b[0]} ${b[1]}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-linecap="round"/>`,
    );

    const apexX = mx + outX * arcInflate;
    const apexY = my + outY * arcInflate;
    out.push(renderLengthLabel(apexX, apexY, value, fontSize));
  } else {
    const lx = mx + outX * 14;
    const ly = my + outY * 14;
    out.push(renderLengthLabel(lx, ly, value, fontSize));
  }
  return out;
}
