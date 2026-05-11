import * as React from 'react';

export type TopbarProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** 우측 영역 — 버튼, 칩, 통화 표시 등 */
  right?: React.ReactNode;
};

/**
 * v2 디자인 시스템 Topbar.
 * mathlab-v2.css 의 .topbar h1 .sub .spacer 매핑.
 *
 * 사용 예:
 *   <Topbar
 *     title="학습 현황"
 *     subtitle="최근 4주 · 중3 1학기"
 *     right={<><Button>7일</Button><Button variant="primary">4주</Button></>}
 *   />
 */
export function Topbar({ title, subtitle, right }: TopbarProps) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      <div className="spacer" />
      {right && <div className="row" style={{ gap: 8 }}>{right}</div>}
    </div>
  );
}
