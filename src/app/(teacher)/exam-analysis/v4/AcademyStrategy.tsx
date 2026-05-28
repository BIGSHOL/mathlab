/**
 * V4 학원 차별화 전략 섹션
 *
 * 갈수학학원 "1등급을 위한 학원의 N가지 전략" 패턴 — 학원 마케팅 포인트.
 * 5개 행 카드 형태 (번호 prefix + title + body).
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface AcademyStrategyProps {
  items: NonNullable<CommentaryResult['v4_academy_strategy']>;
}

export function AcademyStrategy({ items }: AcademyStrategyProps) {
  if (items.length === 0) return null;

  return (
    <div className="v4-academy-strategy">
      {items.map((item, i) => (
        <div key={i} className="v4-strategy-row">
          <div className="v4-strategy-num">{i + 1}</div>
          <div className="v4-strategy-content">
            <h4 className="v4-strategy-title">{item.title}</h4>
            <p className="v4-strategy-body">
              {markdownToHighlighted(item.body, `v4-strategy-${i}`)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
