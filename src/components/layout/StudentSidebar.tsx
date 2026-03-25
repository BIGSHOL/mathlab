'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  BookOpen,
  Calculator,
  Trophy,
  ClipboardCheck,
  Newspaper,
  LifeBuoy,
  User,
  Bell,
  LogOut,
  PanelLeftClose,
  Zap,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLicenses } from '@/hooks/useLicenses';
import { useRepresentativeBadge } from '@/hooks/useRepresentativeBadge';
import { LogoIcon } from '@/components/ui/LogoIcon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useTenant } from '@/components/providers/TenantProvider';
import { useUpdateNotification } from '@/stores/update-notification';
import type { LicenseFeatureKey } from '@/lib/services/license';

interface MenuItem {
  label: string;
  href: string;
  icon: typeof Home;
  licenseFeature?: LicenseFeatureKey;
}

const mainItems: MenuItem[] = [
  { label: '대시보드', href: '/dashboard', icon: Home },
  { label: '단원 목록', href: '/subjects', icon: BookOpen, licenseFeature: 'concept' },
  { label: '연산 연습', href: '/practice/arithmetic', icon: Calculator, licenseFeature: 'arithmetic' },
  { label: '나의 시험', href: '/my-tests', icon: ClipboardCheck, licenseFeature: 'test' },
];

const activityItems: MenuItem[] = [
  { label: '랭킹', href: '/ranking', icon: Trophy },
  { label: '타임어택', href: '/practice/arithmetic/time-attack', icon: Zap, licenseFeature: 'time_attack' },
];

