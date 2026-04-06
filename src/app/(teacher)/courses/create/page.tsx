'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import {
  Search,
  Check,
  Users,
  GraduationCap,
  School,
  Lock,
  Unlock,
} from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer } from '@/components/ui/PageContainer';
import { CurriculumConceptPicker, PickerConceptItem } from '@/components/curriculum/CurriculumConceptPicker';

interface StudentItem {
  id: string;
  name: string;
  grade: number | null;
  username: string;
}

function CourseCreateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const _preClassroomId = searchParams.get('classroomId');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'free' | 'sequential'>('free');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

  // Concept selection
  const [selectedConcepts, setSelectedConcepts] = useState<PickerConceptItem[]>([]);

  // Student selection
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Classroom-based enrollment
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
      } catch (err) { console.error('데이터 조회 실패:', err); }
      setStudentsLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // classroomId 쿼리 파라미터 — 반별 배정 버튼을 미리 선택만 해두고 학생은 전체 해제 상태
  // (전체 선택은 "전체 선택" 버튼으로 사용자가 직접 선택)

  // 선택된 개념 기반 자동 과정명 생성
  useEffect(() => {
    if (titleManuallyEdited || selectedConcepts.length === 0) return;

    // 학년별 단원(chapter) 그룹핑
    const gradeChapterMap = new Map<string, Set<string>>();
    for (const c of selectedConcepts) {
      const g = c.grade ?? 'unknown';
      if (!gradeChapterMap.has(g)) gradeChapterMap.set(g, new Set());
      if (c.chapter) gradeChapterMap.get(g)!.add(c.chapter);
    }

    // grade → 짧은 라벨 (초4, 중1 등)
    const GRADE_SHORT: Record<string, string> = {
      elementary_3: '초3', elementary_4: '초4', elementary_5: '초5', elementary_6: '초6',
      middle_1: '중1', middle_2: '중2', middle_3: '중3',
      high_1: '공통1', high_2: '공통2', high_algebra: '대수',
      high_calculus1: '미적I', high_prob: '확통', high_calculus2: '미적II', high_geo: '기하',
    };
    const gLabel = (g: string) => GRADE_SHORT[g] ?? g;

    // 학기 추출 (grade code 기반)
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

  // CurriculumConceptPicker의 onTitleSuggestion (계통 탭용 — 전체 교체 방식)
  const handleTitleSuggestion = (suggested: string) => {
    if (!titleManuallyEdited) setTitle(suggested);
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
          mode,
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
    <PageContainer maxWidth="xl">
      {/* Header */}
      <PageHeader
        title="새 학습 과정 만들기"
        subtitle="개념을 선택하고 학생에게 배정합니다"
        icon={<GraduationCap className="w-6 h-6" />}
        backHref="/courses"
      />

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
                  placeholder="교육과정/계통 선택 시 자동 생성됩니다"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleManuallyEdited(true);
                  }}
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
              <div>
                <label className="text-sm font-medium text-text-primary mb-1 block">학습 모드</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('sequential')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-sm border transition-colors flex-1 ${
                      mode === 'sequential'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    순차 학습
                  </button>
                  <button
                    onClick={() => setMode('free')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-sm border transition-colors flex-1 ${
                      mode === 'free'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    자유 학습
                  </button>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {mode === 'sequential'
                    ? '이전 개념을 완료해야 다음 개념을 학습할 수 있습니다'
                    : '어떤 개념이든 자유롭게 학습할 수 있습니다'}
                </p>
              </div>
            </div>
          </div>

          {/* 개념 선택 */}
          <div className="bg-white rounded-sm border border-slate-200 p-5 flex-1">
            <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              📋 개념 선택
              {selectedConcepts.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {selectedConcepts.length}개
                </span>
              )}
            </h2>
            <CurriculumConceptPicker
              selectedConcepts={selectedConcepts}
              onChangeSelected={setSelectedConcepts}
              onTitleSuggestion={handleTitleSuggestion}
            />
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

            {/* 반별 일괄 배정 */}
            {classrooms.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 text-xs text-text-secondary mr-1">
                  <School className="w-3.5 h-3.5" /> 반별 배정:
                </span>
                {classrooms.map((cr) => {
                  const crStudentIds = cr.students.map((s) => s.id);
                  const allInClass = crStudentIds.length > 0 && crStudentIds.every((id) => selectedStudentIds.has(id));
                  return (
                    <button
                      key={cr.id}
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
                          : 'bg-white text-text-secondary border-slate-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {cr.name} ({crStudentIds.length})
                    </button>
                  );
                })}
              </div>
            )}

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
                <div className="space-y-1.5 p-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded" />
                  ))}
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
                <span className="text-text-secondary">학습 모드</span>
                <span className="font-bold text-text-primary">
                  {mode === 'sequential' ? '순차 학습' : '자유 학습'}
                </span>
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
                <><MathSpinner size="sm" className="mr-2" /> 생성 중...</>
              ) : (
                <><GraduationCap className="w-4 h-4 mr-2" /> 과정 생성{selectedStudentIds.size > 0 ? ` + ${selectedStudentIds.size}명 배정` : ''}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default function CourseCreatePage() {
  return (
    <Suspense>
      <CourseCreateInner />
    </Suspense>
  );
}
