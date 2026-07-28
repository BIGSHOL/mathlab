/**
 * 난이도 분포 — **순수 숫자표** 표현.
 *
 * DifficultyStackedBar(막대 그래프)와 같은 데이터를 **완전히 다른 구조**로 보여준다.
 * 막대·색 블록 없이 정렬된 수치만 제시 → 리포트/보고서 골격에서 "문서" 느낌을 낸다.
 * (레이아웃은 활자·여백만 바꾸므로, 이렇게 컴포넌트 자체가 갈라져야 내부 디자인이 실제로 달라진다.)
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { sumPoints, formatPoints } from '@/lib/exam-analysis/points';
import { normDiff, V3_DIFF_LABELS, V3_DIFF_COLORS } from './helpers';

export function DifficultyNumericTable({ questions }: { questions: AnalyzedQuestion[] }) {
  const rows = [0, 1, 2, 3, 4].map((i) => {
    const qs = questions.filter((q) => Number(normDiff(String(q.difficulty))) === i + 1);
    return {
      level: i + 1,
      label: V3_DIFF_LABELS[i],
      color: V3_DIFF_COLORS[i],
      count: qs.length,
      points: sumPoints(qs.map((q) => q.points)),
    };
  });
  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  const totalPoints = rows.reduce((s, r) => s + r.points, 0);
  const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <table className="v3-numtable">
      <thead>
        <tr>
          <th className="v3-numtable-lv">난이도</th>
          <th className="v3-numtable-n">문항 수</th>
          <th className="v3-numtable-n">배점</th>
          <th className="v3-numtable-n">배점 비율</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.level} className={r.count === 0 ? 'v3-numtable-empty' : undefined}>
            <td className="v3-numtable-lv">
              <span className="v3-numtable-dot" style={{ background: r.color }} />
              {r.level}단계 · {r.label}
            </td>
            <td className="v3-numtable-n">{r.count}</td>
            <td className="v3-numtable-n">{formatPoints(r.points)}</td>
            <td className="v3-numtable-n">{pct(r.points, totalPoints)}%</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="v3-numtable-lv">합계</td>
          <td className="v3-numtable-n">{totalCount}</td>
          <td className="v3-numtable-n">{formatPoints(totalPoints)}</td>
          <td className="v3-numtable-n">100%</td>
        </tr>
      </tfoot>
    </table>
  );
}
