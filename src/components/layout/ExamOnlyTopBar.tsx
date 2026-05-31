'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, User, Settings, MapPin, FileUp, ListChecks, Building2, Users, FileSearch } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/** SUPER_ADMIN 관리 메뉴 링크 (사이드바 제거 후 유일한 진입점) */
const ADMIN_LINKS = [
  { href: '/exam-analysis', label: '기출분석', icon: FileSearch },
  { href: '/admin/schools', label: '학교 관리', icon: MapPin },
  { href: '/admin/exam-uploads', label: '기출 업로드', icon: FileUp },
  { href: '/admin/extract-queue', label: '추출 대기열', icon: ListChecks },
  { href: '/admin/tenants', label: '지점 관리', icon: Building2 },
  { href: '/admin/users', label: '사용자 관리', icon: Users },
];

/**
 * 기출분석 전용 앱 우측 상단 미니 바.
 * 사용자 이름 + 로그아웃. SUPER_ADMIN 에게는 관리 메뉴 드롭다운 노출.
 */
export function ExamOnlyTopBar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="fixed top-3 right-4 z-50 flex items-center gap-2 bg-white border border-slate-200 rounded-full shadow-sm px-3 py-1.5 print:hidden">
      {isSuperAdmin && (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-primary transition-colors"
            title="관리 메뉴"
          >
            <Settings className="w-3.5 h-3.5" />
            관리
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                {ADMIN_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    {label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <span className="flex items-center gap-2 border-l border-slate-200 pl-2">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-sm text-slate-700 font-medium">
          {user?.name ?? user?.username ?? '사용자'}
        </span>
      </span>
      <button
        onClick={() => logout?.()}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 border-l border-slate-200 pl-2 ml-1 transition-colors"
        title="로그아웃"
      >
        <LogOut className="w-3.5 h-3.5" />
        로그아웃
      </button>
    </div>
  );
}
