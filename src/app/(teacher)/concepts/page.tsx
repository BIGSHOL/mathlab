'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  Brain,
  Plus,
  Link2,
  FileText,
  AlertCircle,
  Eye,
  GripVertical,
  RefreshCw,
  Upload,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  FunctionSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/hooks/useAuth';
import BulkImportModal from '@/components/bulk-import/BulkImportModal';
import { InlineMathText } from '@/components/math/InlineMathText';
import { CurriculumTree } from '@/components/curriculum/CurriculumTree';
import { MathLivePopup } from '@/components/math/MathLivePopup';

// --- Constants ---
const ITEMS_PER_PAGE = 12;

const GRADE_LABELS: Record<string, string> = {
  elementary_3: '초등 3학년',
  elementary_4: '초등 4학년',
  elementary_5: '초등 5학년',
  elementary_6: '초등 6학년',
  middle_1: '중학 1학년',
  middle_2: '중학 2학년',
  middle_3: '중학 3학년',
  high_1: '고등 (공통수학1)',
};

const PART_LABELS: Record<string, string> = {
  calc: '수와 연산',
  algebra: '대수',
  func: '함수',
  geo: '도형',
  data: '자료와 확률',
};

const CATEGORY_LABELS: Record<string, string> = {
  concept: '개념',
  computation: '연산',
};

const GRADE_GROUPS = [
  { label: '초등', grades: ['elementary_3', 'elementary_4', 'elementary_5', 'elementary_6'] },
  { label: '중학', grades: ['middle_1', 'middle_2', 'middle_3'] },
  { label: '고등', grades: ['high_1'] },
];
const GRADE_SHORT_LABELS: Record<string, string> = {
  elementary_3: '3학년', elementary_4: '4학년', elementary_5: '5학년', elementary_6: '6학년',
  middle_1: '1학년', middle_2: '2학년', middle_3: '3학년',
  high_1: '공통수학1',
};

const GRADE_OPTIONS = Object.keys(GRADE_LABELS);
const PART_OPTIONS = Object.keys(PART_LABELS);
const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

// --- Interfaces ---
interface PrerequisiteItem {
  id: string;
  conceptCode: string;
  title: string;
}

interface SubjectItem {
  id: string;
  title: string;
  gradeLevel: number;
}

interface ConceptItem {
  id: string;
  subjectId: string;
  conceptCode: string;
  title: string;
  fullContent: string;
  grade: string;
  semester: number | null;
  chapter: string | null;
  section: string | null;
  sectionSub: string | null;
  category: string;
  part: string;
  source: string | null;
  keywords: string | null;
  prerequisites: PrerequisiteItem[];
  subConcepts: PrerequisiteItem[];
}

interface Meta {
  page: number;
  total: number;
  totalPages: number;
}

type BlankDifficulty = 'easy' | 'hard' | 'both';

interface BlankItem {
  position: number;
  answer: string;
  hint: string;
  difficulty: BlankDifficulty;
}

const DIFFICULTY_CYCLE: BlankDifficulty[] = ['both', 'easy', 'hard'];
const DIFFICULTY_LABELS: Record<BlankDifficulty, string> = { easy: '쉬움', hard: '어려움', both: '전체' };
const DIFFICULTY_COLORS: Record<BlankDifficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  hard: 'bg-amber-100 text-amber-700',
  both: 'bg-blue-100 text-blue-700',
};

interface BlankExercise {
  id: string;
  conceptId: string;
  level: number;
  templateText: string;
  blanks: BlankItem[];
}

// --- Helper Components ---
function ContentWithBlanks({ fullContent, blanks, showBlanks }: { fullContent: string; blanks: BlankItem[]; showBlanks: boolean }) {
  const restored = fullContent.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const answer = blanks.find((b) => b.position === Number(n))?.answer;
    if (showBlanks) return `⟦${answer || `(${n})`}⟧`;
    return answer || `(${n})`;
  });
  if (showBlanks) {
    return (
      <>
        {restored.split(/(⟦[^⟧]*⟧)/).map((seg, i) => {
          if (seg.startsWith('⟦') && seg.endsWith('⟧')) {
            const inner = seg.slice(1, -1);
            return (
              <span key={i} className="bg-emerald-100 text-emerald-700 rounded-sm px-0.5 border-b-2 border-emerald-400">
                <InlineMathText text={inner} />
              </span>
            );
          }
          return <InlineMathText key={i} text={seg} />;
        })}
      </>
    );
  }
  return <InlineMathText text={restored} />;
}

