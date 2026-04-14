import { SolidFigureParams } from '../types';
import { svgWrap, line, katexLabel, COLORS } from '../shared/svg-utils';

/** 입체도형 SVG 생성 (초5-중1) */
export function renderSolidFigure(params: SolidFigureParams): string {
  const shape = params.shape || 'cube';
  const labels = Array.isArray(params.labels) ? params.labels : [];
  const showHidden = params.showHiddenEdges !== false;
  const color = params.color || COLORS.primary;
  const dims = params.dimensions || {};
  const w = dims.width !== undefined ? dims.width : 1;
  const h = dims.height !== undefined ? dims.height : 1;
  const d = dims.depth !== undefined ? dims.depth : 1;
  const r = dims.radius !== undefined ? dims.radius : 1;

  const viewAngle = params.viewAngle ?? 30;
  const viewDepth = params.viewDepth ?? 0.77;

  const parts: string[] = [];

  const faceLabels = Array.isArray(params.faceLabels) ? params.faceLabels : [];

  switch (shape) {
    case 'cube':
      // 정육면체: 치수를 받아도 1:1:1로 고정
      return renderPrism(parts, 1, 1, 1, showHidden, color, labels, true, faceLabels.length > 0 ? faceLabels : undefined);
    case 'rectangular_prism':
      return renderPrism(parts, w, h, d, showHidden, color, labels, false, faceLabels.length > 0 ? faceLabels : undefined, params.gridDivisions, viewAngle, viewDepth, params.showGridLines, params.showCornerUnit);

    case 'cylinder':
      return renderCylinder(parts, r, h, showHidden, color, labels, viewAngle, viewDepth);

    case 'cone':
      return renderCone(parts, r, h, showHidden, color, labels, viewAngle, viewDepth);

    case 'triangular_prism':
      return renderTriangularPrism(parts, w, h, d, showHidden, color, labels, viewAngle, viewDepth);

    case 'pyramid':
      return renderPyramid(parts, w, h, showHidden, color, labels, viewAngle, viewDepth);

    case 'sphere':
      return renderSphere(parts, r, color, labels);

    default:
      return renderPrism(parts, 1, 1, 1, true, color, labels, true, undefined, undefined, viewAngle, viewDepth);
  }
}

type Label = { position: string; text: string };

type FaceLabel = { face: 'front' | 'top' | 'right'; text: string; color?: string };

