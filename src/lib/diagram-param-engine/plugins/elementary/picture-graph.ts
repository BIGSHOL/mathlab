import type { DiagramPlugin } from '../../types';
import type { PictureGraphParams } from '@/lib/utils/svg-diagrams/types';
import { renderPictureGraph } from '@/lib/utils/svg-diagrams/elementary/picture-graph';
import { arr, num } from '../../helpers';

export const pictureGraphPlugin: DiagramPlugin<PictureGraphParams> = {
  type: 'picture_graph',
  normalize(p) {
    return {
      categories: arr(p.categories ?? p.labels ?? p.items),
      values: arr<number>(p.values ?? p.data ?? p.counts).map(Number),
      symbol: (p.symbol ?? p.icon) as string,
      symbolValue: num(p.symbolValue ?? p.symbol_value ?? p.unit, 1),
      title: p.title as string,
      color: p.color as string,
    };
  },
  render: renderPictureGraph,
};
