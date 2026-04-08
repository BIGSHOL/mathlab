import type { DiagramPlugin } from '../../types';
import type { TreeDiagramParams } from '@/lib/utils/svg-diagrams/types';
import { renderTreeDiagram } from '@/lib/utils/svg-diagrams/middle/tree-diagram';
import { arr } from '../../helpers';

export const treeDiagramPlugin: DiagramPlugin<TreeDiagramParams> = {
  type: 'tree_diagram',
  normalize(p) {
    return {
      root: (p.root as TreeDiagramParams['root']) ?? { label: (p.label as string) ?? '시작', children: arr(p.children) },
      title: p.title as string,
      orientation: (p.orientation as TreeDiagramParams['orientation']) ?? 'horizontal',
    };
  },
  render: renderTreeDiagram,
};
