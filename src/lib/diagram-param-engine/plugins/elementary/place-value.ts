import type { DiagramPlugin } from '../../types';
import type { PlaceValueParams } from '@/lib/utils/svg-diagrams/types';
import { renderPlaceValue } from '@/lib/utils/svg-diagrams/elementary/place-value';
import { num } from '../../helpers';

export const placeValuePlugin: DiagramPlugin<PlaceValueParams> = {
  type: 'place_value',
  normalize(p) {
    return {
      hundreds: num(p.hundreds ?? p.hundred ?? p.h, 0),
      tens: num(p.tens ?? p.ten ?? p.t, 0),
      ones: num(p.ones ?? p.one ?? p.o, 0),
    };
  },
  render: renderPlaceValue,
};
