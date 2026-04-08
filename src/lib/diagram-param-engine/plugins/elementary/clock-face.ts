import type { DiagramPlugin } from '../../types';
import type { ClockFaceParams } from '@/lib/utils/svg-diagrams/types';
import { renderClockFace } from '@/lib/utils/svg-diagrams/elementary/clock-face';
import { num } from '../../helpers';

export const clockFacePlugin: DiagramPlugin<ClockFaceParams> = {
  type: 'clock_face',
  normalize(p) {
    return {
      hour: num(p.hour ?? p.hours ?? p.h, 12),
      minute: num(p.minute ?? p.minutes ?? p.min ?? p.m, 0),
      showNumbers: p.showNumbers !== false,
      label: p.label as string,
    };
  },
  render: renderClockFace,
};
