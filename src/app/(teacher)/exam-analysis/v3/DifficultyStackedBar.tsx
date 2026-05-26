/**
 * V3 인포그래픽 1: 난이도별 배점 stacked bar (수평)
 *
 * 5단계 색상 그라데이션 (녹색→황색→빨강).
 * 막대 길이 = 각 난이도의 배점 비중.
 *
 * 시안: scripts/generate-v3-preview-html.ts::renderDifficultyStackedBar 의 JSX 버전
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { V3_DIFF_COLORS, V3_DIFF_LABELS, normDiff } from './helpers';

export function DifficultyStackedBar({ questions }: { questions: AnalyzedQuestion[] }) {
  const stats = [1, 2, 3, 4, 5].map((lv) => {
    const lvQ = questions.filter((q) => normDiff(String(q.difficulty)) === String(lv));
    return {
      level: lv,
      label: V3_DIFF_LABELS[lv - 1],
      count: lvQ.length,
      points: lvQ.reduce((s, q) => s + (q.points || 0), 0),
      color: V3_DIFF_COLORS[lv - 1],
    };
  });
  const totalPts = stats.reduce((s, x) => s + x.points, 0);
  if (totalPts === 0) return null;

  return (
    <figure className="v3-info-fig">
      <figcaption className="v3-info-label">FIGURE · 난이도별 배점 분포</figcaption>
      <div className="v3-stacked-bar">
        {stats
          .filter((s) => s.points > 0)
          .map((s) => {
            const pct = (s.points / totalPts) * 100;
            const label = pct >= 8 ? `${Math.round(pct)}%` : '';
            return (
              <div
                key={s.level}
                style={{ background: s.color, width: `${pct}%`, height: '100%' }}
                title={`${s.label} ${s.count}문항 ${s.points}점`}
              >
                {label}
              </div>
            );
          })}
      </div>
      <div className="v3-stacked-legend">
        {stats.map((s) => {
          const pct = totalPts > 0 ? Math.round((s.points / totalPts) * 100) : 0;
          return (
            <div key={s.level}>
              <span className="v3-legend-swatch" style={{ background: s.color }} />
              <span className="v3-legend-label">
                Lv {s.level} {s.label}
              </span>
              <span className="v3-legend-detail">
                {s.count}문항 · {s.points}점 · {pct}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="v3-info-caption">
        막대 길이는 각 난이도의 <b>배점 비중</b>. 총 {totalPts}점 · {questions.length}문항.
      </p>
    </figure>
  );
}
