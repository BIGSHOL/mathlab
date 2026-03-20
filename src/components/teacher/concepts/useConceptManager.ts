'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { getCurriculumForGrade } from '@/lib/utils/curriculumMapping';
import { GRADE_LABELS, GRADE_GROUPS, PART_LABELS, CATEGORY_LABELS } from '@/lib/constants/labels';

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);
const PART_OPTIONS = Object.keys(PART_LABELS);
import type {
  AiMetadataSuggestion,
  PrerequisiteItem,
  SubjectItem,
  ConceptItem,
  Meta,
  BlankDifficulty,
  BlankItem,
  BlankChild,
  BlankExercise,
  BlankFormState,
  EditFormState,
} from './types';
import { ITEMS_PER_PAGE } from './types';

const GRADE_OPTIONS = Object.keys(GRADE_LABELS);

// 한글 초성 추출 (띄어쓰기 유지)
function getChosung(str: string): string {
  const initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  let result = '';
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      result += initials[Math.floor((code - 0xAC00) / 588)];
    } else {
      result += ch;
    }
  }
  return result;
}

export function useConceptManager(isOwner: boolean) {
  // Filter state
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const categoryFilter = 'concept';
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
  const [chapterFilter, setChapterFilter] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [partFilter, setPartFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editingConcept, setEditingConcept] = useState<ConceptItem | null>(null);
  const [isNewConcept, setIsNewConcept] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    subjectId: '',
    title: '',
    fullContent: '',
    conceptCode: '',
    grade: '',
    semester: '' as string | number,
    chapter: '',
    section: '',
    sectionSub: '',
    category: '',
    part: '',
    source: '',
    keywords: '',
  });
  const [saving, setSaving] = useState(false);

  // 교육과정 캐스케이드 드롭다운 옵션
  const isHighSchool = editForm.grade.startsWith('high_');

  const chapterOptions = useMemo(() => {
    if (!editForm.grade) return [];
    const entries = getCurriculumForGrade(editForm.grade);
    if (isHighSchool) {
      return entries[0]?.chapters.map(c => c.name) ?? [];
    }
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

  // Prerequisite editing state
  const [editPrereqs, setEditPrereqs] = useState<PrerequisiteItem[]>([]);
  const [prereqSearch, setPrereqSearch] = useState('');
  const [prereqResults, setPrereqResults] = useState<PrerequisiteItem[]>([]);
  const [prereqSearching, setPrereqSearching] = useState(false);

  // Blank exercise state
  const [blankExercises, setBlankExercises] = useState<BlankExercise[]>([]);
  const [blanksLoading, setBlanksLoading] = useState(false);
  const [editingBlank, setEditingBlank] = useState<BlankExercise | null>(null);
  const [blankForm, setBlankForm] = useState<BlankFormState>({ level: 1, templateText: '', blanks: [] as BlankItem[] });
  const [isNewBlank, setIsNewBlank] = useState(false);
  const [blankSaving, setBlankSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // AI blank generation & metadata extraction
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showBlankGenOptions, setShowBlankGenOptions] = useState(false);
  const [aiMetadataLoading, setAiMetadataLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiMetadataSuggestion[] | null>(null);

  // Content editing mode
  const [isContentEditing, setIsContentEditing] = useState(false);

  // Bulk import state
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Left panel collapse state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'curriculum' | 'systematic'>('list');
  const [showBlanks, setShowBlanks] = useState(false);
  const [mathPopupOpen, setMathPopupOpen] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [templateViewMode, setTemplateViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [templateMathPopup, setTemplateMathPopup] = useState<{ latex: string; start: number; end: number } | null>(null);
  const [editingBlankPos, setEditingBlankPos] = useState<number | null>(null);

  // Template refs
  const templateHighlightRef = useRef<HTMLDivElement>(null);
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Preview section collapse state
  const [previewOriginalOpen, setPreviewOriginalOpen] = useState(true);
  const [previewStudentOpen, setPreviewStudentOpen] = useState(true);

  // Template undo/redo history
  const templateHistory = useRef<{ templateText: string; blanks: BlankItem[] }[]>([]);
  const templateHistoryIdx = useRef(-1);
  const isUndoRedo = useRef(false);

  const pushTemplateHistory = (templateText: string, blanks: BlankItem[]) => {
    if (isUndoRedo.current) return;
    const hist = templateHistory.current;
    const idx = templateHistoryIdx.current;
    if (idx < hist.length - 1) {
      hist.splice(idx + 1);
    }
    hist.push({ templateText, blanks: blanks.map((b) => ({ ...b })) });
    if (hist.length > 100) hist.shift();
    templateHistoryIdx.current = hist.length - 1;
  };

  const templateUndo = () => {
    const hist = templateHistory.current;
    const idx = templateHistoryIdx.current;
    if (idx <= 0) return;
    isUndoRedo.current = true;
    templateHistoryIdx.current = idx - 1;
    const snapshot = hist[idx - 1];
    setBlankForm((prev) => ({ ...prev, templateText: snapshot.templateText, blanks: snapshot.blanks }));
    setEditForm((p) => ({ ...p, fullContent: snapshot.templateText }));
    isUndoRedo.current = false;
  };

  const templateRedo = () => {
    const hist = templateHistory.current;
    const idx = templateHistoryIdx.current;
    if (idx >= hist.length - 1) return;
    isUndoRedo.current = true;
    templateHistoryIdx.current = idx + 1;
    const snapshot = hist[idx + 1];
    setBlankForm((prev) => ({ ...prev, templateText: snapshot.templateText, blanks: snapshot.blanks }));
    setEditForm((p) => ({ ...p, fullContent: snapshot.templateText }));
    isUndoRedo.current = false;
  };

  // Dirty state tracking
  const [savedEditForm, setSavedEditForm] = useState('');
  const [savedBlankForm, setSavedBlankForm] = useState('');
  const conceptDirty = editingConcept ? JSON.stringify(editForm) !== savedEditForm : false;
  const blankDirty = (editingBlank || isNewBlank) ? JSON.stringify(blankForm) !== savedBlankForm : false;
  const isDirty = conceptDirty || blankDirty;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset tree filters when grade changes
  useEffect(() => {
    setSemesterFilter(null);
    setChapterFilter(null);
    setSectionFilter(null);
    setCurrentPage(1);
  }, [gradeFilter]);

  // Fetch concepts from API
  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (gradeFilter) {
      params.set('grade', gradeFilter);
    } else if (levelFilter) {
      const grades = GRADE_GROUPS.find((g) => g.label === levelFilter)?.grades ?? [];
      params.set('grade', grades.join(','));
    }
    if (categoryFilter) params.set('category', categoryFilter);
    if (semesterFilter) params.set('semester', String(semesterFilter));
    if (chapterFilter) params.set('chapter', chapterFilter);
    if (sectionFilter) params.set('section', sectionFilter);
    if (partFilter) params.set('part', partFilter);
    if (searchDebounced) params.set('search', searchDebounced);
    params.set('page', String(currentPage));
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
  }, [levelFilter, gradeFilter, categoryFilter, semesterFilter, chapterFilter, sectionFilter, partFilter, searchDebounced, currentPage]);

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  // Fetch subjects
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/subjects');
        const json = await res.json();
        if (json.data) setSubjects(json.data);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Edit handlers
  const startEditing = async (concept: ConceptItem) => {
    if (editingConcept && isDirty && !(await confirm({ message: '저장하지 않은 변경사항이 있습니다. 다른 개념으로 이동하시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) return;
    setEditingConcept(concept);
    setIsNewConcept(false);
    setIsContentEditing(false);
    const form: EditFormState = {
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
    };
    setEditForm(form);
    setSavedEditForm(JSON.stringify(form));
    setEditPrereqs(concept.prerequisites ?? []);
    setPrereqSearch('');
    setPrereqResults([]);
    setBlankExercises([]);
    setEditingBlank(null);
    setIsNewBlank(false);
    fetchBlanks(concept.id);
  };

  // 교육과정/계통 트리에서 개념 ID로 선택
  const selectConceptById = useCallback(async (id: string) => {
    const found = concepts.find((c) => c.id === id);
    if (found) {
      startEditing(found);
      return;
    }
    try {
      const res = await fetch(`/api/concepts/${id}`);
      const json = await res.json();
      if (json.data) startEditing(json.data as ConceptItem);
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concepts, editingConcept, isDirty]);

  const startNewConcept = async () => {
    if (editingConcept && isDirty && !(await confirm({ message: '저장하지 않은 변경사항이 있습니다. 새 개념을 추가하시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) return;
    setEditingConcept({ id: '__new__', subjectId: '', conceptCode: '', title: '', fullContent: '', grade: GRADE_OPTIONS[0], semester: null, chapter: null, section: null, sectionSub: null, category: CATEGORY_OPTIONS[0], part: PART_OPTIONS[0], source: null, keywords: null, prerequisites: [], subConcepts: [] });
    setIsNewConcept(true);
    const form: EditFormState = {
      subjectId: subjects[0]?.id ?? '',
      title: '',
      fullContent: '',
      conceptCode: '',
      grade: GRADE_OPTIONS[0],
      semester: '' as string | number,
      chapter: '',
      section: '',
      sectionSub: '',
      category: CATEGORY_OPTIONS[0],
      part: PART_OPTIONS[0],
      source: '',
      keywords: '',
    };
    setEditForm(form);
    setSavedEditForm(JSON.stringify(form));
    setEditPrereqs([]);
    setPrereqSearch('');
    setPrereqResults([]);
    setBlankExercises([]);
    setEditingBlank(null);
    setIsNewBlank(false);
  };

  const cancelEditing = async () => {
    if (isDirty && !(await confirm({ message: '저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) return;
    // 편집 모드에서 닫기 → 개념 선택 유지 (읽기 모드로 전환)
    if (isContentEditing && !isNewConcept) {
      setIsContentEditing(false);
      // 편집 전 상태로 되돌리기
      if (editingConcept) {
        const form: EditFormState = {
          subjectId: editingConcept.subjectId,
          title: editingConcept.title,
          fullContent: editingConcept.fullContent,
          conceptCode: editingConcept.conceptCode ?? '',
          grade: editingConcept.grade,
          semester: editingConcept.semester ?? '' as string | number,
          chapter: editingConcept.chapter ?? '',
          section: editingConcept.section ?? '',
          sectionSub: editingConcept.sectionSub ?? '',
          category: editingConcept.category ?? '',
          part: editingConcept.part ?? '',
          source: editingConcept.source ?? '',
          keywords: editingConcept.keywords ?? '',
        };
        setEditForm(form);
        setSavedEditForm(JSON.stringify(form));
      }
      return;
    }
    // 읽기 모드에서 닫기 → 개념 선택 해제
    setEditingConcept(null);
    setIsNewConcept(false);
    setIsContentEditing(false);
    setEditingBlank(null);
    setIsNewBlank(false);
  };

  const saveConcept = async () => {
    if (!editingConcept) return;
    setSaving(true);
    try {
      if (isNewConcept) {
        const body: Record<string, unknown> = {
          subjectId: editForm.subjectId || subjects[0]?.id,
          title: editForm.title,
          fullContent: editForm.fullContent,
          conceptCode: editForm.conceptCode || undefined,
          grade: editForm.grade,
          semester: editForm.semester ? Number(editForm.semester) : undefined,
          chapter: editForm.chapter || undefined,
          section: editForm.section || undefined,
          sectionSub: editForm.sectionSub || undefined,
          category: editForm.category,
          part: editForm.part,
          source: editForm.source || undefined,
          keywords: editForm.keywords.trim() || undefined,
          prerequisites: editPrereqs.map((p) => p.id),
        };
        const res = await fetch('/api/concepts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          title: editForm.title,
          fullContent: editForm.fullContent,
          conceptCode: editForm.conceptCode,
          grade: editForm.grade,
          semester: editForm.semester ? Number(editForm.semester) : null,
          chapter: editForm.chapter || null,
          section: editForm.section || null,
          sectionSub: editForm.sectionSub || null,
          category: editForm.category,
          part: editForm.part,
          source: editForm.source || null,
          keywords: editForm.keywords.trim() || null,
          prerequisites: editPrereqs.map((p) => p.id),
        };
        const res = await fetch(`/api/concepts/${editingConcept.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setSavedEditForm(JSON.stringify(editForm));
          setIsContentEditing(false);
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
      if (res.ok) {
        fetchConcepts();
      }
    } catch {
      // silently fail
    }
  };

  // Prerequisite search
  const searchPrereqs = async (query: string) => {
    setPrereqSearch(query);
    if (query.trim().length < 1) {
      setPrereqResults([]);
      return;
    }
    setPrereqSearching(true);
    try {
      const params = new URLSearchParams({ search: query, limit: '10' });
      const res = await fetch(`/api/concepts?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        const existingIds = new Set([editingConcept?.id, ...editPrereqs.map((p) => p.id)]);
        setPrereqResults(
          json.data
            .filter((c: ConceptItem) => !existingIds.has(c.id))
            .map((c: ConceptItem) => ({ id: c.id, conceptCode: c.conceptCode, title: c.title }))
        );
      }
    } catch {
      setPrereqResults([]);
    } finally {
      setPrereqSearching(false);
    }
  };

  const addPrereq = (item: PrerequisiteItem) => {
    setEditPrereqs((prev) => [...prev, item]);
    setPrereqSearch('');
    setPrereqResults([]);
  };

  const removePrereq = (id: string) => {
    setEditPrereqs((prev) => prev.filter((p) => p.id !== id));
  };

  // Blank exercise handlers
  const fetchBlanks = async (conceptId: string) => {
    setBlanksLoading(true);
    try {
      const res = await fetch(`/api/concepts/${conceptId}/blanks?all=true`);
      const json = await res.json();
      setBlankExercises(json.data ?? []);
    } catch {
      setBlankExercises([]);
    } finally {
      setBlanksLoading(false);
    }
  };

  const startEditBlank = (exercise: BlankExercise) => {
    setEditingBlank(exercise);
    const matches = [...exercise.templateText.matchAll(/\{\{(\d+)\}\}/g)];
    const seen = new Set<number>();
    const orderedPositions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); orderedPositions.push(pos); }
    }
    const blankMap = new Map(exercise.blanks.map((b) => [b.position, b]));
    const orderedBlanks = orderedPositions.map((pos) => { const b = blankMap.get(pos); return b ? { ...b, difficulty: (b as BlankItem).difficulty || 'easy' } : { position: pos, answer: '', hint: '', difficulty: 'easy' as BlankDifficulty }; });
    const form = {
      level: exercise.level,
      templateText: exercise.templateText,
      blanks: orderedBlanks,
    };
    setBlankForm(form);
    setSavedBlankForm(JSON.stringify(form));
    setIsNewBlank(false);
    templateHistory.current = [{ templateText: form.templateText, blanks: form.blanks.map((b) => ({ ...b })) }];
    templateHistoryIdx.current = 0;
  };

  const startNewBlank = () => {
    setEditingBlank(null);
    const template = editForm.fullContent;
    const matches = [...template.matchAll(/\{\{(\d+)\}\}/g)];
    const seen = new Set<number>();
    const positions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); positions.push(pos); }
    }
    const blanks = positions.map((pos) => ({ position: pos, answer: '', hint: '', difficulty: 'easy' as BlankDifficulty }));
    const form = { level: 1, templateText: template, blanks };
    setBlankForm(form);
    setSavedBlankForm(JSON.stringify(form));
    setIsNewBlank(true);
    templateHistory.current = [{ templateText: template, blanks: blanks.map((b) => ({ ...b })) }];
    templateHistoryIdx.current = 0;
  };

  const cancelBlankEdit = () => {
    setEditingBlank(null);
    setIsNewBlank(false);
    if (editingConcept) fetchBlanks(editingConcept.id);
  };

  // Auto-detect {{N}} placeholders and sync blanks array
  const syncBlanksFromTemplate = (template: string) => {
    const matches = [...template.matchAll(/\{\{(\d+)\}\}/g)];
    const seen = new Set<number>();
    const positions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); positions.push(pos); }
    }
    setBlankForm((prev) => {
      const existingMap = new Map(prev.blanks.map((b) => [b.position, b]));
      const synced = positions.map((pos) => existingMap.get(pos) ?? { position: pos, answer: '', hint: '', difficulty: 'easy' as BlankDifficulty });
      const next = { ...prev, templateText: template, blanks: synced };
      pushTemplateHistory(template, synced);
      return next;
    });
    setEditForm((p) => ({ ...p, fullContent: template }));
  };

  // Convert selected text in template textarea to a blank {{N}}
  const convertSelectionToBlank = () => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart === selectionEnd) return;
    const rawSelected = blankForm.templateText.slice(selectionStart, selectionEnd);
    if (!rawSelected.trim()) return;

    const markerPattern = /\{\{(\d+)\}\}/g;
    const childMarkers: { pos: number; matchStart: number; matchEnd: number }[] = [];
    let m;
    while ((m = markerPattern.exec(rawSelected)) !== null) {
      childMarkers.push({ pos: parseInt(m[1], 10), matchStart: m.index, matchEnd: m.index + m[0].length });
    }

    const existingPositions = blankForm.blanks.map((b) => b.position);
    const nextPos = existingPositions.length > 0 ? Math.max(...existingPositions) + 1 : 1;

    if (childMarkers.length === 0) {
      const selectedText = rawSelected.trim();
      const before = blankForm.templateText.slice(0, selectionStart);
      const after = blankForm.templateText.slice(selectionEnd);
      const newTemplate = before + `{{${nextPos}}}` + after;
      const newBlank: BlankItem = { position: nextPos, answer: selectedText, hint: getChosung(selectedText), difficulty: 'easy' };
      setBlankForm((prev) => {
        const newBlanks = [...prev.blanks, newBlank];
        pushTemplateHistory(newTemplate, newBlanks);
        return { ...prev, templateText: newTemplate, blanks: newBlanks };
      });
      setEditForm((p) => ({ ...p, fullContent: newTemplate }));
    } else {
      let fullAnswer = rawSelected;
      const children: BlankChild[] = [];
      for (let ci = childMarkers.length - 1; ci >= 0; ci--) {
        const cm = childMarkers[ci];
        const childBlank = blankForm.blanks.find((b) => b.position === cm.pos);
        const childAnswer = childBlank?.answer || '';
        fullAnswer = fullAnswer.slice(0, cm.matchStart) + childAnswer + fullAnswer.slice(cm.matchEnd);
      }
      fullAnswer = fullAnswer.trim();
      let rebuiltText = rawSelected;
      for (let ci = childMarkers.length - 1; ci >= 0; ci--) {
        const cm = childMarkers[ci];
        const childBlank = blankForm.blanks.find((b) => b.position === cm.pos);
        const childAnswer = childBlank?.answer || '';
        rebuiltText = rebuiltText.slice(0, cm.matchStart) + childAnswer + rebuiltText.slice(cm.matchEnd);
      }
      const trimOffset = rebuiltText.indexOf(rebuiltText.trim());
      for (const cm of childMarkers) {
        const childBlank = blankForm.blanks.find((b) => b.position === cm.pos);
        if (!childBlank) continue;
        const beforeChild = rawSelected.slice(0, cm.matchStart);
        let offsetInFull = beforeChild.length;
        for (const prev of childMarkers) {
          if (prev.matchStart < cm.matchStart) {
            const prevBlank = blankForm.blanks.find((b) => b.position === prev.pos);
            const prevAnswer = prevBlank?.answer || '';
            offsetInFull += prevAnswer.length - (prev.matchEnd - prev.matchStart);
          }
        }
        offsetInFull -= trimOffset;
        children.push({
          position: childBlank.position,
          answer: childBlank.answer,
          hint: childBlank.hint,
          offset: offsetInFull,
          length: childBlank.answer.length,
        });
      }
      const before = blankForm.templateText.slice(0, selectionStart);
      const after = blankForm.templateText.slice(selectionEnd);
      const newTemplate = before + `{{${nextPos}}}` + after;
      const remainingText = before + after;
      const absorbedPositions = new Set<number>();
      for (const cm of childMarkers) {
        if (!remainingText.includes(`{{${cm.pos}}}`)) {
          absorbedPositions.add(cm.pos);
        }
      }
      const newBlank: BlankItem = {
        position: nextPos,
        answer: fullAnswer,
        hint: getChosung(fullAnswer),
        difficulty: 'hard',
        children,
      };
      setBlankForm((prev) => {
        const newBlanks = [...prev.blanks.filter((b) => !absorbedPositions.has(b.position)), newBlank];
        pushTemplateHistory(newTemplate, newBlanks);
        return { ...prev, templateText: newTemplate, blanks: newBlanks };
      });
      setEditForm((p) => ({ ...p, fullContent: newTemplate }));
    }
  };

  const updateBlankItem = (position: number, field: 'answer' | 'hint' | 'difficulty', value: string) => {
    setBlankForm((prev) => ({
      ...prev,
      blanks: prev.blanks.map((b) => {
        if (b.position !== position) return b;
        if (field === 'answer') {
          return { ...b, answer: value, hint: getChosung(value) };
        }
        return { ...b, [field]: value };
      }),
    }));
  };

  const autoRenumber = () => {
    setBlankForm((prev) => {
      const matches = [...prev.templateText.matchAll(/\{\{(\d+)\}\}/g)];
      const seen = new Set<number>();
      const oldOrder: number[] = [];
      for (const m of matches) {
        const pos = parseInt(m[1], 10);
        if (!seen.has(pos)) { seen.add(pos); oldOrder.push(pos); }
      }
      const mapping = new Map<number, number>();
      oldOrder.forEach((oldPos, i) => mapping.set(oldPos, i + 1));
      const newTemplate = prev.templateText.replace(/\{\{(\d+)\}\}/g, (_, n) => {
        const oldPos = parseInt(n, 10);
        return `{{${mapping.get(oldPos) ?? oldPos}}}`;
      });
      const newBlanks = prev.blanks.map((b) => ({
        ...b,
        position: mapping.get(b.position) ?? b.position,
      })).sort((a, b) => a.position - b.position);
      return { ...prev, templateText: newTemplate, blanks: newBlanks };
    });
  };

  const handleBlankDrop = (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    setBlankForm((prev) => {
      const newBlanks = [...prev.blanks];
      const [moved] = newBlanks.splice(dragIdx, 1);
      newBlanks.splice(dropIdx, 0, moved);
      const oldPositions = prev.blanks.map((b) => b.position);
      const newPositions = newBlanks.map((b) => b.position);
      const mapping = new Map<number, number>();
      oldPositions.forEach((oldPos, i) => {
        mapping.set(oldPos, newPositions[i]);
      });
      const reIndexed = newBlanks.map((b, i) => ({ ...b, position: oldPositions[i] }));
      const newTemplate = prev.templateText.replace(/\{\{(\d+)\}\}/g, (_, n) => {
        const oldPos = parseInt(n, 10);
        return `{{${mapping.get(oldPos) ?? oldPos}}}`;
      });
      return { ...prev, templateText: newTemplate, blanks: reIndexed };
    });
    setDragIdx(null);
  };

  const saveBlankExercise = async () => {
    if (!editingConcept) return;
    if (!blankForm.templateText.trim()) return;
    if (blankForm.blanks.some((b) => !b.answer.trim())) return;

    setBlankSaving(true);
    try {
      if (isNewBlank) {
        const res = await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blankForm),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.id) {
            setEditingBlank({ id: json.data.id, conceptId: editingConcept.id, ...blankForm });
            setIsNewBlank(false);
          }
        }
      } else if (editingBlank) {
        const putRes = await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseId: editingBlank.id, ...blankForm }),
        });
        if (!putRes.ok) {
          toast.error('빈칸 문제 저장에 실패했습니다.');
          return;
        }
      }
      await fetchBlanks(editingConcept.id);
      setSavedBlankForm(JSON.stringify(blankForm));
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setBlankSaving(false);
    }
  };

  const deleteBlankExercise = async (exerciseId: string) => {
    if (!editingConcept) return;
    if (!(await confirm({ message: '이 빈칸 문제를 삭제하시겠습니까?', variant: 'danger', confirmLabel: '삭제' }))) return;
    try {
      const res = await fetch(`/api/concepts/${editingConcept.id}/blanks?exerciseId=${exerciseId}`, {
        method: 'DELETE',
      });
      if (!res.ok) toast.error('삭제에 실패했습니다.');
      await fetchBlanks(editingConcept.id);
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  // 내용 사전 검증
  const validateContentForAi = (content: string): string | null => {
    const trimmed = content.trim();
    if (trimmed.length < 20) return '개념 내용이 너무 짧습니다 (최소 20자).';
    const koreanChars = (trimmed.match(/[가-힣]/g) || []).length;
    if (koreanChars < 5) return '한국어 수학 개념 내용을 입력하세요.';
    const words = trimmed.split(/\s+/).filter(w => w.length >= 2);
    if (words.length < 3) return '내용이 너무 짧습니다. 문장 형태로 입력하세요.';
    return null;
  };

  // AI 메타데이터 자동 추출 + 맞춤법 검사
  const handleAiMetadataExtract = async () => {
    const validationError = validateContentForAi(editForm.fullContent);
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    const filledFields = [editForm.grade, editForm.semester, editForm.chapter, editForm.part, editForm.keywords].filter(Boolean);
    if (filledFields.length >= 5) {
      if (!(await confirm({ message: '모든 메타데이터가 이미 채워져 있습니다. AI 분류를 다시 실행하시겠습니까?', variant: 'info', confirmLabel: '실행' }))) return;
    }

    setAiMetadataLoading(true);
    try {
      const res = await fetch('/api/concepts/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editForm.title, fullContent: editForm.fullContent, currentKeywords: editForm.keywords || '' }),
      });
      if (!res.ok) throw new Error('AI extraction failed');
      const json = await res.json();
      const meta = json.data as {
        title: string; grade: string; semester: number;
        chapter: string; section: string; part: string; keywords: string;
        correctedContent: string; corrections: { original: string; corrected: string; reason: string }[];
      };

      const gradeCode = GRADE_OPTIONS.includes(meta.grade) ? meta.grade : '';

      let matchedChapter = '';
      let matchedSection = '';
      if (gradeCode) {
        const entries = getCurriculumForGrade(gradeCode);
        const isHigh = gradeCode.startsWith('high_');
        const entry = isHigh ? entries[0] : entries.find(e => e.semesterNumber === meta.semester);
        if (entry) {
          const ch = entry.chapters.find(c => c.name === meta.chapter)
            || entry.chapters.find(c => meta.chapter.includes(c.name) || c.name.includes(meta.chapter));
          if (ch) {
            matchedChapter = ch.name;
            if (meta.section && ch.subUnits) {
              const sec = ch.subUnits.find(s => s.name === meta.section)
                || ch.subUnits.find(s => meta.section.includes(s.name) || s.name.includes(meta.section));
              if (sec) matchedSection = sec.name;
            }
          }
        }
      }

      const validPart = PART_OPTIONS.includes(meta.part) ? meta.part : '';

      const proposed: { field: string; label: string; raw: string | number; display: string }[] = [];
      if (meta.title) proposed.push({ field: 'title', label: '제목', raw: meta.title, display: meta.title });
      if (gradeCode) proposed.push({ field: 'grade', label: '학년', raw: gradeCode, display: GRADE_LABELS[gradeCode] || gradeCode });
      if (meta.semester) proposed.push({ field: 'semester', label: '학기', raw: meta.semester, display: `${meta.semester}학기` });
      if (matchedChapter) proposed.push({ field: 'chapter', label: '대단원', raw: matchedChapter, display: matchedChapter });
      if (matchedSection) proposed.push({ field: 'section', label: '중단원', raw: matchedSection, display: matchedSection });
      if (validPart) proposed.push({ field: 'part', label: '영역', raw: validPart, display: PART_LABELS[validPart] || validPart });
      if (meta.keywords) proposed.push({ field: 'keywords', label: '키워드', raw: meta.keywords, display: meta.keywords });

      if (meta.correctedContent && meta.correctedContent.trim() && meta.corrections?.length > 0) {
        const correctionSummary = meta.corrections.map(c => `${c.original} → ${c.corrected}`).join(', ');
        proposed.push({
          field: 'fullContent',
          label: '맞춤법 교정',
          raw: meta.correctedContent,
          display: `${meta.corrections.length}건: ${correctionSummary}`,
        });
      }

      const autoApply: Partial<typeof editForm> = {};
      const diffs: AiMetadataSuggestion[] = [];

      for (const p of proposed) {
        const currentRaw = editForm[p.field as keyof typeof editForm];
        const currentStr = currentRaw == null ? '' : String(currentRaw);
        const suggestedStr = String(p.raw);

        if (p.field === 'fullContent') {
          if (currentStr !== suggestedStr) {
            diffs.push({
              field: p.field,
              label: p.label,
              currentDisplay: '현재 내용',
              suggestedDisplay: p.display,
              suggestedRaw: p.raw,
              checked: true,
            });
          }
          continue;
        }

        const isSameValue = p.field === 'keywords'
          ? new Set(currentStr.split(',').map(s => s.trim()).filter(Boolean)).size === new Set(suggestedStr.split(',').map(s => s.trim()).filter(Boolean)).size
            && currentStr.split(',').map(s => s.trim()).filter(Boolean).every(k => suggestedStr.split(',').map(s => s.trim()).includes(k))
          : currentStr === suggestedStr;

        if (!currentStr || currentStr === '0') {
          autoApply[p.field as keyof typeof editForm] = p.raw as never;
        } else if (!isSameValue) {
          let currentDisplay = currentStr;
          if (p.field === 'grade') currentDisplay = GRADE_LABELS[currentStr] || currentStr;
          else if (p.field === 'part') currentDisplay = PART_LABELS[currentStr] || currentStr;
          else if (p.field === 'semester') currentDisplay = `${currentStr}학기`;
          diffs.push({
            field: p.field,
            label: p.label,
            currentDisplay,
            suggestedDisplay: p.display,
            suggestedRaw: p.raw,
            checked: true,
          });
        }
      }

      if (Object.keys(autoApply).length > 0) {
        setEditForm((prev) => ({ ...prev, ...autoApply }));
      }

      if (diffs.length > 0) {
        setAiSuggestions(diffs);
      } else if (Object.keys(autoApply).length > 0) {
        // All fields were empty and auto-filled
      } else {
        toast.info('AI 분석 결과가 현재 값과 동일합니다.');
      }
    } catch {
      toast.error('AI 메타데이터 추출에 실패했습니다.');
    } finally {
      setAiMetadataLoading(false);
    }
  };

  // AI 제안 적용
  const handleApplyAiSuggestions = () => {
    if (!aiSuggestions) return;
    const updates: Partial<typeof editForm> = {};
    for (const s of aiSuggestions) {
      if (s.checked) {
        updates[s.field as keyof typeof editForm] = s.suggestedRaw as never;
      }
    }
    if (Object.keys(updates).length > 0) {
      setEditForm((prev) => ({ ...prev, ...updates }));
    }
    setAiSuggestions(null);
  };

  // AI 빈칸 자동 생성
  const handleAiBlankGenerate = async (mergeSameTerms: boolean) => {
    if (!editingConcept) return;
    setShowBlankGenOptions(false);
    const validationError = validateContentForAi(editForm.fullContent);
    if (validationError) {
      toast.warning(validationError);
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch('/api/concepts/bulk/extract-blanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ title: editForm.title, fullContent: editForm.fullContent }],
          mergeSameTerms,
        }),
      });

      if (!res.ok) throw new Error('AI extraction failed');
      const json = await res.json();
      const result = json.data?.[0] as { templateText: string; blanks: { position: number; answer: string; hint: string; difficulty: string }[] } | undefined;

      if (!result || !result.templateText || result.blanks.length === 0) {
        toast.warning('AI가 빈칸을 추출하지 못했습니다. 내용이 충분한지 확인하세요.');
        return;
      }

      const blanks: BlankItem[] = result.blanks.map((b) => ({
        position: b.position,
        answer: b.answer,
        hint: b.hint,
        difficulty: (b.difficulty === 'hard' ? 'hard' : b.difficulty === 'full' ? 'full' : 'easy') as BlankDifficulty,
      }));

      const form = { level: 1, templateText: result.templateText, blanks };
      setBlankForm(form);
      setSavedBlankForm('');
      setEditForm((p) => ({ ...p, fullContent: result.templateText }));

      if (blankExercises.length > 0) {
        setEditingBlank(blankExercises[0]);
        setIsNewBlank(false);
      } else {
        setEditingBlank(null);
        setIsNewBlank(true);
      }

      templateHistory.current = [{ templateText: result.templateText, blanks: blanks.map((b) => ({ ...b })) }];
      templateHistoryIdx.current = 0;
    } catch {
      toast.error('AI 빈칸 추출에 실패했습니다.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Ctrl+S 저장 단축키
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isDirty || saving || blankSaving || !editForm.title || !editForm.fullContent) return;
        if (conceptDirty) await saveConcept();
        if (blankDirty && (editingBlank || isNewBlank)) await saveBlankExercise();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Remove blank from form
  const removeBlankFromForm = (b: BlankItem) => {
    const marker = `{{${b.position}}}`;
    let restored = b.answer || '';
    const restoredChildren: BlankItem[] = [];
    if (b.children && b.children.length > 0) {
      const sortedChildren = [...b.children].sort((a, c) => c.offset - a.offset);
      for (const child of sortedChildren) {
        restored = restored.slice(0, child.offset) + `{{${child.position}}}` + restored.slice(child.offset + child.length);
      }
      for (const child of b.children) {
        restoredChildren.push({ position: child.position, answer: child.answer, hint: child.hint, difficulty: 'easy' });
      }
    }
    const newTemplate = blankForm.templateText.replaceAll(marker, restored);
    const newBlanks = [...blankForm.blanks.filter((bl) => bl.position !== b.position), ...restoredChildren];
    pushTemplateHistory(newTemplate, newBlanks);
    setBlankForm((prev) => ({ ...prev, templateText: newTemplate, blanks: newBlanks }));
    setEditForm((p) => ({ ...p, fullContent: newTemplate }));
  };

  return {
    // Filter state
    search, setSearch,
    levelFilter, setLevelFilter,
    gradeFilter, setGradeFilter,
    categoryFilter,
    semesterFilter, setSemesterFilter,
    chapterFilter, setChapterFilter,
    sectionFilter, setSectionFilter,
    partFilter, setPartFilter,
    currentPage, setCurrentPage,

    // Data
    concepts, subjects, meta, loading,

    // Edit state
    editingConcept, isNewConcept, editForm, setEditForm, saving,
    isHighSchool, chapterOptions, sectionOptions, sectionSubOptions,

    // Prerequisites
    editPrereqs, prereqSearch, prereqResults, prereqSearching,
    searchPrereqs, addPrereq, removePrereq,

    // Blank exercises
    blankExercises, blanksLoading, editingBlank, setEditingBlank, blankForm, isNewBlank, setIsNewBlank, blankSaving,
    dragIdx, setDragIdx,

    // AI
    aiGenerating, showBlankGenOptions, setShowBlankGenOptions,
    aiMetadataLoading, aiSuggestions, setAiSuggestions,

    // Content editing
    isContentEditing, setIsContentEditing,

    // Bulk import
    bulkImportOpen, setBulkImportOpen,

    // Left panel
    leftPanelCollapsed, setLeftPanelCollapsed,
    viewMode, setViewMode,
    showBlanks, setShowBlanks,
    mathPopupOpen, setMathPopupOpen,
    contentTextareaRef,
    templateViewMode, setTemplateViewMode,
    templateMathPopup, setTemplateMathPopup,
    editingBlankPos, setEditingBlankPos,

    // Template refs
    templateHighlightRef, templateTextareaRef,

    // Preview state
    previewOriginalOpen, setPreviewOriginalOpen,
    previewStudentOpen, setPreviewStudentOpen,

    // Template undo/redo
    templateUndo, templateRedo, pushTemplateHistory,

    // Dirty state
    conceptDirty, blankDirty, isDirty,

    // Actions
    startEditing, selectConceptById, startNewConcept, cancelEditing,
    saveConcept, deleteConcept,
    fetchConcepts,
    startEditBlank, startNewBlank, cancelBlankEdit,
    syncBlanksFromTemplate, convertSelectionToBlank,
    updateBlankItem, autoRenumber, handleBlankDrop,
    saveBlankExercise, deleteBlankExercise,
    removeBlankFromForm,
    handleAiMetadataExtract, handleApplyAiSuggestions, handleAiBlankGenerate,

    // Owner/Admin check (passed through for convenience)
    isOwner,
  };
}

export type ConceptManagerReturn = ReturnType<typeof useConceptManager>;
