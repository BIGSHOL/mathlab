import type { DiagramPlugin } from '../../types';
import type { NetDiagramParams } from '@/lib/utils/svg-diagrams/types';
import { renderNetDiagram } from '@/lib/utils/svg-diagrams/middle/net-diagram';
import { arr } from '../../helpers';

export const netDiagramPlugin: DiagramPlugin<NetDiagramParams> = {
  type: 'net_diagram',
  normalize(p) {
    return {
      shape: (p.shape ?? p.type ?? 'cube') as NetDiagramParams['shape'],
      labels: arr(p.labels),
      foldLines: p.foldLines !== false,
      color: p.color as string,
    };
  },
  render: renderNetDiagram,
};
