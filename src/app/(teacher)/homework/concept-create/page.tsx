'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import {
  BookOpen,
  Search,
  Check,
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

  const [submitting, setSubmitting] = useState(false);

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
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Header */}
        <PageHeader
          title="개념 숙제 만들기"
          subtitle="개념을 선택하고 학생에게 배정합니다"
          icon={<BookOpen className="w-5 h-5" />}
          backHref="/homework"
        />

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
              <div className="space-y-1.5 p-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
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
