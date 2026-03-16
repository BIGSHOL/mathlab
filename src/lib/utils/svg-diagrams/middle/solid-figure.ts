import { SolidFigureParams } from '../types';
import { svgWrap, line, katexLabel, COLORS } from '../shared/svg-utils';

/** 입체도형 SVG 생성 (초5-중1) */
export function renderSolidFigure(params: SolidFigureParams): string {
  const shape = params.shape || 'cube';
  const labels = Array.isArray(params.labels) ? params.labels : [];
  const showHidden = params.showHiddenEdges !== false;
  const color = params.color || COLORS.primary;
  const dims = params.dimensions || {};
  const w = dims.width || 1;
  const h = dims.height || 1;
  const d = dims.depth || 1;
  const r = dims.radius || 1;

  const parts: string[] = [];

  switch (shape) {
    case 'cube':
    case 'rectangular_prism':
      return renderPrism(parts, w, h, d, showHidden, color, labels, shape === 'cube');

    case 'cylinder':
      return renderCylinder(parts, r, h, showHidden, color, labels);

    case 'cone':
      return renderCone(parts, r, h, showHidden, color, labels);

    case 'triangular_prism':
      return renderTriangularPrism(parts, w, h, d, showHidden, color, labels);

    case 'pyramid':
      return renderPyramid(parts, w, h, showHidden, color, labels);

    case 'sphere':
      return renderSphere(parts, r, color, labels);

    default:
      return renderPrism(parts, 1, 1, 1, true, color, labels, true);
  }
}

type Label = { position: string; text: string };

