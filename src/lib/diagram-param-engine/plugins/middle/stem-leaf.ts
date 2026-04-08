import type { DiagramPlugin } from '../../types';
import type { StemLeafParams } from '@/lib/utils/svg-diagrams/types';
import { renderStemLeaf } from '@/lib/utils/svg-diagrams/middle/stem-leaf';
import { arr, num, type P } from '../../helpers';

export const stemLeafPlugin: DiagramPlugin<StemLeafParams> = {
  type: 'stem_leaf',
  normalize(p) {
    return {
      stems: arr<P>(p.stems ?? p.data).map(s => ({
        stem: num(s.stem, 0),
        leaves: arr<number>(s.leaves ?? s.leaf).map(Number).filter(n => !isNaN(n)),
      })),
      title: p.title as string,
      stemLabel: (p.stemLabel ?? p.stem_label) as string,
      leafLabel: (p.leafLabel ?? p.leaf_label) as string,
    };
  },
  render: renderStemLeaf,
};
