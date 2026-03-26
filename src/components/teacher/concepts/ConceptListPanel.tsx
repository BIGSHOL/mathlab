'use client';

import {
  Search, Trash2, Loader2, Brain, Plus, Upload,
  PanelLeftClose, PanelLeftOpen, List, GitBranch, Network,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { CurriculumTree } from '@/components/curriculum/CurriculumTree';
import { CurriculumConceptTree } from '@/components/curriculum/CurriculumConceptTree';
import { SystematicChainView } from '@/components/curriculum/SystematicChainView';
import { GRADE_LABELS, GRADE_SHORT_LABELS, GRADE_GROUPS, CATEGORY_LABELS, PART_LABELS } from '@/lib/constants/labels';
import { ITEMS_PER_PAGE } from './types';
import type { ConceptManagerReturn } from './useConceptManager';

interface ConceptListPanelProps {
  mgr: ConceptManagerReturn;
}

export function ConceptListPanel({ mgr }: ConceptListPanelProps) {
  const {
    search, setSearch,
    levelFilter, setLevelFilter,
    gradeFilter, setGradeFilter,
    categoryFilter,
    semesterFilter, setSemesterFilter,
    chapterFilter, setChapterFilter,
    sectionFilter, setSectionFilter,
    partFilter, setPartFilter,
    currentPage, setCurrentPage,
    concepts, meta, loading,
    editingConcept,
    leftPanelCollapsed, setLeftPanelCollapsed,
    viewMode, setViewMode,
    isOwner,
    startEditing, selectConceptById, startNewConcept, deleteConcept,
    setBulkImportOpen,
  } = mgr;

  return (
    <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex-col transition-all duration-200 ${leftPanelCollapsed ? 'w-12 hidden md:flex' : 'w-full md:w-72'} ${editingConcept ? 'hidden md:flex' : 'flex'}`}>
      {/* Panel Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          {!leftPanelCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Brain className="w-4 h-4 text-primary shrink-0" />
              <h1 className="text-base font-bold text-text-primary truncate">개념 관리</h1>
              <span className="text-xs text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                {meta.total.toLocaleString()}
              </span>
            </div>
          )}
          <button
            onClick={() => setLeftPanelCollapsed((p) => !p)}
            className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
            title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
          >
            {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
        {/* View mode toggle */}
        {!leftPanelCollapsed && (
          <div className="flex items-center gap-0.5 mt-1.5">
            {([
              { mode: 'list' as const, icon: List, label: '목록' },
              { mode: 'curriculum' as const, icon: GitBranch, label: '교육과정' },
              { mode: 'systematic' as const, icon: Network, label: '계통' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                  viewMode === mode
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-text-secondary hover:bg-slate-100'
                }`}
                title={label}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!leftPanelCollapsed && (
        <>
          {/* Action buttons */}
          {isOwner && viewMode === 'list' && (
            <div className="px-3 pt-2 pb-1 flex gap-1.5">
              <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => setBulkImportOpen(true)}>
                <Upload className="w-3.5 h-3.5 mr-1" />
                가져오기
              </Button>
              <Button size="sm" className="flex-1 text-xs" onClick={startNewConcept}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                새 개념
              </Button>
            </div>
          )}

          {/* Search */}
          {viewMode === 'list' && (
          <div className="px-3 pt-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                placeholder="개념 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          )}

          {/* Filters — 학제/학년은 목록+교육과정 모두, 영역은 목록만 */}
          {viewMode !== 'systematic' && (
          <div className="px-3 pb-2 flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <select
                className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40"
                value={levelFilter ?? ''}
                onChange={(e) => { setLevelFilter(e.target.value || null); setGradeFilter(null); setCurrentPage(1); }}
              >
                <option value="">학제</option>
                {GRADE_GROUPS.map((group) => (
                  <option key={group.label} value={group.label}>{group.label}</option>
                ))}
              </select>
              <select
                className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40"
                value={gradeFilter ?? ''}
                onChange={(e) => { setGradeFilter(e.target.value || null); setCurrentPage(1); }}
                disabled={!levelFilter}
              >
                <option value="">학년</option>
                {(GRADE_GROUPS.find((g) => g.label === levelFilter)?.grades ?? []).map((g) => (
                  <option key={g} value={g}>{GRADE_SHORT_LABELS[g]}</option>
                ))}
              </select>
            </div>
            {viewMode === 'list' && (
            <select
              className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded-sm bg-white focus:ring-1 focus:ring-primary/40"
              value={partFilter ?? ''}
              onChange={(e) => { setPartFilter(e.target.value || null); setCurrentPage(1); }}
            >
              <option value="">영역 전체</option>
              {Object.entries(PART_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            )}
          </div>
          )}

          {/* 목록 모드 */}
          {viewMode === 'list' && (
          <>
            {gradeFilter && (
              <div className="px-2 pb-1">
                <CurriculumTree
                  gradeCode={gradeFilter}
                  categoryFilter={categoryFilter}
                  selectedSemester={semesterFilter}
                  selectedChapter={chapterFilter}
                  selectedSection={sectionFilter}
                  onSelect={(semester, chapter, section) => {
                    setSemesterFilter(semester);
                    setChapterFilter(chapter);
                    setSectionFilter(section);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}

            <div className="border-b border-slate-200" />

            {/* Concept List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : concepts.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">개념이 없습니다</p>
                </div>
              ) : (
                concepts.map((concept) => (
                  <div
                    key={concept.id}
                    className={`group flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 cursor-pointer transition-colors ${
                      editingConcept?.id === concept.id
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : 'hover:bg-white border-l-2 border-l-transparent'
                    }`}
                  >
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => startEditing(concept)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-primary shrink-0">{concept.conceptCode}</span>
                        <span className="text-xs font-medium text-text-primary truncate">{concept.title}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-text-secondary">{GRADE_LABELS[concept.grade]}</span>
                        <span className="text-xs text-slate-300">&middot;</span>
                        <span className={`text-xs font-medium ${concept.category === 'concept' ? 'text-blue-600' : 'text-orange-600'}`}>
                          {CATEGORY_LABELS[concept.category] ?? concept.category}
                        </span>
                        <span className="text-xs text-slate-300">&middot;</span>
                        <span className="text-xs text-text-secondary">{PART_LABELS[concept.part] ?? concept.part}</span>
                      </div>
                    </button>
                    {isOwner && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConcept(concept.id); }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 transition-all rounded-sm hover:bg-red-50 shrink-0"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="shrink-0 px-2 py-1.5 border-t border-slate-200 flex items-center justify-between gap-1">
                <span className="text-[11px] text-text-secondary whitespace-nowrap">
                  {((currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(currentPage * ITEMS_PER_PAGE, meta.total)}/{meta.total}
                </span>
                <Pagination compact currentPage={currentPage} totalPages={meta.totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </>
          )}

          {/* 교육과정 모드 */}
          {viewMode === 'curriculum' && (
            <div className="flex-1 overflow-y-auto">
              {gradeFilter ? (
                <CurriculumConceptTree
                  gradeCode={gradeFilter}
                  selectedConceptId={editingConcept?.id ?? null}
                  onSelectConcept={selectConceptById}
                />
              ) : (
                <div className="text-center py-6 text-text-secondary text-xs">
                  <GitBranch className="w-6 h-6 mx-auto mb-2 opacity-20" />
                  <p>학년을 선택하면 교육과정 순서로</p>
                  <p>개념이 표시됩니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 계통수학 모드 */}
          {viewMode === 'systematic' && (
            <div className="flex-1 overflow-y-auto">
              <SystematicChainView
                selectedConceptId={editingConcept?.id ?? null}
                onSelectConcept={selectConceptById}
              />
            </div>
          )}
        </>
      )}

      {/* Collapsed state */}
      {leftPanelCollapsed && (
        <div className="flex-1 flex flex-col items-center pt-3 gap-2">
          <button
            onClick={() => setLeftPanelCollapsed(false)}
            className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors"
            title="개념 목록 열기"
          >
            <Brain className="w-5 h-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
