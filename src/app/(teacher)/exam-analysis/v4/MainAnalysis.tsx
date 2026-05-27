/**
 * V4 주요 공정 분석 — 출제 영역별 단락 배열
 *
 * 각 영역(영역명 + 분석 body)을 블록 형태로 표시.
 * 갈수학학원 스타일 — 영역별로 독립 단락.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface MainAnalysisProps {
  items: NonNullable<CommentaryResult['v4_main_analysis']>;
}

export function MainAnalysis({ items }: MainAnalysisProps) {
  if (items.length === 0) return null;

  return (
    <div className="v4-main-analysis">
      {items.map((item, i) => (
        <div key={i} className="v4-analysis-block">
          <h4 className="v4-analysis-heading">{item.heading}</h4>
          <p className="v4-analysis-body">
            {markdownToHighlighted(item.body, `v4-main-${i}`)}
          </p>
        </div>
      ))}
    </div>
  );
}
