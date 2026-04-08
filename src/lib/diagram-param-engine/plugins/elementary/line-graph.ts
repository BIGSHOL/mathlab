import type { DiagramPlugin } from '../../types';
import type { LineGraphParams } from '@/lib/utils/svg-diagrams/types';
import { renderLineGraph } from '@/lib/utils/svg-diagrams/elementary/line-graph';
import { arr, num, type P } from '../../helpers';

export const lineGraphPlugin: DiagramPlugin<LineGraphParams> = {
  type: 'line_graph',
  normalize(p) {
    let datasets = arr<P>(p.datasets);
    if (datasets.length === 0 && Array.isArray(p.values)) {
      datasets = [{ values: p.values, label: p.dataLabel, color: p.lineColor }];
    }
    return {
      categories: arr(p.categories ?? p.labels ?? p.items),
      datasets: datasets.map(ds => ({
        values: arr<number>(ds.values ?? ds.data).map(Number),
        label: ds.label as string,
        color: ds.color as string,
      })),
      title: p.title as string,
      yLabel: (p.yLabel ?? p.y_label) as string,
      xLabel: (p.xLabel ?? p.x_label) as string,
      yMax: p.yMax != null ? num(p.yMax, 0) : undefined,
      yStep: p.yStep != null ? num(p.yStep, 0) : undefined,
      showDots: p.showDots !== false,
    };
  },
  render: renderLineGraph,
};
