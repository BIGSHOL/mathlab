'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getNavForRole, getAllNavItems, type NavGroup } from '@/lib/constants/navigation';
import type { UserRole } from '@/types';
import { useViewingTenantStore } from '@/stores/viewingTenantStore';

interface TabDef {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** 직접 이동 (하위 메뉴 없음) */
  href?: string;
  /** 해당 NavGroup IDs */
  groupIds: string[];
}

const TABS: TabDef[] = [
  { id: 'home', label: '홈', icon: LayoutDashboard, href: '/overview', groupIds: ['home'] },
  { id: 'class', label: '수업', icon: Users, groupIds: ['students'] },
  { id: 'content', label: '출제', icon: BookOpen, groupIds: ['content'] },
  { id: 'assess', label: '평가', icon: ClipboardCheck, groupIds: ['assessment'] },
  { id: 'more', label: '더보기', icon: Menu, groupIds: ['analysis', 'system', 'team', 'branch', 'platform'] },
];

export function TeacherBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { tenantId: viewingTenantId } = useViewingTenantStore();
  const [openTab, setOpenTab] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const isViewingAsTenant = user?.role === 'SUPER_ADMIN' && !!viewingTenantId;
  const effectiveRole = isViewingAsTenant ? 'OWNER' : (user?.role ?? 'TEACHER');
  const navGroups = getNavForRole(effectiveRole as UserRole);
  const allItems = getAllNavItems();

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!openTab) return;
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenTab(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openTab]);

  // 페이지 이동 시 닫기
  useEffect(() => {
    setOpenTab(null);
  }, [pathname]);

  // 현재 경로가 어떤 탭에 속하는지 판별
  const getActiveTab = () => {
    for (const tab of TABS) {
      const groups = navGroups.filter((g) => tab.groupIds.includes(g.id));
      for (const group of groups) {
        for (const item of group.items) {
          if (pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href + '/'))) {
            return tab.id;
          }
        }
      }
    }
    return 'home';
  };

  const activeTab = getActiveTab();

  // 탭에 해당하는 그룹들의 아이템 가져오기
  const getTabGroups = (tab: TabDef): NavGroup[] => {
    return navGroups.filter((g) => tab.groupIds.includes(g.id));
  };

  const handleTabClick = (tab: TabDef) => {
    if (tab.href) {
      // 직접 이동 탭 (홈)
      setOpenTab(null);
      return;
    }
    setOpenTab(openTab === tab.id ? null : tab.id);
  };

  const isItemActive = (href: string) => {
    return pathname === href || (href !== '/overview' && pathname.startsWith(href + '/') && !allItems.some((other) => other.href !== href && other.href.startsWith(href + '/') && pathname.startsWith(other.href)));
  };

  return (
    <div ref={navRef} className="md:hidden fixed bottom-0 left-0 right-0 z-50 print:hidden">
      {/* 하위 메뉴 패널 */}
      {openTab && (() => {
        const tab = TABS.find((t) => t.id === openTab);
        if (!tab) return null;
        const groups = getTabGroups(tab);
        if (groups.length === 0) return null;

        return (
          <>
            {/* 백드롭 */}
            <div className="fixed inset-0 bg-black/20 -z-10" />
            {/* 패널 */}
            <div className="bg-white border-t border-slate-200 shadow-lg rounded-t-2xl px-4 py-3 animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-text-primary">{tab.label}</span>
                <button onClick={() => setOpenTab(null)} className="p-1 rounded hover:bg-slate-100">
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
              {groups.map((group) => (
                <div key={group.id} className="mb-3 last:mb-0">
                  {groups.length > 1 && (
                    <div className="flex items-center gap-1 mb-1.5">
                      {group.style === 'admin' && <Shield className="w-3 h-3 text-violet-500" />}
                      <span className={`text-xs font-bold uppercase tracking-wider ${group.style === 'admin' ? 'text-violet-500' : 'text-slate-400'}`}>
                        {group.label}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-1.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item.href);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-sm transition-colors ${
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'text-text-secondary hover:bg-slate-50'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* 하단 탭 바 */}
      <nav className="bg-white border-t border-slate-200">
        <div className="flex items-center justify-around py-1.5 px-2">
          {TABS.map((tab) => {
            const groups = getTabGroups(tab);
            // 해당 그룹이 없으면 (역할에 따라 필터됨) 숨김
            if (groups.length === 0 && tab.id !== 'home') return null;

            const isActive = activeTab === tab.id;
            const isOpen = openTab === tab.id;

            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  onClick={() => setOpenTab(null)}
                  className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-sm min-w-[48px] min-h-[44px] justify-center transition-colors ${
                    isActive ? 'text-primary' : 'text-slate-400'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-sm min-w-[48px] min-h-[44px] justify-center transition-colors ${
                  isOpen ? 'text-primary' : isActive ? 'text-primary' : 'text-slate-400'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
