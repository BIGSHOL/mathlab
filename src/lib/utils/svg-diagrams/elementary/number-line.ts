import { NumberLineParams } from '../types';
import { svgWrap, line, text, arrowHead, circle as svgCircle, COLORS } from '../shared/svg-utils';

/** 수직선 SVG 생성 */
export function renderNumberLine(params: NumberLineParams): string {
  const { min, max, step, marks = [], highlights = [] } = params;
  const lineY = 40;
  const tickH = 8;
  const leftPad = 20;
  const rightPad = 20;
  const lineW = Math.min(500, Math.max(300, (max - min) / step * 40));
  const totalW = lineW + leftPad + rightPad;
  const totalH = 80;

  const toX = (val: number) => leftPad + ((val - min) / (max - min)) * lineW;
  const parts: string[] = [];

  // 하이라이트 영역
  for (const hl of highlights) {
    const x1 = toX(hl.from);
    const x2 = toX(hl.to);
    const color = hl.color || COLORS.primary;
    parts.push(`<rect x="${x1}" y="${lineY - 12}" width="${x2 - x1}" height="24" fill="${color}" opacity="0.15" rx="4"/>`);
  }

  // 메인 라인 + 화살표
  parts.push(line(leftPad - 10, lineY, leftPad + lineW + 10, lineY, { strokeWidth: 2 }));
  parts.push(arrowHead(leftPad + lineW + 10, lineY, 0, 7));

  // 눈금
  const tickCount = Math.round((max - min) / step);
  for (let i = 0; i <= tickCount; i++) {
    const val = min + i * step;
    const x = toX(val);
    parts.push(line(x, lineY - tickH, x, lineY + tickH));
    // 숫자 레이블 (정수면 정수로, 아니면 소수/분수)
    const label = Number.isInteger(val) ? val.toString() : val.toString();
    parts.push(text(x, lineY + tickH + 14, label, { fontSize: 12 }));
  }

  // 마크 (특별 표시)
  for (const mark of marks) {
    const x = toX(mark.value);
    const color = mark.color || COLORS.red;
    parts.push(svgCircle(x, lineY, 4, { fill: color, stroke: color }));
    if (mark.label) {
      parts.push(text(x, lineY - 16, mark.label, { fontSize: 11, fill: color, fontWeight: 'bold' }));
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
