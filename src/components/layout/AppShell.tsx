import * as React from 'react';

export type AppShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  /** 사이드바 없이 single column 으로 렌더 */
  noSide?: boolean;
  /** 추가 클래스명 (예: 'admin' — slate 사이드바 테마) */
  className?: string;
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
 *
 *   {admin slate 테마}
 *   <AppShell className="admin" sidebar={<Sidebar groups={ADMIN_NAV} />}>...</AppShell>
 */
export function AppShell({ sidebar, children, noSide, className }: AppShellProps) {
  const cls = ['app', noSide ? 'no-side' : null, className].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {!noSide && sidebar}
      <div>{children}</div>
    </div>
  );
}
