/**
 * 난이도 분포 — **순수 숫자표** 표현.
 *
 * DifficultyStackedBar(막대 그래프)와 같은 데이터를 **완전히 다른 구조**로 보여준다.
 * 막대·색 블록 없이 정렬된 수치만 제시 → 리포트/보고서 골격에서 "문서" 느낌을 낸다.
 * (레이아웃은 활자·여백만 바꾸므로, 이렇게 컴포넌트 자체가 갈라져야 내부 디자인이 실제로 달라진다.)
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { sumPoints, formatPoints, integerPercents } from '@/lib/exam-analysis/points';
import { questionLevel } from '@/lib/exam-analysis/shared/difficulty';
import { V3_DIFF_LABELS, V3_DIFF_COLORS } from './helpers';

export function DifficultyNumericTable({ questions }: { questions: AnalyzedQuestion[] }) {
  const levelRows = [0, 1, 2, 3, 4].map((i) => {
    const qs = questions.filter((q) => questionLevel(q.difficulty) === i + 1);
    return {
      key: String(i + 1),
      label: `${i + 1}단계 · ${V3_DIFF_LABELS[i]}`,
      color: V3_DIFF_COLORS[i] as string,
      count: qs.length,
      points: sumPoints(qs.map((q) => q.points)),
    };
  });
  // 난이도를 못 읽은 문항을 조용히 빼면 합계 행이 전체 문항 수와 어긋나는데 화면엔 그 사실이 안 보인다.
  // 있을 때만 행을 하나 더 세워 사실대로 드러낸다.
  const unknownQs = questions.filter((q) => questionLevel(q.difficulty) === null);
  const rows = unknownQs.length
    ? [
        ...levelRows,
        {
          key: 'unknown',
          label: '미판독',
          color: 'var(--v3-line)',
          count: unknownQs.length,
          points: sumPoints(unknownQs.map((q) => q.points)),
        },
      ]
    : levelRows;

  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  const totalPoints = sumPoints(rows.map((r) => r.points));
  // 각 행을 따로 반올림하면 열의 합이 99/101 이 되는데, 합계 행에 100% 를 박아 두면 어긋난 게 보인다.
  // 표시값끼리 정합하도록 합 100 보정된 정수 퍼센트를 쓴다.
  const pcts = integerPercents(rows.map((r) => r.points));
  const totalPct = pcts.reduce((s, v) => s + v, 0);

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
        {rows.map((r, i) => (
          <tr key={r.key} className={r.count === 0 ? 'v3-numtable-empty' : undefined}>
            <td className="v3-numtable-lv">
              <span className="v3-numtable-dot" style={{ background: r.color }} />
              {r.label}
            </td>
            <td className="v3-numtable-n">{r.count}</td>
            <td className="v3-numtable-n">{formatPoints(r.points)}</td>
            <td className="v3-numtable-n">{pcts[i]}%</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="v3-numtable-lv">합계</td>
          <td className="v3-numtable-n">{totalCount}</td>
          <td className="v3-numtable-n">{formatPoints(totalPoints)}</td>
          <td className="v3-numtable-n">{totalPct}%</td>
        </tr>
      </tfoot>
    </table>
  );
}
