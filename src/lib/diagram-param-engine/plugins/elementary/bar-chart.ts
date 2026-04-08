import type { DiagramPlugin } from '../../types';
import type { BarChartParams } from '@/lib/utils/svg-diagrams/types';
import { renderBarChart } from '@/lib/utils/svg-diagrams/elementary/bar-chart';
import { arr, num } from '../../helpers';

export const barChartPlugin: DiagramPlugin<BarChartParams> = {
  type: 'bar_chart',
  normalize(p) {
    return {
      categories: arr(p.categories ?? p.labels ?? p.items),
      values: arr<number>(p.values ?? p.data ?? p.counts).map(Number),
      title: p.title as string,
      yLabel: (p.yLabel ?? p.y_label) as string,
      xLabel: (p.xLabel ?? p.x_label) as string,
      barColor: (p.barColor ?? p.color) as string,
      horizontal: !!p.horizontal,
      yMax: p.yMax != null ? num(p.yMax, 0) : undefined,
      yStep: p.yStep != null ? num(p.yStep, 0) : undefined,
    };
  },
  render: renderBarChart,
};
