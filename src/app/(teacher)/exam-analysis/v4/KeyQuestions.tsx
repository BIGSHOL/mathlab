/**
 * V4 주요 문항 분석 (킬러 문항)
 *
 * 갈수학학원 "▶ 주요 문항 분석" 패턴 — 특정 번호별 자세 해설 3~5개.
 * v4_main_analysis(영역별)와 다름. 학부모가 "이 번호가 왜 어려운지" 정확히 파악.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface KeyQuestionsProps {
  items: NonNullable<CommentaryResult['v4_key_questions']>;
}

export function KeyQuestions({ items }: KeyQuestionsProps) {
  if (items.length === 0) return null;

  return (
    <div className="v4-key-questions">
      {items.map((kq, i) => (
        <div key={i} className="v4-key-block">
          <h4 className="v4-key-title">{kq.title}</h4>
          <p className="v4-key-body">
            {markdownToHighlighted(kq.body, `v4-key-${i}`)}
          </p>
        </div>
      ))}
    </div>
  );
}