/** 직육면체/정육면체 */
function renderPrism(parts: string[], _w: number, _h: number, _d: number, showHidden: boolean, color: string, labels: Label[], isCube: boolean): string {
  // 등축투영 좌표 (고정 크기)
  const scale = isCube ? 1 : 1;
  const fw = 80 * scale, fh = 80 * scale, fd = 40 * scale;

  // 전면 사각형
  const f = [[40, 60 + fh], [40 + fw, 60 + fh], [40 + fw, 60], [40, 60]]; // 좌하, 우하, 우상, 좌상
  // 후면 사각형 (우상으로 offset)
  const b = f.map(([x, y]) => [x + fd * 0.7, y - fd * 0.7]);

  const totalW = 40 + fw + fd * 0.7 + 30;
  const totalH = 60 + fh + 20;

  // 면 채우기
  // 전면
  parts.push(`<polygon points="${f.map(p => p.join(',')).join(' ')}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  // 윗면
  parts.push(`<polygon points="${f[3].join(',')},${f[2].join(',')},${b[2].join(',')},${b[3].join(',')}" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="1.5"/>`);
  // 오른면
  parts.push(`<polygon points="${f[1].join(',')},${f[2].join(',')},${b[2].join(',')},${b[1].join(',')}" fill="${color}" fill-opacity="0.05" stroke="${color}" stroke-width="1.5"/>`);

  // 숨은 모서리
  if (showHidden) {
    const dash = '4,3';
    parts.push(line(b[0][0], b[0][1], b[1][0], b[1][1], { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    parts.push(line(b[0][0], b[0][1], b[3][0], b[3][1], { stroke: '#999', strokeWidth: 1, dashArray: dash }));
    parts.push(line(f[0][0], f[0][1], b[0][0], b[0][1], { stroke: '#999', strokeWidth: 1, dashArray: dash }));
  }

  // 라벨
  renderLabels(parts, labels, {
    width: [(f[0][0] + f[1][0]) / 2, f[0][1] + 14],
    height: [f[0][0] - 14, (f[0][1] + f[3][1]) / 2],
    depth: [(f[1][0] + b[1][0]) / 2 + 8, (f[1][1] + b[1][1]) / 2 - 8],
  });

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 원기둥 */
function renderCylinder(parts: string[], _r: number, _h: number, showHidden: boolean, color: string, labels: Label[]): string {
  const cx = 100, topY = 40, botY = 140;
  const rx = 50, ry = 18;
  const totalW = 200;
  const totalH = botY + ry + 20;

  // 옆면
  parts.push(line(cx - rx, topY, cx - rx, botY, { stroke: color, strokeWidth: 1.5 }));
  parts.push(line(cx + rx, topY, cx + rx, botY, { stroke: color, strokeWidth: 1.5 }));
  parts.push(`<rect x="${cx - rx}" y="${topY}" width="${rx * 2}" height="${botY - topY}" fill="${color}" fill-opacity="0.06" stroke="none"/>`);

  // 아래 타원 (앞면)
  parts.push(`<ellipse cx="${cx}" cy="${botY}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="1.5"/>`);

  // 위 타원
  parts.push(`<ellipse cx="${cx}" cy="${topY}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);

  // 숨은 모서리 (아래 타원 뒷면)
  if (showHidden) {
    parts.push(`<path d="M ${cx - rx} ${botY} A ${rx} ${ry} 0 0 0 ${cx + rx} ${botY}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="4,3"/>`);
  }

  renderLabels(parts, labels, {
    radius: [cx, botY + ry + 14],
    height: [cx - rx - 14, (topY + botY) / 2],
  });

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 원뿔 */
function renderCone(parts: string[], _r: number, _h: number, showHidden: boolean, color: string, labels: Label[]): string {
  const cx = 100, apexY = 30, baseY = 150;
  const rx = 50, ry = 18;
  const totalW = 200;
  const totalH = baseY + ry + 20;

  // 옆면 (삼각형)
  parts.push(`<polygon points="${cx},${apexY} ${cx - rx},${baseY} ${cx + rx},${baseY}" fill="${color}" fill-opacity="0.06" stroke="none"/>`);
  parts.push(line(cx, apexY, cx - rx, baseY, { stroke: color, strokeWidth: 1.5 }));
  parts.push(line(cx, apexY, cx + rx, baseY, { stroke: color, strokeWidth: 1.5 }));

  // 밑면 타원 (앞부분)
  parts.push(`<path d="M ${cx - rx} ${baseY} A ${rx} ${ry} 0 0 0 ${cx + rx} ${baseY}" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="1.5"/>`);

  // 숨은 모서리 (뒷면)
  if (showHidden) {
    parts.push(`<path d="M ${cx - rx} ${baseY} A ${rx} ${ry} 0 0 1 ${cx + rx} ${baseY}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="4,3"/>`);
    // 높이선 (점선)
    parts.push(line(cx, apexY, cx, baseY, { stroke: '#999', strokeWidth: 1, dashArray: '4,3' }));
  }

  renderLabels(parts, labels, {
    radius: [cx, baseY + ry + 14],
    height: [cx + 10, (apexY + baseY) / 2],
  });

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 삼각기둥 */
function renderTriangularPrism(parts: string[], _w: number, _h: number, _d: number, showHidden: boolean, color: string, labels: Label[]): string {
  // 전면 삼각형
  const f: [number, number][] = [[50, 140], [130, 140], [90, 50]];
  const offset = [45, -35];
  const b = f.map(([x, y]) => [x + offset[0], y + offset[1]] as [number, number]);
  const totalW = 220;
  const totalH = 170;

  // 전면
  parts.push(`<polygon points="${f.map(p => p.join(',')).join(' ')}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  // 옆면들 (보이는)
  parts.push(`<polygon points="${f[2].join(',')},${f[1].join(',')},${b[1].join(',')},${b[2].join(',')}" fill="${color}" fill-opacity="0.06" stroke="${color}" stroke-width="1.5"/>`);
  parts.push(`<polygon points="${f[2].join(',')},${b[2].join(',')},${b[0].join(',')},${f[0].join(',')}" fill="${color}" fill-opacity="0.03" stroke="none"/>`);
  // 윗변
  parts.push(line(f[2][0], f[2][1], b[2][0], b[2][1], { stroke: color, strokeWidth: 1.5 }));

  // 숨은 모서리
  if (showHidden) {
    parts.push(line(b[0][0], b[0][1], b[1][0], b[1][1], { stroke: '#999', strokeWidth: 1, dashArray: '4,3' }));
    parts.push(line(b[0][0], b[0][1], b[2][0], b[2][1], { stroke: '#999', strokeWidth: 1, dashArray: '4,3' }));
    parts.push(line(f[0][0], f[0][1], b[0][0], b[0][1], { stroke: '#999', strokeWidth: 1, dashArray: '4,3' }));
  }

  renderLabels(parts, labels, {
    width: [(f[0][0] + f[1][0]) / 2, f[0][1] + 14],
    height: [f[0][0] - 14, (f[0][1] + f[2][1]) / 2],
  });

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 사각뿔 */
function renderPyramid(parts: string[], _w: number, _h: number, showHidden: boolean, color: string, labels: Label[]): string {
  const apex: [number, number] = [100, 25];
  const base: [number, number][] = [[50, 130], [150, 130], [175, 105], [75, 105]];
  const totalW = 220;
  const totalH = 160;

  // 밑면 (보이는 부분)
  parts.push(`<polygon points="${base.map(p => p.join(',')).join(' ')}" fill="${color}" fill-opacity="0.06" stroke="none"/>`);
  parts.push(line(base[0][0], base[0][1], base[1][0], base[1][1], { stroke: color, strokeWidth: 1.5 }));
  parts.push(line(base[1][0], base[1][1], base[2][0], base[2][1], { stroke: color, strokeWidth: 1.5 }));

  // 보이는 모서리
  parts.push(line(apex[0], apex[1], base[0][0], base[0][1], { stroke: color, strokeWidth: 1.5 }));
  parts.push(line(apex[0], apex[1], base[1][0], base[1][1], { stroke: color, strokeWidth: 1.5 }));
  parts.push(line(apex[0], apex[1], base[2][0], base[2][1], { stroke: color, strokeWidth: 1.5 }));

  // 숨은 모서리
  if (showHidden) {
    parts.push(line(base[2][0], base[2][1], base[3][0], base[3][1], { stroke: '#999', strokeWidth: 1, dashArray: '4,3' }));
    parts.push(line(base[3][0], base[3][1], base[0][0], base[0][1], { stroke: '#999', strokeWidth: 1, dashArray: '4,3' }));
    parts.push(line(apex[0], apex[1], base[3][0], base[3][1], { stroke: '#999', strokeWidth: 1, dashArray: '4,3' }));
    // 높이선
    const bcx = base.reduce((s, p) => s + p[0], 0) / 4;
    const bcy = base.reduce((s, p) => s + p[1], 0) / 4;
    parts.push(line(apex[0], apex[1], bcx, bcy, { stroke: '#999', strokeWidth: 1, dashArray: '4,3' }));
  }

  renderLabels(parts, labels, {
    height: [apex[0] + 12, (apex[1] + base[0][1]) / 2],
    width: [(base[0][0] + base[1][0]) / 2, base[0][1] + 14],
  });

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 구 */
function renderSphere(parts: string[], _r: number, color: string, labels: Label[]): string {
  const cx = 80, cy = 80, sr = 60;
  const totalW = 180;
  const totalH = 180;

  // 원
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${sr}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>`);
  // 적도 타원 (점선)
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${sr}" ry="${sr * 0.3}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="4,3"/>`);
  // 세로 대원 (점선)
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${sr * 0.3}" ry="${sr}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="4,3"/>`);
  // 중심점
  parts.push(`<circle cx="${cx}" cy="${cy}" r="2" fill="#333"/>`);

  renderLabels(parts, labels, {
    radius: [cx + sr / 2 + 10, cy + 14],
  });

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 라벨 렌더링 헬퍼 */
function renderLabels(parts: string[], labels: Label[], positions: Record<string, number[]>): void {
  for (const lbl of labels) {
    const pos = positions[lbl.position];
    if (pos) {
      parts.push(katexLabel(pos[0], pos[1], lbl.text, { fontSize: 11 }));
    }
  }
}
