'use client';

import { EnglishAnalysisResultView } from './english/AnalysisResultView';
import { MathAnalysisResultView } from './math/AnalysisResultView';
import type { AnalysisResultViewProps } from './shared/view-props';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';

export function AnalysisResultView({ subject, ...props }: AnalysisResultViewProps) {
  return toExamSubjectKey(subject) === 'ENGLISH'
    ? <EnglishAnalysisResultView {...props} />
    : <MathAnalysisResultView {...props} />;
}
