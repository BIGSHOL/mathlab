/**
 * V3 주요 문항 분석 — 킬러 문항 자세 해설 (V4 v4_key_questions 흡수)
 *
 * 변별 핵심 문항 3~5개 자세 해설. NYT 매거진 톤 — 좌측 빨강 라인 + 번호 강조.
 * 자체 <section> 렌더. sectionNum prop으로 번호 표시.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted, koDifficultyText } from './helpers';

interface Props {
  items: NonNullable<CommentaryResult['v4_key_questions']>;
  sectionNum: string;
}

export function V3KeyQuestions({ items, sectionNum }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="v3-section">
      <span className="v3-section-num">{sectionNum}</span>
      <div className="v3-section-sub">핵심 · 주요 문항 해설</div>
      <h3>점수를 가른 결정적 문항</h3>
      <div className="v3-keyq-list">
        {items.map((kq, i) => (
          <div className="v3-keyq-item" key={`kq-${i}`}>
            <div className="v3-keyq-title">{koDifficultyText(kq.title)}</div>
            <p>{markdownToHighlighted(kq.body, `kq-${i}`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
