'use client';

/**
 * 새 학습 과정 만들기 — Pattern A V2 위자드 적용 (W5).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2
 * 매니페스트 V2 권장 페이지 (3단계 — 기본정보 → 개념 → 학생배정).
 *
 * 변경 전: 2-column 단일 페이지 (좌측 기본정보+개념, 우측 학생+제출)
 * 변경 후: 3단계 V2 위자드 — 각 단계가 독립 카드, 검증 후 다음 진행
 *
 * 학습 흐름이 명확해지고 모바일/태블릿에서 가독성 향상.
 */

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import {
  Search,
  Check,
  Users,
  School,
  Lock,
  Unlock,
  GraduationCap,
} from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import {
  CurriculumConceptPicker,
  PickerConceptItem,
} from '@/components/curriculum/CurriculumConceptPicker';
import {
  WizardLayoutV2,
  WizardProgressV2,
  WizardCard,
  WizardBottomBar,
  type WizardStep,
} from '@/components/wizard';

interface StudentItem {
  id: string;
  name: string;
  grade: number | null;
  username: string;
}

const STEPS: WizardStep[] = [
  { id: 'basic', label: '기본 정보' },
  { id: 'concepts', label: '개념 선택' },
  { id: 'assign', label: '학생 배정' },
];

function CourseCreateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const _preClassroomId = searchParams.get('classroomId');

  // ── 위자드 단계 ──
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'free' | 'sequential'>('free');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

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
        console.error('데이터 조회 실패:', err);
      }
      setStudentsLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 선택된 개념 기반 자동 과정명 생성
  useEffect(() => {
    if (titleManuallyEdited || selectedConcepts.length === 0) return;

    const gradeChapterMap = new Map<string, Set<string>>();
    for (const c of selectedConcepts) {
      const g = c.grade ?? 'unknown';
      if (!gradeChapterMap.has(g)) gradeChapterMap.set(g, new Set());
      if (c.chapter) gradeChapterMap.get(g)!.add(c.chapter);
    }

    const GRADE_SHORT: Record<string, string> = {
      elementary_3: '초3', elementary_4: '초4', elementary_5: '초5', elementary_6: '초6',
      middle_1: '중1', middle_2: '중2', middle_3: '중3',
      high_1: '공통1', high_2: '공통2', high_algebra: '대수',
      high_calculus1: '미적I', high_prob: '확통', high_calculus2: '미적II', high_geo: '기하',
    };
    const gLabel = (g: string) => GRADE_SHORT[g] ?? g;

    const getSem = (g: string): string => {
      const firstConcept = selectedConcepts.find((c) => c.grade === g);
      if (!firstConcept?.conceptCode) return '';
      const parts = firstConcept.conceptCode.split('-');
      if (parts.length >= 2) {
        const semPart = parts[1];
        if (semPart === '1' || semPart === '2') return semPart;
      }
      return '';
    };

    const parts: string[] = [];
    for (const [grade, chapters] of gradeChapterMap) {
      const sem = getSem(grade);
      const prefix = sem ? `${gLabel(grade)}-${sem}` : gLabel(grade);
      const chapterList = Array.from(chapters);
      if (chapterList.length === 1) {
        parts.push(`${prefix} ${chapterList[0]}`);
      } else if (chapterList.length <= 2) {
        parts.push(`${prefix} ${chapterList.join(', ')}`);
      } else {
        parts.push(`${prefix} ${chapterList[0]} 외 ${chapterList.length - 1}개`);
      }
    }

    setTitle(parts.join(' + '));
  }, [selectedConcepts, titleManuallyEdited]);

  const handleTitleSuggestion = (suggested: string) => {
    if (!titleManuallyEdited) setTitle(suggested);
  };

  // Student filtering
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

  // ── 단계별 검증 ──
  const canProceed = (() => {
    switch (step) {
      case 0:
        return title.trim().length > 0;
      case 1:
        return selectedConcepts.length > 0;
      case 2:
        return true; // 학생 미선택 허용 (과정만 먼저 생성)
      default:
        return false;
    }
  })();

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('과정명을 입력하세요');
    if (selectedConcepts.length === 0) return toast.error('최소 1개 개념을 선택하세요');

    setSubmitting(true);
    try {
      const createRes = await fetch('/api/learning-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          conceptIds: selectedConcepts.map((c) => c.id),
          mode,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        toast.error(err.error?.message || '과정 생성 실패');
        setSubmitting(false);
        return;
      }

      const { data: courseData } = await createRes.json();

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
    <WizardLayoutV2
      topbar={{
        backHref: '/courses',
        backLabel: '← 과정 목록',
        title: '새 학습 과정 만들기',
        actions: (
          <button
            className="wz-btn ghost"
            type="button"
            onClick={() => router.push('/courses')}
          >
            취소
          </button>
        ),
      }}
      heading={
        step === 0
          ? '과정 기본 정보'
          : step === 1
            ? '학생들이 학습할 개념을 선택해 주세요'
            : '과정에 학생을 배정합니다'
      }
      subheading={
        step === 0
          ? '과정명과 학습 모드를 정합니다. 개념 선택 후 자동으로 제안되기도 합니다.'
          : step === 1
            ? '교육과정/계통/검색 탭에서 골라 담을 수 있고, 선택한 개념 수에 따라 과정명이 자동 제안됩니다.'
            : '반별 일괄 배정 또는 개별 선택 가능. 학생 없이 과정만 먼저 만들 수도 있습니다.'
      }
      progress={
        <WizardProgressV2
          steps={STEPS}
          currentIndex={step}
          onSelect={(i) => setStep(i as 0 | 1 | 2)}
          allowSkipAhead={false}
        />
      }
      canvas={
        <WizardCard>
          {/* ── Step 1: 기본 정보 ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="wz-field">
                <span className="wz-lbl">
                  과정명 <span className="text-red-500">*</span>
                </span>
                <input
                  className="wz-input"
                  placeholder="개념 선택 시 자동 제안됩니다. 직접 입력도 가능."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleManuallyEdited(true);
                  }}
                />
              </div>

              <div className="wz-field">
                <span className="wz-lbl">설명 (선택)</span>
                <textarea
                  className="wz-input"
                  style={{ minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="과정에 대한 간단한 설명"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="wz-field">
                <span className="wz-lbl">학습 모드</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('sequential')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm rounded-sm border transition-colors flex-1 ${
                      mode === 'sequential'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" /> 순차 학습
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('free')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm rounded-sm border transition-colors flex-1 ${
                      mode === 'free'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" /> 자유 학습
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {mode === 'sequential'
                    ? '이전 개념을 완료해야 다음 개념을 학습할 수 있습니다'
                    : '어떤 개념이든 자유롭게 학습할 수 있습니다'}
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: 개념 선택 ── */}
          {step === 1 && (
            <div>
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

          {/* ── Step 3: 학생 배정 ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* 헤더 + 전체 선택 */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 m-0">
                  <Users className="w-4 h-4 text-primary" />
                  학생 목록
                  {selectedStudentIds.size > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {selectedStudentIds.size}명
                    </span>
                  )}
                </h3>
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

              {/* 반별 일괄 배정 */}
              {classrooms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="flex items-center gap-1 text-xs text-slate-500 mr-1">
                    <School className="w-3.5 h-3.5" /> 반별 배정:
                  </span>
                  {classrooms.map((cr) => {
                    const crStudentIds = cr.students.map((s) => s.id);
                    const allInClass =
                      crStudentIds.length > 0 &&
                      crStudentIds.every((id) => selectedStudentIds.has(id));
                    return (
                      <button
                        key={cr.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentIds((prev) => {
                            const next = new Set(prev);
                            if (allInClass) {
                              crStudentIds.forEach((id) => next.delete(id));
                            } else {
                              crStudentIds.forEach((id) => next.add(id));
                            }
                            return next;
                          });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                          allInClass
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {cr.name} ({crStudentIds.length})
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
                  placeholder="이름 또는 아이디 검색"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              {/* 학생 목록 */}
              <div className="border border-slate-200 rounded overflow-y-auto max-h-[400px]">
                {studentsLoading ? (
                  <div className="space-y-1.5 p-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} className="h-8 w-full rounded" />
                    ))}
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">학생이 없습니다</p>
                ) : (
                  filteredStudents.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs border-b border-slate-200 last:border-0 transition-colors ${
                          isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span
                          className={`flex-1 ${
                            isSelected ? 'text-primary font-bold' : 'text-slate-800'
                          }`}
                        >
                          {student.name}
                        </span>
                        <span className="text-slate-500">{student.username}</span>
                        {student.grade && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {student.grade <= 6
                              ? `초${student.grade}`
                              : `중${student.grade - 6}`}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* 최종 요약 */}
              <div className="bg-slate-50 border border-slate-200 rounded-sm p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">과정명</span>
                  <span className="font-bold text-slate-800">{title || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">학습 모드</span>
                  <span className="font-bold text-slate-800">
                    {mode === 'sequential' ? '순차 학습' : '자유 학습'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">개념 수</span>
                  <span className="font-bold text-slate-800">
                    {selectedConcepts.length}개
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">배정 학생</span>
                  <span className="font-bold text-slate-800">
                    {selectedStudentIds.size}명
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                * 학생을 선택하지 않고도 과정을 먼저 생성할 수 있습니다.
              </p>
            </div>
          )}
        </WizardCard>
      }
      bottomBar={
        <WizardBottomBar
          status={
            <>
              단계 <b>{step + 1}</b> / 3 ·{' '}
              {step === 0
                ? title.trim()
                  ? '기본 정보 입력됨'
                  : '과정명 필요'
                : step === 1
                  ? `${selectedConcepts.length}개 개념 선택`
                  : `${selectedStudentIds.size}명 배정 예정`}
            </>
          }
          actions={
            <>
              <button
                type="button"
                className="wz-btn"
                disabled={step === 0}
                onClick={() => setStep((i) => Math.max(0, i - 1) as 0 | 1 | 2)}
              >
                ← 이전
              </button>
              {step < 2 ? (
                <button
                  type="button"
                  className="wz-btn primary"
                  disabled={!canProceed}
                  onClick={() => setStep((i) => Math.min(2, i + 1) as 0 | 1 | 2)}
                >
                  다음 →
                </button>
              ) : (
                <button
                  type="button"
                  className="wz-btn primary"
                  disabled={submitting || !title.trim() || selectedConcepts.length === 0}
                  onClick={handleSubmit}
                >
                  {submitting && <MathSpinner size="sm" />}
                  <GraduationCap className="w-4 h-4" />
                  과정 생성
                  {selectedStudentIds.size > 0
                    ? ` + ${selectedStudentIds.size}명 배정`
                    : ''}
                </button>
              )}
            </>
          }
        />
      }
    />
  );
}

export default function CourseCreatePage() {
  return (
    <Suspense>
      <CourseCreateInner />
    </Suspense>
  );
}
