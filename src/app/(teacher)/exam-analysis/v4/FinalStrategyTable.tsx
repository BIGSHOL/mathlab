/**
 * V4 이번 시험 단원별 피드백 테이블
 *
 * 이번 시험에 출제된 단원별 현재 상태 + 보완 학습 액션을 3열 테이블로 정리.
 * 학원 분석 보고서 스타일 — 실용적 학원 가이드.
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
          <th style={{ width: '43%' }}>실행 액션</th>
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
