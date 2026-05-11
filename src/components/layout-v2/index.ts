/**
 * v2 디자인 시스템 — 레이아웃 셸 (barrel export)
 *
 * 사용: import { AppShell, Sidebar, Topbar, STUDENT_NAV } from '@/components/layout-v2';
 */
export { AppShell } from './AppShell';
export type { AppShellProps } from './AppShell';

export { Topbar } from './Topbar';
export type { TopbarProps } from './Topbar';

export { Sidebar } from './Sidebar';
export type {
  SidebarProps,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarUser,
} from './Sidebar';

export { STUDENT_NAV, TEACHER_NAV, ADMIN_NAV } from './nav-items';
