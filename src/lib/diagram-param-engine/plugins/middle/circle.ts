import type { DiagramPlugin } from '../../types';
import type { CircleParams } from '@/lib/utils/svg-diagrams/types';
import { renderCircle } from '@/lib/utils/svg-diagrams/middle/shapes';

export const circlePlugin: DiagramPlugin<CircleParams> = {
  type: 'circle',
  normalize: (p) => p as unknown as CircleParams,
  render: renderCircle,
};
