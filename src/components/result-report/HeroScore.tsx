/**
 * Pattern B V1 — 점수 영웅 (Score Hero) 카드.
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1 `.hero-score`
 *
 * 인디고 그라데이션 + 골드 큰 숫자 + (옵션) A등급 뱃지 + 메타 (반 평균/전국/상위 %).
 */

export interface HeroScoreMeta {
  label: string;
  value: string;
}

export interface HeroScoreProps {
  /** 화면 상단 소제목 (예: "최종 점수"). default: "최종 점수" */
  kicker?: string;
  /** 큰 타이틀 (예: "잘했어요! 상위 12%") */
  title?: string;
  /** 점수 (정답 점수) */
  score: number;
  /** 만점 */
  total: number;
  /** 학점 뱃지 글자 (예: "A", "B+", "★"). 없으면 hide. */
  grade?: string;
  /** 우측 메타 항목들 (예: 반 평균/전국/상위 %). 비우면 hide. */
  meta?: HeroScoreMeta[];
}

export function HeroScore({
  kicker = '최종 점수',
  title,
  score,
  total,
  grade,
  meta,
}: HeroScoreProps) {
  return (
    <div className="rr-hero-score">
      <div className="kicker">{kicker}</div>
      {title && <div className="ttl">{title}</div>}
      <div className="row">
        {grade && <div className="rr-grade-badge">{grade}</div>}
        <div className="big">
          {score}
          <span className="of">/{total}</span>
        </div>
        {meta && meta.length > 0 && (
          <div className="meta">
            {meta.map((m, i) => (
              <div key={i} className="meta-item">
                <div className="l">{m.label}</div>
                <div className="v">{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
