import { NumberLineParams } from '../types';
import { svgWrap, line, text, arrowHead, circle as svgCircle, COLORS } from '../shared/svg-utils';

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

  const lineY = 35;
  const tickH = 7;
  const leftPad = 25;
  const rightPad = 25;
  const tickCount = Math.min(50, Math.round(range / step));
  const lineW = Math.min(450, Math.max(200, tickCount * 35));
  const totalW = lineW + leftPad + rightPad;
  // 분수 레이블이 있으면 높이 추가
  const hasFractionLabels = !Number.isInteger(step) && step < 1;
  const totalH = label ? (hasFractionLabels ? 90 : 80) : (hasFractionLabels ? 75 : 65);

  const toX = (val: number) => leftPad + ((val - min) / range) * lineW;
  const parts: string[] = [];

  // 하이라이트 영역 (호 또는 사각형)
  for (const hl of highlights) {
    const fromVal = Number(hl.from) || min;
    const toVal = Number(hl.to) || max;
    const x1 = toX(fromVal);
    const x2 = toX(toVal);
    const color = hl.color || COLORS.primary;
    // 호(arc) 형태로 하이라이트 표시 (초등 수직선 스타일)
    const midX = (x1 + x2) / 2;
    const arcR = (x2 - x1) / 2;
    const arcH = Math.min(arcR * 0.6, 18);
    parts.push(`<path d="M ${x1.toFixed(1)} ${lineY} Q ${midX.toFixed(1)} ${(lineY - arcH).toFixed(1)} ${x2.toFixed(1)} ${lineY}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.6"/>`);
    // 호 위에 레이블
    if (hl.label) {
      parts.push(text(midX, lineY - arcH - 6, hl.label, { fontSize: 10, fill: color }));
    }
  }

  // 메인 라인
  parts.push(line(leftPad - 8, lineY, leftPad + lineW + 8, lineY, { strokeWidth: 1.8 }));
  // 오른쪽 화살표
  parts.push(arrowHead(leftPad + lineW + 8, lineY, 0, 6));

  // 눈금
  for (let i = 0; i <= tickCount; i++) {
    const val = min + i * step;
    const x = toX(val);
    // 메인 눈금
    parts.push(line(x, lineY - tickH, x, lineY + tickH, { strokeWidth: 1.2 }));
    // 레이블 (정수면 정수, 분수면 분수 표현 시도)
    const labelStr = formatTickLabel(val);
    if (labelStr.includes('/')) {
      // 분수: 위/아래로 나누어 표시
      const [numer, denom] = labelStr.split('/');
      parts.push(text(x, lineY + tickH + 11, numer, { fontSize: 9 }));
      parts.push(line(x - 5, lineY + tickH + 13, x + 5, lineY + tickH + 13, { strokeWidth: 0.8 }));
      parts.push(text(x, lineY + tickH + 22, denom, { fontSize: 9 }));
    } else {
      parts.push(text(x, lineY + tickH + 13, labelStr, { fontSize: 11 }));
    }
  }

  // 마크 (특별 표시)
  for (const mark of marks) {
    const val = Number(mark.value);
    if (isNaN(val)) continue;
    const x = toX(val);
    const color = mark.color || COLORS.red;
    parts.push(svgCircle(x, lineY, 3.5, { fill: color, stroke: 'white', strokeWidth: 1 }));
    if (mark.label) {
      parts.push(text(x, lineY - 14, mark.label, { fontSize: 10, fill: color, fontWeight: 'bold' }));
    }
  }

  // 전체 레이블
  if (label) {
    parts.push(text(totalW / 2, totalH - 6, label, { fontSize: 11, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
