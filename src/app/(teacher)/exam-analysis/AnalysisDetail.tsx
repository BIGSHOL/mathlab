'use client';

import { toExamSubjectKey } from '@/lib/exam-analysis/subject';
import { EnglishAnalysisDetail } from './english/AnalysisDetail';
import { MathAnalysisDetail } from './math/AnalysisDetail';
import type { ExamPaperData } from './types';

interface AnalysisDetailProps {
  detail: ExamPaperData;
  analyzing: boolean;
  onAnalyze: (id: string) => void;
  onRefresh: () => void;
  autoCommentary?: boolean;
  onToggleAutoCommentary?: (value: boolean) => void;
  gen?: { phase: 'metadata' | 'commentary' | 'englishStudy'; startMs: number; willChain: boolean } | null;
  onCommentaryGenChange?: (id: string, started: boolean) => void;
}

export function AnalysisDetail(props: AnalysisDetailProps) {
  return toExamSubjectKey(props.detail?.subject) === 'ENGLISH'
    ? <EnglishAnalysisDetail {...props} />
    : <MathAnalysisDetail {...props} />;
}
