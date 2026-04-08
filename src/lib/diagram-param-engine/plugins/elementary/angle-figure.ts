import type { DiagramPlugin } from '../../types';
import type { AngleFigureParams } from '@/lib/utils/svg-diagrams/types';
import { renderAngleFigure } from '@/lib/utils/svg-diagrams/elementary/angle-figure';
import { num } from '../../helpers';

export const angleFigurePlugin: DiagramPlugin<AngleFigureParams> = {
  type: 'angle_figure',
  normalize(p) {
    return {
      angle: num(p.angle ?? p.degrees ?? p.deg, 90),
      showProtractor: !!p.showProtractor,
      label: p.label as string,
      ray1Angle: num(p.ray1Angle ?? p.startAngle ?? 0, 0),
      color: p.color as string,
    };
  },
  render: renderAngleFigure,
};
