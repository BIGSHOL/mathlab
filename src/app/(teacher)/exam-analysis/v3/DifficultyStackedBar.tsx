/**
 * V3 인포그래픽 1: 난이도별 배점 분포
 *
 * 사용자 피드백 반영:
 * - 상단: stacked bar (실제 % 비율, 정수 width)
 * - 각 난이도마다 2행: 문항수 grid (max 문항수 칸) + 배점 막대 (max 배점 기준)
 * - 색상은 난이도별 V3_DIFF_COLORS (녹·옅녹·회·황·빨)
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { sumPoints, formatPoints } from '@/lib/exam-analysis/points';
import { V3_DIFF_COLORS, V3_DIFF_LABELS, normDiff } from './helpers';

export function DifficultyStackedBar({ questions }: { questions: AnalyzedQuestion[] }) {
  const stats = [1, 2, 3, 4, 5].map((lv) => {
    const lvQ = questions.filter((q) => normDiff(String(q.difficulty)) === String(lv));
    return {
      level: lv,
      label: V3_DIFF_LABELS[lv - 1],
      count: lvQ.length,
      points: sumPoints(lvQ.map((q) => q.points)),
      color: V3_DIFF_COLORS[lv - 1],
    };
  });
  const totalPts = sumPoints(stats.map((x) => x.points));
  if (totalPts === 0) return null;

  // 상단 stacked bar — 정수 % + 합 100 보정 (네이버 width 동기화)
  const segments = stats.filter((s) => s.points > 0).map((s) => ({
    pct: Math.round((s.points / totalPts) * 100),
    color: s.color,
    label: s.label,
  }));
  const sumInt = segments.reduce((s, x) => s + x.pct, 0);
  if (sumInt !== 100 && segments.length > 0) {
    segments[0].pct += 100 - sumInt;
  }

  const maxCount = Math.max(...stats.map((s) => s.count), 1);
  const maxPoints = Math.max(...stats.map((s) => s.points), 1);

  return (
    <figure className="v3-info-fig">
      <figcaption className="v3-info-label">FIGURE · 난이도별 배점 분포</figcaption>
      <div className="v3-diff-stacked">
        {segments.map((s, i) => (
          <div
            key={i}
            style={{ background: s.color, width: `${s.pct}%`, height: '100%' }}
            title={`${s.label} ${s.pct}%`}
          >
            {s.pct >= 8 ? `${s.pct}%` : ''}
          </div>
        ))}
      </div>
      <p className="v3-info-caption" style={{ marginTop: '10px', marginBottom: '14px' }}>
        각 난이도: <b>상단 grid = 문항수</b> (최대 {maxCount}칸) · <b>하단 막대 = 배점</b> (최대 {maxPoints}점)
      </p>
      {stats.map((s) => {
        const ptsPct = Math.round((s.points / maxPoints) * 100);
        return (
          <div key={s.level} className="v3-diff-level-block">
            <div className="v3-diff-level-header">
              <span className="v3-diff-swatch" style={{ background: s.color }} />
              <span className="v3-diff-label">Lv {s.level} · {s.label}</span>
              <span className="v3-diff-detail">{s.count}문항 · {formatPoints(s.points)}점</span>
            </div>
            <div
              className="v3-diff-count-grid"
              style={{ gridTemplateColumns: `repeat(${maxCount}, 1fr)` }}
            >
              {Array.from({ length: maxCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="v3-diff-count-cell"
                  style={{ background: idx < s.count ? s.color : '#DDD' }}
                />
              ))}
            </div>
            <div className="v3-diff-pts-track">
              <div
                className="v3-diff-pts-fill"
                style={{ width: `${ptsPct}%`, background: s.color }}
              />
            </div>
          </div>
        );
      })}
      <p className="v3-info-caption">
        상단 stacked bar = 배점 비중. 총 {formatPoints(totalPts)}점 · {questions.length}문항.
      </p>
    </figure>
  );
}
