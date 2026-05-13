'use client';

/**
 * 개념 숙제 만들기 — Pattern A V1 위자드 적용 (W5).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V1
 * 매니페스트 V1 권장 — 선생님 daily 워크플로우, 우측 요약 항상 확인.
 *
 * 변경 전: 단일 페이지 (기본설정 + 개념선택 + 학생배정 + 제출 세로 배치)
 * 변경 후: 3단계 V1 위자드 — 좌측 stepper + 중앙 작업 + 우측 실시간 요약
 *
 * 3단계 흐름
 *   1) 기본 설정 (숙제명/시작일/하루당 개념/완료 기준)
 *   2) 개념 선택 (CurriculumConceptPicker)
 *   3) 학생 배정 + 최종 확인
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { BookOpen, Search, Check, Users, School } from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  CurriculumConceptPicker,
  PickerConceptItem,
} from '@/components/curriculum/CurriculumConceptPicker';
import {
  WizardLayoutV1,
  WizardStepperV1,
  type WizardStep,
} from '@/components/wizard';

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

const STAGE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  STAGE_OPTIONS.map((o) => [o.value, o.label]),
);

export default function ConceptHomeworkCreatePage() {
  const router = useRouter();

  // ── 위자드 단계 ──
  const [step, setStep] = useState(0);

  const steps: WizardStep[] = useMemo(
    () => [
      {
        id: 'basic',
        label: '기본 설정',
        sub: '숙제명 · 일정 · 완료 기준',
      },
      {
        id: 'concepts',
        label: '개념 선택',
        sub: '교육과정/계통/검색',
      },
      {
        id: 'assign',
        label: '학생 배정',
        sub: '반별 + 개별 + 최종 확인',
      },
    ],
    [],
  );

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [conceptsPerDay, setConceptsPerDay] = useState(1);
  const [requiredStage, setRequiredStage] = useState('BLANK_FULL');

  // ── 개념 선택 ──
  const [selectedConcepts, setSelectedConcepts] = useState<PickerConceptItem[]>([]);

  // ── 학생 선택 ──
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [classrooms, setClassrooms] = useState<
    { id: string; name: string; students: { id: string }[] }[]
  >([]);

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

  // 자동 숙제명 제안
  const handleTitleSuggestion = (suggested: string) => {
    if (!titleManuallyEdited) setTitle(suggested + ' 숙제');
  };

  const filteredStudents = useMemo(() => {
    return allStudents.filter(
      (s) =>
        !studentSearch ||
        s.name.includes(studentSearch) ||
        s.username.includes(studentSearch),
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

  // Computed
  const totalDays = Math.ceil(
    selectedConcepts.length / Math.max(1, conceptsPerDay),
  );

  // ── 단계별 검증 ──
  const canProceed = (() => {
    switch (step) {
      case 0:
        return title.trim().length > 0;
      case 1:
        return selectedConcepts.length > 0;
      case 2:
        return title.trim().length > 0 && selectedConcepts.length > 0;
      default:
        return false;
    }
  })();

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('제목을 입력하세요');
      return;
    }
    if (selectedConcepts.length === 0) {
      toast.warning('개념을 1개 이상 선택하세요');
      return;
    }

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
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <WizardLayoutV1
        topbar={{
          backHref: '/homework',
          backLabel: '← 숙제 목록',
          title: `개념 숙제 만들기 — 단계 ${step + 1}/3`,
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
                  <BookOpen className="w-4 h-4" />
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
              <div className="ttl">{title || '개념 숙제'}</div>
              <div className="meta">
                {selectedConcepts.length > 0
                  ? `${selectedConcepts.length}개 개념 · ${totalDays}일`
                  : '개념 미선택'}
              </div>
            </div>

            <div className="row">
              <span className="k">시작일</span>
              <span className="v">{startDate}</span>
            </div>
            <div className="row">
              <span className="k">하루당 개념</span>
              <span className="v">{conceptsPerDay}개</span>
            </div>
            <div className="row">
              <span className="k">완료 기준</span>
              <span className="v">{STAGE_LABEL_MAP[requiredStage] ?? '-'}</span>
            </div>
            <div className="row">
              <span className="k">선택 개념</span>
              <span
                className="v"
                style={selectedConcepts.length === 0 ? { color: 'var(--ink-3)' } : undefined}
              >
                {selectedConcepts.length}개
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
                    숙제명과 일정, 완료 기준 단계를 정합니다. 개념 선택 시 이름 자동 제안됩니다.
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
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleManuallyEdited(true);
                    }}
                    placeholder="교육과정/계통 선택 시 자동 생성됩니다"
                  />
                </div>

                <div className="wz-v2-form-row">
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
                    <span className="wz-lbl">하루당 개념 수</span>
                    <select
                      className="wz-select"
                      value={conceptsPerDay}
                      onChange={(e) => setConceptsPerDay(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}개</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="wz-field">
                  <span className="wz-lbl">완료 기준 단계</span>
                  <div className="flex gap-2 flex-wrap">
                    {STAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRequiredStage(opt.value)}
                        className={`flex-1 min-w-[120px] px-3 py-2 rounded-sm text-xs font-medium border transition-colors ${
                          requiredStage === opt.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: 개념 선택 ── */}
            {step === 1 && (
              <div>
                <div className="mb-3">
                  <h3>개념 선택</h3>
                  <p className="sub">
                    교육과정/계통 탭에서 학습 단원을 골라 담을 수 있습니다.
                    선택된 개념 수에 따라 자동으로 일수가 계산됩니다.
                  </p>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">선택된 개념</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {selectedConcepts.length}개
                  </span>
                  {selectedConcepts.length === 0 && (
                    <span className="text-xs text-slate-500">
                      · 최소 1개 이상 선택해 주세요
                    </span>
                  )}
                </div>

                <CurriculumConceptPicker
                  selectedConcepts={selectedConcepts}
                  onChangeSelected={setSelectedConcepts}
                  onTitleSuggestion={handleTitleSuggestion}
                />
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
                        crIds.length > 0 && crIds.every((id) => selectedStudentIds.has(id));
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
                    <span className="text-slate-500">개념 / 일수</span>
                    <span className="font-bold text-slate-800">
                      {selectedConcepts.length}개 · {totalDays}일
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">완료 기준</span>
                    <span className="font-bold text-slate-800">
                      {STAGE_LABEL_MAP[requiredStage]}
                    </span>
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
