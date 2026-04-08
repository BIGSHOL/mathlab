import type { DiagramPlugin } from '../../types';
import type { ScatterPlotParams } from '@/lib/utils/svg-diagrams/types';
import { renderScatterPlot } from '@/lib/utils/svg-diagrams/middle/scatter-plot';
import { arr, num, type P } from '../../helpers';

export const scatterPlotPlugin: DiagramPlugin<ScatterPlotParams> = {
  type: 'scatter_plot',
  normalize(p) {
    const xRange = Array.isArray(p.xRange) ? p.xRange : [0, 10];
    const yRange = Array.isArray(p.yRange) ? p.yRange : [0, 10];
    return {
      points: arr<P>(p.points ?? p.data).map(pt => ({
        x: num(pt.x, 0),
        y: num(pt.y, 0),
        label: pt.label as string,
      })),
      xRange: [num(xRange[0], 0), num(xRange[1], 10)] as [number, number],
      yRange: [num(yRange[0], 0), num(yRange[1], 10)] as [number, number],
      xLabel: (p.xLabel ?? p.x_label) as string,
      yLabel: (p.yLabel ?? p.y_label) as string,
      title: p.title as string,
      gridStep: num(p.gridStep ?? p.step, 1),
      showTrendLine: !!p.showTrendLine,
      trendLineColor: p.trendLineColor as string,
    };
  },
  render: renderScatterPlot,
};
