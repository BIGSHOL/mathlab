import { FlowChartParams } from '../types';
import { svgWrap, rect, text, arrow, COLORS } from '../shared/svg-utils';

/** 플로우차트 SVG 생성 */
export function renderFlowChart(params: FlowChartParams): string {
  const { nodes, arrows: arrowDefs = [] } = params;
  const boxW = 100;
  const boxH = 36;
  const parts: string[] = [];

  // 좌표가 없는 노드에 자동 배치 (세로 나열)
  const resolvedNodes = nodes.map((n, i) => ({
    id: n.id,
    text: n.text,
    x: n.x ?? 0,
    y: n.y ?? i * 60,
  }));

  const nodeMap = new Map(resolvedNodes.map(n => [n.id, n]));

  let maxX = 0, maxY = 0;
  for (const n of resolvedNodes) {
    maxX = Math.max(maxX, n.x + boxW);
    maxY = Math.max(maxY, n.y + boxH);
  }

  for (const n of resolvedNodes) {
    parts.push(rect(n.x, n.y, boxW, boxH, {
      fill: '#EFF6FF',
      stroke: COLORS.primary,
      rx: 6,
    }));
    parts.push(text(n.x + boxW / 2, n.y + boxH / 2, n.text, { fontSize: 12 }));
  }

  for (const a of arrowDefs) {
    const from = nodeMap.get(a.from);
    const to = nodeMap.get(a.to);
    if (!from || !to) continue;

    const fromCx = from.x + boxW / 2;
    const fromCy = from.y + boxH / 2;
    const toCx = to.x + boxW / 2;
    const toCy = to.y + boxH / 2;

    let x1: number, y1: number, x2: number, y2: number;

    if (Math.abs(toCy - fromCy) > Math.abs(toCx - fromCx)) {
      x1 = fromCx;
      y1 = toCy > fromCy ? from.y + boxH : from.y;
      x2 = toCx;
      y2 = toCy > fromCy ? to.y : to.y + boxH;
    } else {
      x1 = toCx > fromCx ? from.x + boxW : from.x;
      y1 = fromCy;
      x2 = toCx > fromCx ? to.x : to.x + boxW;
      y2 = toCy;
    }

    parts.push(arrow(x1, y1, x2, y2, { label: a.label }));
  }

  return svgWrap(parts.join('\n    '), maxX + 20, maxY + 20);
}
