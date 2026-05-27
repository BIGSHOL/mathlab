/**
 * V4 문제 번호별 난이도 테이블
 *
 * AI 생성 v4_difficulty_rows 데이터를 행 색상 코딩으로 표시.
 * 갈수학학원 스타일 핵심 — 학부모가 "어떤 번호가 어떤 단원/난이도"인지 즉시 파악.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { V4_DIFF_ROW_COLORS, V3_DIFF_LABELS } from './helpers';

interface DifficultyByQuestionTableProps {
  rows: NonNullable<CommentaryResult['v4_difficulty_rows']>;
}

export function DifficultyByQuestionTable({ rows }: DifficultyByQuestionTableProps) {
  // 번호 순으로 정렬 (서술형은 뒤에)
  const sorted = [...rows].sort((a, b) => {
    const aIsEssay = String(a.question_number).startsWith('서술');
    const bIsEssay = String(b.question_number).startsWith('서술');
    if (aIsEssay && !bIsEssay) return 1;
    if (!aIsEssay && bIsEssay) return -1;
    const aNum = parseInt(String(a.question_number), 10) || 0;
    const bNum = parseInt(String(b.question_number), 10) || 0;
    return aNum - bNum;
  });

  return (
    <table className="v4-diff-table">
      <thead>
        <tr>
          <th style={{ width: '10%' }}>번호</th>
          <th style={{ width: '52%' }}>단원 · 핵심 개념</th>
          <th style={{ width: '20%' }}>난이도</th>
          <th style={{ width: '18%' }}>배점</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => {
          const lv = Number(row.difficulty);
          const validLv = lv >= 1 && lv <= 5 ? lv : 3;
          const rowBg = V4_DIFF_ROW_COLORS[validLv - 1];
          const diffLabel = V3_DIFF_LABELS[validLv - 1];

          return (
            <tr key={String(row.question_number)} style={{ backgroundColor: rowBg }}>
              <td className="v4-diff-num">
                <strong>{String(row.question_number)}</strong>
              </td>
              <td className="v4-diff-topic">
                {row.topic}
                {row.sub_topic && (
                  <div className="v4-meta-sub" style={{ marginTop: '2px' }}>
                    {row.sub_topic}
                  </div>
                )}
              </td>
              <td className="v4-diff-level">
                Lv {validLv} <span className="v4-meta-sub">{diffLabel}</span>
              </td>
              <td className="v4-diff-points">
                <strong>{row.points}</strong>
                <span className="v4-meta-sub"> 점</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
