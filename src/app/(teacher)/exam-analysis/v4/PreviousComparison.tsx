/**
 * V4 이전 시험 비교/대조 섹션
 *
 * 갈수학학원 "▶ 이전 시험과의 비교/대조" 패턴.
 * 작년 동일 시험 또는 학년 표준 진도 기반 비교 분석.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface PreviousComparisonProps {
  comparison: NonNullable<CommentaryResult['v4_previous_comparison']>;
}

export function PreviousComparison({ comparison }: PreviousComparisonProps) {
  return (
    <div className="v4-previous-box">
      <div className="v4-previous-headline">
        {markdownToHighlighted(comparison.headline, 'v4-prev-h')}
      </div>
      <p className="v4-previous-body">
        {markdownToHighlighted(comparison.body, 'v4-prev-b')}
      </p>
    </div>
  );
}
