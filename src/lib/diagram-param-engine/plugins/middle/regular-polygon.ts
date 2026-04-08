import type { DiagramPlugin } from '../../types';
import type { RegularPolygonParams } from '@/lib/utils/svg-diagrams/types';
import { renderRegularPolygon } from '@/lib/utils/svg-diagrams/middle/shapes';

export const regularPolygonPlugin: DiagramPlugin<RegularPolygonParams> = {
  type: 'regular_polygon',
  normalize: (p) => p as unknown as RegularPolygonParams,
  render: renderRegularPolygon,
};
