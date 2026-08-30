/**
 * V3 인포그래픽 2: 문제 형식 분포 (객관식/단답형/서술형)
 *
 * 상단 stacked bar + 하단 3카드 (각 카드 상단에 색상 보더).
 *
 * 시안: scripts/generate-v3-preview-html.ts::renderFormatBreakdown 의 JSX 버전
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { sumPoints, formatPoints } from '@/lib/exam-analysis/points';
import { resolveQuestionFormat } from '@/lib/exam-analysis/shared/question-format';

const FORMATS = [
  { key: 'objective' as const, label: '객관식', color: 'var(--v3-ink)' },
  { key: 'short_answer' as const, label: '단답형', color: 'var(--v3-muted)' },
  { key: 'essay' as const, label: '서술형', color: 'var(--v3-accent)' },
];

export function FormatBreakdown({ questions }: { questions: AnalyzedQuestion[] }) {
  const stats = FORMATS.map((f) => {
    // 형식 정규화 경유 — 형식이 비었거나 변형 표기인 문항이 어느 카드에도 안 잡히던 문제.
    const fQ = questions.filter((q) => resolveQuestionFormat(q) === f.key);
    return { ...f, count: fQ.length, points: sumPoints(fQ.map((q) => q.points)) };
  });
  const totalPts = sumPoints(stats.map((x) => x.points));
  if (totalPts === 0) return null;

  return (
    <figure className="v3-info-fig">
      <figcaption className="v3-info-label">도표 · 문제 형식 분포</figcaption>
      <div className="v3-stacked-bar v3-stacked-bar-format" style={{ height: '26px', marginBottom: '14px' }}>
        {stats
          .filter((s) => s.points > 0)
          .map((s) => {
            const pct = (s.points / totalPts) * 100;
            const label = pct >= 12 ? `${Math.round(pct)}%` : '';
            return (
              <div key={s.key} style={{ background: s.color, width: `${pct}%`, height: '100%' }}>
                {label}
              </div>
            );
          })}
      </div>
      <div className="v3-format-grid">
        {stats.map((s) => (
          <div key={s.key} className="v3-format-card" style={{ borderTopColor: s.color }}>
            <p className="v3-format-label">{s.label}</p>
            <p className="v3-format-count" style={{ color: s.color }}>
              {s.count}
              <span className="v3-format-unit">문항</span>
            </p>
            <p className="v3-format-points">{formatPoints(s.points)}점</p>
          </div>
        ))}
      </div>
    </figure>
  );
}
