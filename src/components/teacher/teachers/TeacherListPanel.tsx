'use client';

import {
  Search,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from 'lucide-react';
import { relativeTime } from '@/components/teacher/students/helpers';
import type { UserItem } from '@/components/teacher/students/types';

interface TeacherListPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  teachers: UserItem[];
  selectedId: string | null;
  onSelect: (teacher: UserItem) => void;
}

export function TeacherListPanel({
  collapsed,
  onToggleCollapse,
  search,
  onSearchChange,
  loading,
  teachers,
  selectedId,
  onSelect,
}: TeacherListPanelProps) {
  return (
    <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${collapsed ? 'w-12' : 'w-72'}`}>
      {/* 헤더 */}
      <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <UserCog className="w-4 h-4 text-primary shrink-0" />
              <h1 className="text-base font-bold text-text-primary truncate">선생님 관리</h1>
              <span className="text-xs text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                {teachers.length}
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
            title={collapsed ? '패널 열기' : '패널 접기'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* 검색 */}
          <div className="px-3 pt-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                placeholder="선생님 이름 검색..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <div className="border-b border-slate-200" />

          {/* 선생님 목록 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <UserCog className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">선생님이 없습니다.</p>
              </div>
            ) : (
              teachers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors ${
                    selectedId === t.id
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-white border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-violet-100">
                      <span className="text-xs font-bold text-violet-600">{t.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-text-primary truncate">{t.name}</span>
                        <span className="text-xs text-text-secondary">@{t.username}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-text-secondary">
                          {new Date(t.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                        {t.profile?.lastActiveAt && (
                          <>
                            <span className="text-xs text-slate-300">&middot;</span>
                            <span className="text-xs text-text-secondary">{relativeTime(t.profile.lastActiveAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {collapsed && (
        <div className="flex-1 flex flex-col items-center pt-3 gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors"
            title="선생님 관리 열기"
          >
            <UserCog className="w-5 h-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
