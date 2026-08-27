'use client';

import { EnglishAnalysisCommentTab } from './english/AnalysisCommentTab';
import { MathAnalysisCommentTab } from './math/AnalysisCommentTab';
import type { AnalysisCommentTabProps } from './shared/view-props';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';

export function AnalysisCommentTab({ subject, ...props }: AnalysisCommentTabProps) {
  return toExamSubjectKey(subject) === 'ENGLISH'
    ? <EnglishAnalysisCommentTab {...props} />
    : <MathAnalysisCommentTab {...props} />;
}
