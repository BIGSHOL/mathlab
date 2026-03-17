'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileQuestion, Search, Check, Loader2, X } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

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
    } catch { /* ignore */ }
    setQuestionsLoading(false);
  }, [bookFilter, questionSearch]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  useEffect(() => {
    (async () => {
      setStudentsLoading(true);
      try {
        const res = await fetch('/api/users');
        if (res.ok) { const json = await res.json(); setAllStudents((json.data ?? []).filter((u: { role: string }) => u.role === 'STUDENT')); }
      } catch { /* ignore */ }
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

  const selectAllStudents = () => {
    if (selectedStudentIds.size === allStudents.length) setSelectedStudentIds(new Set());
    else setSelectedStudentIds(new Set(allStudents.map((s) => s.id)));
  };

  const totalDays = Math.ceil(selectedQuestions.length / Math.max(1, questionsPerDay));

  const filteredStudents = allStudents.filter((s) => !studentSearch || s.name.includes(studentSearch));

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
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/homework" className="p-1.5 rounded-lg hover:bg-slate-100 text-text-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-primary" />문제 숙제 만들기
            </h1>
            <p className="text-xs text-text-secondary">문제은행에서 문제를 선택하고 학생에게 배정합니다</p>
          </div>
        </div>

        {/* Basic Settings */}
        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">기본 설정</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-text-secondary mb-1 block">숙제 이름</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 3월 2주차 문제 숙제" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">시작일</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">하루당 문제 수</label>
              <select value={questionsPerDay} onChange={(e) => setQuestionsPerDay(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {[1, 2, 3, 5, 7, 10, 15, 20].map((n) => <option key={n} value={n}>{n}문제</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">통과 기준 (%)</label>
              <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          {selectedQuestions.length > 0 && (
            <div className="text-xs text-text-secondary bg-slate-50 rounded px-3 py-2">
              {selectedQuestions.length}문제 &middot; {questionsPerDay}문제/일 &middot; 총 <strong>{totalDays}일</strong>
            </div>
          )}
        </div>

        {/* Question Selection */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-text-primary mb-2">문제 선택 ({selectedQuestions.length}개)</h3>
            <div className="flex gap-2">
              <select value={bookFilter} onChange={(e) => setBookFilter(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded text-xs">
                <option value="">전체 교재</option>
                {bookCodes.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" value={questionSearch} onChange={(e) => setQuestionSearch(e.target.value)} placeholder="문제 검색..." className="w-full pl-8 pr-8 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                {questionSearch && <button onClick={() => setQuestionSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-slate-400" /></button>}
              </div>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {questionsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : allQuestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-secondary">문제가 없습니다</div>
            ) : (
              allQuestions.map((q) => (
                <button key={q.id} onClick={() => toggleQuestion(q)} className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 ${selectedIds.has(q.id) ? 'bg-primary/5' : ''}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedIds.has(q.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                    {selectedIds.has(q.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${DIFF_COLORS[q.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>
                    {DIFF_LABELS[q.difficulty] ?? q.difficulty}
                  </span>
                  <span className="text-[10px] text-text-secondary shrink-0">{q.bookCode}-{q.questionNum}</span>
                  <span className="truncate text-text-primary">{q.content.slice(0, 60)}</span>
                  <span className="text-[10px] text-text-secondary shrink-0 ml-auto">{q.chapter}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Student Selection */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-primary">학생 배정</h3>
              <button onClick={selectAllStudents} className="text-xs text-primary hover:text-primary/80">
                {selectedStudentIds.size === allStudents.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="학생 이름 검색..." className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {studentsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : (
              filteredStudents.map((s) => (
                <button key={s.id} onClick={() => toggleStudent(s.id)} className={`w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-50 ${selectedStudentIds.has(s.id) ? 'bg-primary/5' : ''}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedStudentIds.has(s.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                    {selectedStudentIds.has(s.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-medium text-text-primary">{s.name}</span>
                  {s.grade && <span className="text-[10px] text-text-secondary">{s.grade > 6 ? `중${s.grade - 6}` : `초${s.grade}`}</span>}
                </button>
              ))
            )}
          </div>
          {selectedStudentIds.size > 0 && <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-xs text-text-secondary">{selectedStudentIds.size}명 선택됨</div>}
        </div>

        <div className="flex items-center justify-between py-2">
          <Link href="/homework"><Button variant="ghost" className="text-sm">취소</Button></Link>
          <Button onClick={handleSubmit} loading={submitting} disabled={!title.trim() || selectedQuestions.length === 0 || submitting} className="text-sm">
            문제 숙제 생성 ({selectedQuestions.length}문제 · {totalDays}일 · {selectedStudentIds.size}명)
          </Button>
        </div>
      </div>
    </div>
  );
}
