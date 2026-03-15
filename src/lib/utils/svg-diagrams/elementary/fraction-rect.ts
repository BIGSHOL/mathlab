import { FractionRectParams } from '../types';
import { svgWrap, text, COLORS } from '../shared/svg-utils';

/** 빗금 패턴 <defs> 생성 */
function hatchPatternDef(id: string, color: string): string {
  return `<defs>
    <pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="${color}" stroke-width="1.5" stroke-opacity="0.6"/>
    </pattern>
  </defs>`;
}

/** 단일 분수 사각형 렌더링 */
function renderSingleRect(
  ox: number, oy: number,
  rows: number, cols: number,
  coloredIndices: Set<number>,
  color: string,
  cellW: number, cellH: number,
  hatching: boolean,
  patternId: string
): string {
  const parts: string[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const x = ox + c * cellW;
      const y = oy + r * cellH;
      const isColored = coloredIndices.has(idx);

      // 셀 배경
      if (isColored && hatching) {
        // 빗금 모드: 흰 배경 + 빗금 패턴
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="white" stroke="#555" stroke-width="1"/>`);
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="url(#${patternId})" stroke="none"/>`);
      } else {
        parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${isColored ? color : 'white'}" fill-opacity="${isColored ? 0.35 : 1}" stroke="#555" stroke-width="1"/>`);
        // 색칠 추가 레이어
        if (isColored) {
          parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${color}" fill-opacity="0.15" stroke="none"/>`);
        }
      }
    }
  }

  // 외곽선 강조
  const gridW = cols * cellW;
  const gridH = rows * cellH;
  parts.push(`<rect x="${ox}" y="${oy}" width="${gridW}" height="${gridH}" fill="none" stroke="#555" stroke-width="1.5"/>`);

  return parts.join('\n    ');
}

/** 분수 사각형 SVG 생성 — 여러 개 지원 */
export function renderFractionRect(params: FractionRectParams): string {
  // 파라미터 방어적 처리
  const rows = Math.max(1, Math.min(10, Math.round(Number(params.rows) || 1)));
  const cols = Math.max(1, Math.min(20, Math.round(Number(params.cols) || 1)));
  const count = Math.max(1, Math.min(10, Math.round(Number(params.count) || 1)));
  const color = params.color || COLORS.primary;
  const hatching = !!params.hatching;
  const label = params.label;
  const totalCells = rows * cols;

  // 색칠할 셀 결정 (아래쪽부터 색칠 — 교재 스타일)
  let coloredSet = new Set<number>();
  if (Array.isArray(params.coloredCells) && params.coloredCells.length > 0) {
    coloredSet = new Set(params.coloredCells.map(Number).filter(n => !isNaN(n)));
  } else if (params.coloredCount != null) {
    const n = Math.min(totalCells * count, Math.max(0, Math.round(Number(params.coloredCount))));
    // 각 사각형 내에서 아래쪽(마지막 행)부터 색칠
    let remaining = n;
    for (let g = 0; g < count && remaining > 0; g++) {
      const cellsInThis = Math.min(totalCells, remaining);
      for (let i = 0; i < cellsInThis; i++) {
        // 아래쪽부터: totalCells-1-i → 마지막 셀부터 역순
        coloredSet.add(g * totalCells + (totalCells - 1 - i));
      }
      remaining -= cellsInThis;
    }
  }

  const cellW = 32;
  const cellH = 32;
  const gridW = cols * cellW;
  const gap = 12;
  const totalW = count * gridW + (count - 1) * gap;
  const gridH = rows * cellH;
  const totalH = label ? gridH + 24 : gridH;
  const parts: string[] = [];
  const patternId = 'hatch-' + color.replace('#', '');

  // 빗금 패턴 정의 (hatching 모드일 때만)
  if (hatching) {
    parts.push(hatchPatternDef(patternId, color));
  }

  for (let g = 0; g < count; g++) {
    const ox = g * (gridW + gap);
    // 이 사각형에 해당하는 색칠 인덱스 계산
    const localSet = new Set<number>();
    for (let i = 0; i < totalCells; i++) {
      if (coloredSet.has(g * totalCells + i)) {
        localSet.add(i);
      }
    }
    parts.push(renderSingleRect(ox, 0, rows, cols, localSet, color, cellW, cellH, hatching, patternId));
  }

  // 레이블
  if (label) {
    parts.push(text(totalW / 2, gridH + 16, label, { fontSize: 12, fontWeight: 'bold' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
