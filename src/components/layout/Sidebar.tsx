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
  BookOpen,
  Eye,
  ScanEye,
  ClipboardCheck,
  Shield,
  UserCog,
  Bell,
  LogOut,
  PanelLeftClose,
  Calculator,
  CalendarCheck,
  Newspaper,
  Activity,
  FileSpreadsheet,
  PenLine,
  FileText,
  ToggleRight,
  School,
  Search,
  GraduationCap,
  LifeBuoy,
  Sparkles,
} from 'lucide-react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { LogoIcon } from '@/components/ui/LogoIcon';

interface MenuItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
}

// 홈
const homeItems: MenuItem[] = [
  { label: '대시보드', href: '/overview', icon: LayoutDashboard },
];

// 학습 관리
const learningItems: MenuItem[] = [
  { label: '학생 관리', href: '/students', icon: Users },
  { label: '개념 조회', href: '/concepts', icon: BookOpen },
  { label: '문제 조회', href: '/questions', icon: Database },
  { label: '학습 과정', href: '/courses', icon: GraduationCap },
];

// 출제 · 평가
const assessmentItems: MenuItem[] = [
  { label: '연산 생성기', href: '/questions/arithmetic', icon: Calculator },
  { label: '학습지', href: '/worksheet/create', icon: FileSpreadsheet },
  { label: '숙제 관리', href: '/homework', icon: CalendarCheck },
  { label: '시험 관리', href: '/tests', icon: ClipboardCheck },
  { label: '수기 채점', href: '/manual-grading', icon: PenLine },
];

// 분석
const analysisItems: MenuItem[] = [
  { label: '학습 분석', href: '/analytics', icon: BarChart3 },
];

// 시스템 — 설정/지원
const systemItems: MenuItem[] = [
  { label: '업데이트 내역', href: '/updates', icon: Newspaper },
  { label: '도움말', href: '/help', icon: LifeBuoy },
  { label: '설정', href: '/settings', icon: Settings },
  { label: '고객지원', href: '/support', icon: HelpCircle },
];

// 이전 호환용 — 메인 아이템 전체
const mainItems: MenuItem[] = [...homeItems, ...learningItems, ...assessmentItems, ...analysisItems];

// 어드민 전용
const adminItems: MenuItem[] = [
  { label: '개념 관리', href: '/concepts', icon: BookOpen },
  { label: '문제 관리', href: '/questions', icon: Database },
  { label: '선생님 관리', href: '/students?tab=teachers', icon: UserCog },
  { label: '사용자 관리', href: '/admin/users', icon: Activity },
  { label: 'PDF 문제 추출', href: '/questions/pdf-import', icon: FileText },
  { label: 'AI 문제 생성', href: '/questions/generate', icon: Sparkles, disabled: true },
  { label: '학생 화면 보기', href: '/student-preview', icon: ScanEye },
  { label: '화면 미리보기', href: '/mockups', icon: Eye },
  { label: '기능 관리', href: '/admin/features', icon: ToggleRight },
  { label: '반 관리', href: '/admin/classrooms', icon: School },
];

