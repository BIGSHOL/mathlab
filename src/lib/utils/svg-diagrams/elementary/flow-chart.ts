import { FlowChartParams } from '../types';
import { svgWrap, rect, text, arrow, COLORS } from '../shared/svg-utils';

/** 플로우차트 SVG 생성 */
export function renderFlowChart(params: FlowChartParams): string {
  const { nodes, arrows: arrowDefs } = params;
  const boxW = 100;
  const boxH = 36;
  const parts: string[] = [];

  // 노드 위치 맵
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 전체 크기 계산
  let maxX = 0, maxY = 0;
  for (const n of nodes) {
    maxX = Math.max(maxX, n.x + boxW);
    maxY = Math.max(maxY, n.y + boxH);
  }

  // 노드 그리기
  for (const n of nodes) {
    parts.push(rect(n.x, n.y, boxW, boxH, {
      fill: '#EFF6FF',
      stroke: COLORS.primary,
      rx: 6,
    }));
    parts.push(text(n.x + boxW / 2, n.y + boxH / 2, n.text, { fontSize: 12 }));
  }

  // 화살표 그리기
  for (const a of arrowDefs) {
    const from = nodeMap.get(a.from);
    const to = nodeMap.get(a.to);
    if (!from || !to) continue;

    // 연결점 계산 (center-bottom → center-top 또는 right → left)
    const fromCx = from.x + boxW / 2;
    const fromCy = from.y + boxH / 2;
    const toCx = to.x + boxW / 2;
    const toCy = to.y + boxH / 2;

    let x1: number, y1: number, x2: number, y2: number;

    if (Math.abs(toCy - fromCy) > Math.abs(toCx - fromCx)) {
      // 세로 연결
      x1 = fromCx;
      y1 = toCy > fromCy ? from.y + boxH : from.y;
      x2 = toCx;
      y2 = toCy > fromCy ? to.y : to.y + boxH;
    } else {
      // 가로 연결
      x1 = toCx > fromCx ? from.x + boxW : from.x;
      y1 = fromCy;
      x2 = toCx > fromCx ? to.x : to.x + boxW;
      y2 = toCy;
    }

    parts.push(arrow(x1, y1, x2, y2, { label: a.label }));
  }

  return svgWrap(parts.join('\n    '), maxX + 20, maxY + 20);
}
