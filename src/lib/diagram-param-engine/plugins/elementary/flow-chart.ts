import type { DiagramPlugin } from '../../types';
import type { FlowChartParams } from '@/lib/utils/svg-diagrams/types';
import { renderFlowChart } from '@/lib/utils/svg-diagrams/elementary/flow-chart';
import { arr, num, type P } from '../../helpers';

export const flowChartPlugin: DiagramPlugin<FlowChartParams> = {
  type: 'flow_chart',
  normalize(p) {
    const nodes = arr<P>(p.nodes ?? p.steps);
    const normalized = nodes.map((n, i) => ({
      id: (n.id as string) ?? `node_${i}`,
      text: String(n.text ?? n.label ?? n.value ?? ''),
      x: n.x != null ? num(n.x, 0) : undefined,
      y: n.y != null ? num(n.y, i * 60) : undefined,
    }));
    return {
      nodes: normalized,
      arrows: arr(p.arrows ?? p.edges ?? p.connections),
    };
  },
  render: renderFlowChart,
};
