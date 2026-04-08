import type { DiagramPlugin } from '../../types';
import type { SolidFigureParams } from '@/lib/utils/svg-diagrams/types';
import { renderSolidFigure } from '@/lib/utils/svg-diagrams/middle/solid-figure';
import { arr } from '../../helpers';

export const solidFigurePlugin: DiagramPlugin<SolidFigureParams> = {
  type: 'solid_figure',
  normalize(p) {
    return {
      shape: (p.shape ?? p.type ?? 'cube') as SolidFigureParams['shape'],
      labels: arr(p.labels),
      dimensions: (p.dimensions ?? {}) as Record<string, number>,
      showHiddenEdges: p.showHiddenEdges !== false,
      color: p.color as string,
    };
  },
  render: renderSolidFigure,
};
