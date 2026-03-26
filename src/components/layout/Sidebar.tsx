'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Shield,
  Bell,
  LogOut,
  PanelLeftClose,
  Search,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { LogoIcon } from '@/components/ui/LogoIcon';
import { useTenant } from '@/components/providers/TenantProvider';
import { getNavForRole, getAllNavItems, hasMinRole, type NavItem } from '@/lib/constants/navigation';
import { useViewingTenantStore } from '@/stores/viewingTenantStore';
import type { UserRole } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '슈퍼관리자',
  OWNER: '원장',
  MANAGER: '팀장',
  TEACHER: '선생님',
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const tenant = useTenant();
  const { tenantId: viewingTenantId, tenantName: viewingTenantName, exitTenantView } = useViewingTenantStore();

  // SA가 지점장 뷰 중이면 OWNER 네비로 전환
  const isViewingAsTenant = user?.role === 'SUPER_ADMIN' && !!viewingTenantId;
  const effectiveRole = isViewingAsTenant ? 'OWNER' : (user?.role ?? 'TEACHER');
  const role = effectiveRole as UserRole;
  const navGroups = getNavForRole(role);
  const allItems = getAllNavItems();
  const [collapsed, setCollapsed] = useState(false);
  const displayName = isViewingAsTenant ? (viewingTenantName ?? 'MathLAB') : (tenant?.name || 'MathLAB');

  const isActive = (item: NavItem) => {
    return pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href + '/') && !allItems.some((other) => other !== item && other.href !== item.href && other.href.startsWith(item.href + '/') && pathname.startsWith(other.href)));
  };

  const renderItem = (item: NavItem) => {
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
        key={item.id}
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
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-2 mt-5">
        {label}
      </p>
    );
  };

  return (
    <aside className={`hidden md:flex flex-col bg-white border-r border-slate-200 shrink-0 overflow-hidden transition-all duration-200 print:hidden ${collapsed ? 'w-14' : 'w-48'}`}>
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
              {tenant?.logo ? (
                <img src={tenant.logo} alt={displayName} className="w-5 h-5 shrink-0 object-contain" />
              ) : (
                <LogoIcon className="w-5 h-5 shrink-0" />
              )}
              <h1 className="text-base font-bold tracking-tight text-text-primary truncate">{displayName}</h1>
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

      {/* 지점장 뷰 배너 */}
      {isViewingAsTenant && !collapsed && (
        <div className="mx-3 mt-3 px-2.5 py-2 rounded-sm bg-amber-50 border border-amber-300">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-700 truncate">{viewingTenantName}</span>
          </div>
          <button
            onClick={() => { exitTenantView(); window.location.href = '/admin/tenants'; }}
            className="w-full text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded px-2 py-1 transition-colors"
          >
            SA 뷰로 돌아가기
          </button>
        </div>
      )}
      {isViewingAsTenant && collapsed && (
        <button
          onClick={() => { exitTenantView(); window.location.href = '/admin/tenants'; }}
          className="mx-auto mt-3 p-1.5 rounded bg-amber-50 border border-amber-300 hover:bg-amber-100 transition-colors"
          title={`${viewingTenantName} · 돌아가기`}
        >
          <Building2 className="w-4 h-4 text-amber-600" />
        </button>
      )}

      {/* Admin badge */}
      {!isViewingAsTenant && hasMinRole(role, 'MANAGER') && !collapsed && (
        <div className="mx-3 mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-violet-50 border border-violet-200">
          <Shield className="w-3.5 h-3.5 text-violet-600 shrink-0" />
          <span className="text-xs font-bold text-violet-700">관리자 모드</span>
        </div>
      )}
      {!isViewingAsTenant && hasMinRole(role, 'MANAGER') && collapsed && (
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
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-xs font-mono text-slate-400">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 pt-3">
        {navGroups.map((group) => (
          <React.Fragment key={group.id}>
            {group.id !== 'home' && (
              group.style === 'admin' ? (
                collapsed ? (
                  <div className="my-3 border-t-2 border-violet-200" />
                ) : (
                  <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-1.5 px-2 mt-5 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {group.label}
                  </p>
                )
              ) : (
                renderSectionLabel(group.label)
              )
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map(renderItem)}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* User section at bottom */}
      <div className="shrink-0 border-t border-slate-100 px-2 py-2.5">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <UserAvatar name={user?.name ?? '사용자'} size="xs" />
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
            <UserAvatar name={user?.name ?? '사용자'} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{user?.name ?? '사용자'}</p>
              <p className="text-xs text-text-secondary truncate">{ROLE_LABELS[role] ?? '선생님'}</p>
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
