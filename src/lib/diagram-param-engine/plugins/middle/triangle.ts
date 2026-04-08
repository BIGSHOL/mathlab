import type { DiagramPlugin } from '../../types';
import type { TriangleParams } from '@/lib/utils/svg-diagrams/types';
import { renderTriangle } from '@/lib/utils/svg-diagrams/middle/shapes';

export const trianglePlugin: DiagramPlugin<TriangleParams> = {
  type: 'triangle',
  normalize: (p) => p as unknown as TriangleParams,
  render: renderTriangle,
};
