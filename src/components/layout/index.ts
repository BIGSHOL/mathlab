/**
 * Layout 컴포넌트 barrel export.
 *
 * - v1 (Tailwind 기반): Sidebar, StudentSidebar, BottomNav, TeacherBottomNav,
 *   CommandPalette
 * - v2 (mathlab-v2.css 기반, design v0.4): AppShell, Topbar, SidebarV2,
 *   STUDENT_NAV / TEACHER_NAV / ADMIN_NAV
 */

// ───── v2 디자인 시스템 (data/refact2 design v0.4) ─────
export { AppShell } from './AppShell';
export type { AppShellProps } from './AppShell';

export { Topbar } from './Topbar';
export type { TopbarProps } from './Topbar';

export { SidebarV2 } from './SidebarV2';
export type {
  SidebarV2Props,
  SidebarV2NavGroup,
  SidebarV2NavItem,
  SidebarV2User,
} from './SidebarV2';

export { STUDENT_NAV, TEACHER_NAV, ADMIN_NAV } from './nav-items-v2';
