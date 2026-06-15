'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Settings, MapPin, FileUp, Building2, Users, FileSearch, CreditCard, Sparkles, Ticket, BarChart3, Inbox, UserPlus } from 'lucide-react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';

/** SUPER_ADMIN 관리 메뉴 링크 (사이드바 제거 후 유일한 진입점) */
const ADMIN_LINKS = [
  { href: '/exam-analysis', label: '기출분석', icon: FileSearch },
  { href: '/admin/inquiries', label: '도입 문의', icon: Inbox },
  { href: '/admin/evolution', label: '벤치마크', icon: Sparkles },
  { href: '/exam-analysis/admin/trends', label: '트렌드', icon: BarChart3 },
  { href: '/admin/schools', label: '학교 관리', icon: MapPin },
  { href: '/admin/exam-uploads', label: '기출 업로드', icon: FileUp },
  { href: '/admin/tenants', label: '지점 관리', icon: Building2 },
  { href: '/admin/users', label: '사용자 관리', icon: Users },
  { href: '/admin/demo', label: '데모 계정', icon: UserPlus },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: '슈퍼관리자',
  OWNER: '원장',
  MANAGER: '팀장',
  TEACHER: '선생님',
};

/**
 * 공유 프로필 메뉴 — 사용자 이름/역할 + (SUPER_ADMIN) 관리 메뉴 + 로그아웃.
 * - variant='inline'  : 사이드바 좌상단 임베드용 블록 (기출분석 페이지)
 * - variant='floating': 우측 상단 떠있는 미니바 (사이드바 없는 admin 페이지)
 */
export function ProfileMenu({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOwnerPlus = hasRoleClient(user?.role, 'OWNER');
  const name = user?.name ?? user?.username ?? '사용자';
  const roleLabel = ROLE_LABEL[user?.role ?? ''] ?? '';

  // ── 사이드바 좌상단 인라인 프로필 ──
  if (variant === 'inline') {
    return (
      <div className="px-3 py-2.5 border-b border-slate-200 bg-brand-cream-2/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-800 truncate leading-tight">{name}</div>
            {roleLabel && <div className="text-[11px] text-slate-400 leading-tight">{roleLabel}</div>}
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setOpen((v) => !v)}
              title="관리 메뉴"
              className={`p-1.5 rounded-sm shrink-0 transition-colors ${open ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-primary hover:bg-slate-100'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          {isOwnerPlus && (
            <Link
              href="/entitlements"
              title="이용권 배정"
              className="p-1.5 rounded-sm text-slate-400 hover:text-primary hover:bg-slate-100 shrink-0 transition-colors"
            >
              <Ticket className="w-4 h-4" />
            </Link>
          )}
          {isOwnerPlus && (
            <Link
              href="/billing"
              title="구독/결제"
              className="p-1.5 rounded-sm text-slate-400 hover:text-primary hover:bg-slate-100 shrink-0 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
            </Link>
          )}
          <button
            onClick={() => logout?.()}
            title="로그아웃"
            className="p-1.5 rounded-sm text-slate-400 hover:text-red-600 hover:bg-slate-100 shrink-0 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        {isSuperAdmin && open && (
          <div className="mt-2 space-y-0.5">
            {ADMIN_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-white rounded-sm transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── 우측 상단 떠있는 미니바 (admin 등 사이드바 없는 페이지) ──
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
              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-sm shadow-lg py-1 z-50">
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
      {isOwnerPlus && (
        <Link
          href="/entitlements"
          title="이용권 배정"
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-primary border-l border-slate-200 pl-2 transition-colors"
        >
          <Ticket className="w-3.5 h-3.5" />
          이용권
        </Link>
      )}
      {isOwnerPlus && (
        <Link
          href="/billing"
          title="구독/결제"
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-primary border-l border-slate-200 pl-2 transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5" />
          구독
        </Link>
      )}
      <span className="flex items-center gap-2 border-l border-slate-200 pl-2">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-sm text-slate-700 font-medium">{name}</span>
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

/**
 * 레이아웃에 배치되는 floating 미니바.
 * 기출분석 페이지(/exam-analysis)에선 사이드바 좌상단 ProfileMenu(inline)가 프로필을 담당하므로 숨긴다
 * (우상단 토스트와 겹침 방지 — 사용자 요청 2026-06-01).
 */
export function ExamOnlyTopBar() {
  const pathname = usePathname();
  if (pathname?.startsWith('/exam-analysis')) return null;
  return <ProfileMenu variant="floating" />;
}
