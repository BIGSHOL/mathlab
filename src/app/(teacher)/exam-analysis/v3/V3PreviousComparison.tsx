/**
 * V3 이전 시험 비교/대조 (V4 v4_previous_comparison 흡수)
 *
 * 작년/인근 대비 비교. NYT 매거진 톤 — 데이터 박스 콜아웃 (빨강 좌측 라인).
 * 섹션 번호 없이 본문 흐름에 삽입. 비교 데이터 없으면 부모가 렌더 안 함.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface Props {
  comparison: NonNullable<CommentaryResult['v4_previous_comparison']>;
}

export function V3PreviousComparison({ comparison }: Props) {
  if (!comparison || !comparison.headline) return null;

  return (
    <div className="v3-compare">
      <div className="v3-compare-lb">COMPARE · 이전 시험과의 비교</div>
      <div className="v3-compare-headline">{markdownToHighlighted(comparison.headline, 'pc-h')}</div>
      <p>{markdownToHighlighted(comparison.body, 'pc-b')}</p>
    </div>
  );
}
