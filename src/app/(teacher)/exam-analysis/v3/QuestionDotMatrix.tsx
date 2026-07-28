/**
 * 문항 분포 — **도트 매트릭스** 표현.
 *
 * 문항 하나 = 점 하나. 난이도를 색으로, 배점을 크기로 인코딩한다.
 * 누적 막대(DifficultyStackedBar)가 "비율"을 보여준다면 이건 "개별 문항의 나열"을 보여준다 —
 * 시험지를 훑는 감각에 가깝다. 같은 데이터, 다른 정보 구조.
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { normDiff, V3_DIFF_LABELS, V3_DIFF_COLORS } from './helpers';

export function QuestionDotMatrix({ questions }: { questions: AnalyzedQuestion[] }) {
  if (!questions.length) return null;

  // 배점 → 점 크기 (최대 배점을 기준으로 3단계). 배점이 없으면 중간 크기.
  const maxPoints = Math.max(...questions.map((q) => Number(q.points) || 0), 0);
  const sizeOf = (p: unknown) => {
    const v = Number(p) || 0;
    if (!maxPoints || !v) return 'md';
    const ratio = v / maxPoints;
    return ratio >= 0.85 ? 'lg' : ratio >= 0.5 ? 'md' : 'sm';
  };

  const counts = [0, 0, 0, 0, 0];
  for (const q of questions) {
    const lv = Number(normDiff(String(q.difficulty)));
    if (lv >= 1 && lv <= 5) counts[lv - 1]++;
  }

  return (
    <div className="v3-dotmatrix">
      <div className="v3-dotmatrix-grid">
        {questions.map((q, i) => {
          const lv = Number(normDiff(String(q.difficulty)));
          const color = V3_DIFF_COLORS[Math.min(Math.max(lv, 1), 5) - 1];
          return (
            <span
              key={`${q.question_number ?? i}`}
              className={`v3-dot v3-dot-${sizeOf(q.points)}`}
              style={{ background: color }}
              title={`${q.question_number ?? i + 1}번 · ${V3_DIFF_LABELS[Math.min(Math.max(lv, 1), 5) - 1]} · ${q.points ?? '-'}점`}
            >
              <span className="v3-dot-num">{q.question_number ?? i + 1}</span>
            </span>
          );
        })}
      </div>
      <div className="v3-dotmatrix-legend">
        {V3_DIFF_LABELS.map((label, i) => (
          <span key={label}>
            <span className="v3-dot v3-dot-sm" style={{ background: V3_DIFF_COLORS[i] }} />
            {label} {counts[i]}
          </span>
        ))}
        <span className="v3-dotmatrix-note">점 크기 = 배점</span>
      </div>
    </div>
  );
}
