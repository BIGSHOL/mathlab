'use client';

import { EnglishTypeRadarChart } from '../english/charts/TypeRadarChart';
import { MathTypeRadarChart } from '../math/charts/TypeRadarChart';
import type { TypeRadarChartProps } from '../shared/view-props';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';

export function TypeRadarChart({ subject, ...props }: TypeRadarChartProps) {
  return toExamSubjectKey(subject) === 'ENGLISH'
    ? <EnglishTypeRadarChart {...props} />
    : <MathTypeRadarChart {...props} />;
}
