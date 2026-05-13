'use client';

/**
 * 문제 숙제 만들기 — Pattern A V1 위자드 적용 (W5).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V1
 * 매니페스트 V1 권장 — 선생님 daily, 우측 요약 항상 확인.
 *
 * 변경 전: 단일 페이지 (기본설정 + 문제선택 + 학생배정 + 제출 세로 배치)
 * 변경 후: 3단계 V1 위자드 (concept-create 와 동일 패턴)
 *
 * 3단계 흐름
 *   1) 기본 설정 (숙제명/시작일/하루당 문제/통과 기준)
 *   2) 문제 선택 (교재 필터 + 검색)
 *   3) 학생 배정 + 최종 확인
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileQuestion,
  Search,
  Check,
  X,
  Users,
  School,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { MathSpinner } from '@/components/ui/MathSpinner';
import {
  WizardLayoutV1,
  WizardStepperV1,
  type WizardStep,
} from '@/components/wizard';

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

const DIFF_LABELS: Record<string, string> = {
  BASIC: '하',
  MEDIUM: '중',
  HIGH: '상',
  HIGHEST: '최상',
};
const DIFF_COLORS: Record<string, string> = {
  BASIC: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  HIGHEST: 'bg-red-100 text-red-700',
};

export default function QuestionHomeworkCreatePage() {
  const router = useRouter();

  // ── 위자드 단계 ──
  const [step, setStep] = useState(0);

  const steps: WizardStep[] = useMemo(
    () => [
      { id: 'basic', label: '기본 설정', sub: '숙제명 · 일정 · 통과 기준' },
      { id: 'questions', label: '문제 선택', sub: '교재 필터 + 검색' },
      { id: 'assign', label: '학생 배정', sub: '반별 + 개별 + 최종 확인' },
    ],
    [],
  );

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [questionsPerDay, setQuestionsPerDay] = useState(5);
  const [passingScore, setPassingScore] = useState(80);

  // ── 문제 ──
  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionSearch, setQuestionSearch] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionItem[]>([]);

  // ── 학생 ──
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [classrooms, setClassrooms] = useState<
    { id: string; name: string; students: { id: string }[] }[]
  >([]);

  const [submitting, setSubmitting] = useState(false);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (bookFilter) params.set('bookCode', bookFilter);
      if (questionSearch) params.set('search', questionSearch);
      const res = await fetch(`/api/questions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setAllQuestions(json.data ?? []);
      }
    } catch (err) {
      console.error('문제 목록 조회 실패:', err);
    }
    setQuestionsLoading(false);
  }, [bookFilter, questionSearch]);

  useEffect(() => {
    // Step 2 진입 시점에 fetch 트리거
    if (step === 1) fetchQuestions();
  }, [step, fetchQuestions]);

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
          setAllStudents(
            (json.data ?? []).filter((u: { role: string }) => u.role === 'STUDENT'),
          );
        }
        if (crRes.ok) {
          const json = await crRes.json();
          setClassrooms(json.data ?? []);
        }
      } catch (err) {
        console.error('학생 목록 조회 실패:', err);
      }
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
    setSelectedStudentIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const totalDays = Math.ceil(
    selectedQuestions.length / Math.max(1, questionsPerDay),
  );

  const filteredStudents = allStudents.filter(
    (s) =>
      !studentSearch ||
      s.name.includes(studentSearch) ||
      s.username.includes(studentSearch),
  );

  // Get unique bookCodes
  const bookCodes = [...new Set(allQuestions.map((q) => q.bookCode))].sort();

  // ── 단계별 검증 ──
  const canProceed = (() => {
    switch (step) {
      case 0:
        return title.trim().length > 0;
      case 1:
        return selectedQuestions.length > 0;
      case 2:
        return title.trim().length > 0 && selectedQuestions.length > 0;
      default:
        return false;
    }
  })();

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('제목을 입력하세요');
      return;
    }
    if (selectedQuestions.length === 0) {
      toast.warning('문제를 1개 이상 선택하세요');
      return;
    }

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
      else {
        const json = await res.json();
        toast.error(json.error?.message ?? '생성 실패');
      }
    } catch {
      toast.error('생성 실패');
    }
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <WizardLayoutV1
        topbar={{
          backHref: '/homework',
          backLabel: '← 숙제 목록',
          title: `문제 숙제 만들기 — 단계 ${step + 1}/3`,
          stepText: `· ${steps[step].label}`,
          actions: (
            <>
              <button
                type="button"
                className="wz-btn ghost"
                onClick={() => router.push('/homework')}
              >
                취소
              </button>
              <button
                type="button"
                className="wz-btn"
                disabled={step === 0}
                onClick={() => setStep((i) => Math.max(0, i - 1))}
              >
                ← 이전
              </button>
              {step < 2 ? (
                <button
                  type="button"
                  className="wz-btn primary"
                  disabled={!canProceed}
                  onClick={() => setStep((i) => Math.min(2, i + 1))}
                >
                  다음 →
                </button>
              ) : (
                <button
                  type="button"
                  className="wz-btn primary"
                  disabled={!canProceed || submitting}
                  onClick={handleSubmit}
                >
                  {submitting && <MathSpinner size="sm" />}
                  <FileQuestion className="w-4 h-4" />
                  숙제 생성
                  {selectedStudentIds.size > 0 && ` + ${selectedStudentIds.size}명`}
                </button>
              )}
            </>
          ),
        }}
        stepper={
          <WizardStepperV1
            heading="출제 단계"
            steps={steps}
            currentIndex={step}
            onSelect={(i) => setStep(i)}
            allowSkipAhead={false}
          />
        }
        preview={
          <>
            <h4>실시간 요약</h4>
            <div className="summary">
              <div className="ttl">{title || '문제 숙제'}</div>
              <div className="meta">
                {selectedQuestions.length > 0
                  ? `${selectedQuestions.length}문제 · ${totalDays}일`
                  : '문제 미선택'}
              </div>
            </div>

            <div className="row">
              <span className="k">시작일</span>
              <span className="v">{startDate}</span>
            </div>
            <div className="row">
              <span className="k">하루당 문제</span>
              <span className="v">{questionsPerDay}문제</span>
            </div>
            <div className="row">
              <span className="k">통과 기준</span>
              <span className="v">{passingScore}%</span>
            </div>
            <div className="row">
              <span className="k">선택 문제</span>
              <span
                className="v"
                style={
                  selectedQuestions.length === 0 ? { color: 'var(--ink-3)' } : undefined
                }
              >
                {selectedQuestions.length}문제
              </span>
            </div>
            <div className="row">
              <span className="k">총 진행 기간</span>
              <span
                className="v"
                style={totalDays === 0 ? { color: 'var(--ink-3)' } : undefined}
              >
                {totalDays > 0 ? `${totalDays}일` : '-'}
              </span>
            </div>
            <div className="row">
              <span className="k">배정 학생</span>
              <span
                className="v"
                style={
                  selectedStudentIds.size === 0 ? { color: 'var(--ink-3)' } : undefined
                }
              >
                {selectedStudentIds.size === 0
                  ? '미배정'
                  : `${selectedStudentIds.size}명`}
              </span>
            </div>
          </>
        }
        canvas={
          <>
            {/* ── Step 1: 기본 설정 ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h3>기본 설정</h3>
                  <p className="sub">
                    숙제명과 일정, 통과 기준을 정합니다. 다음 단계에서 문제를 고릅니다.
                  </p>
                </div>

                <div className="wz-field">
                  <span className="wz-lbl">
                    숙제 이름 <span className="text-red-500">*</span>
                  </span>
                  <input
                    className="wz-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 3월 2주차 문제 숙제"
                  />
                </div>

                <div className="wz-v2-form-row three">
                  <div className="wz-field">
                    <span className="wz-lbl">시작일</span>
                    <input
                      className="wz-input"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">하루당 문제 수</span>
                    <select
                      className="wz-select"
                      value={questionsPerDay}
                      onChange={(e) => setQuestionsPerDay(Number(e.target.value))}
                    >
                      {[1, 2, 3, 5, 7, 10, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n}문제
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">통과 기준 (%)</span>
                    <input
                      className="wz-input"
                      type="number"
                      min={0}
                      max={100}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: 문제 선택 ── */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <h3>문제 선택</h3>
                  <p className="sub">
                    문제은행에서 교재/검색으로 필터링하고 클릭으로 선택/해제합니다.
                  </p>
                </div>

                {/* 필터 */}
                <div className="flex gap-2">
                  <select
                    value={bookFilter}
                    onChange={(e) => setBookFilter(e.target.value)}
                    className="wz-select"
                    style={{ width: 'auto' }}
                  >
                    <option value="">전체 교재</option>
                    {bookCodes.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      className="wz-input"
                      style={{ paddingLeft: 32, paddingRight: 32 }}
                      type="text"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder="문제 검색..."
                    />
                    {questionSearch && (
                      <button
                        type="button"
                        onClick={() => setQuestionSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-3 h-3 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 선택 표시 */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {allQuestions.length}개 문제 ·{' '}
                    <b className="text-primary">
                      {selectedQuestions.length}개 선택됨
                    </b>
                  </span>
                  {selectedQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedQuestions([])}
                      className="text-slate-400 hover:text-red-500 hover:underline"
                    >
                      전체 해제
                    </button>
                  )}
                </div>

                {/* 문제 목록 */}
                <div className="max-h-[500px] overflow-y-auto border border-slate-200 rounded-sm">
                  {questionsLoading ? (
                    <div className="space-y-1.5 p-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded" />
                      ))}
                    </div>
                  ) : allQuestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      문제가 없습니다
                    </div>
                  ) : (
                    allQuestions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => toggleQuestion(q)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 border-b border-slate-100 last:border-0 transition-colors ${
                          selectedIds.has(q.id) ? 'bg-primary/5' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                            selectedIds.has(q.id)
                              ? 'bg-primary border-primary'
                              : 'border-slate-300'
                          }`}
                        >
                          {selectedIds.has(q.id) && (
                            <Check className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                        <span
                          className={`px-1 py-0.5 rounded text-xs font-semibold ${
                            DIFF_COLORS[q.difficulty] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {DIFF_LABELS[q.difficulty] ?? q.difficulty}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {q.bookCode}-{q.questionNum}
                        </span>
                        <span className="truncate text-slate-800">
                          {q.content.slice(0, 60)}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0 ml-auto">
                          {q.chapter}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: 학생 배정 + 최종 확인 ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3>학생 배정</h3>
                  <p className="sub">
                    반별 일괄 또는 개별 선택 가능. 학생 없이 숙제 계획만 먼저 만들 수도 있습니다.
                  </p>
                </div>

                {/* 헤더 + 전체 선택 */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 m-0">
                    <Users className="w-4 h-4 text-primary" />
                    학생 목록
                    {selectedStudentIds.size > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        {selectedStudentIds.size}명
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStudentIds(new Set(allStudents.map((s) => s.id)))
                      }
                      className="text-xs text-primary hover:underline"
                    >
                      전체 선택
                    </button>
                    {selectedStudentIds.size > 0 && (
                      <button
                        type="button"
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500 mr-1">
                      <School className="w-3.5 h-3.5" /> 반별 배정:
                    </span>
                    {classrooms.map((cr) => {
                      const crIds = cr.students.map((s) => s.id);
                      const allSelected =
                        crIds.length > 0 &&
                        crIds.every((id) => selectedStudentIds.has(id));
                      return (
                        <button
                          key={cr.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentIds((prev) => {
                              const next = new Set(prev);
                              if (allSelected)
                                crIds.forEach((id) => next.delete(id));
                              else crIds.forEach((id) => next.add(id));
                              return next;
                            });
                          }}
                          className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                            allSelected
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {cr.name} ({crIds.length})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 검색 */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    className="wz-input"
                    style={{ paddingLeft: 32 }}
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="이름 또는 아이디 검색"
                  />
                </div>

                {/* 학생 목록 */}
                <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-sm">
                  {studentsLoading ? (
                    <div className="space-y-1.5 p-2">
                      {Array.from({ length: 4 }, (_, i) => (
                        <Skeleton key={i} className="h-9 w-full rounded" />
                      ))}
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      학생이 없습니다
                    </div>
                  ) : (
                    filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStudent(s.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-slate-100 last:border-0 transition-colors ${
                          selectedStudentIds.has(s.id)
                            ? 'bg-primary/5'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                            selectedStudentIds.has(s.id)
                              ? 'bg-primary border-primary'
                              : 'border-slate-300'
                          }`}
                        >
                          {selectedStudentIds.has(s.id) && (
                            <Check className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                        <span className="text-slate-800 truncate">{s.name}</span>
                        <span className="ml-auto text-xs text-slate-500 shrink-0">
                          {s.username}
                        </span>
                        {s.grade && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-sm shrink-0">
                            {s.grade > 6 ? `중${s.grade - 6}` : `초${s.grade}`}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* 최종 요약 */}
                <div className="bg-slate-50 border border-slate-200 rounded-sm p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">숙제명</span>
                    <span className="font-bold text-slate-800">{title || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">시작일</span>
                    <span className="font-bold text-slate-800">{startDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">문제 / 일수</span>
                    <span className="font-bold text-slate-800">
                      {selectedQuestions.length}문제 · {totalDays}일
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">통과 기준</span>
                    <span className="font-bold text-slate-800">{passingScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">배정 학생</span>
                    <span className="font-bold text-primary">
                      {selectedStudentIds.size}명
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  * 학생을 선택하지 않고도 숙제 계획만 먼저 만들 수 있습니다.
                </p>
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
