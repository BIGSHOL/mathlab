'use client';

import {
  Search,
  School,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { gradeLabel, SCHOOL_LEVEL_OPTIONS, gradeInLevel } from '@/components/teacher/students/helpers';
import type { ClassroomItem } from './types';

interface ClassroomListPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterLevel: string;
  onFilterLevelChange: (value: string) => void;
  filterGrade: string;
  onFilterGradeChange: (value: string) => void;
  loading: boolean;
  classrooms: ClassroomItem[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (classroom: ClassroomItem) => void;
  onAddClick?: () => void;
}

export function ClassroomListPanel({
  collapsed,
  onToggleCollapse,
  search,
  onSearchChange,
  filterLevel,
  onFilterLevelChange,
  filterGrade,
  onFilterGradeChange,
  loading,
  classrooms,
  totalCount,
  selectedId,
  onSelect,
  onAddClick,
}: ClassroomListPanelProps) {
  return (
    <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${collapsed ? 'w-12' : 'w-72'}`}>
      {/* 헤더 */}
      <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <School className="w-4 h-4 text-primary shrink-0" />
              <h1 className="text-base font-bold text-text-primary truncate">반 관리</h1>
              <span className="text-xs text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                {classrooms.length !== totalCount ? `${classrooms.length}/${totalCount}` : classrooms.length}
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
          {/* 검색 + 필터 */}
          <div className="px-3 pt-2 pb-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                placeholder="반 이름 검색..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              <select
                value={filterLevel}
                onChange={(e) => { onFilterLevelChange(e.target.value); onFilterGradeChange(''); }}
                className="flex-1 h-7 px-2 border border-slate-200 rounded-sm text-xs bg-white focus:ring-1 focus:ring-primary/40"
              >
                <option value="">전체 학제</option>
                {SCHOOL_LEVEL_OPTIONS.map((sl) => (
                  <option key={sl.value} value={sl.value}>{sl.label}</option>
                ))}
              </select>
              <select
                value={filterGrade}
                onChange={(e) => onFilterGradeChange(e.target.value)}
                className="flex-1 h-7 px-2 border border-slate-200 rounded-sm text-xs bg-white focus:ring-1 focus:ring-primary/40"
                disabled={!filterLevel}
              >
                <option value="">전체 학년</option>
                {filterLevel && SCHOOL_LEVEL_OPTIONS.find((sl) => sl.value === filterLevel)?.grades.map((g) => (
                  <option key={g} value={g}>{gradeInLevel(g)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 새 반 만들기 버튼 (OWNER+만) */}
          {onAddClick && (
            <>
              <div className="px-3 pb-2">
                <Button size="sm" className="w-full text-xs" onClick={onAddClick}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> 새 반 만들기
                </Button>
              </div>
              <div className="border-b border-slate-200" />
            </>
          )}
          {!onAddClick && <div className="border-b border-slate-200" />}

          {/* 반 목록 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : classrooms.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <School className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">등록된 반이 없습니다.</p>
              </div>
            ) : (
              classrooms.map((cr) => (
                <button
                  key={cr.id}
                  onClick={() => onSelect(cr)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors ${
                    selectedId === cr.id
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-white border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                      <span className="text-xs font-bold text-primary">{cr.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-text-primary truncate block">{cr.name}</span>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-xs text-text-secondary">
                          {cr.grade ? gradeLabel(cr.grade) : '학년 미지정'}
                        </span>
                        <span className="text-xs text-slate-300">&middot;</span>
                        <span className="text-xs text-text-secondary">{cr.students.length}명</span>
                        {cr.teacher && (
                          <>
                            <span className="text-xs text-slate-300">&middot;</span>
                            <span className="text-xs text-text-secondary truncate">{cr.teacher.name}</span>
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
            title="반 관리 열기"
          >
            <School className="w-5 h-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
