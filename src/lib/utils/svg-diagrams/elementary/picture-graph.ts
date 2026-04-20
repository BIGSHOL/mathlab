import { PictureGraphParams } from '../types';
import { svgWrap, text, line, katexLabel, COLORS, TEXTBOOK_STYLE } from '../shared/svg-utils';

/** 그림그래프 SVG 생성 (초3) */
export function renderPictureGraph(params: PictureGraphParams): string {
  const categories = Array.isArray(params.categories) ? params.categories : [];
  const values = Array.isArray(params.values) ? params.values.map(Number) : [];
  const n = Math.min(categories.length, values.length);
  if (n === 0) return svgWrap(text(60, 30, '데이터 없음', { fontSize: 12 }), 120, 60);

  const symbol = params.symbol || '●';
  const symbolValue = Math.max(1, Number(params.symbolValue) || 1);
  const title = params.title;
  const color = params.color || COLORS.primary;

  const rowH = 28;
  const symbolGap = 22;
  const catW = 60;
  const topPad = title ? 28 : 10;
  const maxSymbols = Math.max(...values.map(v => Math.ceil(v / symbolValue)));
  const chartW = catW + maxSymbols * symbolGap + 20;
  const chartH = n * rowH;
  const totalW = chartW + 20;
  const totalH = topPad + chartH + (symbolValue > 1 ? 24 : 10);

  const parts: string[] = [];

  // 제목
  if (title) {
    parts.push(text(totalW / 2, 12, title, { fontSize: 13, fontWeight: 'bold' }));
  }

  // 행별 그리기
  for (let i = 0; i < n; i++) {
    const y = topPad + i * rowH + rowH / 2;
    // 범주 라벨
    parts.push(text(catW / 2, y, categories[i], { fontSize: 11, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
    // 구분선
    parts.push(line(catW, topPad + i * rowH, catW, topPad + (i + 1) * rowH, { stroke: '#E5E7EB', strokeWidth: 0.5 }));

    // 그림 기호 반복
    const fullCount = Math.floor(values[i] / symbolValue);
    const remainder = values[i] % symbolValue;
    for (let j = 0; j < fullCount; j++) {
      const x = catW + 14 + j * symbolGap;
      if (symbol === '●') {
        parts.push(`<circle cx="${x}" cy="${y}" r="7" fill="${color}" fill-opacity="0.7"/>`);
      } else {
        parts.push(text(x, y, symbol, { fontSize: 16, fill: color }));
      }
    }
    // 반개 (나머지)
    if (remainder > 0 && symbolValue > 1) {
      const x = catW + 14 + fullCount * symbolGap;
      const fraction = remainder / symbolValue;
      if (symbol === '●') {
        // 반원 (clipPath)
        const clipId = `half-${i}`;
        parts.push(`<defs><clipPath id="${clipId}"><rect x="${x - 7}" y="${y - 7}" width="${7 * fraction * 2}" height="14"/></clipPath></defs>`);
        parts.push(`<circle cx="${x}" cy="${y}" r="7" fill="${color}" fill-opacity="0.7" clip-path="url(#${clipId})"/>`);
        parts.push(`<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.4"/>`);
      } else {
        parts.push(text(x, y, symbol, { fontSize: 16, fill: color }));
        // 반투명으로 표시
        parts.push(`<rect x="${x + 7 * fraction * 2 - 7}" y="${y - 9}" width="${14 * (1 - fraction)}" height="18" fill="white" fill-opacity="0.7"/>`);
      }
    }
  }

  // 가로 구분선
  for (let i = 0; i <= n; i++) {
    const y = topPad + i * rowH;
    parts.push(line(0, y, chartW, y, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
  }

  // 범례 (symbolValue > 1일 때)
  if (symbolValue > 1) {
    const ly = totalH - 8;
    if (symbol === '●') {
      parts.push(`<circle cx="${catW}" cy="${ly}" r="5" fill="${color}" fill-opacity="0.7"/>`);
    } else {
      parts.push(text(catW, ly, symbol, { fontSize: 12, fill: color }));
    }
    parts.push(katexLabel(catW + 16, ly, `= ${symbolValue}`, { fontSize: 10, anchor: 'start' }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
