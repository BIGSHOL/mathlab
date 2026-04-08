import type { DiagramPlugin } from '../../types';
import type { PieChartParams } from '@/lib/utils/svg-diagrams/types';
import { renderPieChart } from '@/lib/utils/svg-diagrams/elementary/pie-chart';
import { arr, num, type P } from '../../helpers';

export const pieChartPlugin: DiagramPlugin<PieChartParams> = {
  type: 'pie_chart',
  normalize(p) {
    return {
      segments: arr<P>(p.segments ?? p.slices ?? p.data).map(s => ({
        label: String(s.label ?? s.name ?? ''),
        value: num(s.value ?? s.count ?? s.amount, 0),
        color: s.color as string,
      })),
      title: p.title as string,
      showPercent: p.showPercent !== false,
      showValue: !!p.showValue,
    };
  },
  render: renderPieChart,
};
