'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  BookOpen,
  Search,
  Check,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ConceptItem {
  id: string;
  title: string;
  conceptCode: string | null;
  grade: string | null;
  chapter: string | null;
  section: string | null;
}

interface StudentItem {
  id: string;
  name: string;
  grade: number | null;
  username: string;
}

const STAGE_OPTIONS = [
  { value: 'READING', label: '개념읽기만' },
  { value: 'BLANK_EASY', label: '빈칸1단계까지' },
  { value: 'BLANK_HARD', label: '빈칸2단계까지' },
  { value: 'BLANK_FULL', label: '통문장암기 (전체)' },
];

const GRADE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'elementary_3', label: '초3' },
  { value: 'elementary_4', label: '초4' },
  { value: 'elementary_5', label: '초5' },
  { value: 'elementary_6', label: '초6' },
  { value: 'middle_1', label: '중1' },
  { value: 'middle_2', label: '중2' },
  { value: 'middle_3', label: '중3' },
];

export default function ConceptHomeworkCreatePage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [conceptsPerDay, setConceptsPerDay] = useState(1);
  const [requiredStage, setRequiredStage] = useState('BLANK_FULL');

  // Concept selection
  const [allConcepts, setAllConcepts] = useState<ConceptItem[]>([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [conceptSearch, setConceptSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [selectedConcepts, setSelectedConcepts] = useState<ConceptItem[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Student selection
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);

  // Fetch concepts
  const fetchConcepts = useCallback(async () => {
    setConceptsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (gradeFilter) params.set('grade', gradeFilter);
      const res = await fetch(`/api/concepts?${params}`);
      if (res.ok) {
        const json = await res.json();
        setAllConcepts(json.data ?? []);
      }
    } catch (err) { console.error('개념 목록 조회 실패:', err); }
    setConceptsLoading(false);
  }, [gradeFilter]);

  useEffect(() => { fetchConcepts(); }, [fetchConcepts]);

  // Fetch students
  useEffect(() => {
    (async () => {
      setStudentsLoading(true);
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const json = await res.json();
          setAllStudents((json.data ?? []).filter((u: { role: string }) => u.role === 'STUDENT'));
        }
      } catch (err) { console.error('학생 목록 조회 실패:', err); }
      setStudentsLoading(false);
    })();
  }, []);

  // Group concepts by chapter
  const filteredConcepts = allConcepts.filter((c) => {
    if (conceptSearch) {
      const q = conceptSearch.toLowerCase();
      return c.title.toLowerCase().includes(q) || (c.conceptCode?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const chapterGroups = filteredConcepts.reduce<Record<string, ConceptItem[]>>((acc, c) => {
    const key = c.chapter || '(미분류)';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const selectedIds = new Set(selectedConcepts.map((c) => c.id));

  const toggleConcept = (concept: ConceptItem) => {
    if (selectedIds.has(concept.id)) {
      setSelectedConcepts((prev) => prev.filter((c) => c.id !== concept.id));
    } else {
      setSelectedConcepts((prev) => [...prev, concept]);
    }
  };

  const toggleChapter = (chapter: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapter)) next.delete(chapter);
      else next.add(chapter);
      return next;
    });
  };

  const selectAllInChapter = (chapter: string) => {
    const concepts = chapterGroups[chapter] ?? [];
    const allSelected = concepts.every((c) => selectedIds.has(c.id));
    if (allSelected) {
      const removeIds = new Set(concepts.map((c) => c.id));
      setSelectedConcepts((prev) => prev.filter((c) => !removeIds.has(c.id)));
    } else {
      const newConcepts = concepts.filter((c) => !selectedIds.has(c.id));
      setSelectedConcepts((prev) => [...prev, ...newConcepts]);
    }
  };

  // Reorder selected concepts
  const moveUp = (index: number) => {
    if (index === 0) return;
    setSelectedConcepts((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setSelectedConcepts((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  // Student filtering
  const filteredStudents = allStudents.filter((s) =>
    !studentSearch || s.name.includes(studentSearch) || s.username.includes(studentSearch)
  );

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.size === allStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(allStudents.map((s) => s.id)));
    }
  };

  // Computed
  const totalDays = Math.ceil(selectedConcepts.length / Math.max(1, conceptsPerDay));

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) { toast.warning('제목을 입력하세요'); return; }
    if (selectedConcepts.length === 0) { toast.warning('개념을 1개 이상 선택하세요'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/concept-homework/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          startDate,
          conceptIds: selectedConcepts.map((c) => c.id),
          conceptsPerDay,
          requiredStage,
          studentIds: [...selectedStudentIds],
        }),
      });

      if (res.ok) {
        router.push('/homework');
      } else {
        const json = await res.json();
        toast.error(json.error?.message ?? '생성에 실패했습니다');
      }
    } catch {
      toast.error('생성에 실패했습니다');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/homework" className="p-1.5 rounded-sm hover:bg-slate-100 text-text-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              개념 숙제 만들기
            </h1>
            <p className="text-xs text-text-secondary">개념을 선택하고 학생에게 배정합니다</p>
          </div>
        </div>

        {/* Basic Settings */}
        <div className="border border-slate-200 rounded-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">기본 설정</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-text-secondary mb-1 block">숙제 이름</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 3월 2주차 개념 숙제"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">하루당 개념 수</label>
              <select
                value={conceptsPerDay}
                onChange={(e) => setConceptsPerDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}개</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-text-secondary mb-1 block">완료 기준 단계</label>
              <div className="flex gap-2">
                {STAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRequiredStage(opt.value)}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                      requiredStage === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 text-text-secondary hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {selectedConcepts.length > 0 && (
            <div className="text-xs text-text-secondary bg-slate-50 rounded px-3 py-2">
              {selectedConcepts.length}개 개념 &middot; {conceptsPerDay}개/일 &middot; 총 <strong>{totalDays}일</strong>
            </div>
          )}
        </div>

        {/* Concept Selection */}
        <div className="border border-slate-200 rounded-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-text-primary mb-2">개념 선택</h3>
            <div className="flex gap-2">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={conceptSearch}
                  onChange={(e) => setConceptSearch(e.target.value)}
                  placeholder="개념명 또는 코드 검색..."
                  className="w-full h-8 pl-8 pr-8 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                {conceptSearch && (
                  <button onClick={() => setConceptSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-200">
            {/* Available concepts */}
            <div className="max-h-72 overflow-y-auto">
              {conceptsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : Object.keys(chapterGroups).length === 0 ? (
                <div className="p-4 text-center text-xs text-text-secondary">개념이 없습니다</div>
              ) : (
                Object.entries(chapterGroups).map(([chapter, concepts]) => {
                  const isExpanded = expandedChapters.has(chapter);
                  const allSelected = concepts.every((c) => selectedIds.has(c.id));
                  const someSelected = concepts.some((c) => selectedIds.has(c.id));
                  return (
                    <div key={chapter} className="border-b border-slate-200 last:border-0">
                      <div className="flex items-center gap-1 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <button onClick={() => toggleChapter(chapter)} className="flex items-center gap-1 flex-1 min-w-0 text-left">
                          {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                          <span className="text-xs font-medium text-text-primary truncate">{chapter}</span>
                          <span className="text-xs text-text-secondary shrink-0">({concepts.length})</span>
                        </button>
                        <button
                          onClick={() => selectAllInChapter(chapter)}
                          className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                            allSelected ? 'bg-primary text-white' : someSelected ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-primary'
                          }`}
                        >
                          {allSelected ? '전체해제' : '전체선택'}
                        </button>
                      </div>
                      {isExpanded && concepts.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => toggleConcept(c)}
                          className={`w-full text-left px-3 pl-7 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-50 ${
                            selectedIds.has(c.id) ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            selectedIds.has(c.id) ? 'bg-primary border-primary' : 'border-slate-300'
                          }`}>
                            {selectedIds.has(c.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="truncate">{c.title}</span>
                          {c.conceptCode && <span className="text-xs text-text-secondary shrink-0">{c.conceptCode}</span>}
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected concepts (ordered) */}
            <div className="max-h-72 overflow-y-auto">
              <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/50 sticky top-0">
                <span className="text-xs font-medium text-text-primary">선택됨 ({selectedConcepts.length})</span>
                <span className="text-xs text-text-secondary ml-1">드래그 또는 화살표로 순서 변경</span>
              </div>
              {selectedConcepts.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-secondary">왼쪽에서 개념을 선택하세요</div>
              ) : (
                selectedConcepts.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 hover:bg-slate-50 group">
                    <GripVertical className="w-3 h-3 text-slate-300 shrink-0" />
                    <span className="text-xs text-text-secondary w-5 shrink-0">{i + 1}</span>
                    <span className="text-xs text-text-primary truncate flex-1">{c.title}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveUp(i)} className="p-0.5 hover:bg-slate-200 rounded" disabled={i === 0}>
                        <ChevronDown className="w-3 h-3 text-slate-400 rotate-180" />
                      </button>
                      <button onClick={() => moveDown(i)} className="p-0.5 hover:bg-slate-200 rounded" disabled={i === selectedConcepts.length - 1}>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>
                      <button onClick={() => toggleConcept(c)} className="p-0.5 hover:bg-red-100 rounded">
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Student Selection */}
        <div className="border border-slate-200 rounded-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-primary">학생 배정</h3>
              <button
                onClick={selectAllStudents}
                className="text-xs text-primary hover:text-primary/80"
              >
                {selectedStudentIds.size === allStudents.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="학생 이름 검색..."
                className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {studentsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-secondary">학생이 없습니다</div>
            ) : (
              filteredStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-50 ${
                    selectedStudentIds.has(s.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedStudentIds.has(s.id) ? 'bg-primary border-primary' : 'border-slate-300'
                  }`}>
                    {selectedStudentIds.has(s.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-medium text-text-primary">{s.name}</span>
                  {s.grade && (
                    <span className="text-xs text-text-secondary">
                      {s.grade > 6 ? `중${s.grade - 6}` : `초${s.grade}`}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          {selectedStudentIds.size > 0 && (
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/50 text-xs text-text-secondary">
              {selectedStudentIds.size}명 선택됨
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between py-2">
          <Link href="/homework">
            <Button variant="ghost" className="text-sm">취소</Button>
          </Link>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!title.trim() || selectedConcepts.length === 0 || submitting}
            className="text-sm"
          >
            개념 숙제 생성 ({selectedConcepts.length}개 개념 · {totalDays}일 · {selectedStudentIds.size}명)
          </Button>
        </div>
      </div>
    </div>
  );
}
