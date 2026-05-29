/**
 * V3 문항별 난이도·단원 표 (V4 v4_difficulty_rows 흡수 — NYT 매거진 톤)
 *
 * 인포그래픽(난이도 분포/문항 지도)을 보강하는 상세 표.
 * 번호 | 단원·핵심 개념 (+ 한 줄 해설) | Lv | 배점.
 * V4의 행 전체 색상 코딩 대신, Lv 배지만 색상 — NYT 미니멀 톤 유지.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { V3_DIFF_COLORS, V3_DIFF_LABELS } from './helpers';

interface Props {
  rows: NonNullable<CommentaryResult['v4_difficulty_rows']>;
}

export function V3DifficultyTable({ rows }: Props) {
  if (!rows || rows.length === 0) return null;

  // 번호 정렬 (서술형은 뒤로)
  const sorted = [...rows].sort((a, b) => {
    const aEssay = String(a.question_number).startsWith('서술');
    const bEssay = String(b.question_number).startsWith('서술');
    if (aEssay && !bEssay) return 1;
    if (!aEssay && bEssay) return -1;
    return (parseInt(String(a.question_number), 10) || 0) - (parseInt(String(b.question_number), 10) || 0);
  });

  return (
    <table className="v3-qtable">
      <thead>
        <tr>
          <th className="v3-qtable-num">번호</th>
          <th className="v3-qtable-topic">단원 · 핵심 개념</th>
          <th className="v3-qtable-lv">난이도</th>
          <th className="v3-qtable-pts">배점</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => {
          const lv = Number(row.difficulty);
          const validLv = lv >= 1 && lv <= 5 ? lv : 3;
          const color = V3_DIFF_COLORS[validLv - 1];
          const label = V3_DIFF_LABELS[validLv - 1];
          return (
            <tr key={`qt-${i}`}>
              <td className="v3-qtable-num">{String(row.question_number)}</td>
              <td className="v3-qtable-topic">
                <span className="v3-qtable-topic-main">{row.topic}</span>
                {row.analysis_short && (
                  <span className="v3-qtable-topic-sub">{row.analysis_short}</span>
                )}
              </td>
              <td className="v3-qtable-lv">
                <span className="v3-qtable-badge" style={{ background: color }}>
                  Lv{validLv}
                </span>
                <span className="v3-qtable-lvlabel">{label}</span>
              </td>
              <td className="v3-qtable-pts">{row.points}점</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
