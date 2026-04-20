import { ClockFaceParams } from '../types';
import { svgWrap, line, katexLabel, TEXTBOOK_STYLE } from '../shared/svg-utils';

/** 시계 SVG 생성 (초2-3) */
export function renderClockFace(params: ClockFaceParams): string {
  const hour = Math.max(1, Math.min(12, Math.round(Number(params.hour) || 12)));
  const minute = Math.max(0, Math.min(59, Math.round(Number(params.minute) || 0)));
  const showNumbers = params.showNumbers !== false;
  const showMinuteTicks = params.showMinuteTicks !== false;
  const show5MinuteTicks = params.show5MinuteTicks !== false;
  const label = params.label;

  const r = 65;
  const cx = r + 15;
  const cy = r + 15;
  const totalW = cx + r + 15;
  const totalH = label ? cy + r + 30 : cy + r + 15;

  const parts: string[] = [];

  // 외곽 원
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="${TEXTBOOK_STYLE.MAIN_STROKE}" stroke-width="2.5"/>`);
  // 안쪽 원 (장식)
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="#E5E7EB" stroke-width="0.8"/>`);

  // 눈금 + 숫자
  for (let i = 1; i <= 12; i++) {
    const angle = ((i * 30 - 90) * Math.PI) / 180;
    // 긴 눈금 (12, 3, 6, 9) vs 짧은 눈금
    const isMain = i % 3 === 0;
    const innerR = isMain ? r - 12 : r - 8;
    const outerR = r - 3;
    const x1 = cx + innerR * Math.cos(angle);
    const y1 = cy + innerR * Math.sin(angle);
    const x2 = cx + outerR * Math.cos(angle);
    const y2 = cy + outerR * Math.sin(angle);
    if (show5MinuteTicks) {
      parts.push(line(x1, y1, x2, y2, { strokeWidth: isMain ? 2 : 1.2 }));
    }

    // 숫자
    if (showNumbers) {
      const numR = r - 22;
      const nx = cx + numR * Math.cos(angle);
      const ny = cy + numR * Math.sin(angle);
      parts.push(katexLabel(nx, ny, i.toString(), { fontSize: 13 }));
    }
  }

  // 분 눈금 (5분 간격이 아닌 것)
  if (showMinuteTicks) {
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue; // 이미 시 눈금에서 처리
      const angle = ((i * 6 - 90) * Math.PI) / 180;
      const x1 = cx + (r - 5) * Math.cos(angle);
      const y1 = cy + (r - 5) * Math.sin(angle);
      const x2 = cx + (r - 3) * Math.cos(angle);
      const y2 = cy + (r - 3) * Math.sin(angle);
      parts.push(line(x1, y1, x2, y2, { stroke: '#AAA', strokeWidth: 0.5 }));
    }
  }

  // 시침 (짧고 굵음)
  const hourAngle = ((hour * 30 + minute * 0.5 - 90) * Math.PI) / 180;
  const hourLen = r * 0.5;
  const hx = cx + hourLen * Math.cos(hourAngle);
  const hy = cy + hourLen * Math.sin(hourAngle);
  parts.push(line(cx, cy, hx, hy, { strokeWidth: 3.5 }));

  // 분침 (길고 가늘)
  const minuteAngle = ((minute * 6 - 90) * Math.PI) / 180;
  const minuteLen = r * 0.75;
  const mx = cx + minuteLen * Math.cos(minuteAngle);
  const my = cy + minuteLen * Math.sin(minuteAngle);
  parts.push(line(cx, cy, mx, my, { strokeWidth: 2 }));

  // 중심점
  parts.push(`<circle cx="${cx}" cy="${cy}" r="3.5" fill="${TEXTBOOK_STYLE.POINT_COLOR}"/>`);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="1.5" fill="white"/>`);

  // 라벨
  if (label) {
    parts.push(katexLabel(cx, totalH - 10, label, { fontSize: 12 }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