// All items for active-route collision detection
const allItems = [...mainItems, ...systemItems, ...adminItems];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isOwner = user ? hasRoleClient(user.role, 'OWNER') : false;
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: MenuItem) => {
    if (item.href === '/students?tab=teachers') {
      return pathname === '/students' && typeof window !== 'undefined' && window.location.search.includes('tab=teachers');
    }
    return pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href + '/') && !allItems.some((other) => other !== item && other.href !== item.href && other.href.startsWith(item.href + '/') && pathname.startsWith(other.href)));
  };

  const renderItem = (item: MenuItem) => {
    const active = isActive(item);

    if (item.disabled) {
      return (
        <span
          key={item.href}
          className={`relative group flex items-center gap-2.5 px-2 py-2 rounded-sm font-medium text-xs text-slate-300 cursor-not-allowed ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          {!collapsed && item.label}
          <span className={`absolute ${collapsed ? 'left-full ml-1' : 'left-full ml-2'} px-2.5 py-1 rounded-sm bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50`}>
            {collapsed ? item.label + ' - ' : ''}준비 중
          </span>
        </span>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        className={`relative group flex items-center gap-2.5 px-2 py-2 rounded-sm transition-all font-medium text-xs ${collapsed ? 'justify-center' : ''} ${active
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
          }`}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {!collapsed && item.label}
        {collapsed && (
          <span className="absolute left-full ml-1 px-2.5 py-1 rounded-sm bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  const renderSectionLabel = (label: string) => {
    if (collapsed) return <div className="my-3 border-t border-slate-100" />;
    return (
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-2 mt-5">
        {label}
      </p>
    );
  };

  return (
    <aside className={`flex flex-col bg-white border-r border-slate-200 shrink-0 overflow-hidden transition-all duration-200 print:hidden ${collapsed ? 'w-14' : 'w-48'}`}>
      {/* Logo */}
      <div className={`shrink-0 border-b border-slate-100 flex items-center ${collapsed ? 'justify-center px-1 py-3' : 'justify-between px-3 py-3'}`}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded hover:bg-slate-100 transition-colors"
            title="사이드바 펼치기"
          >
            <LogoIcon className="w-5 h-5" />
          </button>
        ) : (
          <>
            <Link href="/overview" className="flex items-center gap-2 min-w-0">
              <LogoIcon className="w-5 h-5 shrink-0" />
              <h1 className="text-base font-bold tracking-tight text-text-primary">MathLab</h1>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              title="사이드바 접기"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Admin badge */}
      {isOwner && !collapsed && (
        <div className="mx-3 mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-violet-50 border border-violet-200">
          <Shield className="w-3.5 h-3.5 text-violet-600 shrink-0" />
          <span className="text-[11px] font-bold text-violet-700">관리자 모드</span>
        </div>
      )}
      {isOwner && collapsed && (
        <div className="mx-auto mt-3" title="관리자 모드">
          <Shield className="w-4 h-4 text-violet-600" />
        </div>
      )}

      {/* 검색 버튼 — Ctrl+K */}
      <div className="px-2 pt-3 shrink-0">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xs ${collapsed ? 'justify-center' : ''}`}
          title="검색 (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">검색...</span>
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-400">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 pt-3">
        {/* 홈 */}
        <div className="flex flex-col gap-0.5">
          {homeItems.map(renderItem)}
        </div>

        {/* 학습 관리 */}
        {renderSectionLabel('학습 관리')}
        <div className="flex flex-col gap-0.5">
          {learningItems.map(renderItem)}
        </div>

        {/* 출제 · 평가 */}
        {renderSectionLabel('출제 · 평가')}
        <div className="flex flex-col gap-0.5">
          {assessmentItems.map(renderItem)}
        </div>

        {/* 분석 */}
        {renderSectionLabel('분석')}
        <div className="flex flex-col gap-0.5">
          {analysisItems.map(renderItem)}
        </div>

        {/* 시스템 */}
        {renderSectionLabel('시스템')}
        <div className="flex flex-col gap-0.5">
          {systemItems.map(renderItem)}
        </div>

        {/* 어드민 전용 */}
        {isOwner && (
          <>
            {collapsed ? (
              <div className="my-3 border-t-2 border-violet-200" />
            ) : (
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1.5 px-2 mt-5 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                어드민
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {adminItems.map(renderItem)}
            </div>
          </>
        )}
      </div>

      {/* User section at bottom */}
      <div className="shrink-0 border-t border-slate-100 px-2 py-2.5">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-[11px] font-bold" title={user?.name ?? '사용자'}>
              {user?.name?.[0] ?? '?'}
            </div>
            <div className="flex items-center gap-0.5">
              <button className="p-1 rounded text-slate-300 cursor-not-allowed opacity-50" title="알림 — 준비 중">
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
              <p className="text-[10px] text-text-secondary truncate">{isOwner ? '관리자' : '선생님'}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button className="p-1 rounded text-slate-300 cursor-not-allowed opacity-50" title="알림 — 준비 중">
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
