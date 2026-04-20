import { BandChartParams } from '../types';
import { svgWrap, line, text, katexLabel, COLORS, TEXTBOOK_STYLE } from '../shared/svg-utils';

const BAND_COLORS = [COLORS.primary, COLORS.secondary, COLORS.green, COLORS.purple, COLORS.red, COLORS.yellow];

/** 띠그래프 SVG 생성 (초6) */
export function renderBandChart(params: BandChartParams): string {
  const segments = Array.isArray(params.segments) ? params.segments : [];
  if (segments.length === 0) return svgWrap(text(60, 30, '데이터 없음', { fontSize: 12 }), 120, 60);

  const title = params.title;
  const showPercent = params.showPercent !== false;
  const bandH = Math.max(20, Math.min(80, Number(params.height) || 40));

  const total = segments.reduce((s, seg) => s + Math.max(0, Number(seg.value) || 0), 0);
  if (total === 0) return svgWrap(text(60, 30, '합계 0', { fontSize: 12 }), 120, 60);

  const bandW = 360;
  const leftPad = 10;
  const topPad = title ? 28 : 10;
  const labelRowH = 22;
  const tickRowH = 18;
  const totalW = leftPad * 2 + bandW;
  const totalH = topPad + labelRowH + bandH + tickRowH + 10;

  const parts: string[] = [];

  // 제목
  if (title) {
    parts.push(text(totalW / 2, 12, title, { fontSize: 13, fontWeight: 'bold' }));
  }

  // 띠 렌더링
  let xOffset = leftPad;
  const bandY = topPad + labelRowH;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const val = Math.max(0, Number(seg.value) || 0);
    const ratio = val / total;
    const w = ratio * bandW;
    const color = seg.color || BAND_COLORS[i % BAND_COLORS.length];

    // 띠 구간
    parts.push(`<rect x="${xOffset}" y="${bandY}" width="${w.toFixed(1)}" height="${bandH}" fill="${color}" fill-opacity="0.5" stroke="white" stroke-width="1"/>`);

    // 구간 라벨 (상단)
    const midX = xOffset + w / 2;
    parts.push(text(midX, bandY - 6, seg.label, { fontSize: 10, fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));

    // 백분율 (띠 안에)
    if (showPercent && w > 20) {
      const pct = Math.round(ratio * 100);
      parts.push(katexLabel(midX, bandY + bandH / 2, `${pct}\\%`, { fontSize: 10 }));
    }

    xOffset += w;
  }

  // 외곽선
  parts.push(`<rect x="${leftPad}" y="${bandY}" width="${bandW}" height="${bandH}" fill="none" stroke="${TEXTBOOK_STYLE.MAIN_STROKE}" stroke-width="1.5"/>`);

  // 하단 눈금 (0%, 50%, 100%)
  const tickY = bandY + bandH + 4;
  const tickMarks = [0, 25, 50, 75, 100];
  for (const pct of tickMarks) {
    const x = leftPad + (pct / 100) * bandW;
    parts.push(line(x, bandY + bandH, x, bandY + bandH + 4, { strokeWidth: 1 }));
    parts.push(katexLabel(x, tickY + 8, `${pct}`, { fontSize: 9 }));
  }

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
