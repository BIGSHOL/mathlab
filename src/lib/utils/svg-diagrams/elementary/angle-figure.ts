import { AngleFigureParams } from '../types';
import { svgWrap, line, arrowHead, katexLabel, COLORS } from '../shared/svg-utils';

/** 각도 그림 SVG 생성 (초4) */
export function renderAngleFigure(params: AngleFigureParams): string {
  const angleDeg = Math.max(0, Math.min(360, Number(params.angle) || 90));
  const ray1Angle = Number(params.ray1Angle) || 0;
  const showProtractor = !!params.showProtractor;
  const label = params.label;
  const color = params.color || COLORS.primary;

  const r = 80; // 반직선 길이
  const arcR = 30; // 각도 호 반지름
  const cx = r + 30;
  const cy = r + 30;
  const totalW = cx + r + 40;
  const totalH = cy + r + 20;

  const parts: string[] = [];

  // 반직선 각도 (라디안)
  const ray1Rad = (-ray1Angle * Math.PI) / 180;
  const ray2Rad = (-(ray1Angle + angleDeg) * Math.PI) / 180;

  // 반직선 1 (기준선)
  const r1x = cx + r * Math.cos(ray1Rad);
  const r1y = cy + r * Math.sin(ray1Rad);
  parts.push(line(cx, cy, r1x, r1y, { strokeWidth: 1.5 }));
  parts.push(arrowHead(r1x, r1y, -ray1Angle, 6));

  // 반직선 2
  const r2x = cx + r * Math.cos(ray2Rad);
  const r2y = cy + r * Math.sin(ray2Rad);
  parts.push(line(cx, cy, r2x, r2y, { strokeWidth: 1.5 }));
  parts.push(arrowHead(r2x, r2y, -(ray1Angle + angleDeg), 6));

  // 직각 표시 (90°)
  if (angleDeg === 90) {
    const sz = 12;
    const ux1 = Math.cos(ray1Rad) * sz;
    const uy1 = Math.sin(ray1Rad) * sz;
    const ux2 = Math.cos(ray2Rad) * sz;
    const uy2 = Math.sin(ray2Rad) * sz;
    parts.push(`<polyline points="${cx + ux1},${cy + uy1} ${cx + ux1 + ux2},${cy + uy1 + uy2} ${cx + ux2},${cy + uy2}" fill="none" stroke="#333" stroke-width="1"/>`);
  } else {
    // 각도 호
    const arcStart = ray1Rad;
    const arcEnd = ray2Rad;
    const ax1 = cx + arcR * Math.cos(arcStart);
    const ay1 = cy + arcR * Math.sin(arcStart);
    const ax2 = cx + arcR * Math.cos(arcEnd);
    const ay2 = cy + arcR * Math.sin(arcEnd);
    const largeArc = angleDeg > 180 ? 1 : 0;
    // sweep: 시계 반대 방향 → 0
    parts.push(`<path d="M ${ax1.toFixed(2)} ${ay1.toFixed(2)} A ${arcR} ${arcR} 0 ${largeArc} 0 ${ax2.toFixed(2)} ${ay2.toFixed(2)}" fill="none" stroke="${color}" stroke-width="1.5"/>`);
  }

  // 라벨 (호 중간)
  const labelText = label || `${angleDeg}°`;
  const midAngleRad = (-(ray1Angle + angleDeg / 2) * Math.PI) / 180;
  const labelDist = angleDeg === 90 ? 22 : arcR + 14;
  const lx = cx + labelDist * Math.cos(midAngleRad);
  const ly = cy + labelDist * Math.sin(midAngleRad);
  parts.push(katexLabel(lx, ly, labelText, { fontSize: 12 }));

  // 꼭짓점 점
  parts.push(`<circle cx="${cx}" cy="${cy}" r="2" fill="#333"/>`);

  // 각도기
  if (showProtractor) {
    // 반원 각도기 (얇은 원호 + 눈금)
    const pR = r * 0.85;
    // 외곽 반원
    parts.push(`<path d="M ${cx + pR} ${cy} A ${pR} ${pR} 0 1 0 ${cx - pR} ${cy}" fill="none" stroke="#CCC" stroke-width="0.8"/>`);
    // 10° 간격 눈금
    for (let deg = 0; deg <= 180; deg += 10) {
      const rad = (-deg * Math.PI) / 180;
      const inner = deg % 30 === 0 ? pR - 10 : pR - 6;
      const x1 = cx + inner * Math.cos(rad);
      const y1 = cy + inner * Math.sin(rad);
      const x2 = cx + pR * Math.cos(rad);
      const y2 = cy + pR * Math.sin(rad);
      parts.push(line(x1, y1, x2, y2, { stroke: '#CCC', strokeWidth: 0.5 }));
      // 30° 간격 라벨
      if (deg % 30 === 0) {
        const lx2 = cx + (pR - 16) * Math.cos(rad);
        const ly2 = cy + (pR - 16) * Math.sin(rad);
        parts.push(katexLabel(lx2, ly2, deg.toString(), { fontSize: 8 }));
      }
    }
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
