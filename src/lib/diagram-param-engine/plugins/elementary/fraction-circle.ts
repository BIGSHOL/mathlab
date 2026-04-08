import type { DiagramPlugin } from '../../types';
import type { FractionCircleParams } from '@/lib/utils/svg-diagrams/types';
import { renderFractionCircle } from '@/lib/utils/svg-diagrams/elementary/fraction-circle';
import { num, arr } from '../../helpers';

export const fractionCirclePlugin: DiagramPlugin<FractionCircleParams> = {
  type: 'fraction_circle',
  normalize(p) {
    return {
      totalParts: num(p.totalParts ?? p.parts ?? p.denominator ?? p.divisions ?? p.segments, 1),
      coloredParts: num(p.coloredParts ?? p.colored ?? p.numerator ?? p.filled ?? p.shaded, 0),
      coloredSlices: arr(p.coloredSlices),
      hatchedSlices: arr(p.hatchedSlices),
      hatchedParts: num(p.hatchedParts ?? 0, 0),
      count: num(p.count ?? p.circles ?? p.copies ?? p.num, 1),
      color: p.color as string,
      hatching: !!p.hatching,
      label: p.label as string,
    };
  },
  render: renderFractionCircle,
};
