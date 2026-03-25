'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConceptFilters } from './hooks/useConceptFilters';
import { useConceptCrud } from './hooks/useConceptCrud';
import { usePrerequisites } from './hooks/usePrerequisites';
import { useBlankEditor } from './hooks/useBlankEditor';
import { useConceptAi } from './hooks/useConceptAi';

export function useConceptManager(isOwner: boolean) {
  // 1. Filters
  const filters = useConceptFilters();

  // 2. UI state
  const [isContentEditing, setIsContentEditing] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'curriculum' | 'systematic'>('list');
  const [showBlanks, setShowBlanks] = useState(false);

  // Ref-based bridges: 서브 훅 간 순환 의존 회피
  const blanksRef = useRef<{ resetBlanks: () => void; fetchBlanks: (id: string) => void }>({
    resetBlanks: () => {},
    fetchBlanks: () => {},
  });
  const isDirtyRef = useRef<() => boolean>(() => false);

  // 3. Prerequisites
  const prereqs = usePrerequisites(null as never); // editingConcept은 crud 생성 후 업데이트

  // 4. CRUD
  const crud = useConceptCrud({
    filters,
    isDirtyRef: () => isDirtyRef.current(),
    editPrereqs: prereqs.editPrereqs,
    setEditPrereqs: prereqs.setEditPrereqs,
    setPrereqSearch: prereqs.setPrereqSearch,
    setPrereqResults: prereqs.setPrereqResults,
    resetBlanks: () => blanksRef.current.resetBlanks(),
    fetchBlanks: (id: string) => blanksRef.current.fetchBlanks(id),
    isContentEditing,
    setIsContentEditing,
  });

  // 5. Blank Editor
  const blanks = useBlankEditor({
    editingConcept: crud.editingConcept,
    editForm: crud.editForm,
    setEditForm: crud.setEditForm,
  });

  // Bridge 연결
  blanksRef.current = { resetBlanks: blanks.resetBlanks, fetchBlanks: blanks.fetchBlanks };

  // Prerequisites에 실제 editingConcept 전달 (usePrerequisites 내부에서 searchPrereqs가 이를 사용)
  // → usePrerequisites가 editingConcept를 searchPrereqs 클로저에서만 사용하므로
  //   prereqs 훅은 한 번만 호출하고, searchPrereqs를 래핑하여 최신 editingConcept 사용
  const searchPrereqsWrapped = useCallback(async (query: string) => {
    prereqs.setPrereqSearch(query);
    if (query.trim().length < 1) { prereqs.setPrereqResults([]); return; }
    // prereqs.searchPrereqs 대신 직접 구현하여 최신 editingConcept 사용
    try {
      const params = new URLSearchParams({ search: query, limit: '10' });
      const res = await fetch(`/api/concepts?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        const existingIds = new Set([crud.editingConcept?.id, ...prereqs.editPrereqs.map((p) => p.id)]);
        prereqs.setPrereqResults(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          json.data.filter((c: any) => !existingIds.has(c.id)).map((c: any) => ({ id: c.id, conceptCode: c.conceptCode, title: c.title }))
        );
      }
    } catch { prereqs.setPrereqResults([]); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crud.editingConcept?.id, prereqs.editPrereqs]);

  // Dirty state
  const isDirty = crud.conceptDirty || blanks.blankDirty;
  useEffect(() => {
    isDirtyRef.current = () => isDirty;
  }, [isDirty]);

  // 6. AI
  const ai = useConceptAi({
    editingConcept: crud.editingConcept,
    editForm: crud.editForm,
    setEditForm: crud.setEditForm,
    blankExercises: blanks.blankExercises,
    setBlankForm: blanks.setBlankForm,
    setSavedBlankForm: blanks.setSavedBlankForm,
    setEditingBlank: blanks.setEditingBlank,
    setIsNewBlank: blanks.setIsNewBlank,
    templateHistoryRef: { current: [] } as React.MutableRefObject<{ templateText: string; blanks: never[] }[]>,
    templateHistoryIdxRef: { current: 0 } as React.MutableRefObject<number>,
  });

  // Ctrl+S
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isDirty || crud.saving || blanks.blankSaving || !crud.editForm.title || !crud.editForm.fullContent) return;
        if (crud.conceptDirty) await crud.saveConcept();
        if (blanks.blankDirty && (blanks.editingBlank || blanks.isNewBlank)) await blanks.saveBlankExercise();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return {
    // Filter state
    search: filters.search, setSearch: filters.setSearch,
    levelFilter: filters.levelFilter, setLevelFilter: filters.setLevelFilter,
    gradeFilter: filters.gradeFilter, setGradeFilter: filters.setGradeFilter,
    categoryFilter: filters.categoryFilter, setCategoryFilter: filters.setCategoryFilter,
    semesterFilter: filters.semesterFilter, setSemesterFilter: filters.setSemesterFilter,
    chapterFilter: filters.chapterFilter, setChapterFilter: filters.setChapterFilter,
    sectionFilter: filters.sectionFilter, setSectionFilter: filters.setSectionFilter,
    partFilter: filters.partFilter, setPartFilter: filters.setPartFilter,
    currentPage: filters.currentPage, setCurrentPage: filters.setCurrentPage,

    // Data
    concepts: crud.concepts, subjects: crud.subjects, meta: crud.meta, loading: crud.loading,

    // Edit state
    editingConcept: crud.editingConcept, isNewConcept: crud.isNewConcept,
    editForm: crud.editForm, setEditForm: crud.setEditForm, saving: crud.saving,
    isHighSchool: crud.isHighSchool, chapterOptions: crud.chapterOptions,
    sectionOptions: crud.sectionOptions, sectionSubOptions: crud.sectionSubOptions,

    // Prerequisites
    editPrereqs: prereqs.editPrereqs, prereqSearch: prereqs.prereqSearch,
    prereqResults: prereqs.prereqResults, prereqSearching: prereqs.prereqSearching,
    searchPrereqs: searchPrereqsWrapped, addPrereq: prereqs.addPrereq, removePrereq: prereqs.removePrereq,

    // Blank exercises
    blankExercises: blanks.blankExercises, blanksLoading: blanks.blanksLoading,
    editingBlank: blanks.editingBlank, setEditingBlank: blanks.setEditingBlank,
    blankForm: blanks.blankForm, isNewBlank: blanks.isNewBlank, setIsNewBlank: blanks.setIsNewBlank,
    blankSaving: blanks.blankSaving,
    dragIdx: blanks.dragIdx, setDragIdx: blanks.setDragIdx,

    // AI
    aiGenerating: ai.aiGenerating, showBlankGenOptions: ai.showBlankGenOptions, setShowBlankGenOptions: ai.setShowBlankGenOptions,
    aiMetadataLoading: ai.aiMetadataLoading, aiSuggestions: ai.aiSuggestions, setAiSuggestions: ai.setAiSuggestions,

    // Content editing
    isContentEditing, setIsContentEditing,

    // Bulk import
    bulkImportOpen, setBulkImportOpen,

    // Left panel
    leftPanelCollapsed, setLeftPanelCollapsed,
    viewMode, setViewMode,
    showBlanks, setShowBlanks,
    templateViewMode: blanks.templateViewMode, setTemplateViewMode: blanks.setTemplateViewMode,
    templateMathPopup: blanks.templateMathPopup, setTemplateMathPopup: blanks.setTemplateMathPopup,
    editingBlankPos: blanks.editingBlankPos, setEditingBlankPos: blanks.setEditingBlankPos,

    // Template refs
    templateHighlightRef: blanks.templateHighlightRef, templateTextareaRef: blanks.templateTextareaRef,

    // Preview state
    previewOriginalOpen: blanks.previewOriginalOpen, setPreviewOriginalOpen: blanks.setPreviewOriginalOpen,
    previewStudentOpen: blanks.previewStudentOpen, setPreviewStudentOpen: blanks.setPreviewStudentOpen,

    // Template undo/redo
    templateUndo: blanks.templateUndo, templateRedo: blanks.templateRedo, pushTemplateHistory: blanks.pushTemplateHistory,

    // Dirty state
    conceptDirty: crud.conceptDirty, blankDirty: blanks.blankDirty, isDirty,

    // Actions
    startEditing: crud.startEditing, selectConceptById: crud.selectConceptById,
    startNewConcept: crud.startNewConcept, cancelEditing: crud.cancelEditing,
    saveConcept: crud.saveConcept, deleteConcept: crud.deleteConcept,
    fetchConcepts: crud.fetchConcepts,
    startEditBlank: blanks.startEditBlank, startNewBlank: blanks.startNewBlank, cancelBlankEdit: blanks.cancelBlankEdit,
    syncBlanksFromTemplate: blanks.syncBlanksFromTemplate, convertSelectionToBlank: blanks.convertSelectionToBlank, convertRangeToBlank: blanks.convertRangeToBlank,
    updateBlankItem: blanks.updateBlankItem, autoRenumber: blanks.autoRenumber, handleBlankDrop: blanks.handleBlankDrop,
    saveBlankExercise: blanks.saveBlankExercise, deleteBlankExercise: blanks.deleteBlankExercise,
    removeBlankFromForm: blanks.removeBlankFromForm,
    handleAiMetadataExtract: ai.handleAiMetadataExtract, handleApplyAiSuggestions: ai.handleApplyAiSuggestions, handleAiBlankGenerate: ai.handleAiBlankGenerate,

    // Owner/Admin check
    isOwner,
  };
}

export type ConceptManagerReturn = ReturnType<typeof useConceptManager>;