/** 직육면체/정육면체 */
function renderPrism(parts: string[], rw: number, rh: number, rd: number, showHidden: boolean, color: string, labels: Label[], isCube: boolean, faceLabels?: FaceLabel[], gridDivisions?: { w?: number; h?: number; d?: number }, viewAngle = 30, viewDepth = 0.77, showGridLines?: boolean, showCornerUnit?: boolean): string {
  // 교과서 투영 파라미터 적용
  const THETA = viewAngle * Math.PI / 180;
  const ALPHA = viewDepth;
  const cosT = Math.cos(THETA);
  const sinT = Math.sin(THETA);

  // 실제 비율 반영 — maxSide 기준 정규화
  let fw: number, fh: number, fdRaw: number;
  if (isCube) {
    fw = 80; fh = 80; fdRaw = 80;
  } else {
    const maxSide = Math.max(rw || 1, rh || 1, rd || 1);
    const base = 110;
    fw = Math.max(30, ((rw || 1) / maxSide) * base);
    fh = Math.max(30, ((rh || 1) / maxSide) * base);
    fdRaw = Math.max(18, ((rd || 1) / maxSide) * base);
  }
  const dx = fdRaw * ALPHA * cosT;
  const dy = fdRaw * ALPHA * sinT;

  const hasDims = rw !== 1 || rh !== 1 || rd !== 1 || (faceLabels && faceLabels.length > 0 ? false : true); // If default 1,1,1 keep it simple unless we specifically want to show labels. Actually let's just check if any dimension is explicitly set and not all are 1s if we want to avoid showing 1cm everywhere by default. The best way is assuming UI explicitly passes dimensions we should render them if > 0.
  const wantsDimensions = rw > 0 || rh > 0 || rd > 0;
  const hasLabels = wantsDimensions && (rw !== 1 || rh !== 1 || rd !== 1);
  const padL = hasDims ? 40 : 40, padT = hasDims ? 35 : 40, padR = hasDims ? 75 : 30, padB = hasDims ? 50 : 20;
  const ox = padL, oy = padT + fh;
  // 전면 사각형 (FBL, FBR, FTR, FTL)
  const f = [[ox, oy], [ox + fw, oy], [ox + fw, oy - fh], [ox, oy - fh]];
  // 후면 사각형 (BBL, BBR, BTR, BTL)
  const b = f.map(([x, y]) => [x + dx, y - dy]);

  const totalW = padL + fw + dx + padR;
  const totalH = padT + fh + padB;

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

  // 격자 분할선 및 코너 블록 (최대공약수/최소공배수)
  if (gridDivisions) {
    const nw = Math.max(1, Math.floor(gridDivisions.w ?? 1));
    const nh = Math.max(1, Math.floor(gridDivisions.h ?? 1));
    const nd = Math.max(1, Math.floor(gridDivisions.d ?? 1));

    if (showGridLines) {
      const gLine = (x1: number, y1: number, x2: number, y2: number) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="0.8" stroke-opacity="0.55"/>`;
      for (let i = 1; i < nw; i++) { const x = f[0][0] + (fw * i) / nw; parts.push(gLine(x, f[0][1], x, f[3][1])); }
      for (let i = 1; i < nh; i++) { const y = f[3][1] + (fh * i) / nh; parts.push(gLine(f[0][0], y, f[1][0], y)); }
      for (let i = 1; i < nw; i++) { const t = i / nw; parts.push(gLine(f[3][0] + (f[2][0] - f[3][0]) * t, f[3][1] + (f[2][1] - f[3][1]) * t, b[3][0] + (b[2][0] - b[3][0]) * t, b[3][1] + (b[2][1] - b[3][1]) * t)); }
      for (let i = 1; i < nd; i++) { const t = i / nd; parts.push(gLine(f[3][0] + (b[3][0] - f[3][0]) * t, f[3][1] + (b[3][1] - f[3][1]) * t, f[2][0] + (b[2][0] - f[2][0]) * t, f[2][1] + (b[2][1] - f[2][1]) * t)); }
      for (let i = 1; i < nh; i++) { const t = i / nh; parts.push(gLine(f[1][0] + (f[2][0] - f[1][0]) * t, f[1][1] + (f[2][1] - f[1][1]) * t, b[1][0] + (b[2][0] - b[1][0]) * t, b[1][1] + (b[2][1] - b[1][1]) * t)); }
      for (let i = 1; i < nd; i++) { const t = i / nd; parts.push(gLine(f[1][0] + (b[1][0] - f[1][0]) * t, f[1][1] + (b[1][1] - f[1][1]) * t, f[2][0] + (b[2][0] - f[2][0]) * t, f[2][1] + (b[2][1] - f[2][1]) * t)); }
    }

    // 코너 단위 정육면체 표시
    if (showCornerUnit && (nw > 1 || nh > 1 || nd > 1)) {
      const uw = fw / nw, uh = fh / nh;
      const udx = dx / nd, udy = dy / nd;
      const uf = [[f[0][0], f[0][1]], [f[0][0] + uw, f[0][1]], [f[0][0] + uw, f[0][1] - uh], [f[0][0], f[0][1] - uh]];
      const ub = uf.map(([x, y]) => [x + udx, y - udy]);
      const cStroke = '#94A3B8'; // 테두리는 은은한 회색
      const cFront = '#F1F5F9';  // 전면: 약간 회색 (불투명)
      const cTop = '#F8FAFC';    // 윗면: 거의 흰색 (불투명)
      const cRight = '#E2E8F0';  // 오른면: 좀 더 진한 회색 (불투명)

      // 얇은 선으로 코너 블록 그리기 (불투명 처리하여 뒤쪽 점선 비침 방지)
      parts.push(`<polygon points="${uf.map(p => p.join(',')).join(' ')}" fill="${cFront}" stroke="${cStroke}" stroke-width="1.2"/>`);
      parts.push(`<polygon points="${uf[3].join(',')},${uf[2].join(',')},${ub[2].join(',')},${ub[3].join(',')}" fill="${cTop}" stroke="${cStroke}" stroke-width="1.2"/>`);
      parts.push(`<polygon points="${uf[1].join(',')},${uf[2].join(',')},${ub[2].join(',')},${ub[1].join(',')}" fill="${cRight}" stroke="${cStroke}" stroke-width="1.2"/>`);
    }
  }

  // 치수 자동 라벨 (dimensions > 1일 때 곡선+라벨)
  if (wantsDimensions) {
    const dimDash = '5,3'; const dimC = '#555';
    const bezAt = (p0: number[], p1: number[], p2: number[], t: number) =>
      [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]];
    const lerp2 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const splitCurve = (p0: number[], ctrl: number[], p2: number[], lbl: string, dx: number = 0, dy: number = 0) => {
      // t=0.20~0.80 구간을 비워서 라벨 공간을 더 넓게 확보 (글자가 겹치지 않도록)
      const s1e = bezAt(p0, ctrl, p2, 0.20), s1c = lerp2(p0, ctrl, 0.20);
      parts.push(`<path d="M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q ${s1c[0].toFixed(1)} ${s1c[1].toFixed(1)} ${s1e[0].toFixed(1)} ${s1e[1].toFixed(1)}" fill="none" stroke="${dimC}" stroke-width="0.8" stroke-dasharray="${dimDash}"/>`);
      const s2s = bezAt(p0, ctrl, p2, 0.80), s2c = lerp2(ctrl, p2, 0.80);
      parts.push(`<path d="M ${s2s[0].toFixed(1)} ${s2s[1].toFixed(1)} Q ${s2c[0].toFixed(1)} ${s2c[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" fill="none" stroke="${dimC}" stroke-width="0.8" stroke-dasharray="${dimDash}"/>`);
      const mid = bezAt(p0, ctrl, p2, 0.5);
      // 살짝 바깥쪽으로 밀어주어 모서리와 겹치지 않게 함 (dx, dy 적용)
      parts.push(katexLabel(mid[0] + dx, mid[1] + dy, lbl, { fontSize: 13 }));
    };
    // W (가로): FBL → FBR, 아래로 볼록
    const kW = Math.max(25, fw * 0.35);
    if (rw > 0) splitCurve(f[0], [(f[0][0] + f[1][0]) / 2, f[0][1] + kW], f[1], `${rw}cm`, 0, 5);
    // D (깊이): FBR → BBR, 오른쪽 아래 볼록
    const kD = Math.max(25, fdRaw * 0.45);
    if (rd > 0) splitCurve(f[1], [(f[1][0] + b[1][0]) / 2 + kD, (f[1][1] + b[1][1]) / 2 + kD * 0.3], b[1], `${rd}cm`, 8, 5);
    // H (높이): BTR → BBR, 오른쪽으로 볼록
    const kH = Math.max(25, fh * 0.35);
    if (rh > 0) splitCurve(b[2], [b[1][0] + kH, (b[2][1] + b[1][1]) / 2], b[1], `${rh}cm`, 12, 0);
  }

  // 면 텍스트 (faceLabels) — 치수 없을 때만
  if (faceLabels && !wantsDimensions) {
    for (const fl of faceLabels) {
      const txt = fl.text.replace(/^\$+|\$+$/g, '').trim();
      if (!txt) continue;
      if (fl.face === 'front') {
        const cx = (f[0][0] + f[1][0]) / 2;
        const cy = (f[0][1] + f[3][1]) / 2;
        parts.push(katexLabel(cx, cy, txt, { fontSize: 16 }));
      } else if (fl.face === 'top') {
        const cx = (f[3][0] + b[2][0]) / 2;
        const cy = (f[3][1] + b[2][1]) / 2;
        parts.push(katexLabel(cx, cy, txt, { fontSize: 14 }));
      } else if (fl.face === 'right') {
        const cx = (f[1][0] + b[2][0]) / 2;
        const cy = (f[1][1] + b[2][1]) / 2;
        parts.push(katexLabel(cx, cy, txt, { fontSize: 14 }));
      }
    }
  }

  // 라벨 (치수)
  renderLabels(parts, labels, {
    width: [(f[0][0] + f[1][0]) / 2, f[0][1] + 14],
    height: [f[0][0] - 14, (f[0][1] + f[3][1]) / 2],
    depth: [(f[1][0] + b[1][0]) / 2 + 8, (f[1][1] + b[1][1]) / 2 - 8],
  });

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

/** 원기둥 */
function renderCylinder(parts: string[], _r: number, _h: number, showHidden: boolean, color: string, labels: Label[], viewAngle = 30, viewDepth = 0.77): string {
  const cx = 100, topY = 40, botY = 140;
  const rx = 50;
  const ry = Math.max(5, rx * Math.sin(viewAngle * Math.PI / 180) * (viewDepth / 0.77));
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
function renderCone(parts: string[], _r: number, _h: number, showHidden: boolean, color: string, labels: Label[], viewAngle = 30, viewDepth = 0.77): string {
  const cx = 100, apexY = 30, baseY = 150;
  const rx = 50;
  const ry = Math.max(5, rx * Math.sin(viewAngle * Math.PI / 180) * (viewDepth / 0.77));
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
function renderTriangularPrism(parts: string[], _w: number, _h: number, _d: number, showHidden: boolean, color: string, labels: Label[], viewAngle = 30, viewDepth = 0.77): string {
  // 전면 삼각형
  const f: [number, number][] = [[50, 140], [130, 140], [90, 50]];
  const THETA = viewAngle * Math.PI / 180;
  const dx = 60 * viewDepth * Math.cos(THETA);
  const dy = 60 * viewDepth * Math.sin(THETA);
  const offset = [dx, -dy];
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
function renderPyramid(parts: string[], _w: number, _h: number, showHidden: boolean, color: string, labels: Label[], viewAngle = 30, viewDepth = 0.77): string {
  const apex: [number, number] = [100, 25];
  const THETA = viewAngle * Math.PI / 180;
  const bdx = 40 * viewDepth * Math.cos(THETA);
  const bdy = Math.max(5, 40 * viewDepth * Math.sin(THETA));
  const base: [number, number][] = [
    [50, 130],
    [150, 130],
    [150 + bdx, 130 - bdy],
    [50 + bdx, 130 - bdy]
  ];
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
