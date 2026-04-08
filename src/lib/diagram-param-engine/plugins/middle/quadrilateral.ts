import type { DiagramPlugin } from '../../types';
import type { QuadrilateralParams } from '@/lib/utils/svg-diagrams/types';
import { renderQuadrilateral } from '@/lib/utils/svg-diagrams/middle/shapes';

export const quadrilateralPlugin: DiagramPlugin<QuadrilateralParams> = {
  type: 'quadrilateral',
  normalize: (p) => p as unknown as QuadrilateralParams,
  render: renderQuadrilateral,
};
