import { FlowChartParams } from '../types';
import { svgWrap, rect, text, arrow, line, circle as svgCircle, COLORS } from '../shared/svg-utils';

/** 플로우차트 SVG 생성 — rect/circle/diamond 노드 지원 */
export function renderFlowChart(params: FlowChartParams): string {
  const { nodes, arrows: arrowDefs = [] } = params;
  const parts: string[] = [];

  // 좌표가 없는 노드에 자동 배치 (세로 나열)
  const resolvedNodes = nodes.map((n, i) => ({
    ...n,
    x: n.x ?? 0,
    y: n.y ?? i * 60,
    shape: n.shape ?? 'rect',
    size: n.size,
    color: n.color,
    textColor: n.textColor,
  }));

  const nodeMap = new Map(resolvedNodes.map(n => [n.id, n]));

  let maxX = 0, maxY = 0;
  for (const n of resolvedNodes) {
    if (n.shape === 'circle') {
      const r = n.size ?? 18;
      maxX = Math.max(maxX, n.x + r * 2);
      maxY = Math.max(maxY, n.y + r * 2);
    } else {
      const w = n.size ?? 100;
      const h = 36;
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    }
  }

  // 노드 그리기
  for (const n of resolvedNodes) {
    const fill = n.color || '#EFF6FF';
    const stroke = COLORS.primary;
    const textFill = n.textColor || '#1e293b';

    if (n.shape === 'circle') {
      const r = n.size ?? 18;
      const cx = n.x + r;
      const cy = n.y + r;
      parts.push(svgCircle(cx, cy, r, { fill, stroke, strokeWidth: 1.5 }));
      parts.push(text(cx, cy, n.text, { fontSize: 12, fill: textFill, fontWeight: 'bold' }));
    } else if (n.shape === 'diamond') {
      const s = n.size ?? 36;
      const cx = n.x + s / 2;
      const cy = n.y + s / 2;
      parts.push(`<polygon points="${cx},${n.y} ${n.x + s},${cy} ${cx},${n.y + s} ${n.x},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
      parts.push(text(cx, cy, n.text, { fontSize: 12, fill: textFill }));
    } else {
      // rect (기본)
      const w = n.size ?? 100;
      const h = 36;
      parts.push(rect(n.x, n.y, w, h, { fill, stroke, rx: 6 }));
      parts.push(text(n.x + w / 2, n.y + h / 2, n.text, { fontSize: 12, fill: textFill }));
    }
  }

  // 연결선
  for (const a of arrowDefs) {
    const from = nodeMap.get(a.from);
    const to = nodeMap.get(a.to);
    if (!from || !to) continue;

    // 노드 중심 좌표 계산
    const getCenter = (n: typeof from) => {
      if (n.shape === 'circle') {
        const r = n.size ?? 18;
        return { cx: n.x + r, cy: n.y + r, r };
      }
      if (n.shape === 'diamond') {
        const s = n.size ?? 36;
        return { cx: n.x + s / 2, cy: n.y + s / 2, r: s / 2 };
      }
      const w = n.size ?? 100;
      return { cx: n.x + w / 2, cy: n.y + 18, r: 18 };
    };

    const fc = getCenter(from);
    const tc = getCenter(to);

    // 원형이면 원 테두리에서 선이 시작/끝
    const angle = Math.atan2(tc.cy - fc.cy, tc.cx - fc.cx);
    const x1 = fc.cx + Math.cos(angle) * fc.r;
    const y1 = fc.cy + Math.sin(angle) * fc.r;
    const x2 = tc.cx - Math.cos(angle) * tc.r;
    const y2 = tc.cy - Math.sin(angle) * tc.r;

    if (a.noArrowHead) {
      parts.push(line(x1, y1, x2, y2, { strokeWidth: 1.2, stroke: '#94a3b8' }));
    } else {
      parts.push(arrow(x1, y1, x2, y2, { label: a.label }));
    }
  }

  return svgWrap(parts.join('\n    '), maxX + 20, maxY + 20);
}
