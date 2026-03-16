import { NetDiagramParams } from '../types';
import { svgWrap, line, katexLabel, COLORS } from '../shared/svg-utils';

type FaceLabel = { face: number; text: string };

/** 전개도 SVG 생성 (초5-6) */
export function renderNetDiagram(params: NetDiagramParams): string {
  const shape = params.shape || 'cube';
  const labels = Array.isArray(params.labels) ? params.labels : [];
  const foldLines = params.foldLines !== false;
  const color = params.color || COLORS.primary;

  switch (shape) {
    case 'cube': return renderCubeNet(labels, foldLines, color);
    case 'rectangular_prism': return renderRectPrismNet(labels, foldLines, color);
    case 'cylinder': return renderCylinderNet(labels, foldLines, color);
    case 'cone': return renderConeNet(labels, foldLines, color);
    case 'triangular_prism': return renderTriPrismNet(labels, foldLines, color);
    case 'pyramid': return renderPyramidNet(labels, foldLines, color);
    default: return renderCubeNet(labels, foldLines, color);
  }
}

/** 정육면체 전개도 (십자형) */
function renderCubeNet(labels: FaceLabel[], foldLines: boolean, color: string): string {
  const s = 60; // 면 한 변
  const parts: string[] = [];
  // 십자형 배치: 4행 3열, 중앙 열이 세로로 연결
  // (0,1)윗면 / (1,0)좌 (1,1)앞 (1,2)우 / (2,1)아래 / (3,1)뒤
  const faces: [number, number][] = [
    [s, 0],         // 0: 윗면
    [0, s],         // 1: 좌
    [s, s],         // 2: 앞
    [s * 2, s],     // 3: 우
    [s, s * 2],     // 4: 아래
    [s, s * 3],     // 5: 뒤
  ];

  const totalW = s * 3 + 20;
  const totalH = s * 4 + 20;

  // 면 렌더링
  for (let i = 0; i < faces.length; i++) {
    const [x, y] = faces[i];
    parts.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
    // 라벨
    const faceLabel = labels.find(l => l.face === i);
    if (faceLabel) {
      parts.push(katexLabel(x + s / 2, y + s / 2, faceLabel.text, { fontSize: 11 }));
    }
  }

  // 접는 선
  if (foldLines) {
    const dash = '6,3';
    // 윗면-앞면
    parts.push(line(s, s, s * 2, s, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    // 좌-앞
    parts.push(line(s, s, s, s * 2, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    // 앞-우
    parts.push(line(s * 2, s, s * 2, s * 2, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    // 앞-아래
    parts.push(line(s, s * 2, s * 2, s * 2, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    // 아래-뒤
    parts.push(line(s, s * 3, s * 2, s * 3, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 직육면체 전개도 */
function renderRectPrismNet(labels: FaceLabel[], foldLines: boolean, color: string): string {
  const w = 80, h = 50, d = 40;
  const parts: string[] = [];
  // 십자형: 중심열 높이=h, 좌우=d, 위아래=w
  const faces: [number, number, number, number][] = [
    [d, 0, w, d],           // 0: 윗면
    [0, d, d, h],           // 1: 좌
    [d, d, w, h],           // 2: 앞
    [d + w, d, d, h],       // 3: 우
    [d, d + h, w, d],       // 4: 아래
    [d, d + h + d, w, h],   // 5: 뒤
  ];

  const totalW = d * 2 + w + 20;
  const totalH = d * 2 + h * 2 + 20;

  for (let i = 0; i < faces.length; i++) {
    const [x, y, fw, fh] = faces[i];
    parts.push(`<rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
    const faceLabel = labels.find(l => l.face === i);
    if (faceLabel) {
      parts.push(katexLabel(x + fw / 2, y + fh / 2, faceLabel.text, { fontSize: 10 }));
    }
  }

  if (foldLines) {
    const dash = '6,3';
    parts.push(line(d, d, d + w, d, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    parts.push(line(d, d, d, d + h, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    parts.push(line(d + w, d, d + w, d + h, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    parts.push(line(d, d + h, d + w, d + h, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    parts.push(line(d, d + h + d, d + w, d + h + d, { stroke: '#999', strokeWidth: 1, dashArray: dash }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 원기둥 전개도 */
function renderCylinderNet(labels: FaceLabel[], _foldLines: boolean, color: string): string {
  const r = 35, rectW = Math.round(2 * Math.PI * r), rectH = 80;
  const parts: string[] = [];
  const ox = 10, oy = r + 10;

  // 윗원
  parts.push(`<ellipse cx="${ox + rectW / 2}" cy="${oy - r - 5}" rx="${r}" ry="${r * 0.4}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  const topLabel = labels.find(l => l.face === 0);
  if (topLabel) parts.push(katexLabel(ox + rectW / 2, oy - r - 5, topLabel.text, { fontSize: 10 }));

  // 직사각형 (옆면)
  const rectY = oy + 10;
  parts.push(`<rect x="${ox}" y="${rectY}" width="${rectW}" height="${rectH}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  const sideLabel = labels.find(l => l.face === 1);
  if (sideLabel) parts.push(katexLabel(ox + rectW / 2, rectY + rectH / 2, sideLabel.text, { fontSize: 10 }));
  // 길이 표시
  parts.push(katexLabel(ox + rectW / 2, rectY + rectH + 14, `2\\pi r`, { fontSize: 10 }));

  // 아랫원
  const botCy = rectY + rectH + 35 + r * 0.4;
  parts.push(`<ellipse cx="${ox + rectW / 2}" cy="${botCy}" rx="${r}" ry="${r * 0.4}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  const botLabel = labels.find(l => l.face === 2);
  if (botLabel) parts.push(katexLabel(ox + rectW / 2, botCy, botLabel.text, { fontSize: 10 }));

  const totalW = rectW + 20;
  const totalH = botCy + r * 0.4 + 15;
  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 원뿔 전개도 */
function renderConeNet(labels: FaceLabel[], _foldLines: boolean, color: string): string {
  const baseR = 30;
  const slantR = 90;
  const parts: string[] = [];
  const cx = 120, cy = 100;

  // 부채꼴 (옆면) — 호 각도 = baseR/slantR * 360°
  const sectorAngleDeg = (baseR / slantR) * 360;
  const sectorAngleRad = (sectorAngleDeg * Math.PI) / 180;
  const startAngle = -Math.PI / 2 - sectorAngleRad / 2;
  const endAngle = -Math.PI / 2 + sectorAngleRad / 2;
  const x1 = cx + slantR * Math.cos(startAngle);
  const y1 = cy + slantR * Math.sin(startAngle);
  const x2 = cx + slantR * Math.cos(endAngle);
  const y2 = cy + slantR * Math.sin(endAngle);
  const largeArc = sectorAngleDeg > 180 ? 1 : 0;
  parts.push(`<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${slantR} ${slantR} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  const sectorLabel = labels.find(l => l.face === 0);
  if (sectorLabel) {
    const midAngle = -Math.PI / 2;
    const lx = cx + slantR * 0.55 * Math.cos(midAngle);
    const ly = cy + slantR * 0.55 * Math.sin(midAngle);
    parts.push(katexLabel(lx, ly, sectorLabel.text, { fontSize: 10 }));
  }

  // 밑면 원
  const botCy = cy + slantR + 15 + baseR;
  parts.push(`<circle cx="${cx}" cy="${botCy}" r="${baseR}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  const botLabel = labels.find(l => l.face === 1);
  if (botLabel) parts.push(katexLabel(cx, botCy, botLabel.text, { fontSize: 10 }));

  const totalW = 240;
  const totalH = botCy + baseR + 15;
  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 삼각기둥 전개도 */
function renderTriPrismNet(labels: FaceLabel[], foldLines: boolean, color: string): string {
  const bw = 60, _bh = 52, rectH = 80;
  const triH = Math.round(bw * Math.sqrt(3) / 2 * 0.6);
  const parts: string[] = [];

  // 3개 직사각형 (옆면, 가로 나열)
  for (let i = 0; i < 3; i++) {
    const x = i * bw;
    parts.push(`<rect x="${x}" y="${triH}" width="${bw}" height="${rectH}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
    if (foldLines && i > 0) {
      parts.push(line(i * bw, triH, i * bw, triH + rectH, { stroke: '#999', strokeWidth: 1, dashArray: '6,3' }));
    }
    const fl = labels.find(l => l.face === i + 2);
    if (fl) parts.push(katexLabel(x + bw / 2, triH + rectH / 2, fl.text, { fontSize: 10 }));
  }

  // 윗 삼각형
  const triCx = bw / 2;
  parts.push(`<polygon points="${0},${triH} ${bw},${triH} ${triCx},${0}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  if (foldLines) parts.push(line(0, triH, bw, triH, { stroke: '#999', strokeWidth: 1, dashArray: '6,3' }));
  const topLabel = labels.find(l => l.face === 0);
  if (topLabel) parts.push(katexLabel(triCx, triH * 0.5, topLabel.text, { fontSize: 10 }));

  // 아래 삼각형
  const botTriTop = triH + rectH;
  const botTriCx = bw * 2 + bw / 2;
  parts.push(`<polygon points="${bw * 2},${botTriTop} ${bw * 3},${botTriTop} ${botTriCx},${botTriTop + triH}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  if (foldLines) parts.push(line(bw * 2, botTriTop, bw * 3, botTriTop, { stroke: '#999', strokeWidth: 1, dashArray: '6,3' }));
  const botLabel = labels.find(l => l.face === 1);
  if (botLabel) parts.push(katexLabel(botTriCx, botTriTop + triH * 0.5, botLabel.text, { fontSize: 10 }));

  const totalW = bw * 3 + 20;
  const totalH = botTriTop + triH + 15;
  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 사각뿔 전개도 */
function renderPyramidNet(labels: FaceLabel[], foldLines: boolean, color: string): string {
  const s = 60;
  const triH = 55;
  const parts: string[] = [];
  const cx = s + triH + 10, cy = s + triH + 10;

  // 중앙 사각형 (밑면)
  parts.push(`<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  const baseLabel = labels.find(l => l.face === 0);
  if (baseLabel) parts.push(katexLabel(cx, cy, baseLabel.text, { fontSize: 10 }));

  // 4개 삼각형 (각 변에서 바깥으로)
  const dirs: [number, number, number, number, number, number][] = [
    // triangle apex x, y, base corner 1, base corner 2
    [cx, cy - s / 2 - triH, cx - s / 2, cy - s / 2, cx + s / 2, cy - s / 2], // 위
    [cx + s / 2 + triH, cy, cx + s / 2, cy - s / 2, cx + s / 2, cy + s / 2], // 오른
    [cx, cy + s / 2 + triH, cx + s / 2, cy + s / 2, cx - s / 2, cy + s / 2], // 아래
    [cx - s / 2 - triH, cy, cx - s / 2, cy + s / 2, cx - s / 2, cy - s / 2], // 왼
  ];

  for (let i = 0; i < 4; i++) {
    const [ax, ay, bx1, by1, bx2, by2] = dirs[i];
    parts.push(`<polygon points="${ax},${ay} ${bx1},${by1} ${bx2},${by2}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
    if (foldLines) {
      parts.push(line(bx1, by1, bx2, by2, { stroke: '#999', strokeWidth: 1, dashArray: '6,3' }));
    }
    const fl = labels.find(l => l.face === i + 1);
    if (fl) {
      parts.push(katexLabel((ax + bx1 + bx2) / 3, (ay + by1 + by2) / 3, fl.text, { fontSize: 10 }));
    }
  }

  const totalW = cx + s / 2 + triH + 15;
  const totalH = cy + s / 2 + triH + 15;
  return svgWrap(parts.join('\n    '), totalW, totalH);
}

