'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  FileText,
  Download,
  Filter,
  BookOpen,
  FolderOpen,
  Edit,
  Trash2,
  KeyRound,
  Loader2,
  X,
  Save,
  Check,
  FunctionSquare,
  ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Shapes,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { MathRenderer } from '@/components/math/MathRenderer';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import { ImageUploadPopup } from '@/components/math/ImageUploadButton';
import { EditableMathRenderer } from '@/components/math/EditableMathRenderer';
import { DiagramEditorPopup } from '@/components/math/DiagramEditorPopup';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import { DIFFICULTY_LABELS, TYPE_LABELS, BOOK_LABELS, DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
import type { QuestionDifficulty, QuestionType, LevelTestDomain } from '@/types';
import type { DiagramParam } from '@/types/pdf-extract';

// --- Constants ---
const MIDDLE_BOOK_CODES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'] as const;
const ELEMENTARY_BOOK_CODES = ['E3-1', 'E3-2', 'E4-1', 'E4-2', 'E5-1', 'E5-2', 'E6-1', 'E6-2'] as const;
const DIFFICULTY_OPTIONS = ['전체', '하', '중', '상', '최상'] as const;
const TYPE_OPTIONS = ['객관식', '단답형', '서술형'] as const;
const ITEMS_PER_PAGE = 10;

// 새 문제 추가 모달에서 사용하는 기본 단원 목록 (fallback)
const CHAPTERS_BY_BOOK_DEFAULT: Record<string, string[]> = {
  'E3-1': ['덧셈과 뺄셈', '평면도형', '나눗셈', '곱셈', '길이와 시간', '분수와 소수'],
  'E3-2': ['곱셈', '나눗셈', '원', '분수', '들이와 무게', '자료의 정리'],
  'E4-1': ['큰 수', '각도', '곱셈과 나눗셈', '평면도형의 이동', '막대그래프', '규칙 찾기'],
  'E4-2': ['분수의 덧셈과 뺄셈', '삼각형', '소수의 덧셈과 뺄셈', '사각형', '꺾은선그래프', '다각형'],
  'E5-1': ['자연수의 혼합 계산', '약수와 배수', '규칙과 대응', '약분과 통분', '분수의 덧셈과 뺄셈', '다각형의 둘레와 넓이'],
  'E5-2': ['수의 범위와 어림', '분수의 곱셈', '합동과 대칭', '소수의 곱셈', '직육면체', '평균과 가능성'],
  'E6-1': ['분수의 나눗셈', '각기둥과 각뿔', '소수의 나눗셈', '비와 비율', '여러 가지 그래프', '직육면체의 부피와 겉넓이'],
  'E6-2': ['분수의 나눗셈', '소수의 나눗셈', '공간과 입체', '비례식과 비례배분', '원의 넓이', '원기둥 원뿔 구'],
};

const DIFFICULTY_TO_ENUM: Record<string, QuestionDifficulty> = {
  하: 'BASIC',
  중: 'MEDIUM',
  상: 'HIGH',
  최상: 'HIGHEST',
};
const TYPE_TO_ENUM: Record<string, QuestionType> = {
  객관식: 'MULTIPLE_CHOICE',
  단답형: 'SHORT_ANSWER',
  서술형: 'ESSAY',
};

interface QuestionItem {
  id: string;
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  sourceTag: string | null;
  domain: string | null;
  conceptId: string | null;
  diagramSpec?: DiagramParam[] | null;
}

interface Meta {
  page: number;
  total: number;
  totalPages: number;
}

function getDifficultyBadgeColor(d: string) {
  switch (d) {
    case '하':
      return 'bg-green-100 text-green-700';
    case '중':
      return 'bg-yellow-100 text-yellow-700';
    case '상':
      return 'bg-red-100 text-red-700';
    case '최상':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getTopicBadgeColor(topic: string) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < topic.length; i++) hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function QuestionsPage() {
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
  const [editForm, setEditForm] = useState({
    content: '',
    answer: '',
    explanation: '',
    difficulty: '' as QuestionDifficulty,
    type: '' as QuestionType,
    choices: [] as string[],
    chapter: '',
    section: '',
    sourceTag: '',
    domain: '' as string,
    conceptId: '' as string,
    diagramParams: [] as DiagramParam[],
  });
  const [concepts, setConcepts] = useState<{ id: string; conceptCode: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // MathLive 수식 에디터
  const [mathPopup, setMathPopup] = useState<{
    open: boolean;
    field: 'content' | 'answer' | 'explanation' | 'choice';
    choiceIndex?: number;
    initialLatex: string;
    replaceRange?: { start: number; end: number };
  }>({ open: false, field: 'content', initialLatex: '' });
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const explanationRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLInputElement>(null);
  const choiceRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cursorPosRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // 이미지 업로드 팝업
  const [imagePopup, setImagePopup] = useState<{
    open: boolean;
    field: 'content' | 'explanation';
  }>({ open: false, field: 'content' });

  // 도형 편집기 상태
  const [diagramEditorOpen, setDiagramEditorOpen] = useState(false);
  const [editingDiagramIdx, setEditingDiagramIdx] = useState<number | null>(null);
  const [diagramMode, setDiagramMode] = useState<'edit' | 'create'>('edit');

  // 새 문제 추가
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createForm, setCreateForm] = useState({
    bookCode: 'E3-1',
    chapter: '',
    section: '',
    questionNum: 1,
    difficulty: 'BASIC' as QuestionDifficulty,
    type: 'SHORT_ANSWER' as QuestionType,
    content: '',
    choices: ['', '', '', '', ''],
    answer: '',
    explanation: '',
    sourceTag: '',
    diagramParams: [] as DiagramParam[],
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
        } catch { /* ignore */ }
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
        alert('문제 생성에 실패했습니다.');
      }
    } catch {
      alert('문제 생성 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Fetch book counts (once on mount)
  useEffect(() => {
    fetch('/api/questions/stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          const counts: Record<string, number> = {};
          json.data.byBook.forEach((b: { bookCode: string; count: number }) => {
            counts[b.bookCode] = b.count;
          });
          setBookCounts(counts);
          setTotalCount(json.data.total);
          if (json.data.chaptersByBook) setChaptersByBook(json.data.chaptersByBook);
          if (json.data.sectionsByBook) setSectionsByBook(json.data.sectionsByBook);
        }
      })
      .catch(() => {});
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

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // 개념 목록 로드 (편집 모드 시 conceptId 선택용)
  useEffect(() => {
    fetch('/api/concepts?limit=200')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data) setConcepts(json.data.map((c: { id: string; conceptCode: string; title: string }) => ({ id: c.id, conceptCode: c.conceptCode || '', title: c.title })));
      })
      .catch(() => {});
  }, []);

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
        } catch { /* ignore */ }
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
        alert('문제 저장에 실패했습니다.');
      }
    } catch {
      alert('문제 저장 중 오류가 발생했습니다.');
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
        alert('문제 삭제에 실패했습니다.');
      }
    } catch {
      alert('문제 삭제 중 오류가 발생했습니다.');
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

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Header + Filters ===== */}
      <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${leftPanelCollapsed ? 'w-12' : 'w-72'}`}>
        {/* Panel Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!leftPanelCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                <h1 className="text-sm font-bold text-text-primary truncate">문제 은행</h1>
                <span className="text-[10px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
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
        </div>

        {!leftPanelCollapsed && (
          <div className="flex-1 flex flex-col gap-2 p-2.5 overflow-y-auto">
        {/* School Level Tabs */}
        <Card className="p-3 flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <div className="bg-primary/10 rounded-sm p-2 text-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold leading-normal">학년 / 학기</h3>
              <p className="text-text-secondary text-xs">교재별 문제 분류</p>
            </div>
          </div>

          {/* School Level Toggle */}
          <div className="flex rounded-sm bg-slate-100 p-1">
            <button
              onClick={() => { setSchoolLevel('elementary'); setBookFilter(null); setChapterFilter(null); setSectionFilter(null); setCurrentPage(1); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-colors ${
                schoolLevel === 'elementary' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              초등 (3~6학년)
            </button>
            <button
              onClick={() => { setSchoolLevel('middle'); setBookFilter(null); setChapterFilter(null); setSectionFilter(null); setCurrentPage(1); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-colors ${
                schoolLevel === 'middle' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              중등 (1~3학년)
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            <button
              onClick={() => {
                setBookFilter(null);
                setChapterFilter(null);
                setSectionFilter(null);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-sm font-medium text-sm transition-colors text-left ${
                bookFilter === null
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span>전체 보기</span>
              <span
                className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                  bookFilter === null ? 'bg-primary/20' : 'bg-slate-100'
                }`}
              >
                {schoolTotal || meta.total}
              </span>
            </button>
            {(schoolLevel === 'middle' ? MIDDLE_BOOK_CODES : ELEMENTARY_BOOK_CODES).map((code) => (
              <button
                key={code}
                onClick={() => {
                  setBookFilter(code);
                  setChapterFilter(null);
                  setSectionFilter(null);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-sm font-medium text-sm transition-colors text-left ${
                  bookFilter === code
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{BOOK_LABELS[code]}</span>
                {bookCounts[code] != null && (
                  <span
                    className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                      bookFilter === code ? 'bg-primary/20' : 'bg-slate-100'
                    }`}
                  >
                    {bookCounts[code]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </Card>

        {/* Chapter Filter - 특정 학기 선택 시에만 표시 */}
        {bookFilter && chaptersByBook[bookFilter]?.length > 0 && (
          <Card className="p-3 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              단원 필터
            </h3>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              <button
                onClick={() => { setChapterFilter(null); setSectionFilter(null); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left ${
                  chapterFilter === null
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                }`}
              >
                전체
              </button>
              {chaptersByBook[bookFilter].map((ch) => (
                <button
                  key={ch.chapter}
                  onClick={() => { setChapterFilter(ch.chapter); setSectionFilter(null); setCurrentPage(1); }}
                  className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left flex justify-between items-center ${
                    chapterFilter === ch.chapter
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                  }`}
                >
                  <span>{ch.chapter}</span>
                  <span className={`text-[10px] ${chapterFilter === ch.chapter ? 'text-white/70' : 'text-text-tertiary'}`}>{ch.count}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Section Filter - 특정 학기 선택 시에만 표시 */}
        {bookFilter && sectionsByBook[bookFilter]?.length > 0 && (
          <Card className="p-3 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              유형/코너 필터
            </h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => { setSectionFilter(null); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left ${
                  sectionFilter === null
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                }`}
              >
                전체
              </button>
              {sectionsByBook[bookFilter].map((s) => (
                <button
                  key={s.section}
                  onClick={() => { setSectionFilter(s.section); setCurrentPage(1); }}
                  className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left flex justify-between items-center ${
                    sectionFilter === s.section
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                  }`}
                >
                  <span>{s.section}</span>
                  <span className={`text-[10px] ${sectionFilter === s.section ? 'text-white/70' : 'text-text-tertiary'}`}>{s.count}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Type Filter */}
        <Card className="p-3 flex flex-col gap-2">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            유형 필터
          </h3>
          <div className="flex flex-col gap-2">
            {TYPE_OPTIONS.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={typeFilters.has(type)}
                  onChange={() => toggleTypeFilter(type)}
                  className="form-checkbox text-primary rounded-sm border-slate-300 focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm font-medium">{type}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Difficulty Filter */}
        <Card className="p-3 flex flex-col gap-2">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            난이도
          </h3>
          <div className="flex gap-1.5">
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficultyFilter(d);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  difficultyFilter === d
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </Card>
          </div>
        )}

        {/* Collapsed state: just the BookOpen icon as a button to expand */}
        {leftPanelCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-2">
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors"
              title="문제 목록 열기"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white p-3 md:p-4 gap-3 overflow-y-auto">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-bold leading-tight text-text-primary">문제 은행</h1>
            <p className="text-text-secondary text-sm">
              초등·중등 수학 문제 검색 및 관리. 전체 {meta.total.toLocaleString()}개의 문제
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              PDF 내보내기
            </Button>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              새 문제 추가
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
            <Search className="w-5 h-5" />
          </div>
          <input
            className="w-full pl-12 pr-3 py-2.5 bg-white border border-slate-200 rounded-sm shadow-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400 transition-all"
            placeholder="문제 내용, 단원명 또는 키워드로 검색 (예: 소인수분해, 이차방정식)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Mobile filter info */}
        <div className="flex lg:hidden items-center gap-2 text-sm text-text-secondary">
          <Filter className="w-4 h-4" />
          <span>
            {bookFilter ? BOOK_LABELS[bookFilter] : '전체'} &bull;{' '}
            {difficultyFilter === '전체' ? '모든 난이도' : difficultyFilter} &bull;{' '}
            {meta.total}개 결과
          </span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-text-secondary">문제를 불러오는 중...</span>
          </div>
        ) : (
          <>
            {/* Questions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {questions.length === 0 ? (
                <div className="col-span-full text-center py-8 text-text-secondary">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">조건에 맞는 문제가 없습니다.</p>
                  <p className="text-sm mt-1">필터를 조정하거나 PDF 파싱을 실행해주세요.</p>
                </div>
              ) : (
                questions.map((q) => (
                  <Card
                    key={q.id}
                    className="p-3 flex flex-col gap-2 hover:shadow-hover transition-shadow cursor-pointer"
                    onClick={() => openQuestion(q)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-sm">
                          {BOOK_LABELS[q.bookCode] || q.bookCode}
                        </span>
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-sm ${getTopicBadgeColor(q.chapter)}`}
                        >
                          {q.chapter}
                        </span>
                        {q.section && (
                          <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
                            {q.section}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-sm ${getDifficultyBadgeColor(
                            DIFFICULTY_LABELS[q.difficulty]
                          )}`}
                        >
                          {DIFFICULTY_LABELS[q.difficulty]}
                        </span>
                        <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
                          {TYPE_LABELS[q.type]}
                        </span>
                        {q.domain && DOMAIN_LABELS[q.domain as LevelTestDomain] && (
                          <span className={`px-2 py-1 text-xs font-bold rounded-sm ${DOMAIN_COLORS[q.domain as LevelTestDomain]?.bg} ${DOMAIN_COLORS[q.domain as LevelTestDomain]?.text}`}>
                            {DOMAIN_LABELS[q.domain as LevelTestDomain]}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 text-text-secondary">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditing(q); }}
                          className="p-1 hover:text-primary transition-colors rounded-sm hover:bg-slate-100"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {deleteConfirm === q.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => deleteQuestion(q.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-sm text-xs font-bold"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1 hover:bg-slate-100 rounded-sm text-xs"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(q.id); }}
                            className="p-1 hover:text-red-500 transition-colors rounded-sm hover:bg-red-50"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-sm leading-relaxed font-medium text-text-primary">
                      <MathRenderer content={q.content} />
                      {q.choices && Array.isArray(q.choices) && (
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          {(q.choices as string[]).map((c, i) => (
                            <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                              <MathRenderer content={c} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-text-secondary flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        정답: <MathRenderer content={q.answer} className="inline" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedExplanation(expandedExplanation === q.id ? null : q.id);
                        }}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {expandedExplanation === q.id ? '해설 닫기' : '해설 보기'}
                      </button>
                    </div>
                    {expandedExplanation === q.id && (
                      <div className="text-xs text-text-secondary bg-slate-50 rounded-sm p-2.5 border border-slate-100">
                        {q.explanation ? (
                          <MathRenderer content={q.explanation} />
                        ) : (
                          '해설이 아직 등록되지 않았습니다.'
                        )}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>

            {/* Pagination */}
            {meta.total > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-2">
                <p className="text-sm text-text-secondary">
                  {meta.total.toLocaleString()}개 중{' '}
                  {((currentPage - 1) * ITEMS_PER_PAGE + 1).toLocaleString()}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, meta.total).toLocaleString()} 표시
                </p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={meta.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* View / Edit Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2.5" onClick={closeModal}>
          <div
            className={`bg-white rounded-sm shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all ${
              modalMode === 'edit' ? 'max-w-6xl' : 'max-w-2xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 border-b border-slate-200 px-3 py-2.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  {modalMode === 'view' ? '문제 조회' : '문제 수정'}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {BOOK_LABELS[selectedQuestion.bookCode] || selectedQuestion.bookCode} · #{selectedQuestion.questionNum}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {modalMode === 'view' && (
                  <Button variant="secondary" size="sm" onClick={() => startEditing()}>
                    <Edit className="w-4 h-4 mr-1.5" />
                    수정
                  </Button>
                )}
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {modalMode === 'view' ? (
              /* ── View Mode ── */
              <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-sm">
                    {BOOK_LABELS[selectedQuestion.bookCode] || selectedQuestion.bookCode}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-sm ${getTopicBadgeColor(selectedQuestion.chapter)}`}>
                    {selectedQuestion.chapter}
                  </span>
                  {selectedQuestion.section && (
                    <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
                      {selectedQuestion.section}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-sm ${getDifficultyBadgeColor(DIFFICULTY_LABELS[selectedQuestion.difficulty])}`}>
                    {DIFFICULTY_LABELS[selectedQuestion.difficulty]}
                  </span>
                  <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
                    {TYPE_LABELS[selectedQuestion.type]}
                  </span>
                  {selectedQuestion.domain && DOMAIN_LABELS[selectedQuestion.domain as LevelTestDomain] && (
                    <span className={`px-2 py-1 text-xs font-bold rounded-sm ${DOMAIN_COLORS[selectedQuestion.domain as LevelTestDomain]?.bg} ${DOMAIN_COLORS[selectedQuestion.domain as LevelTestDomain]?.text}`}>
                      {DOMAIN_LABELS[selectedQuestion.domain as LevelTestDomain]}
                    </span>
                  )}
                  {selectedQuestion.conceptId && (() => {
                    const c = concepts.find((x) => x.id === selectedQuestion.conceptId);
                    return c ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-sm bg-slate-100 text-slate-600">
                        {c.conceptCode ? `${c.conceptCode} · ` : ''}{c.title}
                      </span>
                    ) : null;
                  })()}
                </div>

                {/* Content */}
                <div className="text-sm">
                  <MathRenderer content={selectedQuestion.content} />
                </div>

                {/* Choices */}
                {selectedQuestion.choices && Array.isArray(selectedQuestion.choices) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(selectedQuestion.choices as string[]).map((c, i) => (
                      <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                        <MathRenderer content={c} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Answer */}
                <div className="border-t border-slate-200 pt-2.5">
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-primary" />
                    정답
                  </h3>
                  <div className="px-3 py-2 bg-primary/5 rounded-sm text-sm">
                    <MathRenderer content={selectedQuestion.answer} />
                  </div>
                </div>

                {/* Explanation */}
                <div className="border-t border-slate-200 pt-2.5">
                  <h3 className="text-sm font-bold mb-2">해설</h3>
                  {selectedQuestion.explanation ? (
                    <div className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100 text-sm">
                      <MathRenderer content={selectedQuestion.explanation} />
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary italic">해설이 등록되지 않았습니다.</p>
                  )}
                </div>

                {/* Source Tag */}
                {selectedQuestion.sourceTag && (
                  <div className="text-xs text-text-secondary pt-2 border-t border-slate-100">
                    출처: {selectedQuestion.sourceTag}
                  </div>
                )}
              </div>
            ) : (
              /* ── Edit Mode ── */
              <div className="flex-1 flex divide-x divide-slate-200 min-h-0">
                {/* Left: Editors */}
                <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">단원</label>
                      <input
                        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        value={editForm.chapter}
                        onChange={(e) => setEditForm((p) => ({ ...p, chapter: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">소단원</label>
                      <input
                        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        value={editForm.section}
                        onChange={(e) => setEditForm((p) => ({ ...p, section: e.target.value }))}
                        placeholder="소단원"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">난이도</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        value={editForm.difficulty}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, difficulty: e.target.value as QuestionDifficulty }))
                        }
                      >
                        <option value="BASIC">하</option>
                        <option value="MEDIUM">중</option>
                        <option value="HIGH">상</option>
                        <option value="HIGHEST">최상</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">유형</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        value={editForm.type}
                        onChange={(e) => {
                          const newType = e.target.value as QuestionType;
                          setEditForm((p) => {
                            const updated = { ...p, type: newType };
                            if (newType === 'MULTIPLE_CHOICE' && updated.choices.length < 5) {
                              const padded = [...updated.choices];
                              while (padded.length < 5) padded.push('');
                              updated.choices = padded;
                            }
                            return updated;
                          });
                        }}
                      >
                        <option value="MULTIPLE_CHOICE">객관식</option>
                        <option value="SHORT_ANSWER">단답형</option>
                        <option value="ESSAY">서술형</option>
                      </select>
                    </div>
                  </div>

                  {/* 4대영역 · 개념 태깅 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">4대영역</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        value={editForm.domain}
                        onChange={(e) => setEditForm((p) => ({ ...p, domain: e.target.value }))}
                      >
                        <option value="">미지정</option>
                        <option value="CALCULATION">계산력</option>
                        <option value="UNDERSTANDING">이해력</option>
                        <option value="PROBLEM_SOLVING">문제해결력</option>
                        <option value="REASONING">추론력</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">연결 개념</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        value={editForm.conceptId}
                        onChange={(e) => setEditForm((p) => ({ ...p, conceptId: e.target.value }))}
                      >
                        <option value="">미지정</option>
                        {concepts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.conceptCode ? `[${c.conceptCode}] ` : ''}{c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-text-secondary">문제 내용</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openMathPopup('content')}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                          title="수식 삽입"
                        >
                          <FunctionSquare className="w-3.5 h-3.5" />
                          수식
                        </button>
                        <button
                          type="button"
                          onClick={() => openImagePopup('content')}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                          title="이미지 삽입"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          이미지
                        </button>
                        <button
                          type="button"
                          onClick={() => openDiagramEditor('edit')}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-50 rounded-sm transition-colors"
                          title="도형 삽입"
                        >
                          <Shapes className="w-3.5 h-3.5" />
                          도형
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={contentRef}
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[100px] resize-y"
                      value={editForm.content}
                      onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
                    />
                  </div>

                  {editForm.type === 'MULTIPLE_CHOICE' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-text-secondary">선택지</label>
                        <button
                          type="button"
                          onClick={() => openMathPopup('choice', 0)}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                          title="수식 삽입"
                        >
                          <FunctionSquare className="w-3.5 h-3.5" />
                          수식
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {editForm.choices.map((c, i) => (
                          <div key={i} className="flex gap-1">
                            <input
                              ref={(el) => { choiceRefs.current[i] = el; }}
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              value={c}
                              onChange={(e) => updateChoice(i, e.target.value)}
                              placeholder={`선택지 ${i + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => openMathPopup('choice', i)}
                              className="px-1.5 text-slate-400 hover:text-primary transition-colors shrink-0"
                              title="수식 삽입"
                            >
                              <FunctionSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-text-secondary">정답</label>
                      <button
                        type="button"
                        onClick={() => openMathPopup('answer')}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                        title="수식 삽입"
                      >
                        <FunctionSquare className="w-3.5 h-3.5" />
                        수식
                      </button>
                    </div>
                    <input
                      ref={answerRef}
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      value={editForm.answer}
                      onChange={(e) => setEditForm((p) => ({ ...p, answer: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-text-secondary">해설</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openMathPopup('explanation')}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                          title="수식 삽입"
                        >
                          <FunctionSquare className="w-3.5 h-3.5" />
                          수식
                        </button>
                        <button
                          type="button"
                          onClick={() => openImagePopup('explanation')}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                          title="이미지 삽입"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          이미지
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={explanationRef}
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[80px] resize-y"
                      value={editForm.explanation}
                      onChange={(e) => setEditForm((p) => ({ ...p, explanation: e.target.value }))}
                      placeholder="해설을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">출처 태그</label>
                    <input
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      value={editForm.sourceTag}
                      onChange={(e) => setEditForm((p) => ({ ...p, sourceTag: e.target.value }))}
                      placeholder="출처"
                    />
                  </div>
                </div>

                {/* Right: Live Preview (수식 클릭 → 편집) */}
                <div className="flex-1 overflow-y-auto px-3 py-3 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">미리보기</h3>
                    <span className="text-[10px] text-slate-400">수식을 클릭하면 편집할 수 있습니다</span>
                  </div>

                  <div className="text-sm">
                    <EditableMathRenderer
                      content={editForm.content}
                      onMathClick={(latex, start, end) => openMathEdit('content', latex, start, end)}
                    />
                  </div>

                  {editForm.type === 'MULTIPLE_CHOICE' && editForm.choices.some((c) => c) && (
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      {editForm.choices.map((c, i) =>
                        c ? (
                          <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                            <EditableMathRenderer
                              content={c}
                              onMathClick={(latex, start, end) => openMathEdit('choice', latex, start, end, i)}
                            />
                          </div>
                        ) : null
                      )}
                    </div>
                  )}

                  {editForm.answer && (
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        정답
                      </h4>
                      <div className="px-3 py-2 bg-primary/5 rounded-sm text-sm">
                        <EditableMathRenderer
                          content={editForm.answer}
                          onMathClick={(latex, start, end) => openMathEdit('answer', latex, start, end)}
                        />
                      </div>
                    </div>
                  )}

                  {editForm.explanation && (
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <h4 className="text-xs font-bold text-text-secondary mb-1.5">해설</h4>
                      <div className="px-3 py-2 bg-white rounded-sm border border-slate-100 text-sm">
                        <EditableMathRenderer
                          content={editForm.explanation}
                          onMathClick={(latex, start, end) => openMathEdit('explanation', latex, start, end)}
                        />
                      </div>
                    </div>
                  )}

                  {/* 도형 미리보기 */}
                  {editForm.diagramParams && editForm.diagramParams.length > 0 && (
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                        <Shapes className="w-3.5 h-3.5" />
                        도형 ({editForm.diagramParams.length}개)
                      </h4>
                      <div className="space-y-2">
                        {editForm.diagramParams.map((dp, idx) => {
                          let svg = '';
                          try { svg = renderDiagram({ type: dp.type as DiagramType, params: dp.params as Record<string, unknown> }) ?? ''; } catch { /* ignore */ }
                          return (
                            <div key={idx} className="relative group border border-slate-100 rounded-sm p-2 bg-white">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-slate-400">[그림{idx + 1}] {dp.label}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => editDiagram(idx, 'edit')}
                                    className="text-[10px] px-1.5 py-0.5 text-primary hover:bg-primary/10 rounded"
                                  >수정</button>
                                  <button
                                    onClick={() => removeDiagram(idx, 'edit')}
                                    className="text-[10px] px-1.5 py-0.5 text-red-500 hover:bg-red-50 rounded"
                                  >삭제</button>
                                </div>
                              </div>
                              {svg && (
                                <div
                                  className="[&_svg]:max-w-full [&_svg]:h-auto"
                                  dangerouslySetInnerHTML={{ __html: svg }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-200 px-3 py-2.5 flex justify-end gap-2">
              {modalMode === 'view' ? (
                <Button variant="secondary" size="sm" onClick={closeModal}>
                  닫기
                </Button>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setModalMode('view')}>
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveQuestion}
                    disabled={saving || !editForm.content || !editForm.answer}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? '저장 중...' : saveSuccess ? '저장됨' : '저장'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 새 문제 추가 모달 ── */}
      {isCreateMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2.5" onClick={closeCreateModal}>
          <div
            className="bg-white rounded-sm shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 border-b border-slate-200 px-3 py-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">새 문제 추가</h2>
              <button onClick={closeCreateModal} className="p-2 hover:bg-slate-100 rounded-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex divide-x divide-slate-200 min-h-0">
              {/* Left: Form */}
              <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                {/* 교재/단원/번호 */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">교재</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                      value={createForm.bookCode}
                      onChange={(e) => setCreateForm((p) => ({ ...p, bookCode: e.target.value, chapter: '' }))}
                    >
                      {[...ELEMENTARY_BOOK_CODES, ...MIDDLE_BOOK_CODES].map((code) => (
                        <option key={code} value={code}>{BOOK_LABELS[code] || code}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">단원</label>
                    {(chaptersByBook[createForm.bookCode]?.length || CHAPTERS_BY_BOOK_DEFAULT[createForm.bookCode]) ? (
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                        value={createForm.chapter}
                        onChange={(e) => setCreateForm((p) => ({ ...p, chapter: e.target.value }))}
                      >
                        <option value="">선택</option>
                        {(chaptersByBook[createForm.bookCode]?.map(c => c.chapter) || CHAPTERS_BY_BOOK_DEFAULT[createForm.bookCode] || []).map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                        value={createForm.chapter}
                        onChange={(e) => setCreateForm((p) => ({ ...p, chapter: e.target.value }))}
                        placeholder="단원명 입력"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">문제 번호</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                      value={createForm.questionNum}
                      onChange={(e) => setCreateForm((p) => ({ ...p, questionNum: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                {/* 코너/난이도/유형 */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">코너 (선택)</label>
                    <input
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                      value={createForm.section}
                      onChange={(e) => setCreateForm((p) => ({ ...p, section: e.target.value }))}
                      placeholder="개념 완성하기, 실력 다지기 등"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">난이도</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                      value={createForm.difficulty}
                      onChange={(e) => setCreateForm((p) => ({ ...p, difficulty: e.target.value as QuestionDifficulty }))}
                    >
                      <option value="BASIC">하</option>
                      <option value="MEDIUM">중</option>
                      <option value="HIGH">상</option>
                      <option value="HIGHEST">최상</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">유형</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                      value={createForm.type}
                      onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value as QuestionType }))}
                    >
                      <option value="MULTIPLE_CHOICE">객관식</option>
                      <option value="SHORT_ANSWER">단답형</option>
                      <option value="ESSAY">서술형</option>
                    </select>
                  </div>
                </div>

                {/* 문제 내용 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-text-secondary">문제 내용</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openMathPopup('content')}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                      >
                        <FunctionSquare className="w-3.5 h-3.5" />
                        수식
                      </button>
                      <button
                        type="button"
                        onClick={() => openImagePopup('content')}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        이미지
                      </button>
                      <button
                        type="button"
                        onClick={() => openDiagramEditor('create')}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-50 rounded-sm transition-colors"
                        title="도형 삽입"
                      >
                        <Shapes className="w-3.5 h-3.5" />
                        도형
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={contentRef}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 min-h-[120px] resize-y"
                    value={createForm.content}
                    onChange={(e) => setCreateForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="문제 내용을 입력하세요. 이미지 버튼으로 그림을 추가할 수 있습니다."
                  />
                </div>

                {/* 선택지 (객관식) */}
                {createForm.type === 'MULTIPLE_CHOICE' && (
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block">선택지</label>
                    <div className="space-y-2">
                      {createForm.choices.map((c, i) => (
                        <input
                          key={i}
                          className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                          value={c}
                          onChange={(e) => {
                            setCreateForm((p) => {
                              const choices = [...p.choices];
                              choices[i] = e.target.value;
                              return { ...p, choices };
                            });
                          }}
                          placeholder={`${i + 1}번 선택지`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 정답 */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">정답</label>
                  <input
                    ref={answerRef}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                    value={createForm.answer}
                    onChange={(e) => setCreateForm((p) => ({ ...p, answer: e.target.value }))}
                    placeholder="정답 입력"
                  />
                </div>

                {/* 해설 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-text-secondary">해설 (선택)</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openMathPopup('explanation')}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                      >
                        <FunctionSquare className="w-3.5 h-3.5" />
                        수식
                      </button>
                      <button
                        type="button"
                        onClick={() => openImagePopup('explanation')}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        이미지
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={explanationRef}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-y"
                    value={createForm.explanation}
                    onChange={(e) => setCreateForm((p) => ({ ...p, explanation: e.target.value }))}
                    placeholder="해설을 입력하세요"
                  />
                </div>

                {/* 출처 태그 */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">출처 태그 (선택)</label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                    value={createForm.sourceTag}
                    onChange={(e) => setCreateForm((p) => ({ ...p, sourceTag: e.target.value }))}
                    placeholder="출처"
                  />
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="flex-1 overflow-y-auto px-3 py-3 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">미리보기</h3>
                </div>

                <div className="text-sm">
                  {createForm.content ? (
                    <MathRenderer content={createForm.content} />
                  ) : (
                    <p className="text-slate-400 italic text-sm">문제 내용을 입력하면 미리보기가 표시됩니다</p>
                  )}
                </div>

                {createForm.type === 'MULTIPLE_CHOICE' && createForm.choices.some((c) => c) && (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    {createForm.choices.map((c, i) =>
                      c ? (
                        <div key={i} className="px-3 py-2 bg-white rounded-sm border border-slate-200">
                          <MathRenderer content={c} />
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {createForm.answer && (
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      정답
                    </h4>
                    <div className="px-3 py-2 bg-primary/5 rounded-sm text-sm">
                      <MathRenderer content={createForm.answer} />
                    </div>
                  </div>
                )}

                {createForm.explanation && (
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <h4 className="text-xs font-bold text-text-secondary mb-1.5">해설</h4>
                    <div className="px-3 py-2 bg-white rounded-sm border border-slate-100 text-sm">
                      <MathRenderer content={createForm.explanation} />
                    </div>
                  </div>
                )}

                {/* 도형 미리보기 */}
                {createForm.diagramParams && createForm.diagramParams.length > 0 && (
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                      <Shapes className="w-3.5 h-3.5" />
                      도형 ({createForm.diagramParams.length}개)
                    </h4>
                    <div className="space-y-2">
                      {createForm.diagramParams.map((dp, idx) => {
                        let svg = '';
                        try { svg = renderDiagram({ type: dp.type as DiagramType, params: dp.params as Record<string, unknown> }) ?? ''; } catch { /* ignore */ }
                        return (
                          <div key={idx} className="relative group border border-slate-100 rounded-sm p-2 bg-white">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-400">[그림{idx + 1}] {dp.label}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => editDiagram(idx, 'create')}
                                  className="text-[10px] px-1.5 py-0.5 text-primary hover:bg-primary/10 rounded"
                                >수정</button>
                                <button
                                  onClick={() => removeDiagram(idx, 'create')}
                                  className="text-[10px] px-1.5 py-0.5 text-red-500 hover:bg-red-50 rounded"
                                >삭제</button>
                              </div>
                            </div>
                            {svg && (
                              <div
                                className="[&_svg]:max-w-full [&_svg]:h-auto"
                                dangerouslySetInnerHTML={{ __html: svg }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-200 px-3 py-2.5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={closeCreateModal}>
                취소
              </Button>
              <Button
                size="sm"
                onClick={createQuestion}
                disabled={saving || !createForm.content || !createForm.answer || !createForm.chapter}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {saving ? '저장 중...' : saveSuccess ? '저장됨' : '추가'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MathLive 수식 편집 팝업 */}
      <MathLivePopup
        isOpen={mathPopup.open}
        onClose={() => setMathPopup((p) => ({ ...p, open: false }))}
        onInsert={handleMathInsert}
        initialLatex={mathPopup.initialLatex}
      />

      {/* 이미지 업로드 팝업 */}
      <ImageUploadPopup
        isOpen={imagePopup.open}
        onClose={() => setImagePopup((p) => ({ ...p, open: false }))}
        onInsert={handleImageInsert}
      />

      {/* 도형 편집기 팝업 */}
      <DiagramEditorPopup
        isOpen={diagramEditorOpen}
        initialParam={editingDiagramIdx !== null
          ? (diagramMode === 'create' ? createForm : editForm).diagramParams?.[editingDiagramIdx] ?? null
          : null
        }
        diagramIndex={editingDiagramIdx}
        onClose={() => setDiagramEditorOpen(false)}
        onSave={handleDiagramSave}
      />
    </div>
  );
}
