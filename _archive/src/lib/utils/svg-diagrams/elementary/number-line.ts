import { NumberLineParams } from '../types';
import { svgWrap, line, text, arrowHead, circle as svgCircle, katexFO, fractionFO, COLORS, TEXTBOOK_STYLE } from '../shared/svg-utils';

/** 소수를 분수 문자열로 변환 시도 (1/8 → "1/8") */
function formatTickLabel(val: number): string {
  if (Number.isInteger(val)) return val.toString();
  // step이 분수 형태인지 판별 (1/N 꼴)
  // 분모 후보: 2~12
  for (const denom of [2, 3, 4, 5, 6, 7, 8, 9, 10, 12]) {
    const numer = Math.round(val * denom);
    if (Math.abs(numer / denom - val) < 0.0001) {
      return `${numer}/${denom}`;
    }
  }
  const rounded = Math.round(val * 1000) / 1000;
  return rounded.toString();
}

/** 수직선 SVG 생성 — 방어적 파라미터 처리 */
export function renderNumberLine(params: NumberLineParams): string {
  // 방어적 파라미터 처리
  const min = Number(params.min) || 0;
  const max = Number(params.max) || (min + 1);
  const range = max - min;
  const step = Math.max(0.001, Number(params.step) || (range / 10));
  const marks = Array.isArray(params.marks) ? params.marks : [];
  const highlights = Array.isArray(params.highlights) ? params.highlights : [];
  const label = params.label;

  const lineY = 40;
  const tickH = 5;
  const leftPad = 30;
  const rightPad = 30;
  const tickCount = Math.min(50, Math.round(range / step));
  // 분수 레이블이 있으면 간격을 더 넓혀 뭉개짐 방지
  const hasFractionLabels = !Number.isInteger(step) && step < 1;
  const tickSpacing = hasFractionLabels ? 55 : 35;
  const lineW = Math.max(200, tickCount * tickSpacing);
  const totalW = lineW + leftPad + rightPad;
  const totalH = label ? (hasFractionLabels ? 100 : 80) : (hasFractionLabels ? 85 : 65);

  const toX = (val: number) => leftPad + ((val - min) / range) * lineW;
  const parts: string[] = [];

  // 하이라이트 영역 (호 또는 사각형)
  for (const hl of highlights) {
    const fromVal = Number(hl.from) || min;
    const toVal = Number(hl.to) || max;
    const x1 = toX(fromVal);
    const x2 = toX(toVal);
    const color = hl.color || TEXTBOOK_STYLE.MAIN_STROKE;
    // 호(arc) 형태로 하이라이트 표시 (초등 수직선 스타일)
    const midX = (x1 + x2) / 2;
    const arcR = (x2 - x1) / 2;
    const arcH = Math.min(arcR * 0.6, 18);
    const dashAttr = hl.dashed ? ' stroke-dasharray="4 3"' : '';
    parts.push(`<path d="M ${x1.toFixed(1)} ${lineY} Q ${midX.toFixed(1)} ${(lineY - arcH).toFixed(1)} ${x2.toFixed(1)} ${lineY}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.6"${dashAttr}/>`);
    // 호 위에 레이블
    if (hl.label) {
      parts.push(text(midX, lineY - arcH - 6, hl.label, { fontSize: 10, fill: color, fontStyle: 'italic' }));
    }
  }

  // 화살표 방향 (기본: 오른쪽만)
  const arrowR = params.arrowRight !== false;
  const arrowL = params.arrowLeft === true;
  const lineExtL = arrowL ? 12 : 8;
  const lineExtR = arrowR ? 12 : 8;

  // 메인 라인 (교재 스타일: 굵은 선)
  parts.push(line(leftPad - lineExtL, lineY, leftPad + lineW + lineExtR, lineY, { strokeWidth: 2.5 }));
  // 화살표
  if (arrowR) parts.push(arrowHead(leftPad + lineW + lineExtR, lineY, 0, 7));
  if (arrowL) parts.push(arrowHead(leftPad - lineExtL, lineY, 180, 7));

  // 눈금 (교재 스타일: 얇은 선)
  // showAllTickLabels가 false(기본)면 min/max/marks만 라벨 표시
  const showAll = params.showAllTickLabels === true;
  const markValues = new Set(marks.map((m) => Math.round(m.value * 10000) / 10000));
  for (let i = 0; i <= tickCount; i++) {
    const val = min + i * step;
    const roundedVal = Math.round(val * 10000) / 10000;
    const x = toX(val);
    parts.push(line(x, lineY - tickH, x, lineY + tickH, { strokeWidth: 0.8 }));
    // 라벨: 전체 표시 모드이거나, min/max이거나, marks에 포함된 값만
    const isEndpoint = i === 0 || i === tickCount;
    const isMarked = markValues.has(roundedVal);
    if (showAll || isEndpoint || isMarked) {
      const labelStr = formatTickLabel(val);
      const foTopY = lineY + tickH + 4;
      if (labelStr.includes('/')) {
        const [numer, denom] = labelStr.split('/');
        parts.push(fractionFO(x, foTopY, numer, denom, { fontSize: 14 }));
      } else {
        const numW = Math.max(24, labelStr.length * 10 + 8);
        parts.push(katexFO(x, foTopY, labelStr, { w: numW, h: 24, fontSize: 14 }));
      }
    }
  }

  // 마크 (특별 표시)
  for (const mark of marks) {
    const val = Number(mark.value);
    if (isNaN(val)) continue;
    const x = toX(val);
    const color = mark.color || COLORS.red;
    // showDot 기본값 true (점 표시)
    if (mark.showDot !== false) {
      parts.push(svgCircle(x, lineY, 3.5, { fill: color, stroke: 'white', strokeWidth: 1 }));
    }
    if (mark.label) {
      const labelY = mark.labelBelow ? lineY + 22 : lineY - 14;
      parts.push(text(x, labelY, mark.label, { fontSize: 10, fill: color, fontWeight: 'bold' }));
    }
  }

  // 점프 화살표 (jumpArrows)
  if (params.jumpArrows) {
    for (const ja of params.jumpArrows) {
      const fromX = toX(Number(ja.from));
      const toXVal = toX(Number(ja.to));
      const jaColor = ja.color || TEXTBOOK_STYLE.MAIN_STROKE;
      const above = ja.above !== false; // 기본 위쪽
      const midX = (fromX + toXVal) / 2;
      const arcH = Math.min(Math.abs(toXVal - fromX) * 0.4, 25);
      const arcY = above ? lineY - arcH : lineY + arcH;
      const _sweepFlag = above ? (ja.to > ja.from ? 1 : 0) : (ja.to > ja.from ? 0 : 1);
      const _arcR = Math.abs(toXVal - fromX) / 2;
      parts.push(`<path d="M ${fromX} ${lineY} Q ${midX} ${arcY} ${toXVal} ${lineY}" fill="none" stroke="${jaColor}" stroke-width="1.5"/>`);
      // 화살촉
      const dx = toXVal > fromX ? -5 : 5;
      const dy = above ? 4 : -4;
      parts.push(`<polygon points="${toXVal},${lineY} ${toXVal + dx},${lineY + dy} ${toXVal + dx * 0.3},${lineY}" fill="${jaColor}"/>`);
      if (ja.label) {
        const labelY = above ? arcY - 6 : arcY + 12;
        parts.push(text(midX, labelY, ja.label, { fontSize: 10, fill: jaColor }));
      }
    }
  }

  // 열린 끝점 (빈 원)
  if (params.openEndpoints) {
    for (const val of params.openEndpoints) {
      const x = toX(Number(val));
      parts.push(svgCircle(x, lineY, 4, { fill: 'white', stroke: TEXTBOOK_STYLE.MAIN_STROKE, strokeWidth: 1.5 }));
    }
  }

  // 닫힌 끝점 (채운 원)
  if (params.closedEndpoints) {
    for (const val of params.closedEndpoints) {
      const x = toX(Number(val));
      parts.push(svgCircle(x, lineY, 4, { fill: TEXTBOOK_STYLE.POINT_COLOR, stroke: TEXTBOOK_STYLE.POINT_COLOR, strokeWidth: 1 }));
    }
  }

  // 전체 레이블
  if (label) {
    parts.push(text(totalW / 2, totalH - 6, label, { fontSize: 11, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
