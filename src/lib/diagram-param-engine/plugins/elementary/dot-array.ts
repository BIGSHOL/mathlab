import type { DiagramPlugin } from '../../types';
import type { DotArrayParams } from '@/lib/utils/svg-diagrams/types';
import { renderDotArray } from '@/lib/utils/svg-diagrams/elementary/dot-array';
import { num } from '../../helpers';

export const dotArrayPlugin: DiagramPlugin<DotArrayParams> = {
  type: 'dot_array',
  normalize(p) {
    return {
      rows: num(p.rows ?? p.row, 1),
      cols: num(p.cols ?? p.col ?? p.columns, 1),
      symbol: p.symbol as string,
      label: p.label as string,
    };
  },
  render: renderDotArray,
};
