import { FractionRectParams } from '../types';
import { svgWrap, text, COLORS, hatchPatternDef, TEXTBOOK_STYLE } from '../shared/svg-utils';

/** 단일 분수 사각형 렌더링 */
function renderSingleRect(
  ox: number, oy: number,
  rows: number, cols: number,
  coloredIndices: Set<number>,
  hatchedIndices: Set<number>,
  color: string,
  cellW: number, cellH: number,
  globalHatching: boolean,
  patternId: string
): string {
  const parts: string[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const x = ox + c * cellW;
      const y = oy + r * cellH;
      const isColored = coloredIndices.has(idx);
      // 개별 셀 빗금: hatchedCells에 있거나, 전역 hatching + colored일 때
      const isHatched = hatchedIndices.has(idx) || (isColored && globalHatching);

      if (isHatched) {
        // 빗금 셀: 색칠도 함께면 연한 배경 + 빗금, 아니면 흰 배경 + 빗금
        const bg = isColored ? color : 'white';
        const bgOpacity = isColored ? 0.2 : 1;
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${bg}" fill-opacity="${bgOpacity}" stroke="${TEXTBOOK_STYLE.MAIN_STROKE}" stroke-width="1"/>`);
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="url(#${patternId})" stroke="none"/>`);
      } else if (isColored) {
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${color}" fill-opacity="0.35" stroke="${TEXTBOOK_STYLE.MAIN_STROKE}" stroke-width="1"/>`);
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${color}" fill-opacity="0.15" stroke="none"/>`);
      } else {
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="white" stroke="${TEXTBOOK_STYLE.MAIN_STROKE}" stroke-width="1"/>`);
      }
    }
  }

  // 외곽선 강조
  const gridW = cols * cellW;
  const gridH = rows * cellH;
  parts.push(`<rect x="${ox}" y="${oy}" width="${gridW}" height="${gridH}" fill="none" stroke="${TEXTBOOK_STYLE.MAIN_STROKE}" stroke-width="1.5"/>`);

  return parts.join('\n    ');
}

/** 분수 사각형 SVG 생성 — 여러 개 지원 */
export function renderFractionRect(params: FractionRectParams): string {
  // 파라미터 방어적 처리
  const rows = Math.max(1, Math.min(10, Math.round(Number(params.rows) || 1)));
  const cols = Math.max(1, Math.min(20, Math.round(Number(params.cols) || 1)));
  const count = Math.max(1, Math.min(10, Math.round(Number(params.count) || 1)));
  const color = params.color || COLORS.primary;
  const globalHatching = !!params.hatching;
  const label = params.label;
  const totalCells = rows * cols;

  // 색칠할 셀 결정 (아래쪽부터 색칠 — 교재 스타일)
  let coloredSet = new Set<number>();
  if (Array.isArray(params.coloredCells) && params.coloredCells.length > 0) {
    coloredSet = new Set(params.coloredCells.map(Number).filter(n => !isNaN(n)));
  } else if (params.coloredCount != null) {
    // coloredCount = 사각형당 색칠할 셀 수 (모든 사각형에 동일 적용)
    const n = Math.min(totalCells, Math.max(0, Math.round(Number(params.coloredCount))));
    for (let g = 0; g < count; g++) {
      for (let i = 0; i < n; i++) {
        coloredSet.add(g * totalCells + (totalCells - 1 - i));
      }
    }
  }

  // 빗금 처리할 셀 (개별 지정)
  const hatchedSet = new Set<number>(
    Array.isArray(params.hatchedCells) ? params.hatchedCells.map(Number).filter(n => !isNaN(n)) : []
  );
  // 빗금 패턴이 필요한지 판단: 개별 hatchedCells가 있거나 전역 hatching일 때
  const needsHatch = hatchedSet.size > 0 || globalHatching;

  const cellW = 32;
  const cellH = 32;
  const gridW = cols * cellW;
  const gap = 12;
  const totalW = count * gridW + (count - 1) * gap;
  const gridH = rows * cellH;
  const totalH = label ? gridH + 24 : gridH;
  const parts: string[] = [];
  const patternId = 'hatch-' + color.replace('#', '');

  // 빗금 패턴 정의
  if (needsHatch) {
    parts.push(hatchPatternDef(patternId, color));
  }

  for (let g = 0; g < count; g++) {
    const ox = g * (gridW + gap);
    const localColoredSet = new Set<number>();
    const localHatchedSet = new Set<number>();
    for (let i = 0; i < totalCells; i++) {
      if (coloredSet.has(g * totalCells + i)) localColoredSet.add(i);
      if (hatchedSet.has(g * totalCells + i)) localHatchedSet.add(i);
    }
    parts.push(renderSingleRect(ox, 0, rows, cols, localColoredSet, localHatchedSet, color, cellW, cellH, globalHatching, patternId));
  }

  // 레이블
  if (label) {
    parts.push(text(totalW / 2, gridH + 16, label, { fontSize: 12, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