export default function ConceptsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Filter state
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
  const [chapterFilter, setChapterFilter] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editingConcept, setEditingConcept] = useState<ConceptItem | null>(null);
  const [isNewConcept, setIsNewConcept] = useState(false);
  const [editForm, setEditForm] = useState({
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

  // Prerequisite editing state
  const [editPrereqs, setEditPrereqs] = useState<PrerequisiteItem[]>([]);
  const [prereqSearch, setPrereqSearch] = useState('');
  const [prereqResults, setPrereqResults] = useState<PrerequisiteItem[]>([]);
  const [prereqSearching, setPrereqSearching] = useState(false);

  // Blank exercise state
  const [blankExercises, setBlankExercises] = useState<BlankExercise[]>([]);
  const [blanksLoading, setBlanksLoading] = useState(false);
  const [editingBlank, setEditingBlank] = useState<BlankExercise | null>(null);
  const [blankForm, setBlankForm] = useState({ level: 1, templateText: '', blanks: [] as BlankItem[] });
  const [isNewBlank, setIsNewBlank] = useState(false);
  const [blankSaving, setBlankSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Bulk import state
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Left panel collapse state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [showBlanks, setShowBlanks] = useState(false);
  const [mathPopupOpen, setMathPopupOpen] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Template highlight overlay ref & textarea ref for selection
  const templateHighlightRef = useRef<HTMLDivElement>(null);
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Preview section collapse state (column 2)
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
    // Trim future states if we're not at the end
    if (idx < hist.length - 1) {
      hist.splice(idx + 1);
    }
    hist.push({ templateText, blanks: blanks.map((b) => ({ ...b })) });
    // Keep max 100 entries
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

  // Dirty state tracking — compare current form JSON with saved snapshot
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
    if (gradeFilter) params.set('grade', gradeFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (semesterFilter) params.set('semester', String(semesterFilter));
    if (chapterFilter) params.set('chapter', chapterFilter);
    if (sectionFilter) params.set('section', sectionFilter);
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
  }, [gradeFilter, categoryFilter, semesterFilter, chapterFilter, sectionFilter, searchDebounced, currentPage]);

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  // Fetch subjects for the create form
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
  const startEditing = (concept: ConceptItem) => {
    if (editingConcept && isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 다른 개념으로 이동하시겠습니까?')) return;
    setEditingConcept(concept);
    setIsNewConcept(false);
    const form = {
      subjectId: concept.subjectId,
      title: concept.title,
      fullContent: concept.fullContent,
      conceptCode: concept.conceptCode,
      grade: concept.grade,
      semester: concept.semester ?? '' as string | number,
      chapter: concept.chapter ?? '',
      section: concept.section ?? '',
      sectionSub: concept.sectionSub ?? '',
      category: concept.category,
      part: concept.part,
      source: concept.source ?? '',
      keywords: concept.keywords ?? '',
    };
    setEditForm(form);
    setSavedEditForm(JSON.stringify(form));
    setEditPrereqs(concept.prerequisites ?? []);
    setPrereqSearch('');
    setPrereqResults([]);
    // Fetch blank exercises
    setBlankExercises([]);
    setEditingBlank(null);
    setIsNewBlank(false);
    fetchBlanks(concept.id);
  };

  const startNewConcept = () => {
    if (editingConcept && isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 새 개념을 추가하시겠습니까?')) return;
    setEditingConcept({ id: '__new__', subjectId: '', conceptCode: '', title: '', fullContent: '', grade: GRADE_OPTIONS[0], semester: null, chapter: null, section: null, sectionSub: null, category: CATEGORY_OPTIONS[0], part: PART_OPTIONS[0], source: null, keywords: null, prerequisites: [], subConcepts: [] });
    setIsNewConcept(true);
    const form = {
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

  const cancelEditing = () => {
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) return;
    setEditingConcept(null);
    setIsNewConcept(false);
    setEditingBlank(null);
    setIsNewBlank(false);
  };

  const saveConcept = async () => {
    if (!editingConcept) return;
    setSaving(true);
    try {
      if (isNewConcept) {
        // Create new concept
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
        // Update existing concept
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
          fetchConcepts();
        }
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const deleteConcept = async (id: string) => {
    if (!confirm('이 개념을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
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
        // Filter out current concept and already-added prerequisites
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
    // 템플릿 내 등장 순서로 정렬
    const matches = [...exercise.templateText.matchAll(/\{\{(\d+)\}\}/g)];
    const seen = new Set<number>();
    const orderedPositions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); orderedPositions.push(pos); }
    }
    const blankMap = new Map(exercise.blanks.map((b) => [b.position, b]));
    const orderedBlanks = orderedPositions.map((pos) => { const b = blankMap.get(pos); return b ? { ...b, difficulty: (b as BlankItem).difficulty || 'both' } : { position: pos, answer: '', hint: '', difficulty: 'both' as BlankDifficulty }; });
    const form = {
      level: exercise.level,
      templateText: exercise.templateText,
      blanks: orderedBlanks,
    };
    setBlankForm(form);
    setSavedBlankForm(JSON.stringify(form));
    setIsNewBlank(false);
  };

  const startNewBlank = () => {
    setEditingBlank(null);
    // Pre-fill template from fullContent (merge)
    const template = editForm.fullContent;
    const matches = [...template.matchAll(/\{\{(\d+)\}\}/g)];
    const seen = new Set<number>();
    const positions: number[] = [];
    for (const m of matches) {
      const pos = parseInt(m[1], 10);
      if (!seen.has(pos)) { seen.add(pos); positions.push(pos); }
    }
    const blanks = positions.map((pos) => ({ position: pos, answer: '', hint: '', difficulty: 'both' as BlankDifficulty }));
    const form = { level: 1, templateText: template, blanks };
    setBlankForm(form);
    setSavedBlankForm(JSON.stringify(form));
    setIsNewBlank(true);
  };

  const cancelBlankEdit = () => {
    setEditingBlank(null);
    setIsNewBlank(false);
  };

  // Auto-detect {{N}} placeholders and sync blanks array (등장 순서 유지)
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
      const synced = positions.map((pos) => existingMap.get(pos) ?? { position: pos, answer: '', hint: '', difficulty: 'both' as BlankDifficulty });
      const next = { ...prev, templateText: template, blanks: synced };
      pushTemplateHistory(template, synced);
      return next;
    });
    // Sync template text to fullContent (merged field)
    setEditForm((p) => ({ ...p, fullContent: template }));
  };

  // Convert selected text in template textarea to a blank {{N}}
  const convertSelectionToBlank = () => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart === selectionEnd) return; // no selection
    const selectedText = blankForm.templateText.slice(selectionStart, selectionEnd).trim();
    if (!selectedText) return;
    // Find next available position number
    const existingPositions = blankForm.blanks.map((b) => b.position);
    const nextPos = existingPositions.length > 0 ? Math.max(...existingPositions) + 1 : 1;
    // Replace selected text with {{N}}
    const before = blankForm.templateText.slice(0, selectionStart);
    const after = blankForm.templateText.slice(selectionEnd);
    const newTemplate = before + `{{${nextPos}}}` + after;
    // Add new blank with selected text as answer
    const newBlank: BlankItem = { position: nextPos, answer: selectedText, hint: getChosung(selectedText), difficulty: 'both' };
    setBlankForm((prev) => {
      const newBlanks = [...prev.blanks, newBlank];
      pushTemplateHistory(newTemplate, newBlanks);
      return { ...prev, templateText: newTemplate, blanks: newBlanks };
    });
    setEditForm((p) => ({ ...p, fullContent: newTemplate }));
  };

  // 한글 초성 추출 (띄어쓰기 유지)
  const getChosung = (str: string): string => {
    const initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    let result = '';
    for (const ch of str) {
      const code = ch.charCodeAt(0);
      if (code >= 0xAC00 && code <= 0xD7A3) {
        result += initials[Math.floor((code - 0xAC00) / 588)];
      } else {
        result += ch; // 공백, 숫자, 영문 등 그대로 유지
      }
    }
    return result;
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

  // 자동 번호 정렬: 템플릿 등장 순서대로 1,2,3,... 재번호
  const autoRenumber = () => {
    setBlankForm((prev) => {
      const matches = [...prev.templateText.matchAll(/\{\{(\d+)\}\}/g)];
      const seen = new Set<number>();
      const oldOrder: number[] = [];
      for (const m of matches) {
        const pos = parseInt(m[1], 10);
        if (!seen.has(pos)) { seen.add(pos); oldOrder.push(pos); }
      }
      // old→new mapping
      const mapping = new Map<number, number>();
      oldOrder.forEach((oldPos, i) => mapping.set(oldPos, i + 1));
      // Update template
      const newTemplate = prev.templateText.replace(/\{\{(\d+)\}\}/g, (_, n) => {
        const oldPos = parseInt(n, 10);
        return `{{${mapping.get(oldPos) ?? oldPos}}}`;
      });
      // Remap blanks
      const newBlanks = prev.blanks.map((b) => ({
        ...b,
        position: mapping.get(b.position) ?? b.position,
      })).sort((a, b) => a.position - b.position);
      return { ...prev, templateText: newTemplate, blanks: newBlanks };
    });
  };

  // 드래그 재정렬
  const handleBlankDrop = (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    setBlankForm((prev) => {
      const newBlanks = [...prev.blanks];
      const [moved] = newBlanks.splice(dragIdx, 1);
      newBlanks.splice(dropIdx, 0, moved);
      // Re-assign positions: template order matches new visual order
      const oldPositions = prev.blanks.map((b) => b.position);
      const newPositions = newBlanks.map((b) => b.position);
      // Create mapping from old position → new position
      const mapping = new Map<number, number>();
      oldPositions.forEach((oldPos, i) => {
        mapping.set(oldPos, newPositions[i]);
      });
      // Swap positions to match new order
      const reIndexed = newBlanks.map((b, i) => ({ ...b, position: oldPositions[i] }));
      // Update template text
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
        await fetch(`/api/concepts/${editingConcept.id}/blanks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseId: editingBlank.id, ...blankForm }),
        });
      }
      await fetchBlanks(editingConcept.id);
      setSavedBlankForm(JSON.stringify(blankForm));
      // Don't close — stay in editing mode
    } catch {
      // silently fail
    } finally {
      setBlankSaving(false);
    }
  };

  const deleteBlankExercise = async (exerciseId: string) => {
    if (!editingConcept) return;
    if (!confirm('이 빈칸 문제를 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/concepts/${editingConcept.id}/blanks?exerciseId=${exerciseId}`, {
        method: 'DELETE',
      });
      await fetchBlanks(editingConcept.id);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Header + Search + Filters + Concept List ===== */}
      <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${leftPanelCollapsed ? 'w-12' : 'w-72'}`}>
        {/* Panel Header (was Page Header) */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!leftPanelCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <Brain className="w-4 h-4 text-primary shrink-0" />
                <h1 className="text-sm font-bold text-text-primary truncate">개념 관리</h1>
                <span className="text-[10px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  {meta.total.toLocaleString()}
                </span>
              </div>
            )}
            <button
              onClick={() => setLeftPanelCollapsed((p) => !p)}
              className="p-1 hover:bg-slate-100 rounded-md text-text-secondary transition-colors shrink-0"
              title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
            >
              {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!leftPanelCollapsed && (
          <>
            {/* Action buttons */}
            {isAdmin && (
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
            <div className="px-3 pt-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                  placeholder="개념 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="px-3 pb-2 flex gap-1.5">
              <select
                className="flex-1 min-w-0 px-1.5 py-1 text-[11px] border border-slate-200 rounded bg-white focus:ring-1 focus:ring-primary/40"
                value={gradeFilter ?? ''}
                onChange={(e) => { setGradeFilter(e.target.value || null); setCurrentPage(1); }}
              >
                <option value="">학년</option>
                {GRADE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.grades.map((g) => (
                      <option key={g} value={g}>{GRADE_SHORT_LABELS[g]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select
                className="flex-1 min-w-0 px-1.5 py-1 text-[11px] border border-slate-200 rounded bg-white focus:ring-1 focus:ring-primary/40"
                value={categoryFilter ?? ''}
                onChange={(e) => { setCategoryFilter(e.target.value || null); setCurrentPage(1); }}
              >
                <option value="">카테고리</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            {/* Curriculum Tree */}
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
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : concepts.length === 0 ? (
                <div className="text-center py-10 text-text-secondary">
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
                        <span className="text-[10px] font-mono font-bold text-primary shrink-0">{concept.conceptCode}</span>
                        <span className="text-xs font-medium text-text-primary truncate">{concept.title}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-text-secondary">{GRADE_LABELS[concept.grade]}</span>
                        <span className="text-[10px] text-slate-300">&middot;</span>
                        <span className={`text-[10px] font-medium ${concept.category === 'concept' ? 'text-blue-600' : 'text-orange-600'}`}>
                          {CATEGORY_LABELS[concept.category] ?? concept.category}
                        </span>
                        <span className="text-[10px] text-slate-300">&middot;</span>
                        <span className="text-[10px] text-text-secondary">{PART_LABELS[concept.part] ?? concept.part}</span>
                      </div>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConcept(concept.id); }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 transition-all rounded hover:bg-red-50 shrink-0"
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
              <div className="shrink-0 px-3 py-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[10px] text-text-secondary">
                  {((currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(currentPage * ITEMS_PER_PAGE, meta.total)} / {meta.total}
                </span>
                <Pagination currentPage={currentPage} totalPages={meta.totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </>
        )}

        {/* Collapsed state: just the Brain icon as a button to expand */}
        {leftPanelCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-2">
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              className="p-2 hover:bg-slate-100 rounded-lg text-primary transition-colors"
              title="개념 목록 열기"
            >
              <Brain className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

        {/* ===== Right Panel: Editor ===== */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {!editingConcept ? (
            <div className="flex-1 flex items-center justify-center text-text-secondary">
              <div className="text-center">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-15" />
                <p className="font-medium text-text-primary">개념을 선택하세요</p>
                <p className="text-sm mt-1">왼쪽 목록에서 개념을 선택하거나 새 개념을 추가하세요</p>
              </div>
            </div>
          ) : (
            <>
              {/* --- Concept Info Bar --- */}
              <div className="shrink-0 px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col gap-2">
                {/* Row 1: 제목 / 개념코드 / 출처 */}
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">제목 *</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">개념 코드</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.conceptCode}
                      onChange={(e) => setEditForm((p) => ({ ...p, conceptCode: e.target.value }))}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="w-40 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">출처</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.source}
                      onChange={(e) => setEditForm((p) => ({ ...p, source: e.target.value }))}
                      placeholder="교재명 등"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                {/* Row 2: 학년 / 학기 / 대단원 / 중단원 / 소단원 */}
                <div className="flex gap-3 items-end">
                  <div className="w-32 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">학년</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
                      value={editForm.grade}
                      onChange={(e) => setEditForm((p) => ({ ...p, grade: e.target.value }))}
                      disabled={!isAdmin}
                    >
                      {GRADE_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.grades.map((g) => (
                            <option key={g} value={g}>{GRADE_SHORT_LABELS[g]}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="w-20 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">학기</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
                      value={editForm.semester}
                      onChange={(e) => setEditForm((p) => ({ ...p, semester: e.target.value ? Number(e.target.value) : '' }))}
                      disabled={!isAdmin}
                    >
                      <option value="">-</option>
                      <option value="1">1학기</option>
                      <option value="2">2학기</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">대단원</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.chapter}
                      onChange={(e) => setEditForm((p) => ({ ...p, chapter: e.target.value }))}
                      placeholder="예: 자연수의 혼합 계산"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">중단원</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.section}
                      onChange={(e) => setEditForm((p) => ({ ...p, section: e.target.value }))}
                      placeholder="예: 덧셈과 뺄셈이 섞여 있는 식"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">소단원</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.sectionSub}
                      onChange={(e) => setEditForm((p) => ({ ...p, sectionSub: e.target.value }))}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                {/* Row 3: 카테고리 / 영역 / 키워드 */}
                <div className="flex gap-3 items-end">
                  <div className="w-24 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">카테고리</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
                      value={editForm.category}
                      onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                      disabled={!isAdmin}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28 shrink-0">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">영역</label>
                    <select
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary bg-white"
                      value={editForm.part}
                      onChange={(e) => setEditForm((p) => ({ ...p, part: e.target.value }))}
                      disabled={!isAdmin}
                    >
                      {PART_OPTIONS.map((pt) => (
                        <option key={pt} value={pt}>{PART_LABELS[pt]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-text-secondary mb-0.5">키워드</label>
                    <input
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary"
                      value={editForm.keywords}
                      onChange={(e) => setEditForm((p) => ({ ...p, keywords: e.target.value }))}
                      placeholder="쉼표로 구분"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </div>

              {/* --- Editor Body --- */}
              <div className="flex-1 overflow-hidden min-h-0">
                {(isNewBlank || editingBlank) && !isNewConcept ? (
                  /* ====== 3-Column: Template | Preview | Blanks ====== */
                  <div className="grid grid-cols-3 divide-x divide-slate-200 h-full">
                    {/* -- Col 1: Template -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-text-secondary">
                          개념 내용 / 템플릿
                          {isAdmin && (
                            <span className="font-normal ml-1 text-slate-400">
                              텍스트 선택 후 빈칸 변환
                            </span>
                          )}
                        </label>
                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setMathPopupOpen(true)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-text-secondary hover:text-primary hover:bg-primary/5 rounded-md transition-colors border border-slate-200"
                              title="수식 삽입"
                            >
                              <FunctionSquare className="w-3 h-3" />
                              수식
                            </button>
                            <button
                              type="button"
                              onClick={convertSelectionToBlank}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-md transition-colors border border-primary/30"
                              title="템플릿에서 텍스트를 선택한 후 클릭하면 빈칸으로 변환됩니다"
                            >
                              <Plus className="w-3 h-3" />
                              빈칸 변환
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="relative flex-1 min-h-[250px]">
                        <textarea
                          ref={templateTextareaRef}
                          spellCheck={false}
                          className="absolute inset-0 z-10 w-full h-full resize-none px-3 py-2 text-sm leading-relaxed bg-transparent border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50/50 disabled:text-text-secondary font-serif-kr"
                          style={{ color: 'transparent', caretColor: '#1e293b', WebkitTextFillColor: 'transparent' }}
                          value={blankForm.templateText}
                          onChange={(e) => syncBlanksFromTemplate(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                              e.preventDefault();
                              templateUndo();
                            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                              e.preventDefault();
                              templateRedo();
                            }
                          }}
                          onScroll={(e) => {
                            if (templateHighlightRef.current) {
                              templateHighlightRef.current.scrollTop = e.currentTarget.scrollTop;
                            }
                          }}
                          disabled={!isAdmin}
                        />
                        <div
                          ref={templateHighlightRef}
                          className="absolute inset-0 z-0 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-y-auto pointer-events-none rounded-lg border border-transparent font-serif-kr"
                          aria-hidden="true"
                        >
                          {blankForm.templateText ? (
                            blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) =>
                              /^\{\{\d+\}\}$/.test(part) ? (
                                <mark key={i} className="bg-amber-200/80 text-amber-900 rounded-sm">{part}</mark>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )
                          ) : (
                            <span className="text-slate-400">{'개념 내용을 입력하고 {{1}}, {{2}} 형식으로 빈칸을 지정하세요.'}</span>
                          )}
                        </div>
                      </div>

                      {/* Prerequisites (Col 1 bottom) */}
                      <div>
                        <label className="block text-xs font-bold mb-1.5 text-text-secondary flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" />
                          선수 개념 ({editPrereqs.length}개)
                        </label>
                        {editPrereqs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editPrereqs.map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium"
                              >
                                <span className="font-mono font-bold">{p.conceptCode}</span>
                                <span className="text-text-secondary">{p.title}</span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => removePrereq(p.id)}
                                    className="ml-0.5 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        {isAdmin && (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                              <Plus className="w-4 h-4" />
                            </div>
                            <input
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              value={prereqSearch}
                              onChange={(e) => searchPrereqs(e.target.value)}
                              placeholder="선수 개념 검색..."
                            />
                            {prereqSearching && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
                              </div>
                            )}
                            {prereqResults.length > 0 && (
                              <div className="absolute left-0 right-0 mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto z-10">
                                {prereqResults.map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => addPrereq(r)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="font-mono text-primary font-bold text-xs shrink-0">{r.conceptCode}</span>
                                    <span className="truncate">{r.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* -- Col 2: Preview (always visible) -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto bg-slate-50/30">
                      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        미리보기
                      </h3>
                      {blankForm.blanks.length > 0 ? (
                        <>
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setPreviewOriginalOpen((p) => !p)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                            >
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">원본 (정답 포함)</span>
                              {previewOriginalOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                            {previewOriginalOpen && (
                              <div className="px-3 pb-3">
                                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-serif-kr">
                                  {blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) =>
                                    /^\{\{\d+\}\}$/.test(part) ? (
                                      <span key={i} className="inline-flex items-center mx-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold">
                                        {(() => { const n = part.match(/\d+/)?.[0]; const blank = blankForm.blanks.find((b) => b.position === parseInt(n ?? '0', 10)); return blank?.answer || '?'; })()}
                                      </span>
                                    ) : <InlineMathText key={i} text={part} />
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setPreviewStudentOpen((p) => !p)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                            >
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">학생 화면</span>
                              {previewStudentOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                            {previewStudentOpen && (
                              <div className="px-3 pb-3">
                                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-serif-kr">
                                  {blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) =>
                                    /^\{\{\d+\}\}$/.test(part) ? (
                                      <span key={i} className="inline-block min-w-[2.5em] border-b-2 border-blue-400 mx-0.5 text-center text-[10px] text-blue-400">{part.match(/\d+/)?.[0]}</span>
                                    ) : <InlineMathText key={i} text={part} />
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-text-secondary text-xs">
                          <div className="text-center">
                            <Eye className="w-6 h-6 mx-auto mb-2 opacity-20" />
                            <p>빈칸을 추가하면<br />미리보기가 표시됩니다</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* -- Col 3: Blanks -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                          빈칸 ({blankForm.blanks.length}개)
                        </h3>
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={autoRenumber}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="등장 순서대로 1, 2, 3... 재번호"
                            >
                              <RefreshCw className="w-3 h-3" />
                              자동 정렬
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={cancelBlankEdit}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <X className="w-3 h-3" />
                            목록
                          </button>
                        </div>
                      </div>

                      {/* Difficulty legend */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 쉬움({blankForm.blanks.filter((b) => b.difficulty === 'easy').length})</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 어려움({blankForm.blanks.filter((b) => b.difficulty === 'hard').length})</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> 전체({blankForm.blanks.filter((b) => (b.difficulty || 'both') === 'both').length})</span>
                      </div>

                      {/* Blank items */}
                      {blankForm.blanks.length > 0 && (
                        <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                          {blankForm.blanks.map((b, idx) => (
                            <div
                              key={`${b.position}-${idx}`}
                              className={`bg-white rounded-lg p-2 border transition-colors ${
                                dragIdx === idx ? 'border-primary bg-primary/5' : 'border-slate-200'
                              }`}
                              draggable={isAdmin}
                              onDragStart={() => isAdmin && setDragIdx(idx)}
                              onDragOver={(e) => { e.preventDefault(); }}
                              onDrop={() => isAdmin && handleBlankDrop(idx)}
                              onDragEnd={() => setDragIdx(null)}
                            >
                              {/* Row 1: grip + badge + answer + difficulty */}
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="w-3 h-3 text-slate-300 shrink-0 cursor-grab" />
                                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}>
                                  {b.position}
                                </span>
                                <input
                                  className="flex-1 min-w-0 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary font-serif-kr"
                                  value={b.answer}
                                  onChange={(e) => updateBlankItem(b.position, 'answer', e.target.value)}
                                  placeholder="정답"
                                  disabled={!isAdmin}
                                />
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = b.difficulty || 'both';
                                      const nextIdx = (DIFFICULTY_CYCLE.indexOf(cur) + 1) % DIFFICULTY_CYCLE.length;
                                      updateBlankItem(b.position, 'difficulty', DIFFICULTY_CYCLE[nextIdx]);
                                    }}
                                    className={`shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-colors ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}
                                    title="클릭하여 난이도 변경"
                                  >
                                    {DIFFICULTY_LABELS[b.difficulty || 'both']}
                                  </button>
                                ) : (
                                  <span className={`shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full ${DIFFICULTY_COLORS[b.difficulty || 'both']}`}>
                                    {DIFFICULTY_LABELS[b.difficulty || 'both']}
                                  </span>
                                )}
                              </div>
                              {/* Row 2: hint (full width, indented under answer) */}
                              <div className="flex items-center gap-1.5 mt-1 pl-[calc(12px+6px+24px+6px)]">
                                <input
                                  className="flex-1 min-w-0 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary text-slate-500 font-serif-kr"
                                  value={b.hint}
                                  onChange={(e) => updateBlankItem(b.position, 'hint', e.target.value)}
                                  placeholder="힌트 (학생에게 보여줄 설명)"
                                  disabled={!isAdmin}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Validation warning */}
                      {blankForm.blanks.some((b) => !b.answer.trim()) && blankForm.blanks.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          모든 빈칸의 정답을 입력해주세요
                        </div>
                      )}

                      {/* Difficulty summary */}
                      {blankForm.blanks.length > 0 && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                          {blankForm.blanks.filter((b) => (b.difficulty || 'both') === 'both').length > 0 && (
                            <span>전체: {blankForm.blanks.filter((b) => (b.difficulty || 'both') === 'both').length}개</span>
                          )}
                          {blankForm.blanks.filter((b) => b.difficulty === 'easy').length > 0 && (
                            <span>쉬움만: {blankForm.blanks.filter((b) => b.difficulty === 'easy').length}개</span>
                          )}
                          {blankForm.blanks.filter((b) => b.difficulty === 'hard').length > 0 && (
                            <span>어려움만: {blankForm.blanks.filter((b) => b.difficulty === 'hard').length}개</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ====== 2-Column: Content | Blank List ====== */
                  <div className="grid grid-cols-2 divide-x divide-slate-200 h-full">
                    {/* -- Col 1: Content (원본 — 빈칸은 정답 표시) -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text-secondary">개념 내용 {isNewConcept ? '' : '(원본)'}</label>
                        {!isNewConcept && blankExercises.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowBlanks((v) => !v)}
                            className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${showBlanks ? 'bg-primary/10 text-primary font-semibold' : 'text-text-secondary hover:bg-slate-100'}`}
                          >
                            {showBlanks ? '빈칸 표시 ON' : '빈칸 표시 OFF'}
                          </button>
                        )}
                      </div>
                      {isNewConcept || (!blanksLoading && !blankExercises.length) ? (
                        /* 새 개념 또는 빈칸 없을 때: 편집 가능한 textarea + 수식 버튼 */
                        <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setMathPopupOpen(true)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-text-secondary hover:text-primary hover:bg-primary/5 rounded-md transition-colors border border-slate-200"
                                title="수식 삽입"
                              >
                                <FunctionSquare className="w-3.5 h-3.5" />
                                수식
                              </button>
                            </div>
                          )}
                          <textarea
                            ref={contentTextareaRef}
                            className="w-full h-[300px] min-h-[200px] max-h-[600px] resize-y px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white leading-relaxed font-serif-kr focus:ring-2 focus:ring-primary/40 focus:border-primary"
                            value={editForm.fullContent}
                            onChange={(e) => setEditForm((p) => ({ ...p, fullContent: e.target.value }))}
                            placeholder="개념 내용을 입력하세요..."
                            spellCheck={false}
                            disabled={!isAdmin}
                          />
                        </div>
                      ) : (
                        /* 기존 개념 + 빈칸 있을 때 (또는 로딩 중): 읽기 전용 렌더링 */
                        <div className="w-full h-[300px] min-h-[200px] max-h-[600px] resize-y px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white leading-relaxed whitespace-pre-wrap overflow-y-auto font-serif-kr">
                          {blanksLoading ? (
                            <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                          ) : (
                            <ContentWithBlanks
                              fullContent={editForm.fullContent}
                              blanks={blankExercises.flatMap((ex) => (ex.blanks as BlankItem[]))}
                              showBlanks={showBlanks}
                            />
                          )}
                        </div>
                      )}

                      {/* Prerequisites */}
                      <div>
                        <label className="block text-xs font-bold mb-1.5 text-text-secondary flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" />
                          선수 개념 ({editPrereqs.length}개)
                        </label>
                        {editPrereqs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editPrereqs.map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium"
                              >
                                <span className="font-mono font-bold">{p.conceptCode}</span>
                                <span className="text-text-secondary">{p.title}</span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => removePrereq(p.id)}
                                    className="ml-0.5 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        {isAdmin && (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                              <Plus className="w-4 h-4" />
                            </div>
                            <input
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              value={prereqSearch}
                              onChange={(e) => searchPrereqs(e.target.value)}
                              placeholder="선수 개념 검색..."
                            />
                            {prereqSearching && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
                              </div>
                            )}
                            {prereqResults.length > 0 && (
                              <div className="absolute left-0 right-0 mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto z-10">
                                {prereqResults.map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => addPrereq(r)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="font-mono text-primary font-bold text-xs shrink-0">{r.conceptCode}</span>
                                    <span className="truncate">{r.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* -- Col 2: Single blank exercise -- */}
                    <div className="px-4 py-3 flex flex-col gap-3 overflow-y-auto">
                      {(() => {
                        const ex = blankExercises[0] as BlankExercise | undefined;
                        const blanks = ex ? (ex.blanks as BlankItem[]) : [];
                        const bothCount = blanks.filter((b) => (b.difficulty || 'both') === 'both').length;
                        const easyOnlyCount = blanks.filter((b) => b.difficulty === 'easy').length;
                        const hardOnlyCount = blanks.filter((b) => b.difficulty === 'hard').length;

                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                빈칸 문제 {blanks.length > 0 ? `(${blanks.length}개)` : ''}
                              </h3>
                            </div>

                            {isNewConcept ? (
                              <div className="text-center py-10 text-text-secondary">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">개념을 먼저 생성한 후<br />빈칸 문제를 추가할 수 있습니다</p>
                              </div>
                            ) : blanksLoading ? (
                              <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              </div>
                            ) : !ex ? (
                              <div className="text-center py-10 text-text-secondary">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">등록된 빈칸 문제가 없습니다</p>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={startNewBlank}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/30"
                                  >
                                    <Plus className="w-4 h-4" />
                                    빈칸 추가
                                  </button>
                                )}
                              </div>
                            ) : (
                              <>
                                {/* Difficulty summary */}
                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                  {bothCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> 전체 {bothCount}</span>}
                                  {easyOnlyCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 쉬움 {easyOnlyCount}</span>}
                                  {hardOnlyCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 어려움 {hardOnlyCount}</span>}
                                </div>

                                {/* Blank list */}
                                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                                  {blanks.map((b) => (
                                    <div key={b.position} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${DIFFICULTY_COLORS[b.difficulty || 'both']} border-current/20`}>
                                      <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">#{b.position}</span>
                                      <span className="text-xs font-medium flex-1 truncate font-serif-kr">{b.answer}</span>
                                      {b.hint && <span className="text-[10px] opacity-60 truncate max-w-[40%] font-serif-kr">{b.hint}</span>}
                                      <span className="text-[9px] font-bold shrink-0">{DIFFICULTY_LABELS[b.difficulty || 'both']}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Delete button */}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => deleteBlankExercise(ex.id)}
                                    className="flex items-center justify-center gap-1.5 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    빈칸 문제 삭제
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* --- Footer --- */}
              <div className="shrink-0 bg-white border-t border-slate-200 px-5 py-2.5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors"
                >
                  닫기
                </button>
                {isAdmin && !isNewConcept && !(editingBlank || isNewBlank) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (blankExercises.length > 0) {
                        startEditBlank(blankExercises[0]);
                      } else {
                        startNewBlank();
                      }
                    }}
                    className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-lg border border-slate-200 text-text-primary hover:bg-slate-50 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    빈칸 편집
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (conceptDirty) await saveConcept();
                      if (blankDirty && (editingBlank || isNewBlank)) await saveBlankExercise();
                    }}
                    disabled={!isDirty || saving || blankSaving || !editForm.title || !editForm.fullContent || ((editingBlank || isNewBlank) && blankDirty && (blankForm.blanks.length === 0 || blankForm.blanks.some((b) => !b.answer.trim())))}
                    className="inline-flex items-center justify-center h-9 px-5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {(saving || blankSaving) ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {(saving || blankSaving) ? '저장 중...' : '저장'}
                  </button>
                )}
              </div>
            </>
          )}
        </main>

      {/* Bulk Import Modal */}
      {bulkImportOpen && (
        <BulkImportModal
          subjects={subjects}
          onClose={() => setBulkImportOpen(false)}
          onSuccess={() => { setBulkImportOpen(false); fetchConcepts(); }}
        />
      )}

      {/* Math Popup */}
      <MathLivePopup
        isOpen={mathPopupOpen}
        onClose={() => setMathPopupOpen(false)}
        onInsert={(latex) => {
          const insertion = `$${latex}$`;
          // 빈칸 편집 모드면 templateTextarea, 아니면 contentTextarea
          const ta = (editingBlank || isNewBlank) ? templateTextareaRef.current : contentTextareaRef.current;
          if (ta) {
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            if (editingBlank || isNewBlank) {
              const before = blankForm.templateText.slice(0, start);
              const after = blankForm.templateText.slice(end);
              syncBlanksFromTemplate(before + insertion + after);
            } else {
              const before = editForm.fullContent.slice(0, start);
              const after = editForm.fullContent.slice(end);
              setEditForm((p) => ({ ...p, fullContent: before + insertion + after }));
            }
            setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + insertion.length; }, 0);
          } else {
            if (editingBlank || isNewBlank) {
              syncBlanksFromTemplate(blankForm.templateText + insertion);
            } else {
              setEditForm((p) => ({ ...p, fullContent: p.fullContent + insertion }));
            }
          }
        }}
      />
    </div>
  );
}
