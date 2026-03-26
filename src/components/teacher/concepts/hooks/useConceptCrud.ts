'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { getCurriculumForGrade } from '@/lib/utils/curriculumMapping';
import { GRADE_LABELS, GRADE_GROUPS, PART_LABELS, CATEGORY_LABELS } from '@/lib/constants/labels';
import type { ConceptItem, SubjectItem, Meta, EditFormState, PrerequisiteItem } from '../types';
import { ITEMS_PER_PAGE } from '../types';
import type { ConceptFiltersReturn } from './useConceptFilters';

const GRADE_OPTIONS = Object.keys(GRADE_LABELS);
const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);
const PART_OPTIONS = Object.keys(PART_LABELS);

interface CrudDeps {
  filters: ConceptFiltersReturn;
  isDirtyRef: () => boolean;
  editPrereqs: PrerequisiteItem[];
  setEditPrereqs: (v: PrerequisiteItem[]) => void;
  setPrereqSearch: (v: string) => void;
  setPrereqResults: (v: PrerequisiteItem[]) => void;
  resetBlanks: () => void;
  fetchBlanks: (conceptId: string) => void;
  isContentEditing: boolean;
  setIsContentEditing: (v: boolean) => void;
}

export function useConceptCrud(deps: CrudDeps) {
  const { filters } = deps;

  // Data state
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingConcept, setEditingConcept] = useState<ConceptItem | null>(null);
  const [isNewConcept, setIsNewConcept] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    subjectId: '', title: '', fullContent: '', conceptCode: '',
    grade: '', semester: '' as string | number, chapter: '', section: '', sectionSub: '',
    category: '', part: '', source: '', keywords: '',
  });
  const [saving, setSaving] = useState(false);
  const [savedEditForm, setSavedEditForm] = useState('');

  // 교육과정 캐스케이드
  const isHighSchool = editForm.grade.startsWith('high_');

  const chapterOptions = useMemo(() => {
    if (!editForm.grade) return [];
    const entries = getCurriculumForGrade(editForm.grade);
    if (isHighSchool) return entries[0]?.chapters.map(c => c.name) ?? [];
    const sem = Number(editForm.semester);
    if (!sem) return [];
    const entry = entries.find(e => e.semesterNumber === sem);
    return entry?.chapters.map(c => c.name) ?? [];
  }, [editForm.grade, editForm.semester, isHighSchool]);

  const sectionOptions = useMemo(() => {
    if (!editForm.grade || !editForm.chapter) return [];
    const entries = getCurriculumForGrade(editForm.grade);
    const entry = isHighSchool ? entries[0] : entries.find(e => e.semesterNumber === Number(editForm.semester));
    const chapter = entry?.chapters.find(c => c.name === editForm.chapter);
    return chapter?.subUnits?.map(s => s.name) ?? [];
  }, [editForm.grade, editForm.semester, editForm.chapter, isHighSchool]);

  const sectionSubOptions = useMemo(() => {
    if (!editForm.grade || !editForm.chapter || !editForm.section) return [];
    const entries = getCurriculumForGrade(editForm.grade);
    const entry = isHighSchool ? entries[0] : entries.find(e => e.semesterNumber === Number(editForm.semester));
    const chapter = entry?.chapters.find(c => c.name === editForm.chapter);
    const section = chapter?.subUnits?.find(s => s.name === editForm.section);
    return section?.subUnits?.map(s => s.name) ?? [];
  }, [editForm.grade, editForm.semester, editForm.chapter, editForm.section, isHighSchool]);

  // Dirty tracking
  const conceptDirty = editingConcept ? JSON.stringify(editForm) !== savedEditForm : false;

  // Fetch concepts
  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.gradeFilter) {
      params.set('grade', filters.gradeFilter);
    } else if (filters.levelFilter) {
      const grades = GRADE_GROUPS.find((g) => g.label === filters.levelFilter)?.grades ?? [];
      params.set('grade', grades.join(','));
    }
    if (filters.categoryFilter) params.set('category', filters.categoryFilter);
    if (filters.semesterFilter) params.set('semester', String(filters.semesterFilter));
    if (filters.chapterFilter) params.set('chapter', filters.chapterFilter);
    if (filters.sectionFilter) params.set('section', filters.sectionFilter);
    if (filters.partFilter) params.set('part', filters.partFilter);
    if (filters.searchDebounced) params.set('search', filters.searchDebounced);
    params.set('page', String(filters.currentPage));
    params.set('limit', String(ITEMS_PER_PAGE));

    try {
      const res = await fetch(`/api/concepts?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setConcepts(json.data);
        setMeta(json.meta ?? { page: 1, total: 0, totalPages: 1 });
      }
    } catch {
      setConcepts([]);
    } finally {
      setLoading(false);
    }
  }, [filters.levelFilter, filters.gradeFilter, filters.categoryFilter, filters.semesterFilter, filters.chapterFilter, filters.sectionFilter, filters.partFilter, filters.searchDebounced, filters.currentPage]);

  useEffect(() => { fetchConcepts(); }, [fetchConcepts]);

  // Fetch subjects
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/subjects');
        const json = await res.json();
        if (json.data) setSubjects(json.data);
      } catch { /* ignore */ }
    })();
  }, []);

  // Helpers
  const populateForm = (concept: ConceptItem): EditFormState => ({
    subjectId: concept.subjectId,
    title: concept.title,
    fullContent: concept.fullContent,
    conceptCode: concept.conceptCode ?? '',
    grade: concept.grade,
    semester: concept.semester ?? '' as string | number,
    chapter: concept.chapter ?? '',
    section: concept.section ?? '',
    sectionSub: concept.sectionSub ?? '',
    category: concept.category ?? '',
    part: concept.part ?? '',
    source: concept.source ?? '',
    keywords: concept.keywords ?? '',
  });

  // Edit handlers
  const startEditing = async (concept: ConceptItem) => {
    if (editingConcept && deps.isDirtyRef() && !(await confirm({ message: '저장하지 않은 변경사항이 있습니다. 다른 개념으로 이동하시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) return;
    setEditingConcept(concept);
    setIsNewConcept(false);
    deps.setIsContentEditing(false);
    const form = populateForm(concept);
    setEditForm(form);
    setSavedEditForm(JSON.stringify(form));
    deps.setEditPrereqs(concept.prerequisites ?? []);
    deps.setPrereqSearch('');
    deps.setPrereqResults([]);
    deps.resetBlanks();
    deps.fetchBlanks(concept.id);
  };

  const selectConceptById = useCallback(async (id: string) => {
    const found = concepts.find((c) => c.id === id);
    if (found) { startEditing(found); return; }
    try {
      const res = await fetch(`/api/concepts/${id}`);
      const json = await res.json();
      if (json.data) {
        // API returns prerequisiteFor but ConceptItem expects subConcepts
        const d = json.data;
        startEditing({
          ...d,
          subConcepts: d.prerequisiteFor ?? d.subConcepts ?? [],
        } as ConceptItem);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concepts, editingConcept]);

  const startNewConcept = async () => {
    if (editingConcept && deps.isDirtyRef() && !(await confirm({ message: '저장하지 않은 변경사항이 있습니다. 새 개념을 추가하시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) return;
    setEditingConcept({ id: '__new__', subjectId: '', conceptCode: '', title: '', fullContent: '', grade: GRADE_OPTIONS[0], semester: null, chapter: null, section: null, sectionSub: null, category: CATEGORY_OPTIONS[0], part: PART_OPTIONS[0], source: null, keywords: null, prerequisites: [], subConcepts: [] });
    setIsNewConcept(true);
    const form: EditFormState = {
      subjectId: subjects[0]?.id ?? '', title: '', fullContent: '', conceptCode: '',
      grade: GRADE_OPTIONS[0], semester: '' as string | number, chapter: '', section: '', sectionSub: '',
      category: CATEGORY_OPTIONS[0], part: PART_OPTIONS[0], source: '', keywords: '',
    };
    setEditForm(form);
    setSavedEditForm(JSON.stringify(form));
    deps.setEditPrereqs([]);
    deps.setPrereqSearch('');
    deps.setPrereqResults([]);
    deps.resetBlanks();
  };

  const cancelEditing = async () => {
    if (deps.isDirtyRef() && !(await confirm({ message: '저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) return;
    if (deps.isContentEditing && !isNewConcept) {
      deps.setIsContentEditing(false);
      if (editingConcept) {
        const form = populateForm(editingConcept);
        setEditForm(form);
        setSavedEditForm(JSON.stringify(form));
      }
      return;
    }
    setEditingConcept(null);
    setIsNewConcept(false);
    deps.setIsContentEditing(false);
    deps.resetBlanks();
  };

  const saveConcept = async () => {
    if (!editingConcept) return;
    setSaving(true);
    try {
      if (isNewConcept) {
        const body: Record<string, unknown> = {
          subjectId: editForm.subjectId || subjects[0]?.id,
          title: editForm.title, fullContent: editForm.fullContent,
          conceptCode: editForm.conceptCode || undefined,
          grade: editForm.grade,
          semester: editForm.semester ? Number(editForm.semester) : undefined,
          chapter: editForm.chapter || undefined, section: editForm.section || undefined,
          sectionSub: editForm.sectionSub || undefined,
          category: editForm.category, part: editForm.part,
          source: editForm.source || undefined,
          keywords: editForm.keywords.trim() || undefined,
          prerequisites: deps.editPrereqs.map((p) => p.id),
        };
        const res = await fetch('/api/concepts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setSavedEditForm(JSON.stringify(editForm));
          setEditingConcept(null);
          setIsNewConcept(false);
          fetchConcepts();
        }
      } else {
        const body: Record<string, unknown> = {
          title: editForm.title, fullContent: editForm.fullContent,
          conceptCode: editForm.conceptCode || null,
          grade: editForm.grade,
          semester: editForm.semester ? Number(editForm.semester) : null,
          chapter: editForm.chapter || null, section: editForm.section || null,
          sectionSub: editForm.sectionSub || null,
          category: editForm.category, part: editForm.part,
          source: editForm.source || null,
          keywords: editForm.keywords.trim() || null,
          prerequisites: deps.editPrereqs.map((p) => p.id),
        };
        const res = await fetch(`/api/concepts/${editingConcept.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setSavedEditForm(JSON.stringify(editForm));
          deps.setIsContentEditing(false);
          fetchConcepts();
        } else {
          toast.error('개념 저장에 실패했습니다.');
        }
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const deleteConcept = async (id: string) => {
    if (!(await confirm({ message: '이 개념을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.', variant: 'danger', confirmLabel: '삭제' }))) return;
    try {
      const res = await fetch(`/api/concepts/${id}`, { method: 'DELETE' });
      if (res.ok) fetchConcepts();
    } catch { /* silently fail */ }
  };

  return {
    concepts, subjects, meta, loading,
    editingConcept, isNewConcept, editForm, setEditForm, saving,
    savedEditForm, setSavedEditForm,
    isHighSchool, chapterOptions, sectionOptions, sectionSubOptions,
    conceptDirty,
    fetchConcepts, startEditing, selectConceptById, startNewConcept, cancelEditing, saveConcept, deleteConcept,
  };
}

export type ConceptCrudReturn = ReturnType<typeof useConceptCrud>;
