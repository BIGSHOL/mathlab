import type { DiagramPlugin } from '../../types';
import type { CoordinatePlaneParams } from '@/lib/utils/svg-diagrams/types';
import { renderCoordinatePlane } from '@/lib/utils/svg-diagrams/middle/coordinate-plane';
import { num, arr } from '../../helpers';

export const coordinatePlanePlugin: DiagramPlugin<CoordinatePlaneParams> = {
  type: 'coordinate_plane',
  normalize(p) {
    const xRange = Array.isArray(p.xRange) ? p.xRange : [-5, 5];
    const yRange = Array.isArray(p.yRange) ? p.yRange : [-5, 5];
    return {
      xRange: [num(xRange[0], -5), num(xRange[1], 5)],
      yRange: [num(yRange[0], -5), num(yRange[1], 5)],
      gridStep: num(p.gridStep ?? p.step, 1),
      points: arr(p.points),
      lines: arr(p.lines),
    };
  },
  render: renderCoordinatePlane,
};
