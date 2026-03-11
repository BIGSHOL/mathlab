'use client';

import { useState, type ReactNode } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Users,
  HelpCircle,
  Activity,
} from 'lucide-react';

interface DashboardShellProps {
  children: ReactNode;
  isAdmin?: boolean;
  stats?: {
    students: number;
    activeRate: number;
    pending: number;
  };
}

export function DashboardShell({ children, isAdmin, stats }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* Left Panel */}
      <aside
        className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${
          collapsed ? 'w-12' : 'w-72'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <LayoutDashboard className="w-4 h-4 text-primary shrink-0" />
                <h1 className="text-sm font-bold text-text-primary truncate">대시보드</h1>
              </div>
            )}
            <button
              onClick={() => setCollapsed((p) => !p)}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              title={collapsed ? '패널 펼치기' : '패널 접기'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Panel content (hidden when collapsed) */}
        {!collapsed && (
          <>
            <div className="flex-1" />

            {/* Summary Stats at bottom */}
            {stats && (
              <div className="shrink-0 border-t border-slate-200 px-3 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  요약
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-text-secondary">전체 학생</span>
                    </div>
                    <span className="text-xs font-bold text-text-primary">{stats.students}명</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-text-secondary">활동률</span>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        stats.activeRate >= 80 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {stats.activeRate}%
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-xs text-text-secondary">대기 문의</span>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          stats.pending > 0 ? 'text-rose-600' : 'text-text-primary'
                        }`}
                      >
                        {stats.pending}건
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Collapsed state */}
        {collapsed && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-2">
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors"
              title="대시보드 열기"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Right Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
