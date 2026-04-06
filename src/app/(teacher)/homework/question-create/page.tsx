'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileQuestion, Search, Check, X, Users, School } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer } from '@/components/ui/PageContainer';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface QuestionItem {
  id: string;
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  difficulty: string;
  type: string;
  content: string;
}

interface StudentItem {
  id: string;
  name: string;
  grade: number | null;
  username: string;
}

const DIFF_LABELS: Record<string, string> = { BASIC: '하', MEDIUM: '중', HIGH: '상', HIGHEST: '최상' };
const DIFF_COLORS: Record<string, string> = { BASIC: 'bg-emerald-100 text-emerald-700', MEDIUM: 'bg-blue-100 text-blue-700', HIGH: 'bg-orange-100 text-orange-700', HIGHEST: 'bg-red-100 text-red-700' };

export default function QuestionHomeworkCreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [questionsPerDay, setQuestionsPerDay] = useState(5);
  const [passingScore, setPassingScore] = useState(80);

  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionSearch, setQuestionSearch] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionItem[]>([]);

  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; students: { id: string }[] }[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (bookFilter) params.set('bookCode', bookFilter);
      if (questionSearch) params.set('search', questionSearch);
      const res = await fetch(`/api/questions?${params}`);
      if (res.ok) { const json = await res.json(); setAllQuestions(json.data ?? []); }
    } catch (err) { console.error('문제 목록 조회 실패:', err); }
    setQuestionsLoading(false);
  }, [bookFilter, questionSearch]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // Fetch students + classrooms
  useEffect(() => {
    (async () => {
      setStudentsLoading(true);
      try {
        const [userRes, crRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/classrooms'),
        ]);
        if (userRes.ok) { const json = await userRes.json(); setAllStudents((json.data ?? []).filter((u: { role: string }) => u.role === 'STUDENT')); }
        if (crRes.ok) { const json = await crRes.json(); setClassrooms(json.data ?? []); }
      } catch (err) { console.error('학생 목록 조회 실패:', err); }
      setStudentsLoading(false);
    })();
  }, []);

  const selectedIds = new Set(selectedQuestions.map((q) => q.id));

  const toggleQuestion = (q: QuestionItem) => {
    if (selectedIds.has(q.id)) {
      setSelectedQuestions((prev) => prev.filter((x) => x.id !== q.id));
    } else {
      setSelectedQuestions((prev) => [...prev, q]);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const totalDays = Math.ceil(selectedQuestions.length / Math.max(1, questionsPerDay));

  const filteredStudents = allStudents.filter((s) => !studentSearch || s.name.includes(studentSearch) || s.username.includes(studentSearch));

  // Get unique bookCodes
  const bookCodes = [...new Set(allQuestions.map((q) => q.bookCode))].sort();

  const handleSubmit = async () => {
    if (!title.trim()) { toast.warning('제목을 입력하세요'); return; }
    if (selectedQuestions.length === 0) { toast.warning('문제를 1개 이상 선택하세요'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/question-homework/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          startDate,
          questionIds: selectedQuestions.map((q) => q.id),
          questionsPerDay,
          passingScore,
          studentIds: [...selectedStudentIds],
        }),
      });
      if (res.ok) router.push('/homework');
      else { const json = await res.json(); toast.error(json.error?.message ?? '생성 실패'); }
    } catch { toast.error('생성 실패'); }
    setSubmitting(false);
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="문제 숙제 만들기"
        subtitle="문제은행에서 문제를 선택하고 학생에게 배정합니다"
        icon={<FileQuestion className="w-6 h-6" />}
        backHref="/homework"
      />

      <div className="space-y-5">
        {/* Basic Settings */}
        <div className="border border-slate-200 rounded-sm bg-white p-5 space-y-3">
          <h3 className="font-bold text-text-primary">기본 설정</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-text-secondary mb-1 block">숙제 이름</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 3월 2주차 문제 숙제" className="w-full h-9 px-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">시작일</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-9 px-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">하루당 문제 수</label>
              <select value={questionsPerDay} onChange={(e) => setQuestionsPerDay(Number(e.target.value))} className="w-full h-9 px-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
                {[1, 2, 3, 5, 7, 10, 15, 20].map((n) => <option key={n} value={n}>{n}문제</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">통과 기준 (%)</label>
              <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-full h-9 px-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
          </div>
          {selectedQuestions.length > 0 && (
            <div className="text-xs text-text-secondary bg-slate-50 rounded-sm px-3 py-2">
              {selectedQuestions.length}문제 &middot; {questionsPerDay}문제/일 &middot; 총 <strong>{totalDays}일</strong>
            </div>
          )}
        </div>

        {/* Question Selection */}
        <div className="border border-slate-200 rounded-sm bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-text-primary mb-3">문제 선택 ({selectedQuestions.length}개)</h3>
            <div className="flex gap-2">
              <select value={bookFilter} onChange={(e) => setBookFilter(e.target.value)} className="h-9 px-2 border border-slate-200 rounded-sm text-xs">
                <option value="">전체 교재</option>
                {bookCodes.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" value={questionSearch} onChange={(e) => setQuestionSearch(e.target.value)} placeholder="문제 검색..." className="w-full h-9 pl-8 pr-8 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" />
                {questionSearch && <button onClick={() => setQuestionSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-slate-400" /></button>}
              </div>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {questionsLoading ? (
              <div className="space-y-1.5 p-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded" />
                ))}
              </div>
            ) : allQuestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-secondary">문제가 없습니다</div>
            ) : (
              allQuestions.map((q) => (
                <button key={q.id} onClick={() => toggleQuestion(q)} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 border-b border-slate-100 last:border-0 transition-colors ${selectedIds.has(q.id) ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                  <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${selectedIds.has(q.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                    {selectedIds.has(q.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`px-1 py-0.5 rounded text-xs font-semibold ${DIFF_COLORS[q.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>
                    {DIFF_LABELS[q.difficulty] ?? q.difficulty}
                  </span>
                  <span className="text-xs text-text-secondary shrink-0">{q.bookCode}-{q.questionNum}</span>
                  <span className="truncate text-text-primary">{q.content.slice(0, 60)}</span>
                  <span className="text-xs text-text-secondary shrink-0 ml-auto">{q.chapter}</span>
                </button>
              ))
            )}
          </div>
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
            <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="이름 또는 아이디 검색" className="w-full h-9 pl-8 pr-3 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" />
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
                <button key={s.id} onClick={() => toggleStudent(s.id)} className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-slate-100 last:border-0 transition-colors ${selectedStudentIds.has(s.id) ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                  <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${selectedStudentIds.has(s.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
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

        <div className="flex items-center justify-between py-2">
          <Link href="/homework"><Button variant="ghost">취소</Button></Link>
          <Button onClick={handleSubmit} loading={submitting} disabled={!title.trim() || selectedQuestions.length === 0 || submitting}>
            <FileQuestion className="w-4 h-4 mr-1" />
            문제 숙제 생성{selectedStudentIds.size > 0 ? ` + ${selectedStudentIds.size}명 배정` : ''}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
