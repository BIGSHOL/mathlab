/**
 * V3 출제 핵심 포인트 — 영역별 분석 (V4 v4_main_analysis 흡수)
 *
 * 출제된 주요 영역별 독립 단락. NYT 매거진 톤 — heading(명조) + body 단락.
 * 자체 <section> 렌더 (QASection 패턴). sectionNum prop으로 번호 표시.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface Props {
  items: NonNullable<CommentaryResult['v4_main_analysis']>;
  sectionNum: string;
}

export function V3MainAnalysis({ items, sectionNum }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="v3-section">
      <span className="v3-section-num">{sectionNum}</span>
      <div className="v3-section-sub">분석 · 출제 핵심 포인트</div>
      <h3>영역별로 본 출제 의도</h3>
      <div className="v3-analysis-list">
        {items.map((item, i) => (
          <div className="v3-analysis-item" key={`ma-${i}`}>
            <h4>{item.heading}</h4>
            <p>{markdownToHighlighted(item.body, `ma-${i}`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
