'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Database,
  BarChart3,
  Settings,
  HelpCircle,
  Sparkles,
  BookOpen,
  Eye,
  ClipboardCheck,
  Shield,
  UserCog,
  Bell,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Calculator,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MenuItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { label: '대시보드', href: '/overview', icon: LayoutDashboard },
  { label: '선생님 관리', href: '/students?tab=teachers', icon: UserCog, adminOnly: true },
  { label: '학생 관리', href: '/students', icon: Users },
  { label: '개념 관리', href: '/concepts', icon: BookOpen },
  { label: '문제 은행', href: '/questions', icon: Database },
  { label: '연산 생성기', href: '/questions/arithmetic', icon: Calculator },
  { label: 'AI 문제 생성', href: '/questions/generate', icon: Sparkles, disabled: true },
  { label: '시험 관리', href: '/tests', icon: ClipboardCheck },
  { label: '레벨테스트', href: '/level-test', icon: GraduationCap },
  { label: '학습 분석', href: '/analytics', icon: BarChart3 },
];

const systemItems = [
  { label: '설정', href: '/settings', icon: Settings },
  { label: '고객지원', href: '/support', icon: HelpCircle },
  { label: '목업 미리보기', href: '/mockups', icon: Eye },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [collapsed, setCollapsed] = useState(false);

  const visibleMenuItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className={`flex flex-col bg-white border-r border-slate-200 shrink-0 overflow-hidden transition-all duration-200 print:hidden ${collapsed ? 'w-14' : 'w-48'}`}>
      {/* Logo */}
      <div className="shrink-0 px-3 py-3 border-b border-slate-100 flex items-center justify-between">
        <Link href="/overview" className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          {!collapsed && <h1 className="text-base font-bold tracking-tight text-text-primary">MathLab</h1>}
        </Link>
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Admin badge */}
      {isAdmin && !collapsed && (
        <div className="mx-3 mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-200">
          <Shield className="w-3.5 h-3.5 text-violet-600 shrink-0" />
          <span className="text-[11px] font-bold text-violet-700">관리자 모드</span>
        </div>
      )}
      {isAdmin && collapsed && (
        <div className="mx-auto mt-3" title="관리자 모드">
          <Shield className="w-4 h-4 text-violet-600" />
        </div>
      )}

      {/* Menu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 pt-3">
        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-2">
            메인 메뉴
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          {visibleMenuItems.map((item) => {
            const isActive = item.adminOnly
              ? pathname === '/students' && typeof window !== 'undefined' && window.location.search.includes('tab=teachers')
              : pathname === item.href || (item.href !== '/overview' && !item.adminOnly && pathname.startsWith(item.href + '/') && !visibleMenuItems.some((other) => other !== item && other.href !== item.href && other.href.startsWith(item.href + '/') && pathname.startsWith(other.href)));

            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className={`relative group flex items-center gap-2.5 px-2 py-2 rounded-lg font-medium text-xs text-slate-300 cursor-not-allowed ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && item.label}
                  <span className={`absolute ${collapsed ? 'left-full ml-1' : 'left-full ml-2'} px-2.5 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50`}>
                    {collapsed ? item.label + ' - ' : ''}기능 추가 예정
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all font-medium text-xs ${collapsed ? 'justify-center' : ''} ${isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && item.label}
                {collapsed && (
                  <span className="absolute left-full ml-1 px-2.5 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-2 mt-5">
            시스템
          </p>
        )}
        {collapsed && <div className="my-3 border-t border-slate-100" />}
        <div className="flex flex-col gap-0.5">
          {systemItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all font-medium text-xs ${collapsed ? 'justify-center' : ''} ${isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && item.label}
                {collapsed && (
                  <span className="absolute left-full ml-1 px-2.5 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* User section at bottom */}
      <div className="shrink-0 border-t border-slate-100 px-2 py-2.5">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-[11px] font-bold" title={user?.name ?? '사용자'}>
              {user?.name?.[0] ?? '?'}
            </div>
            <div className="flex items-center gap-0.5">
              <button className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="알림">
                <Bell className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => logout?.()} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="로그아웃">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-[11px] font-bold shrink-0">
              {user?.name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{user?.name ?? '사용자'}</p>
              <p className="text-[10px] text-text-secondary truncate">{isAdmin ? '관리자' : '선생님'}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="알림">
                <Bell className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => logout?.()} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="로그아웃">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
