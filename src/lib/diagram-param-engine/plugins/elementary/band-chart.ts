import type { DiagramPlugin } from '../../types';
import type { BandChartParams } from '@/lib/utils/svg-diagrams/types';
import { renderBandChart } from '@/lib/utils/svg-diagrams/elementary/band-chart';
import { arr, num, type P } from '../../helpers';

export const bandChartPlugin: DiagramPlugin<BandChartParams> = {
  type: 'band_chart',
  normalize(p) {
    return {
      segments: arr<P>(p.segments ?? p.parts ?? p.data).map(s => ({
        label: String(s.label ?? s.name ?? ''),
        value: num(s.value ?? s.count ?? s.amount, 0),
        color: s.color as string,
      })),
      title: p.title as string,
      showPercent: p.showPercent !== false,
      height: p.height != null ? num(p.height, 40) : undefined,
    };
  },
  render: renderBandChart,
};
