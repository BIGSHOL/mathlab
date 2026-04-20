import { StemLeafParams } from '../types';
import { svgWrap, line, text, katexLabel, TEXTBOOK_STYLE } from '../shared/svg-utils';

/** 줄기잎그림 SVG 생성 (중1) */
export function renderStemLeaf(params: StemLeafParams): string {
  const stems = Array.isArray(params.stems) ? params.stems : [];
  if (stems.length === 0) return svgWrap(text(60, 30, '데이터 없음', { fontSize: 12 }), 120, 60);

  const title = params.title;
  const stemLabel = params.stemLabel || '줄기';
  const leafLabel = params.leafLabel || '잎';

  const rowH = 26;
  const stemW = 44;
  const leafDigitW = 16;
  const headerH = 28;
  const topPad = title ? 28 : 6;

  // 잎 최대 개수 (너비 결정)
  const maxLeaves = Math.max(...stems.map(s => (Array.isArray(s.leaves) ? s.leaves.length : 0)), 1);
  const leafW = Math.max(80, maxLeaves * leafDigitW + 10);
  const totalW = stemW + leafW + 20;
  const totalH = topPad + headerH + stems.length * rowH + 6;

  const parts: string[] = [];

  // 제목
  if (title) {
    parts.push(text(totalW / 2, 14, title, { fontSize: 13, fontWeight: 'bold' }));
  }

  const tableX = 10;
  const dividerX = tableX + stemW;

  // 헤더
  const headerY = topPad;
  parts.push(text(tableX + stemW / 2, headerY + headerH / 2, stemLabel, { fontSize: 11, fontWeight: 'bold', fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));
  parts.push(text(dividerX + leafW / 2, headerY + headerH / 2, leafLabel, { fontSize: 11, fontWeight: 'bold', fill: TEXTBOOK_STYLE.PLAIN_TEXT_COLOR }));

  // 헤더 아래 구분선
  parts.push(line(tableX, headerY + headerH, tableX + stemW + leafW, headerY + headerH, { strokeWidth: 1.5 }));

  // 세로 구분선
  parts.push(line(dividerX, headerY, dividerX, topPad + headerH + stems.length * rowH, { strokeWidth: 1.5 }));

  // 행
  for (let i = 0; i < stems.length; i++) {
    const s = stems[i];
    const stem = Number(s.stem) || 0;
    const leaves = Array.isArray(s.leaves) ? s.leaves.map(Number).filter(n => !isNaN(n)) : [];
    const y = topPad + headerH + i * rowH + rowH / 2;

    // 줄기 (오른쪽 정렬)
    parts.push(katexLabel(tableX + stemW / 2, y, stem.toString(), { fontSize: 13 }));

    // 잎 (왼쪽 정렬, 숫자 간격)
    for (let j = 0; j < leaves.length; j++) {
      const lx = dividerX + 10 + j * leafDigitW;
      parts.push(katexLabel(lx, y, leaves[j].toString(), { fontSize: 13, anchor: 'start' }));
    }

    // 행 구분선 (얇은)
    if (i < stems.length - 1) {
      const lineY = topPad + headerH + (i + 1) * rowH;
      parts.push(line(tableX, lineY, tableX + stemW + leafW, lineY, { stroke: '#E5E7EB', strokeWidth: 0.5 }));
    }
  }

  // 외곽 테두리
  parts.push(`<rect x="${tableX}" y="${headerY}" width="${stemW + leafW}" height="${headerH + stems.length * rowH}" fill="none" stroke="${TEXTBOOK_STYLE.MAIN_STROKE}" stroke-width="1.5" rx="2"/>`);

  return svgWrap(parts.join('\n    '), totalW, totalH);
}
