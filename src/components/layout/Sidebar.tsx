'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  { label: 'AI 문제 생성', href: '/questions/generate', icon: Sparkles, disabled: true },
  { label: '시험 관리', href: '/tests', icon: ClipboardCheck },
  { label: '학습 분석', href: '/analytics', icon: BarChart3 },
];

const systemItems = [
  { label: '설정', href: '/settings', icon: Settings },
  { label: '고객지원', href: '/support', icon: HelpCircle },
  { label: '목업 미리보기', href: '/mockups', icon: Eye },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const visibleMenuItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 flex-col bg-white/50 backdrop-blur-sm border-r border-slate-200/50 py-6 px-4 shrink-0 overflow-y-auto hidden md:flex">
      <div className="flex flex-col gap-1.5">
        {/* Admin badge */}
        {isAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-violet-50 border border-violet-200">
            <Shield className="w-4 h-4 text-violet-600" />
            <span className="text-xs font-bold text-violet-700">관리자 모드</span>
          </div>
        )}

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
          메인 메뉴
        </p>
        {visibleMenuItems.map((item) => {
          const isActive = item.adminOnly
            ? pathname === '/students' && typeof window !== 'undefined' && window.location.search.includes('tab=teachers')
            : pathname === item.href || (item.href !== '/overview' && !item.adminOnly && pathname.startsWith(item.href + '/'));

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="relative group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm text-slate-300 cursor-not-allowed"
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                <span className="absolute left-full ml-2 px-2.5 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  기능 추가 예정
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3 mt-8">
          시스템
        </p>
        {systemItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
