/**
 * V4 출제 특징 요약 — 회색 박스 안 자연 단락
 *
 * AI 생성 v4_exam_features 사용 — headline + body 단락.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface ExamFeaturesProps {
  features: NonNullable<CommentaryResult['v4_exam_features']>;
}

export function ExamFeatures({ features }: ExamFeaturesProps) {
  return (
    <div className="v4-features-box">
      <div className="v4-features-headline">
        {markdownToHighlighted(features.headline, 'v4-feat-h')}
      </div>
      <p className="v4-features-body">
        {markdownToHighlighted(features.body, 'v4-feat-b')}
      </p>
    </div>
  );
}
