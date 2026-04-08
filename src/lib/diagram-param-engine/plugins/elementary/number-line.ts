import type { DiagramPlugin } from '../../types';
import type { NumberLineParams } from '@/lib/utils/svg-diagrams/types';
import { renderNumberLine } from '@/lib/utils/svg-diagrams/elementary/number-line';
import { num, arr } from '../../helpers';

export const numberLinePlugin: DiagramPlugin<NumberLineParams> = {
  type: 'number_line',
  normalize(p) {
    const min = num(p.min ?? p.start ?? p.from, 0);
    const max = num(p.max ?? p.end ?? p.to, min + 1);
    const range = max - min;
    return {
      min, max,
      step: num(p.step ?? p.interval ?? p.tick, range > 0 ? range / Math.min(10, range) : 1),
      marks: arr(p.marks ?? p.points ?? p.markers),
      highlights: arr(p.highlights ?? p.arcs ?? p.jumps ?? p.regions),
      label: p.label as string,
    };
  },
  render: renderNumberLine,
};
