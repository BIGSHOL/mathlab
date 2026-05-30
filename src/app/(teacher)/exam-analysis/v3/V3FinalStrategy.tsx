/**
 * V3 이번 시험 단원별 피드백 (V4 v4_final_strategy 흡수)
 *
 * 이번 시험에 출제된 단원별 현재 상태 + 실행 액션. NYT 매거진 톤.
 * 자체 <section> 렌더. sectionNum prop으로 번호 표시.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface Props {
  rows: NonNullable<CommentaryResult['v4_final_strategy']>;
  sectionNum: string;
}

export function V3FinalStrategy({ rows, sectionNum }: Props) {
  if (!rows || rows.length === 0) return null;

  return (
    <section className="v3-section">
      <span className="v3-section-num">{sectionNum}</span>
      <div className="v3-section-sub">피드백 · 단원별 학습 방향</div>
      <h3>이번 시험 단원별 피드백</h3>
      <div className="v3-strategy-list">
        {rows.map((row, i) => (
          <div className="v3-strategy-item" key={`fs-${i}`}>
            <div className="v3-strategy-area">{row.area}</div>
            <div className="v3-strategy-line">
              <span className="v3-strategy-tag v3-strategy-tag-now">현재 상태</span>
              <span className="v3-strategy-text">{markdownToHighlighted(row.current_status, `fs-s-${i}`)}</span>
            </div>
            <div className="v3-strategy-line">
              <span className="v3-strategy-tag v3-strategy-tag-act">실행 액션</span>
              <span className="v3-strategy-text">{markdownToHighlighted(row.action, `fs-a-${i}`)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
