import type { DiagramPlugin } from '../../types';
import type { VennDiagramParams } from '@/lib/utils/svg-diagrams/types';
import { renderVennDiagram } from '@/lib/utils/svg-diagrams/middle/venn-diagram';

export const vennDiagramPlugin: DiagramPlugin<VennDiagramParams> = {
  type: 'venn_diagram',
  normalize: (p) => p as unknown as VennDiagramParams,
  render: renderVennDiagram,
};
