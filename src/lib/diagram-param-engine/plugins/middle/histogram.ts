import type { DiagramPlugin } from '../../types';
import type { HistogramParams } from '@/lib/utils/svg-diagrams/types';
import { renderHistogram } from '@/lib/utils/svg-diagrams/middle/histogram';
import { arr, num, type P } from '../../helpers';

export const histogramPlugin: DiagramPlugin<HistogramParams> = {
  type: 'histogram',
  normalize(p) {
    return {
      bins: arr<P>(p.bins ?? p.classes ?? p.data).map(b => ({
        range: Array.isArray(b.range) ? [num(b.range[0], 0), num(b.range[1], 0)] as [number, number] : [0, 0] as [number, number],
        frequency: num(b.frequency ?? b.freq ?? b.count, 0),
      })),
      title: p.title as string,
      xLabel: (p.xLabel ?? p.x_label) as string,
      yLabel: (p.yLabel ?? p.y_label) as string,
      showFrequencyPolygon: !!p.showFrequencyPolygon,
      color: p.color as string,
    };
  },
  render: renderHistogram,
};
