'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Edit,
  Trash2,
  BookOpen,
  Save,
  X,
  Loader2,
  Filter,
  Brain,
  Plus,
  Link2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';

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

const GRADE_OPTIONS = Object.keys(GRADE_LABELS);
const PART_OPTIONS = Object.keys(PART_LABELS);
const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

// --- Interfaces ---
interface PrerequisiteItem {
  id: string;
  conceptCode: string;
  title: string;
}

interface ConceptItem {
  id: string;
  conceptCode: string;
  title: string;
  fullContent: string;
  grade: string;
  category: string;
  part: string;
  keywords: string | null;
  prerequisites: PrerequisiteItem[];
  subConcepts: PrerequisiteItem[];
}

interface Meta {
  page: number;
  total: number;
  totalPages: number;
}

// --- Helpers ---
function getCategoryBadgeColor(category: string) {
  switch (category) {
    case 'concept':
      return 'bg-blue-100 text-blue-700';
    case 'computation':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getPartBadgeColor(part: string) {
  switch (part) {
    case 'calc':
      return 'bg-green-100 text-green-700';
    case 'algebra':
      return 'bg-purple-100 text-purple-700';
    case 'func':
      return 'bg-teal-100 text-teal-700';
    case 'geo':
      return 'bg-pink-100 text-pink-700';
    case 'data':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function ConceptsPage() {
  // Filter state
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [partFilter, setPartFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editingConcept, setEditingConcept] = useState<ConceptItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    fullContent: '',
    conceptCode: '',
    grade: '',
    category: '',
    part: '',
    keywords: '',
  });
  const [saving, setSaving] = useState(false);
  const [expandedPrereqs, setExpandedPrereqs] = useState<string | null>(null);

  // Prerequisite editing state
  const [editPrereqs, setEditPrereqs] = useState<PrerequisiteItem[]>([]);
  const [prereqSearch, setPrereqSearch] = useState('');
  const [prereqResults, setPrereqResults] = useState<PrerequisiteItem[]>([]);
  const [prereqSearching, setPrereqSearching] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch concepts from API
  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (gradeFilter) params.set('grade', gradeFilter);
    if (categoryFilter) params.set('category', categoryFilter);
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
  }, [gradeFilter, categoryFilter, partFilter, searchDebounced, currentPage]);

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  // Edit handlers
  const startEditing = (concept: ConceptItem) => {
    setEditingConcept(concept);
    setEditForm({
      title: concept.title,
      fullContent: concept.fullContent,
      conceptCode: concept.conceptCode,
      grade: concept.grade,
      category: concept.category,
      part: concept.part,
      keywords: concept.keywords ?? '',
    });
    setEditPrereqs(concept.prerequisites ?? []);
    setPrereqSearch('');
    setPrereqResults([]);
  };

  const cancelEditing = () => {
    setEditingConcept(null);
  };

  const saveConcept = async () => {
    if (!editingConcept) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: editForm.title,
        fullContent: editForm.fullContent,
        conceptCode: editForm.conceptCode,
        grade: editForm.grade,
        category: editForm.category,
        part: editForm.part,
        keywords: editForm.keywords.trim() || null,
        prerequisites: editPrereqs.map((p) => p.id),
      };

      const res = await fetch(`/api/concepts/${editingConcept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setEditingConcept(null);
        fetchConcepts();
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

  return (
    <div className="flex-1 flex p-6 md:p-10 gap-6 max-w-[1600px] mx-auto w-full">
      {/* Sidebar Filters */}
      <aside className="w-64 shrink-0 hidden lg:flex flex-col gap-6">
        {/* Grade Filter */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <div className="bg-primary/10 rounded-full p-2 text-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold leading-normal">학년</h3>
              <p className="text-text-secondary text-xs">학년별 개념 분류</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => {
                setGradeFilter(null);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors text-left ${
                gradeFilter === null
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>전체 학년</span>
            </button>
            {GRADE_OPTIONS.map((grade) => (
              <button
                key={grade}
                onClick={() => {
                  setGradeFilter(grade);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors text-left ${
                  gradeFilter === grade
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{GRADE_LABELS[grade]}</span>
              </button>
            ))}
          </nav>
        </Card>

        {/* Category Filter */}
        <Card className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            카테고리
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setCategoryFilter(null);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === null
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
              }`}
            >
              전체
            </button>
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </Card>

        {/* Part Filter */}
        <Card className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            영역
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setPartFilter(null);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                partFilter === null
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
              }`}
            >
              전체
            </button>
            {PART_OPTIONS.map((part) => (
              <button
                key={part}
                onClick={() => {
                  setPartFilter(part);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  partFilter === part
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                }`}
              >
                {PART_LABELS[part]}
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
            <h1 className="text-3xl font-bold leading-tight text-text-primary flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              개념 관리
            </h1>
            <p className="text-text-secondary text-sm">
              수학 개념 검색 및 관리. 전체 {meta.total.toLocaleString()}개의 개념
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
            <Search className="w-5 h-5" />
          </div>
          <input
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400 transition-all"
            placeholder="개념 제목, 코드 또는 내용으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Mobile filter info */}
        <div className="flex lg:hidden items-center gap-2 text-sm text-text-secondary">
          <Filter className="w-4 h-4" />
          <span>
            {gradeFilter ? GRADE_LABELS[gradeFilter] : '전체 학년'} &bull;{' '}
            {categoryFilter ? CATEGORY_LABELS[categoryFilter] : '모든 카테고리'} &bull;{' '}
            {partFilter ? PART_LABELS[partFilter] : '모든 영역'} &bull;{' '}
            {meta.total}개 결과
          </span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-text-secondary">개념을 불러오는 중...</span>
          </div>
        ) : (
          <>
            {/* Concepts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {concepts.length === 0 ? (
                <div className="col-span-full text-center py-16 text-text-secondary">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">조건에 맞는 개념이 없습니다.</p>
                  <p className="text-sm mt-1">필터를 조정하거나 검색어를 변경해주세요.</p>
                </div>
              ) : (
                concepts.map((concept) => (
                  <Card
                    key={concept.id}
                    className="p-5 flex flex-col gap-3 hover:shadow-hover transition-shadow"
                  >
                    {/* Top row: badges + actions */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded font-mono">
                          {concept.conceptCode}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">
                          {GRADE_LABELS[concept.grade] ?? concept.grade}
                        </span>
                      </div>
                      <div className="flex gap-1 text-text-secondary shrink-0">
                        <button
                          onClick={() => startEditing(concept)}
                          className="p-1 hover:text-primary transition-colors rounded hover:bg-slate-100"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteConcept(concept.id)}
                          className="p-1 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-text-primary leading-snug">
                      {concept.title}
                    </h3>

                    {/* Category / Part badges */}
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${getCategoryBadgeColor(concept.category)}`}
                      >
                        {CATEGORY_LABELS[concept.category] ?? concept.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${getPartBadgeColor(concept.part)}`}
                      >
                        {PART_LABELS[concept.part] ?? concept.part}
                      </span>
                    </div>

                    {/* Description (truncated) */}
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {concept.fullContent}
                    </p>

                    {/* Footer: prerequisite & sub-concept list */}
                    <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2">
                      {/* Prerequisites */}
                      <button
                        onClick={() => setExpandedPrereqs(expandedPrereqs === concept.id ? null : concept.id)}
                        className="flex items-center text-xs text-text-secondary hover:text-primary transition-colors w-full"
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                        선수 개념 {concept.prerequisites?.length ?? 0}개
                        {(concept.prerequisites?.length ?? 0) > 0 && (
                          <span className="ml-auto text-primary font-bold">
                            {expandedPrereqs === concept.id ? '접기' : '보기'}
                          </span>
                        )}
                      </button>
                      {expandedPrereqs === concept.id && concept.prerequisites?.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {concept.prerequisites.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-slate-50 rounded-lg">
                              <span className="font-mono text-primary font-bold">{p.conceptCode}</span>
                              <span className="text-text-secondary">{p.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sub-concepts */}
                      {(concept.subConcepts?.length ?? 0) > 0 && (
                        <button
                          onClick={() => setExpandedPrereqs(expandedPrereqs === `sub-${concept.id}` ? null : `sub-${concept.id}`)}
                          className="flex items-center text-xs text-text-secondary hover:text-emerald-600 transition-colors w-full"
                        >
                          <Link2 className="w-3.5 h-3.5 mr-1.5" />
                          하위 개념 {concept.subConcepts.length}개
                          <span className="ml-auto text-emerald-600 font-bold">
                            {expandedPrereqs === `sub-${concept.id}` ? '접기' : '보기'}
                          </span>
                        </button>
                      )}
                      {expandedPrereqs === `sub-${concept.id}` && concept.subConcepts?.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {concept.subConcepts.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-emerald-50 rounded-lg">
                              <span className="font-mono text-emerald-600 font-bold">{s.conceptCode}</span>
                              <span className="text-text-secondary">{s.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
      {editingConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">개념 수정</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {editingConcept.conceptCode && <>{editingConcept.conceptCode} &middot; </>}
                  {GRADE_LABELS[editingConcept.grade] ?? editingConcept.grade}
                </p>
              </div>
              <button onClick={cancelEditing} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold mb-1.5">제목</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              {/* Concept Code */}
              <div>
                <label className="block text-sm font-bold mb-1.5">개념 코드</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editForm.conceptCode}
                  onChange={(e) => setEditForm((p) => ({ ...p, conceptCode: e.target.value }))}
                />
              </div>

              {/* Grade / Category / Part */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5">학년</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={editForm.grade}
                    onChange={(e) => setEditForm((p) => ({ ...p, grade: e.target.value }))}
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {GRADE_LABELS[g]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">카테고리</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={editForm.category}
                    onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">영역</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={editForm.part}
                    onChange={(e) => setEditForm((p) => ({ ...p, part: e.target.value }))}
                  >
                    {PART_OPTIONS.map((pt) => (
                      <option key={pt} value={pt}>
                        {PART_LABELS[pt]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Full Content */}
              <div>
                <label className="block text-sm font-bold mb-1.5">개념 내용</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[160px] resize-y"
                  value={editForm.fullContent}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullContent: e.target.value }))}
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-bold mb-1.5">키워드</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editForm.keywords}
                  onChange={(e) => setEditForm((p) => ({ ...p, keywords: e.target.value }))}
                  placeholder="쉼표로 구분 (예: 소수, 합성수, 약수)"
                />
              </div>

              {/* Prerequisites */}
              <div>
                <label className="block text-sm font-bold mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" />
                  선수 개념 ({editPrereqs.length}개)
                </label>

                {/* Current prerequisites */}
                {editPrereqs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editPrereqs.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium"
                      >
                        <span className="font-mono font-bold">{p.conceptCode}</span>
                        <span className="text-text-secondary">{p.title}</span>
                        <button
                          type="button"
                          onClick={() => removePrereq(p.id)}
                          className="ml-0.5 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search to add */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                    <Plus className="w-4 h-4" />
                  </div>
                  <input
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={prereqSearch}
                    onChange={(e) => searchPrereqs(e.target.value)}
                    placeholder="선수 개념 검색 (코드 또는 제목)..."
                  />
                  {prereqSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
                    </div>
                  )}
                </div>

                {/* Search results dropdown */}
                {prereqResults.length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto">
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
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={cancelEditing}>
                취소
              </Button>
              <Button
                size="sm"
                onClick={saveConcept}
                disabled={saving || !editForm.title}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
