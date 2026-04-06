'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer } from '@/components/ui/PageContainer';
import { toast } from '@/components/ui/Toast';
import {
  BookOpen,
  Search,
  Check,
  Users,
  School,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CurriculumConceptPicker, PickerConceptItem } from '@/components/curriculum/CurriculumConceptPicker';

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

export default function ConceptHomeworkCreatePage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [conceptsPerDay, setConceptsPerDay] = useState(1);
  const [requiredStage, setRequiredStage] = useState('BLANK_FULL');

  // Concept selection
  const [selectedConcepts, setSelectedConcepts] = useState<PickerConceptItem[]>([]);

  // Student selection
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; students: { id: string }[] }[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Fetch students + classrooms
  useEffect(() => {
    (async () => {
      setStudentsLoading(true);
      try {
        const [userRes, crRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/classrooms'),
        ]);
        if (userRes.ok) {
          const json = await userRes.json();
          setAllStudents((json.data ?? []).filter((u: { role: string }) => u.role === 'STUDENT'));
        }
        if (crRes.ok) {
          const json = await crRes.json();
          setClassrooms(json.data ?? []);
        }
      } catch (err) { console.error('학생 목록 조회 실패:', err); }
      setStudentsLoading(false);
    })();
  }, []);

  // 자동 숙제명 제안
  const handleTitleSuggestion = (suggested: string) => {
    if (!titleManuallyEdited) setTitle(suggested + ' 숙제');
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

  // 전체 선택/해제는 인라인으로 처리
  const _selectAll = () => {
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
        toast.success('개념 숙제가 생성되었습니다');
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
    <PageContainer maxWidth="xl">
        <PageHeader
          title="개념 숙제 만들기"
          subtitle="개념을 선택하고 학생에게 배정합니다"
          icon={<BookOpen className="w-6 h-6" />}
          backHref="/homework"
        />
      <div className="space-y-5">

        {/* Basic Settings */}
        <div className="border border-slate-200 rounded-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">기본 설정</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-text-secondary mb-1 block">숙제 이름</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleManuallyEdited(true);
                }}
                placeholder="교육과정/계통 선택 시 자동 생성됩니다"
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">하루당 개념 수</label>
              <select
                value={conceptsPerDay}
                onChange={(e) => setConceptsPerDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                    className={`flex-1 px-3 py-2 rounded-sm text-xs font-medium border transition-colors ${
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
        <div className="border border-slate-200 rounded-sm p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            📋 개념 선택
            {selectedConcepts.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                {selectedConcepts.length}개
              </span>
            )}
          </h3>
          <CurriculumConceptPicker
            selectedConcepts={selectedConcepts}
            onChangeSelected={setSelectedConcepts}
            onTitleSuggestion={handleTitleSuggestion}
          />
        </div>

        {/* Student Selection */}
        <div className="border border-slate-200 rounded-sm bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              학생 배정
              {selectedStudentIds.size > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {selectedStudentIds.size}명
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedStudentIds(new Set(allStudents.map((s) => s.id)))}
                className="text-xs text-primary hover:underline"
              >
                전체 선택
              </button>
              {selectedStudentIds.size > 0 && (
                <button
                  onClick={() => setSelectedStudentIds(new Set())}
                  className="text-xs text-slate-400 hover:text-red-500 hover:underline"
                >
                  전체 해제
                </button>
              )}
            </div>
          </div>

          {/* 반별 배정 */}
          {classrooms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <School className="w-3.5 h-3.5" /> 반별 배정:
              </span>
              {classrooms.map((cr) => {
                const crIds = cr.students.map((s) => s.id);
                const allSelected = crIds.length > 0 && crIds.every((id) => selectedStudentIds.has(id));
                return (
                  <button
                    key={cr.id}
                    onClick={() => {
                      setSelectedStudentIds((prev) => {
                        const next = new Set(prev);
                        if (allSelected) crIds.forEach((id) => next.delete(id));
                        else crIds.forEach((id) => next.add(id));
                        return next;
                      });
                    }}
                    className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                      allSelected ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-slate-200 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {cr.name} ({crIds.length})
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="이름 또는 아이디 검색"
              className="w-full h-9 pl-8 pr-3 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-sm">
            {studentsLoading ? (
              <div className="space-y-1.5 p-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded" />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-secondary">학생이 없습니다</div>
            ) : (
              filteredStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-slate-100 last:border-0 transition-colors ${
                    selectedStudentIds.has(s.id) ? 'bg-primary/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                    selectedStudentIds.has(s.id) ? 'bg-primary border-primary' : 'border-slate-300'
                  }`}>
                    {selectedStudentIds.has(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-text-primary truncate">{s.name}</span>
                  <span className="ml-auto text-xs text-text-secondary shrink-0">{s.username}</span>
                  {s.grade && (
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-sm shrink-0">
                      {s.grade > 6 ? `중${s.grade - 6}` : `초${s.grade}`}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
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
          >
            <BookOpen className="w-4 h-4 mr-1" />
            개념 숙제 생성{selectedStudentIds.size > 0 ? ` + ${selectedStudentIds.size}명 배정` : ''}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
