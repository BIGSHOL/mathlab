'use client';

import {
  UserPlus,
  Search,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { gradeLabel, relativeTime } from './helpers';
import type { UserItem } from './types';

interface StudentListPanelProps {
  // 패널 상태
  leftPanelCollapsed: boolean;
  onToggleCollapse: () => void;

  // 검색/필터
  search: string;
  onSearchChange: (value: string) => void;
  gradeFilter: string;
  onGradeFilterChange: (value: string) => void;
  levelFilter: string;
  onLevelFilterChange: (value: string) => void;
  activityFilter: string;
  onActivityFilterChange: (value: string) => void;
  onResetFilters: () => void;

  // 사용자 목록
  loading: boolean;
  filteredUsers: UserItem[];
  selectedUserId: string | null;
  onSelectUser: (user: UserItem) => void;

  // 액션
  onAddClick: () => void;
  isManager?: boolean;

  // 파생 데이터
  panelTitle: string;
  panelCount: number;

  // 모바일 상세 열림 시 목록 숨김
  mobileHidden?: boolean;
}

export function StudentListPanel({
  leftPanelCollapsed,
  onToggleCollapse,
  search,
  onSearchChange,
  gradeFilter,
  onGradeFilterChange,
  levelFilter,
  onLevelFilterChange,
  activityFilter,
  onActivityFilterChange,
  onResetFilters,
  loading,
  filteredUsers,
  selectedUserId,
  onSelectUser,
  onAddClick,
  isManager,
  panelTitle,
  panelCount,
  mobileHidden,
}: StudentListPanelProps) {
  return (
    <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${leftPanelCollapsed ? 'w-12 hidden md:flex' : 'w-full md:w-72'} ${mobileHidden ? 'hidden md:flex' : ''}`}>
      <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          {!leftPanelCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <h1 className="text-base font-bold text-text-primary truncate">{panelTitle}</h1>
              <span className="text-xs text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">{panelCount}</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
            title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
          >
            {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!leftPanelCollapsed && (
        <>
          <div className="px-3 pt-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                placeholder="학생 이름 검색..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          <div className="px-3 pb-2 flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <select className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40" value={gradeFilter} onChange={(e) => onGradeFilterChange(e.target.value)}>
                <option value="all">전체 학년</option>
                {[1,2,3,4,5,6,7,8,9].map((g) => (<option key={g} value={String(g)}>{gradeLabel(g)}</option>))}
              </select>
              <select className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40" value={levelFilter} onChange={(e) => onLevelFilterChange(e.target.value)}>
                <option value="all">전체 레벨</option>
                <option value="low">초급 (1-2)</option>
                <option value="mid">중급 (3-5)</option>
                <option value="high">고급 (6+)</option>
              </select>
            </div>
            <select className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40" value={activityFilter} onChange={(e) => onActivityFilterChange(e.target.value)}>
              <option value="all">전체 상태</option>
              <option value="active">활동 중</option>
              <option value="inactive">미참여</option>
              <option value="new">최근 가입</option>
            </select>
            {(gradeFilter !== 'all' || levelFilter !== 'all' || activityFilter !== 'all') && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">필터 결과: <span className="font-bold text-text-primary">{filteredUsers.length}명</span></span>
                <button onClick={onResetFilters} className="text-xs text-primary font-semibold hover:underline">초기화</button>
              </div>
            )}
          </div>

          {isManager && (
            <div className="px-3 pb-2">
              <Button size="sm" className="w-full text-xs" onClick={onAddClick}><UserPlus className="w-3.5 h-3.5 mr-1" />학생 추가</Button>
            </div>
          )}
          <div className="border-b border-slate-200" />

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-text-secondary"><Users className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-sm">학생이 없습니다.</p></div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onSelectUser(u)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors ${
                    selectedUserId === u.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-white border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                      <span className="text-xs font-bold text-primary">{u.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-text-primary truncate">{u.name}</span>
                        <span className="text-xs text-text-secondary">@{u.username}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-text-secondary">{gradeLabel(u.grade)}</span>
                        <span className="text-xs text-slate-300">&middot;</span>
                        <span className="text-xs font-medium text-primary">Lv.{u.profile?.level ?? 1}</span>
                        <span className="text-xs text-slate-300">&middot;</span>
                        <span className="text-xs text-text-secondary">{u.profile?.totalXp ?? 0} XP</span>
                        {u.profile?.lastActiveAt && (
                          <>
                            <span className="text-xs text-slate-300">&middot;</span>
                            <span className="text-xs text-text-secondary">{relativeTime(u.profile.lastActiveAt)}</span>
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

      {leftPanelCollapsed && (
        <div className="flex-1 flex flex-col items-center pt-3 gap-2">
          <button onClick={() => onToggleCollapse()} className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors" title={`${panelTitle} 열기`}>
            <Users className="w-5 h-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
