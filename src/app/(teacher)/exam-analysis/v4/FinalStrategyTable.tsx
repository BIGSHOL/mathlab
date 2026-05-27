/**
 * V4 기말 대비 전략 테이블
 *
 * 영역별 현재 상태 + 권장 학습 액션을 3열 테이블로 정리.
 * 갈수학학원 스타일 — 실용적 학원 가이드.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { markdownToHighlighted } from './helpers';

interface FinalStrategyTableProps {
  rows: NonNullable<CommentaryResult['v4_final_strategy']>;
}

export function FinalStrategyTable({ rows }: FinalStrategyTableProps) {
  if (rows.length === 0) return null;

  return (
    <table className="v4-strategy-table">
      <thead>
        <tr>
          <th style={{ width: '25%' }}>출제 영역</th>
          <th style={{ width: '32%' }}>현재 상태</th>
          <th style={{ width: '43%' }}>다음 시험 대비 액션</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td className="v4-strategy-area">
              <strong>{row.area}</strong>
            </td>
            <td className="v4-strategy-status">
              {markdownToHighlighted(row.current_status, `v4-strat-s-${i}`)}
            </td>
            <td className="v4-strategy-action">
              {markdownToHighlighted(row.action, `v4-strat-a-${i}`)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
