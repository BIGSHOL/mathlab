'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/Toast';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import type { QuestionDifficulty, QuestionType } from '@/types';
import type { DiagramParam } from '@/types/pdf-extract';
import {
  MIDDLE_BOOK_CODES,
  ELEMENTARY_BOOK_CODES,
  DIFFICULTY_TO_ENUM,
  TYPE_TO_ENUM,
  TYPE_OPTIONS,
  ITEMS_PER_PAGE,
  type QuestionItem,
  type Meta,
  type EditFormState,
  type CreateFormState,
  type MathPopupState,
  type ImagePopupState,
  type ConceptOption,
} from './question-types';

export function useQuestionManager() {
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [schoolLevel, setSchoolLevel] = useState<'middle' | 'elementary'>('middle');
  const [bookFilter, setBookFilter] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('전체');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(TYPE_OPTIONS));
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Book counts + chapters/sections from stats API
  const [bookCounts, setBookCounts] = useState<Record<string, number>>({});
  const [, setTotalCount] = useState(0);
  const [chaptersByBook, setChaptersByBook] = useState<Record<string, { chapter: string; count: number }[]>>({});
  const [sectionsByBook, setSectionsByBook] = useState<Record<string, { section: string; count: number }[]>>({});

  // View / Edit modal
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [editForm, setEditForm] = useState<EditFormState>({
    content: '',
    answer: '',
    explanation: '',
    difficulty: '' as QuestionDifficulty,
    type: '' as QuestionType,
    choices: [],
    chapter: '',
    section: '',
    sourceTag: '',
    domain: '',
    conceptId: '',
    diagramParams: [],
  });
  const [concepts, setConcepts] = useState<ConceptOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // MathLive 수식 에디터
  const [mathPopup, setMathPopup] = useState<MathPopupState>({ open: false, field: 'content', initialLatex: '' });
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const explanationRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLInputElement>(null);
  const choiceRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cursorPosRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // 이미지 업로드 팝업
  const [imagePopup, setImagePopup] = useState<ImagePopupState>({ open: false, field: 'content' });

  // 도형 편집기 상태
  const [diagramEditorOpen, setDiagramEditorOpen] = useState(false);
  const [editingDiagramIdx, setEditingDiagramIdx] = useState<number | null>(null);
  const [diagramMode, setDiagramMode] = useState<'edit' | 'create'>('edit');

  // 새 문제 추가
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    bookCode: 'E3-1',
    chapter: '',
    section: '',
    questionNum: 1,
    difficulty: 'BASIC',
    type: 'SHORT_ANSWER',
    content: '',
    choices: ['', '', '', '', ''],
    answer: '',
    explanation: '',
    sourceTag: '',
    diagramParams: [],
  });

  // "수식" 버튼 → 커서가 $...$ 안이면 기존 수식 편집, 아니면 새 삽입
  const openMathPopup = (field: 'content' | 'answer' | 'explanation' | 'choice', choiceIndex?: number) => {
    let el: HTMLTextAreaElement | HTMLInputElement | null = null;
    if (field === 'content') el = contentRef.current;
    else if (field === 'explanation') el = explanationRef.current;
    else if (field === 'answer') el = answerRef.current;
    else if (field === 'choice' && choiceIndex !== undefined) el = choiceRefs.current[choiceIndex];

    let initialLatex = '';
    let replaceRange: { start: number; end: number } | undefined;
    if (el) {
      const cursor = el.selectionStart ?? 0;
      const selEnd = el.selectionEnd ?? 0;
      const text = el.value;

      // 커서가 $...$ 수식 안에 있는지 감지
      const dollarRegex = /\$([^$]+)\$/g;
      let match;
      while ((match = dollarRegex.exec(text)) !== null) {
        const mStart = match.index;
        const mEnd = match.index + match[0].length;
        if (cursor >= mStart && cursor <= mEnd) {
          initialLatex = match[1];
          replaceRange = { start: mStart, end: mEnd };
          break;
        }
      }

      // 수식 안이 아니면 선택된 텍스트 확인
      if (!replaceRange) {
        cursorPosRef.current = { start: cursor, end: selEnd };
        if (cursor !== selEnd) {
          const selected = text.substring(cursor, selEnd);
          const m = selected.match(/^\$([^$]+)\$$/);
          initialLatex = m ? m[1] : selected;
        }
      }
    }
    setMathPopup({ open: true, field, choiceIndex, initialLatex, replaceRange });
  };

  // 미리보기에서 수식 클릭 → 기존 수식 편집
  const openMathEdit = (
    field: 'content' | 'answer' | 'explanation' | 'choice',
    latex: string,
    start: number,
    end: number,
    choiceIndex?: number,
  ) => {
    setMathPopup({
      open: true,
      field,
      choiceIndex,
      initialLatex: latex,
      replaceRange: { start, end },
    });
  };

  const handleMathInsert = useCallback((latex: string) => {
    const wrapped = `$${latex}$`;
    const { field, choiceIndex, replaceRange } = mathPopup;
    const { start, end } = replaceRange ?? cursorPosRef.current;

    const splice = (text: string) =>
      text.substring(0, start) + wrapped + text.substring(end);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setter = (isCreateMode ? setCreateForm : setEditForm) as React.Dispatch<React.SetStateAction<any>>;
    if (field === 'content') {
      setter((p: Record<string, unknown>) => ({ ...p, content: splice(p.content as string) }));
    } else if (field === 'explanation') {
      setter((p: Record<string, unknown>) => ({ ...p, explanation: splice(p.explanation as string) }));
    } else if (field === 'answer') {
      setter((p: Record<string, unknown>) => ({ ...p, answer: splice(p.answer as string) }));
    } else if (field === 'choice' && choiceIndex !== undefined) {
      setter((p: Record<string, unknown>) => {
        const choices = [...(p.choices as string[])];
        choices[choiceIndex] = splice(choices[choiceIndex] || '');
        return { ...p, choices };
      });
    }
  }, [mathPopup, isCreateMode]);

  // 이미지 삽입
  const openImagePopup = (field: 'content' | 'explanation') => {
    const el = field === 'content' ? contentRef.current : explanationRef.current;
    if (el) {
      cursorPosRef.current = { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length };
    }
    setImagePopup({ open: true, field });
  };

  const handleImageInsert = useCallback((markdown: string) => {
    const { field } = imagePopup;
    const { start, end } = cursorPosRef.current;
    const splice = (text: string) =>
      text.substring(0, start) + markdown + text.substring(end);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setter = (isCreateMode ? setCreateForm : setEditForm) as React.Dispatch<React.SetStateAction<any>>;
    if (field === 'content') {
      setter((p: Record<string, unknown>) => ({ ...p, content: splice(p.content as string) }));
    } else if (field === 'explanation') {
      setter((p: Record<string, unknown>) => ({ ...p, explanation: splice(p.explanation as string) }));
    }
  }, [imagePopup, isCreateMode]);

  // 도형 편집기 열기 (새 도형 추가)
  const openDiagramEditor = (mode: 'edit' | 'create') => {
    setDiagramMode(mode);
    setEditingDiagramIdx(null);
    setDiagramEditorOpen(true);
  };

  // 기존 도형 편집
  const editDiagram = (idx: number, mode: 'edit' | 'create') => {
    setDiagramMode(mode);
    setEditingDiagramIdx(idx);
    setDiagramEditorOpen(true);
  };

  // 도형 저장 콜백
  const handleDiagramSave = (param: DiagramParam, _svg: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setter = diagramMode === 'create' ? setCreateForm : setEditForm;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setter((prev: any) => {
      const params = [...(prev.diagramParams || [])];
      if (editingDiagramIdx !== null) {
        params[editingDiagramIdx] = param;
      } else {
        params.push(param);
      }
      let content = prev.content as string;
      if (editingDiagramIdx === null) {
        const tag = `[그림${params.length}]`;
        if (!content.includes(tag)) {
          content = content + (content.endsWith('\n') ? '' : '\n\n') + tag;
        }
      }
      return { ...prev, diagramParams: params, content };
    });
    setDiagramEditorOpen(false);
  };

  // 도형 삭제
  const removeDiagram = (idx: number, mode: 'edit' | 'create') => {
    const setter = mode === 'create' ? setCreateForm : setEditForm;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setter((prev: any) => {
      const params = (prev.diagramParams as DiagramParam[]).filter((_: DiagramParam, i: number) => i !== idx);
      let content = prev.content as string;
      content = content.replace(new RegExp(`\\[그림${idx + 1}\\]\\n*`, 'g'), '');
      for (let i = idx + 1; i <= (prev.diagramParams as DiagramParam[]).length; i++) {
        content = content.replace(new RegExp(`\\[그림${i + 1}\\]`, 'g'), `[그림${i}]`);
      }
      return { ...prev, diagramParams: params, content };
    });
  };

  // Fetch questions from API
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (bookFilter) {
      params.set('bookCode', bookFilter);
    } else {
      // 전체 보기: 학교급에 맞는 bookCode 프리픽스 필터
      params.set('bookCodePrefix', schoolLevel === 'elementary' ? 'E' : '');
    }
    if (chapterFilter) params.set('chapter', chapterFilter);
    if (sectionFilter) params.set('section', sectionFilter);
    if (difficultyFilter !== '전체') params.set('difficulty', DIFFICULTY_TO_ENUM[difficultyFilter]);

    // Handle type filter
    const selectedTypes = Array.from(typeFilters);
    if (selectedTypes.length === 1) {
      params.set('type', TYPE_TO_ENUM[selectedTypes[0]]);
    }

    if (searchDebounced) params.set('search', searchDebounced);
    params.set('page', String(currentPage));
    params.set('limit', String(ITEMS_PER_PAGE));

    try {
      const res = await fetch(`/api/questions?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        let data = json.data;
        if (selectedTypes.length > 1 && selectedTypes.length < TYPE_OPTIONS.length) {
          const enumSet = new Set(selectedTypes.map((t) => TYPE_TO_ENUM[t]));
          data = data.filter((q: QuestionItem) => enumSet.has(q.type));
        }
        setQuestions(data);
        setMeta(json.meta ?? { page: 1, total: 0, totalPages: 1 });
      }
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [bookFilter, chapterFilter, sectionFilter, difficultyFilter, typeFilters, searchDebounced, currentPage, schoolLevel]);

  // 새 문제 추가
  const openCreateModal = () => {
    setIsCreateMode(true);
    setSelectedQuestion(null);
    setModalMode('edit');
    setCreateForm({
      bookCode: bookFilter || (schoolLevel === 'elementary' ? 'E3-1' : '1-1'),
      chapter: '',
      section: '',
      questionNum: 1,
      difficulty: 'BASIC',
      type: 'SHORT_ANSWER',
      content: '',
      choices: ['', '', '', '', ''],
      answer: '',
      explanation: '',
      sourceTag: '',
      diagramParams: [],
    });
    setSaveSuccess(false);
  };

  const closeCreateModal = () => {
    setIsCreateMode(false);
    setSaveSuccess(false);
  };

  const createQuestion = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        bookCode: createForm.bookCode,
        chapter: createForm.chapter,
        section: createForm.section || null,
        questionNum: createForm.questionNum,
        difficulty: createForm.difficulty,
        type: createForm.type,
        content: createForm.content,
        answer: createForm.answer,
        explanation: createForm.explanation || null,
        sourceTag: createForm.sourceTag || null,
      };
      if (createForm.type === 'MULTIPLE_CHOICE') {
        const filtered = createForm.choices.filter((c) => c.trim());
        if (filtered.length >= 2) body.choices = filtered;
      }
      if (createForm.diagramParams?.length > 0) {
        body.diagramSpec = createForm.diagramParams.map((dp) => ({
          type: dp.type, label: dp.label, align: dp.align, params: dp.params,
        }));
        try {
          body.diagramSVG = createForm.diagramParams
            .map((dp) => renderDiagram({ type: dp.type as DiagramType, params: dp.params as Record<string, unknown> }) ?? '')
            .join('\n');
        } catch (err) { console.error('다이어그램 SVG 렌더링 실패:', err); }
      }

      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          closeCreateModal();
          fetchQuestions();
        }, 800);
      } else {
        toast.error('문제 생성에 실패했습니다.');
      }
    } catch {
      toast.error('문제 생성 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Fetch book counts + concepts in parallel (once on mount)
  useEffect(() => {
    Promise.all([
      fetch('/api/questions/stats')
        .then((res) => res.json())
        .catch(() => null),
      fetch('/api/concepts?limit=200')
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
    ]).then(([statsJson, conceptsJson]) => {
      if (statsJson?.data) {
        const counts: Record<string, number> = {};
        statsJson.data.byBook.forEach((b: { bookCode: string; count: number }) => {
          counts[b.bookCode] = b.count;
        });
        setBookCounts(counts);
        setTotalCount(statsJson.data.total);
        if (statsJson.data.chaptersByBook) setChaptersByBook(statsJson.data.chaptersByBook);
        if (statsJson.data.sectionsByBook) setSectionsByBook(statsJson.data.sectionsByBook);
      }
      if (conceptsJson?.data) setConcepts(conceptsJson.data.map((c: { id: string; conceptCode: string; title: string }) => ({ id: c.id, conceptCode: c.conceptCode || '', title: c.title })));
    });
  }, []);

  const schoolTotal = (schoolLevel === 'middle' ? MIDDLE_BOOK_CODES : ELEMENTARY_BOOK_CODES)
    .reduce((sum, code) => sum + (bookCounts[code] || 0), 0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // View / Edit handlers
  const openQuestion = (q: QuestionItem) => {
    setSelectedQuestion(q);
    setModalMode('view');
  };

  const populateEditForm = (q: QuestionItem) => {
    const existingChoices = q.choices ? [...(q.choices as string[])] : [];
    while (existingChoices.length < 5) existingChoices.push('');
    setEditForm({
      content: q.content,
      answer: q.answer,
      explanation: q.explanation || '',
      difficulty: q.difficulty,
      type: q.type,
      choices: existingChoices,
      chapter: q.chapter,
      section: q.section || '',
      sourceTag: q.sourceTag || '',
      domain: q.domain || '',
      conceptId: q.conceptId || '',
      diagramParams: (q.diagramSpec as DiagramParam[] | null) ?? [],
    });
  };

  const startEditing = (q?: QuestionItem) => {
    const target = q || selectedQuestion;
    if (!target) return;
    setSelectedQuestion(target);
    setModalMode('edit');
    populateEditForm(target);
    setSaveSuccess(false);
  };

  const closeModal = () => {
    setSelectedQuestion(null);
    setModalMode('view');
    setSaveSuccess(false);
  };

  const saveQuestion = async () => {
    if (!selectedQuestion) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        content: editForm.content,
        answer: editForm.answer,
        explanation: editForm.explanation || null,
        difficulty: editForm.difficulty,
        type: editForm.type,
        chapter: editForm.chapter,
        section: editForm.section || null,
        sourceTag: editForm.sourceTag || null,
        domain: editForm.domain || null,
        conceptId: editForm.conceptId || null,
      };
      if (editForm.type === 'MULTIPLE_CHOICE' && editForm.choices.length >= 2) {
        body.choices = editForm.choices;
      } else {
        body.choices = null;
      }
      if (editForm.diagramParams?.length > 0) {
        body.diagramSpec = editForm.diagramParams.map((dp) => ({
          type: dp.type, label: dp.label, align: dp.align, params: dp.params,
        }));
        try {
          body.diagramSVG = editForm.diagramParams
            .map((dp) => renderDiagram({ type: dp.type as DiagramType, params: dp.params as Record<string, unknown> }) ?? '')
            .join('\n');
        } catch (err) { console.error('다이어그램 SVG 렌더링 실패:', err); }
      } else {
        body.diagramSpec = null;
        body.diagramSVG = null;
      }

      const res = await fetch(`/api/questions/${selectedQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveSuccess(true);
        const updatedQ: QuestionItem = {
          ...selectedQuestion,
          content: editForm.content,
          answer: editForm.answer,
          explanation: editForm.explanation || null,
          difficulty: editForm.difficulty,
          type: editForm.type,
          choices: editForm.type === 'MULTIPLE_CHOICE' ? editForm.choices : null,
          chapter: editForm.chapter,
          section: editForm.section || null,
          sourceTag: editForm.sourceTag || null,
          domain: editForm.domain || null,
          conceptId: editForm.conceptId || null,
          diagramSpec: editForm.diagramParams.length > 0 ? editForm.diagramParams : null,
        };
        setTimeout(() => {
          setSelectedQuestion(updatedQ);
          setModalMode('view');
          setSaveSuccess(false);
          fetchQuestions();
        }, 800);
      } else {
        toast.error('문제 저장에 실패했습니다.');
      }
    } catch {
      toast.error('문제 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        if (selectedQuestion?.id === id) closeModal();
        fetchQuestions();
      } else {
        toast.error('문제 삭제에 실패했습니다.');
      }
    } catch {
      toast.error('문제 삭제 중 오류가 발생했습니다.');
    }
  };

  const updateChoice = (index: number, value: string) => {
    setEditForm((prev) => {
      const newChoices = [...prev.choices];
      newChoices[index] = value;
      return { ...prev, choices: newChoices };
    });
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
    setCurrentPage(1);
  };

  return {
    // Filter state
    search, setSearch,
    leftPanelCollapsed, setLeftPanelCollapsed,
    schoolLevel, setSchoolLevel,
    bookFilter, setBookFilter,
    chapterFilter, setChapterFilter,
    sectionFilter, setSectionFilter,
    difficultyFilter, setDifficultyFilter,
    typeFilters, toggleTypeFilter,
    currentPage, setCurrentPage,
    expandedExplanation, setExpandedExplanation,

    // Data
    questions, meta, loading,
    bookCounts, schoolTotal,
    chaptersByBook, sectionsByBook,
    concepts,

    // View/Edit modal
    selectedQuestion, modalMode, setModalMode,
    editForm, setEditForm,
    saving, saveSuccess,
    deleteConfirm, setDeleteConfirm,
    openQuestion, startEditing, closeModal,
    saveQuestion, deleteQuestion, updateChoice,

    // Create modal
    isCreateMode, createForm, setCreateForm,
    openCreateModal, closeCreateModal, createQuestion,

    // Math popup
    mathPopup, setMathPopup,
    openMathPopup, openMathEdit, handleMathInsert,

    // Image popup
    imagePopup, setImagePopup,
    openImagePopup, handleImageInsert,

    // Diagram
    diagramEditorOpen, setDiagramEditorOpen,
    editingDiagramIdx, diagramMode,
    openDiagramEditor, editDiagram,
    handleDiagramSave, removeDiagram,

    // Refs
    contentRef, explanationRef, answerRef, choiceRefs,

    // Actions
    fetchQuestions,
  };
}
