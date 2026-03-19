'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Users,
  GraduationCap,
  ArrowUp,
  ArrowDown,
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

export default function CourseCreatePage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

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
  const filteredConcepts = useMemo(() => {
    return allConcepts.filter((c) => {
      if (conceptSearch) {
        const q = conceptSearch.toLowerCase();
        return c.title.toLowerCase().includes(q) || (c.conceptCode?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [allConcepts, conceptSearch]);

  const chapterGroups = useMemo(() => {
    return filteredConcepts.reduce<Record<string, ConceptItem[]>>((acc, c) => {
      const key = c.chapter || '(미분류)';
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {});
  }, [filteredConcepts]);

  const selectedIds = useMemo(() => new Set(selectedConcepts.map((c) => c.id)), [selectedConcepts]);

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
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) =>
      !studentSearch || s.name.includes(studentSearch) || s.username.includes(studentSearch)
    );
  }, [allStudents, studentSearch]);

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

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('과정명을 입력하세요');
    if (selectedConcepts.length === 0) return toast.error('최소 1개 개념을 선택하세요');

    setSubmitting(true);
    try {
      // 1. 과정 생성
      const createRes = await fetch('/api/learning-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          conceptIds: selectedConcepts.map((c) => c.id),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        toast.error(err.error?.message || '과정 생성 실패');
        return;
      }

      const { data: courseData } = await createRes.json();

      // 2. 학생 배정 (선택한 학생이 있는 경우)
      if (selectedStudentIds.size > 0) {
        const enrollRes = await fetch(`/api/learning-courses/${courseData.id}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: Array.from(selectedStudentIds) }),
        });

        if (enrollRes.ok) {
          const enrollData = await enrollRes.json();
          toast.success(`과정 생성 완료! ${enrollData.data.enrolled}명 배정됨`);
        } else {
          toast.success('과정이 생성되었습니다 (학생 배정 일부 실패)');
        }
      } else {
        toast.success('과정이 생성되었습니다');
      }

      router.push(`/courses/${courseData.seq}`);
    } catch {
      toast.error('과정 생성 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/courses" className="p-2 rounded-sm hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            새 학습 과정 만들기
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">개념을 선택하고 학생에게 배정합니다</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 기본 정보 + 개념 선택 */}
        <div className="flex flex-col gap-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-sm border border-slate-200 p-5">
            <h2 className="font-bold text-text-primary mb-4">기본 정보</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-text-primary mb-1 block">과정명 *</label>
                <input
                  className="w-full h-9 px-3 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="예: 초4 1학기 자연수의 혼합 계산"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1 block">설명 (선택)</label>
                <textarea
                  className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                  rows={2}
                  placeholder="과정에 대한 간단한 설명"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 개념 선택 */}
          <div className="bg-white rounded-sm border border-slate-200 p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-text-primary flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                개념 선택
                {selectedConcepts.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {selectedConcepts.length}개
                  </span>
                )}
              </h2>
            </div>

            {/* 필터 */}
            <div className="flex gap-2 mb-3">
              <select
                className="h-8 px-2 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className="w-full h-8 pl-8 pr-3 rounded-sm border border-slate-200 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="개념 검색"
                  value={conceptSearch}
                  onChange={(e) => setConceptSearch(e.target.value)}
                />
              </div>
            </div>

            {/* 개념 목록 (대단원별) */}
            <div className="border border-slate-200 rounded overflow-y-auto max-h-[400px]">
              {conceptsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : Object.keys(chapterGroups).length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">개념이 없습니다</p>
              ) : (
                Object.entries(chapterGroups).map(([chapter, concepts]) => {
                  const isExpanded = expandedChapters.has(chapter);
                  const allSelected = concepts.every((c) => selectedIds.has(c.id));
                  const someSelected = concepts.some((c) => selectedIds.has(c.id));
                  return (
                    <div key={chapter} className="border-b border-slate-200 last:border-0">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                        <button onClick={() => toggleChapter(chapter)} className="flex items-center gap-1 flex-1 text-left">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-xs font-bold text-text-primary">{chapter}</span>
                          <span className="text-xs text-text-secondary">({concepts.length})</span>
                        </button>
                        <button
                          onClick={() => selectAllInChapter(chapter)}
                          className={`text-xs px-2 py-0.5 rounded transition-colors ${
                            allSelected ? 'bg-primary text-white' : someSelected ? 'bg-primary/20 text-primary' : 'bg-slate-200 text-text-secondary hover:bg-slate-300'
                          }`}
                        >
                          {allSelected ? '전체 해제' : '전체 선택'}
                        </button>
                      </div>
                      {isExpanded && concepts.map((concept) => {
                        const isSelected = selectedIds.has(concept.id);
                        return (
                          <button
                            key={concept.id}
                            onClick={() => toggleConcept(concept)}
                            className={`w-full text-left flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
                              isSelected ? 'bg-primary/5 text-primary' : 'text-text-primary hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="flex-1 truncate">{concept.title}</span>
                            {concept.section && (
                              <span className="text-xs text-text-secondary shrink-0">{concept.section}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* 선택된 개념 순서 */}
            {selectedConcepts.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-bold text-text-primary mb-2">선택 순서 (학습 순서)</h3>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                  {selectedConcepts.map((concept, idx) => (
                    <div
                      key={concept.id}
                      className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-100 text-xs"
                    >
                      <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="w-5 text-center font-bold text-slate-400">{idx + 1}</span>
                      <span className="flex-1 truncate text-text-primary">{concept.title}</span>
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => moveDown(idx)} disabled={idx === selectedConcepts.length - 1} className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setSelectedConcepts((prev) => prev.filter((c) => c.id !== concept.id))}
                        className="p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: 학생 선택 + 제출 */}
        <div className="flex flex-col gap-6">
          {/* 학생 선택 */}
          <div className="bg-white rounded-sm border border-slate-200 p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                학생 배정
                {selectedStudentIds.size > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {selectedStudentIds.size}명
                  </span>
                )}
              </h2>
              <button
                onClick={selectAllStudents}
                className="text-xs text-primary hover:underline"
              >
                {selectedStudentIds.size === allStudents.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full h-8 pl-8 pr-3 rounded-sm border border-slate-200 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                placeholder="이름 또는 아이디 검색"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>

            <div className="border border-slate-200 rounded overflow-y-auto max-h-[500px]">
              {studentsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">학생이 없습니다</p>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.has(student.id);
                  return (
                    <button
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs border-b border-slate-200 last:border-0 transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`flex-1 ${isSelected ? 'text-primary font-bold' : 'text-text-primary'}`}>
                        {student.name}
                      </span>
                      <span className="text-text-secondary">{student.username}</span>
                      {student.grade && (
                        <span className="text-xs text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded">
                          {student.grade <= 6 ? `초${student.grade}` : `중${student.grade - 6}`}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <p className="text-xs text-text-secondary mt-2">
              * 학생을 선택하지 않고도 과정을 먼저 생성할 수 있습니다.
            </p>
          </div>

          {/* 제출 버튼 */}
          <div className="bg-white rounded-sm border border-slate-200 p-5">
            <div className="flex flex-col gap-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">과정명</span>
                <span className="font-bold text-text-primary">{title || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">개념 수</span>
                <span className="font-bold text-text-primary">{selectedConcepts.length}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">배정 학생</span>
                <span className="font-bold text-text-primary">{selectedStudentIds.size}명</span>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || selectedConcepts.length === 0}
              className="w-full"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 생성 중...</>
              ) : (
                <><GraduationCap className="w-4 h-4 mr-2" /> 과정 생성{selectedStudentIds.size > 0 ? ` + ${selectedStudentIds.size}명 배정` : ''}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
