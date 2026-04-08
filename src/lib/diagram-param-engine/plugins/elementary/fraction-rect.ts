import type { DiagramPlugin } from '../../types';
import type { FractionRectParams } from '@/lib/utils/svg-diagrams/types';
import { renderFractionRect } from '@/lib/utils/svg-diagrams/elementary/fraction-rect';
import { num, arr } from '../../helpers';

export const fractionRectPlugin: DiagramPlugin<FractionRectParams> = {
  type: 'fraction_rect',
  normalize(p) {
    return {
      rows: num(p.rows ?? p.row ?? 1, 1),
      cols: num(p.cols ?? p.col ?? p.columns ?? p.denominator ?? p.parts, 1),
      coloredCells: arr(p.coloredCells ?? p.colored_cells),
      coloredCount: num(p.coloredCount ?? p.colored ?? p.numerator ?? p.filled ?? p.shaded, 0),
      hatchedCells: arr(p.hatchedCells ?? p.hatched_cells),
      count: num(p.count ?? p.rectangles ?? p.copies ?? p.num, 1),
      color: p.color as string,
      hatching: !!p.hatching,
      label: p.label as string,
    };
  },
  render: renderFractionRect,
};