const systemItems: MenuItem[] = [
  { label: '업데이트', href: '/updates', icon: Newspaper },
  { label: '도움말', href: '/help-public', icon: LifeBuoy },
  { label: '프로필', href: '/profile', icon: User },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewAsId = searchParams.get('_as');
  const { user, logout } = useAuth();
  const tenant = useTenant();
  const { isLicensed } = useLicenses();
  const { badgeIcon } = useRepresentativeBadge();
  const [collapsed, setCollapsed] = useState(false);
  const displayName = tenant?.name || 'MathLab';

  const update = useUpdateNotification((s) => s.update);
  const dismissed = useUpdateNotification((s) => s.dismissed);
  const reopen = useUpdateNotification((s) => s.reopen);
  const hasHiddenNotif = update && update.totalNew > 0 && dismissed;
  const isRevengePage = pathname.startsWith('/practice/revenge');

  const withAs = (href: string) => (viewAsId ? `${href}?_as=${viewAsId}` : href);

  const allItems = [...mainItems, ...activityItems, ...systemItems];

  const isActive = (item: MenuItem) => {
    if (item.href === '/dashboard') return pathname === '/dashboard';
    return pathname === item.href || (pathname.startsWith(item.href + '/') && !allItems.some((other) => other !== item && other.href !== item.href && other.href.startsWith(item.href + '/') && pathname.startsWith(other.href)));
  };

  const renderItem = (item: MenuItem) => {
    const active = isActive(item);
    const locked = item.licenseFeature ? !isLicensed(item.licenseFeature) : false;

    // 잠긴 메뉴: 클릭 불가 + 회색 + 자물쇠
    if (locked) {
      return (
        <span
          key={item.label}
          className={`relative group flex items-center gap-2.5 px-2 py-2 rounded-sm text-xs cursor-not-allowed select-none ${collapsed ? 'justify-center' : ''} ${
            isRevengePage ? 'text-slate-600' : 'text-slate-300'
          }`}
          title={collapsed ? `${item.label} — 이용권 필요` : undefined}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              <Lock className="w-3 h-3 shrink-0" />
            </>
          )}
          {collapsed && (
            <span className="absolute left-full ml-1 px-2.5 py-1 rounded-sm bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {item.label} — 이용권 필요
            </span>
          )}
        </span>
      );
    }

    return (
      <Link
        key={item.label}
        href={withAs(item.href)}
        className={`relative group flex items-center gap-2.5 px-2 py-2 rounded-sm transition-all font-medium text-xs ${collapsed ? 'justify-center' : ''} ${
          active
            ? isRevengePage
              ? 'bg-red-500/20 text-red-400 font-semibold'
              : 'bg-primary/10 text-primary font-semibold'
            : isRevengePage
              ? 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
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
    if (collapsed) return <div key={label} className={`my-3 border-t ${isRevengePage ? 'border-slate-700' : 'border-slate-100'}`} />;
    return (
      <p key={label} className={`text-xs font-bold uppercase tracking-widest mb-1.5 px-2 mt-5 ${isRevengePage ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </p>
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 overflow-hidden transition-all duration-300 print:hidden ${
        collapsed ? 'w-14' : 'w-48'
      } ${isRevengePage ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-slate-200'}`}
    >
      {/* Logo */}
      <div className={`shrink-0 flex items-center ${collapsed ? 'justify-center px-1 py-3' : 'justify-between px-3 py-3'} ${isRevengePage ? 'border-b border-slate-700' : 'border-b border-slate-100'}`}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className={`p-1.5 rounded transition-colors ${isRevengePage ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            title="사이드바 펼치기"
          >
            <LogoIcon className="w-5 h-5" />
          </button>
        ) : (
          <>
            <Link href={withAs('/dashboard')} className="flex items-center gap-2 min-w-0">
              {tenant?.logo ? (
                <img src={tenant.logo} alt={displayName} className="w-5 h-5 shrink-0 object-contain" />
              ) : (
                <LogoIcon className="w-5 h-5 shrink-0" />
              )}
              <h1 className={`text-base font-bold tracking-tight truncate ${isRevengePage ? 'text-white' : 'text-text-primary'}`}>{displayName}</h1>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className={`p-1 rounded transition-colors shrink-0 ${isRevengePage ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              title="사이드바 접기"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 pt-3">
        <div className="flex flex-col gap-0.5">
          {mainItems.map(renderItem)}
        </div>

        {renderSectionLabel('활동')}
        <div className="flex flex-col gap-0.5">
          {activityItems.map(renderItem)}
        </div>

        {renderSectionLabel('기타')}
        <div className="flex flex-col gap-0.5">
          {systemItems.map(renderItem)}
        </div>
      </div>

      {/* User */}
      <div className={`shrink-0 px-2 py-2.5 ${isRevengePage ? 'border-t border-slate-700' : 'border-t border-slate-100'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <UserAvatar name={user?.name ?? '학생'} badgeIcon={badgeIcon} size="xs" />
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { if (hasHiddenNotif) reopen(); }}
                className={`relative p-1 rounded transition-colors ${hasHiddenNotif ? 'text-slate-600 hover:text-primary' : 'text-slate-300 cursor-default'}`}
                title={hasHiddenNotif ? '숨긴 알림 보기' : '알림 없음'}
              >
                <Bell className="w-3.5 h-3.5" />
                {hasHiddenNotif && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full" />}
              </button>
              <button onClick={() => logout?.()} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="로그아웃">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <UserAvatar name={user?.name ?? '학생'} badgeIcon={badgeIcon} size="xs" />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${isRevengePage ? 'text-white' : 'text-text-primary'}`}>{user?.name ?? '학생'}</p>
              <p className={`text-xs truncate ${isRevengePage ? 'text-slate-500' : 'text-text-secondary'}`}>학생</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => { if (hasHiddenNotif) reopen(); }}
                className={`relative p-1 rounded transition-colors ${hasHiddenNotif ? 'text-slate-600 hover:text-primary' : 'text-slate-300 cursor-default'}`}
                title={hasHiddenNotif ? '숨긴 알림 보기' : '알림 없음'}
              >
                <Bell className="w-3.5 h-3.5" />
                {hasHiddenNotif && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full" />}
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
