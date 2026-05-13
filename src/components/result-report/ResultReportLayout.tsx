/**
 * Pattern B V1 — 결과 리포트 셸 (frame + topbar + 2-column).
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1
 *
 * 좌측: main (HeroScore + KpiGrid + UnitBars + WrongList)
 * 우측: side (AICommentary + RewardBox + NextActions)
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface ResultReportLayoutProps {
  /** 뒤로가기 href. 미지정 시 ← 표시 안 함. */
  backHref?: string;
  /** 시험명 등 제목 (좌측) */
  title: ReactNode;
  /** 응시 정보 메타 (예: "2026.05.10 응시 · 60분 소요") */
  meta?: ReactNode;
  /** 우측 액션 버튼 (PDF/오답노트 등) */
  topbarActions?: ReactNode;

  /** 좌측 메인 영역 — HeroScore, KpiGrid, 단원별, 오답 */
  main: ReactNode;
  /** 우측 사이드 영역 — AI 코멘트, 보상, 액션 */
  side?: ReactNode;
}

export function ResultReportLayout({
  backHref,
  title,
  meta,
  topbarActions,
  main,
  side,
}: ResultReportLayoutProps) {
  return (
    <div className="rr-frame">
      <div className="rr-topbar">
        {backHref && (
          <Link className="back" href={backHref} aria-label="뒤로">
            ←
          </Link>
        )}
        <span className="title">{title}</span>
        {meta && <span className="meta">{meta}</span>}
        <div className="sp" />
        {topbarActions}
      </div>
      <div className="rr-v1">
        <div className="rr-v1-main">{main}</div>
        {side && <aside className="rr-v1-side">{side}</aside>}
      </div>
    </div>
  );
}
