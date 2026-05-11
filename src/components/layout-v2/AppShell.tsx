import * as React from 'react';

export type AppShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  /** 사이드바 없이 single column 으로 렌더 */
  noSide?: boolean;
};

/**
 * v2 디자인 시스템 앱 셸 (사이드바 + 본문 그리드).
 * mathlab-v2.css 의 .app .app.no-side 매핑.
 *
 * 사용 예:
 *   <AppShell sidebar={<StudentSidebar user={...} />}>
 *     <Topbar title="대시보드" />
 *     <div className="main">...</div>
 *   </AppShell>
 */
export function AppShell({ sidebar, children, noSide }: AppShellProps) {
  return (
    <div className={`app${noSide ? ' no-side' : ''}`}>
      {!noSide && sidebar}
      <div>{children}</div>
    </div>
  );
}
