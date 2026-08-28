/**
 * 문항 분포 — **도트 매트릭스** 표현.
 *
 * 문항 하나 = 점 하나. 난이도를 색으로, 배점을 크기로 인코딩한다.
 * 누적 막대(DifficultyStackedBar)가 "비율"을 보여준다면 이건 "개별 문항의 나열"을 보여준다 —
 * 시험지를 훑는 감각에 가깝다. 같은 데이터, 다른 정보 구조.
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { V3_DIFF_LABELS, V3_DIFF_COLORS } from './helpers';
import { questionLevel, countByLevel } from '@/lib/exam-analysis/shared/difficulty';
import { formatPoints } from '@/lib/exam-analysis/shared/points';

/** 난이도 판독 실패 표시 — 전 테마 공통 중립 토큰(신규 CSS 토큰 없이) */
const UNKNOWN_FILL = 'var(--v3-line)';
const UNKNOWN_LABEL = '미판독';

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

  const { counts, unknown: unknownCount } = countByLevel(questions);

  return (
    <div className="v3-dotmatrix">
      <div className="v3-dotmatrix-grid">
        {questions.map((q, i) => {
          // 판독 실패는 5단계 램프에 억지로 밀어 넣지 않는다 — 예전엔 NaN 이 색 배열을 벗어나
          // **투명한 점 + 툴팁 'undefined'** 가 됐다. 중립색 + '미판독' 으로 사실대로 표시한다.
          const lv = questionLevel(q.difficulty);
          const color = lv ? V3_DIFF_COLORS[lv - 1] : UNKNOWN_FILL;
          const label = lv ? V3_DIFF_LABELS[lv - 1] : UNKNOWN_LABEL;
          return (
            <span
              key={`${q.question_number ?? i}`}
              className={`v3-dot v3-dot-${sizeOf(q.points)}`}
              style={{ background: color }}
              title={`${q.question_number ?? i + 1}번 · ${label} · ${formatPoints(q.points) || '-'}점`}
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
        {unknownCount > 0 && (
          <span>
            <span className="v3-dot v3-dot-sm" style={{ background: UNKNOWN_FILL }} />
            {UNKNOWN_LABEL} {unknownCount}
          </span>
        )}
        <span className="v3-dotmatrix-note">점 크기 = 배점</span>
      </div>
    </div>
  );
}
