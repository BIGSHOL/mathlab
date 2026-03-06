'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DIFFICULTY_LABELS, TYPE_LABELS, BOOK_LABELS } from '@/types';
import type { QuestionDifficulty, QuestionType } from '@/types';

// --- Constants ---
const MIDDLE_BOOK_CODES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'] as const;
const ELEMENTARY_BOOK_CODES = ['E3-1', 'E3-2', 'E4-1', 'E4-2', 'E5-1', 'E5-2', 'E6-1', 'E6-2'] as const;
const DIFFICULTY_OPTIONS = ['전체', '하', '중', '상', '최상'] as const;
const TYPE_OPTIONS = ['객관식', '단답형', '서술형'] as const;
const ITEMS_PER_PAGE = 10;

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
  const [schoolLevel, setSchoolLevel] = useState<'middle' | 'elementary'>('middle');
  const [bookFilter, setBookFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('전체');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(TYPE_OPTIONS));
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Book counts from stats API
  const [bookCounts, setBookCounts] = useState<Record<string, number>>({});
  const [, setTotalCount] = useState(0);

  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
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
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
    if (bookFilter) params.set('bookCode', bookFilter);
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
  }, [bookFilter, difficultyFilter, typeFilters, searchDebounced, currentPage]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Edit handlers
  const startEditing = (q: QuestionItem) => {
    setEditingQuestion(q);
    const existingChoices = q.choices ? [...(q.choices as string[])] : [];
    // Ensure exactly 5 choices for MULTIPLE_CHOICE
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
    });
    setSaveSuccess(false);
  };

  const cancelEditing = () => {
    setEditingQuestion(null);
    setSaveSuccess(false);
  };

  const saveQuestion = async () => {
    if (!editingQuestion) return;
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
      };
      if (editForm.type === 'MULTIPLE_CHOICE' && editForm.choices.length >= 2) {
        body.choices = editForm.choices;
      } else {
        body.choices = null;
      }

      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          setEditingQuestion(null);
          setSaveSuccess(false);
          fetchQuestions();
        }, 800);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchQuestions();
      }
    } catch {
      // silently fail
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
    <div className="flex-1 flex p-6 md:p-10 gap-6 max-w-[1600px] mx-auto w-full">
      {/* Sidebar Filters */}
      <aside className="w-64 shrink-0 hidden lg:flex flex-col gap-6">
        {/* School Level Tabs */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <div className="bg-primary/10 rounded-full p-2 text-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold leading-normal">학년 / 학기</h3>
              <p className="text-text-secondary text-xs">교재별 문제 분류</p>
            </div>
          </div>

          {/* School Level Toggle */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => { setSchoolLevel('elementary'); setBookFilter(null); setCurrentPage(1); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                schoolLevel === 'elementary' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              초등 (3~6학년)
            </button>
            <button
              onClick={() => { setSchoolLevel('middle'); setBookFilter(null); setCurrentPage(1); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
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
                setCurrentPage(1);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors text-left ${
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
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors text-left ${
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

        {/* Type Filter */}
        <Card className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            유형 필터
          </h3>
          <div className="flex flex-col gap-2">
            {TYPE_OPTIONS.map((type) => (
              <label key={type} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={typeFilters.has(type)}
                  onChange={() => toggleTypeFilter(type)}
                  className="form-checkbox text-primary rounded border-slate-300 focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm font-medium">{type}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Difficulty Filter */}
        <Card className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            난이도
          </h3>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficultyFilter(d);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
      </aside>

      {/* Main Content */}
      <section className="flex-1 flex flex-col gap-6 min-w-0">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold leading-tight text-text-primary">문제 은행</h1>
            <p className="text-text-secondary text-sm">
              초등·중등 수학 문제 검색 및 관리. 전체 {meta.total.toLocaleString()}개의 문제
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              PDF 내보내기
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              새 문제 추가
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
            <Search className="w-5 h-5" />
          </div>
          <input
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400 transition-all"
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
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-text-secondary">문제를 불러오는 중...</span>
          </div>
        ) : (
          <>
            {/* Questions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {questions.length === 0 ? (
                <div className="col-span-full text-center py-16 text-text-secondary">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">조건에 맞는 문제가 없습니다.</p>
                  <p className="text-sm mt-1">필터를 조정하거나 PDF 파싱을 실행해주세요.</p>
                </div>
              ) : (
                questions.map((q) => (
                  <Card
                    key={q.id}
                    className="p-5 flex flex-col gap-4 hover:shadow-hover transition-shadow"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded">
                          {BOOK_LABELS[q.bookCode] || q.bookCode}
                        </span>
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded ${getTopicBadgeColor(q.chapter)}`}
                        >
                          {q.chapter}
                        </span>
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded ${getDifficultyBadgeColor(
                            DIFFICULTY_LABELS[q.difficulty]
                          )}`}
                        >
                          {DIFFICULTY_LABELS[q.difficulty]}
                        </span>
                        <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded">
                          {TYPE_LABELS[q.type]}
                        </span>
                      </div>
                      <div className="flex gap-1 text-text-secondary">
                        <button
                          onClick={() => startEditing(q)}
                          className="p-1 hover:text-primary transition-colors rounded hover:bg-slate-100"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {deleteConfirm === q.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteQuestion(q.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded text-xs font-bold"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1 hover:bg-slate-100 rounded text-xs"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(q.id)}
                            className="p-1 hover:text-red-500 transition-colors rounded hover:bg-red-50"
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
                        <div className="grid grid-cols-2 gap-2 mt-3 text-text-secondary">
                          {(q.choices as string[]).map((c, i) => (
                            <MathRenderer key={i} content={c} className="inline" />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-text-secondary flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        정답: <MathRenderer content={q.answer} className="inline" />
                      </div>
                      <button
                        onClick={() =>
                          setExpandedExplanation(expandedExplanation === q.id ? null : q.id)
                        }
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {expandedExplanation === q.id ? '해설 닫기' : '해설 보기'}
                      </button>
                    </div>
                    {expandedExplanation === q.id && (
                      <div className="text-xs text-text-secondary bg-slate-50 rounded-lg p-3 border border-slate-100">
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
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2">
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
      </section>

      {/* Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">문제 수정</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {BOOK_LABELS[editingQuestion.bookCode] || editingQuestion.bookCode} · #{editingQuestion.questionNum}
                </p>
              </div>
              <button onClick={cancelEditing} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {/* 단원 */}
              <div>
                <label className="block text-sm font-bold mb-1.5">단원</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editForm.chapter}
                  onChange={(e) => setEditForm((p) => ({ ...p, chapter: e.target.value }))}
                />
              </div>

              {/* 소단원 */}
              <div>
                <label className="block text-sm font-bold mb-1.5">소단원 <span className="text-text-secondary font-normal">(선택)</span></label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editForm.section}
                  onChange={(e) => setEditForm((p) => ({ ...p, section: e.target.value }))}
                  placeholder="소단원을 입력하세요"
                />
              </div>

              {/* 난이도 / 유형 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5">난이도</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
                  <label className="block text-sm font-bold mb-1.5">유형</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
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

              {/* 문제 내용 */}
              <div>
                <label className="block text-sm font-bold mb-1.5">문제 내용</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[120px] resize-y"
                  value={editForm.content}
                  onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
                />
                {editForm.content && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                    <p className="text-xs text-text-secondary mb-1 font-bold">미리보기</p>
                    <MathRenderer content={editForm.content} />
                  </div>
                )}
              </div>

              {/* 선택지 (객관식) */}
              {editForm.type === 'MULTIPLE_CHOICE' && (
                <div>
                  <label className="block text-sm font-bold mb-1.5">선택지</label>
                  <div className="flex flex-col gap-2">
                    {editForm.choices.map((c, i) => (
                      <input
                        key={i}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        value={c}
                        onChange={(e) => updateChoice(i, e.target.value)}
                        placeholder={`선택지 ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 정답 */}
              <div>
                <label className="block text-sm font-bold mb-1.5">정답</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[60px] resize-y"
                  value={editForm.answer}
                  onChange={(e) => setEditForm((p) => ({ ...p, answer: e.target.value }))}
                />
              </div>

              {/* 해설 */}
              <div>
                <label className="block text-sm font-bold mb-1.5">해설 <span className="text-text-secondary font-normal">(선택)</span></label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[80px] resize-y"
                  value={editForm.explanation}
                  onChange={(e) => setEditForm((p) => ({ ...p, explanation: e.target.value }))}
                  placeholder="해설을 입력하세요"
                />
              </div>

              {/* 출처 태그 */}
              <div>
                <label className="block text-sm font-bold mb-1.5">출처 태그 <span className="text-text-secondary font-normal">(선택)</span></label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editForm.sourceTag}
                  onChange={(e) => setEditForm((p) => ({ ...p, sourceTag: e.target.value }))}
                  placeholder="출처 태그를 입력하세요"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={cancelEditing}>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
