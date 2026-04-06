'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import {
  ArrowLeft,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle,
  Search,
  Check,
  UserPlus,
  Trash2,
  Pencil,
  X,
  School,
  ChevronRight,
} from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';

interface ConceptDetail {
  id: string;
  title: string;
  conceptCode: string | null;
  grade: string | null;
  chapter: string | null;
  section: string | null;
  sortOrder: number;
}

interface EnrollmentDetail {
  id: string;
  student: { id: string; name: string; grade: number | null; username: string };
  sortOrder: number;
  status: 'LOCKED' | 'ACTIVE' | 'COMPLETED';
  startedAt: string | null;
  completedAt: string | null;
  completedConcepts: number;
  totalConcepts: number;
  progressPercent: number;
  currentConceptTitle: string | null;
  currentConceptIndex: number | null;
  currentStage: string;
  perConceptStatus: ('completed' | 'current' | 'locked')[];
}

interface CourseDetail {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  concepts: ConceptDetail[];
  enrollments: EnrollmentDetail[];
}

interface StudentItem {
  id: string;
  name: string;
  grade: number | null;
  username: string;
  role: string;
}

const STATUS_LABEL = { LOCKED: '대기', ACTIVE: '진행 중', COMPLETED: '완료' };
const STATUS_COLOR = {
  LOCKED: 'text-slate-400 bg-slate-50',
  ACTIVE: 'text-primary bg-primary/10',
  COMPLETED: 'text-emerald-600 bg-emerald-50',
};

const STAGE_LABEL: Record<string, string> = {
  NOT_STARTED: '시작 전',
  READING: '개념학습',
  BLANK_EASY: '빈칸 1단계',
  BLANK_HARD: '빈칸 2단계',
  BLANK_FULL: '통문장 암기',
  ALL_COMPLETED: '전체 완료',
};

const STAGE_BADGE: Record<string, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-500',
  READING: 'bg-blue-50 text-blue-600',
  BLANK_EASY: 'bg-emerald-50 text-emerald-600',
  BLANK_HARD: 'bg-orange-50 text-orange-600',
  BLANK_FULL: 'bg-violet-50 text-violet-600',
  ALL_COMPLETED: 'bg-emerald-50 text-emerald-600',
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isManager = hasRoleClient(user?.role, 'MANAGER');
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 학생 추가 배정용
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [addStudentSearch, setAddStudentSearch] = useState('');
  const [addStudentIds, setAddStudentIds] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; students: { id: string }[] }[]>([]);

  // 제목/설명 편집
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!course) return;
    setEditTitle(course.title);
    setEditDesc(course.description || '');
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!editTitle.trim()) { toast.warning('과정명을 입력하세요'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/learning-courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), description: editDesc.trim() || null }),
      });
      if (res.ok) {
        toast.success('과정 정보가 수정되었습니다');
        setEditing(false);
        fetchCourse();
      } else {
        toast.error('수정 실패');
      }
    } catch {
      toast.error('수정 중 오류 발생');
    }
    setSaving(false);
  };

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/learning-courses/${id}`);
      if (res.ok) {
        const json = await res.json();
        setCourse(json.data);
      }
    } catch {
      toast.error('과정 정보를 불러오지 못했습니다');
    }
    setLoading(false);
  };

  useEffect(() => { fetchCourse(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 학생 목록 + 반 목록 (배정 추가용)
  useEffect(() => {
    if (!showAddStudents) return;
    Promise.all([
      fetch('/api/users').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
      fetch('/api/classrooms').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
    ]).then(([userJson, crJson]) => {
      setAllStudents((userJson.data ?? []).filter((u: StudentItem) => u.role === 'STUDENT'));
      setClassrooms(crJson.data ?? []);
    }).catch((err) => console.error('데이터 조회 실패:', err));
  }, [showAddStudents]);

  const enrolledStudentIds = useMemo(
    () => new Set(course?.enrollments.map((e) => e.student.id) ?? []),
    [course]
  );

  const unenrolledStudents = useMemo(() => {
    return allStudents
      .filter((s) => !enrolledStudentIds.has(s.id))
      .filter((s) => !addStudentSearch || s.name.includes(addStudentSearch) || s.username.includes(addStudentSearch));
  }, [allStudents, enrolledStudentIds, addStudentSearch]);

  const handleEnroll = async () => {
    if (addStudentIds.size === 0) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/learning-courses/${id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: Array.from(addStudentIds) }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`${json.data.enrolled}명 배정 완료`);
        setShowAddStudents(false);
        setAddStudentIds(new Set());
        fetchCourse();
      } else {
        toast.error('배정 실패');
      }
    } catch {
      toast.error('배정 중 오류 발생');
    }
    setEnrolling(false);
  };

  const handleRemoveEnrollment = async (enrollmentId: string, studentName: string) => {
    if (!(await confirm({ message: `${studentName} 학생의 배정을 삭제하시겠습니까?`, variant: 'danger', confirmLabel: '삭제' }))) return;
    try {
      // enrollment 삭제는 course PATCH로 처리하거나, 별도 API 필요
      // 간단히 직접 삭제 — enrollment ID로
      const res = await fetch(`/api/learning-courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeEnrollmentId: enrollmentId }),
      });
      if (res.ok) {
        toast.success('배정이 삭제되었습니다');
        fetchCourse();
      }
    } catch {
      toast.error('삭제 중 오류 발생');
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-6 md:py-8 max-w-[1400px] mx-auto">
        {/* 헤더 (뒤로가기 + 아이콘 + 제목 + 날짜) */}
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-9 h-9 rounded-sm" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-7 w-48" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-3 w-28" />
        </div>
        {/* 4개 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-sm p-4 text-center space-y-1.5">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
        {/* 2열 그리드: 개념 (1/3) + 학생 (2/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm bg-slate-50 border border-slate-100">
                  <Skeleton variant="circle" className="w-6 h-6 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-8 w-24 rounded" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-sm border border-slate-100">
                  <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <div className="w-32 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="px-4 sm:px-6 py-6 md:py-8 max-w-[1400px] mx-auto">
        <div className="bg-white border border-slate-200 rounded-sm p-12 text-center">
          <p className="text-text-secondary">과정을 찾을 수 없습니다.</p>
          <button onClick={() => router.back()} className="text-primary text-sm hover:underline mt-2 inline-block">
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  const avgProgress = course.enrollments.length > 0
    ? Math.round(course.enrollments.reduce((sum, e) => sum + e.progressPercent, 0) / course.enrollments.length)
    : 0;
  const completedCount = course.enrollments.filter((e) => e.status === 'COMPLETED').length;

  return (
    <div className="px-4 sm:px-6 py-6 md:py-8 max-w-[1400px] mx-auto">
      {/* 뒤로가기 */}
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-primary mb-3 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> 뒤로가기
      </button>

      {/* ── 프로필 히어로 ── */}
      <div className="bg-gradient-to-r from-primary/5 via-blue-50/50 to-violet-50/30 border border-slate-200 rounded-sm p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex flex-col gap-2">
                <input
                  className="text-sm font-bold text-text-primary bg-white border border-slate-200 rounded-sm px-2 py-1.5 w-full focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="과정명"
                  autoFocus
                />
                <input
                  className="text-xs text-text-secondary bg-white border border-slate-200 rounded-sm px-2 py-1.5 w-full focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="설명 (선택)"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} disabled={saving}>
                    {saving ? <MathSpinner size="sm" className="mr-1" /> : null}저장
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="w-3.5 h-3.5 mr-1" />취소</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text-primary">{course.title}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">#{course.seq}</span>
                  {isManager && (
                    <button onClick={startEdit} className="p-1 text-slate-400 hover:text-primary transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  {course.description || '설명 없음'} · {new Date(course.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </>
            )}
          </div>
          {/* 핵심 수치 */}
          <div className="hidden sm:flex items-center gap-5 shrink-0">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary">
                <BookOpen className="w-4 h-4" />
                <span className="text-lg font-bold">{course.concepts.length}</span>
              </div>
              <div className="text-xs text-text-secondary">개념</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-500">
                <Users className="w-4 h-4" />
                <span className="text-lg font-bold">{course.enrollments.length}</span>
              </div>
              <div className="text-xs text-text-secondary">학생</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <span className="text-lg font-bold text-amber-500">{avgProgress}%</span>
              <div className="text-xs text-text-secondary">평균 진행</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-violet-500">
                <CheckCircle className="w-4 h-4" />
                <span className="text-lg font-bold">{completedCount}</span>
              </div>
              <div className="text-xs text-text-secondary">완료</div>
            </div>
          </div>
        </div>
        {/* 모바일 수치 */}
        <div className="grid grid-cols-2 gap-2 mt-3 sm:hidden">
          <div className="text-center bg-white/60 rounded-sm py-1.5">
            <div className="text-xs font-bold text-primary">{course.concepts.length}개</div>
            <div className="text-xs text-text-secondary">개념</div>
          </div>
          <div className="text-center bg-white/60 rounded-sm py-1.5">
            <div className="text-xs font-bold text-emerald-600">{course.enrollments.length}명</div>
            <div className="text-xs text-text-secondary">학생</div>
          </div>
          <div className="text-center bg-white/60 rounded-sm py-1.5">
            <div className="text-xs font-bold text-amber-600">{avgProgress}%</div>
            <div className="text-xs text-text-secondary">진행</div>
          </div>
          <div className="text-center bg-white/60 rounded-sm py-1.5">
            <div className="text-xs font-bold text-violet-600">{completedCount}명</div>
            <div className="text-xs text-text-secondary">완료</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: 포함 개념 — 좌측 컬러바 패턴 */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-3 h-3 text-primary" />
            </div>
            <h3 className="text-xs font-bold text-text-primary">학습 개념 ({course.concepts.length}개)</h3>
          </div>
          <div className="space-y-1.5">
            {course.concepts.map((concept, idx) => (
              <div
                key={concept.id}
                className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-primary/40 transition-colors"
              >
                <div className="w-1 self-stretch bg-primary/40 shrink-0" />
                <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">{concept.title}</div>
                    {concept.chapter && concept.chapter !== concept.title && (
                      <div className="text-xs text-text-secondary truncate">{concept.chapter}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: 배정 학생 — 좌측 컬러바 + ChevronRight */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center shrink-0">
                <Users className="w-3 h-3 text-emerald-600" />
              </div>
              <h3 className="text-xs font-bold text-text-primary">배정 학생 ({course.enrollments.length}명)</h3>
            </div>
            {isManager && (
              <Button size="sm" onClick={() => setShowAddStudents(!showAddStudents)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                학생 추가
              </Button>
            )}
          </div>

          {/* 학생 추가 패널 (OWNER+) */}
          {isManager && showAddStudents && (
            <div className="mb-4 p-3 bg-slate-50 rounded-sm border border-slate-200">
              {classrooms.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="flex items-center gap-1 text-xs text-text-secondary mr-1">
                    <School className="w-3.5 h-3.5" /> 반별 추가:
                  </span>
                  {classrooms.map((cr) => {
                    const crUnenrolled = cr.students.map((s) => s.id).filter((sid) => !enrolledStudentIds.has(sid));
                    if (crUnenrolled.length === 0) return null;
                    const allSelected = crUnenrolled.every((sid) => addStudentIds.has(sid));
                    return (
                      <button
                        key={cr.id}
                        onClick={() => {
                          setAddStudentIds((prev) => {
                            const next = new Set(prev);
                            if (allSelected) crUnenrolled.forEach((sid) => next.delete(sid));
                            else crUnenrolled.forEach((sid) => next.add(sid));
                            return next;
                          });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                          allSelected ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-slate-200 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {cr.name} ({crUnenrolled.length})
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className="w-full h-8 pl-8 pr-3 rounded-sm border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="이름 또는 아이디 검색"
                  value={addStudentSearch}
                  onChange={(e) => setAddStudentSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-sm border border-slate-200 bg-white mb-2">
                {unenrolledStudents.length === 0 ? (
                  <p className="text-xs text-text-secondary text-center py-4">배정 가능한 학생이 없습니다</p>
                ) : (
                  unenrolledStudents.map((s) => {
                    const isSelected = addStudentIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setAddStudentIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.id)) next.delete(s.id);
                            else next.add(s.id);
                            return next;
                          });
                        }}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs border-b border-slate-200 last:border-0 transition-colors ${
                          isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="flex-1">{s.name}</span>
                        <span className="text-text-secondary">{s.username}</span>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEnroll} disabled={addStudentIds.size === 0 || enrolling}>
                  {enrolling ? <MathSpinner size="sm" className="mr-1" /> : null}
                  {addStudentIds.size}명 배정
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddStudents(false); setAddStudentIds(new Set()); }}>
                  취소
                </Button>
              </div>
            </div>
          )}

          {/* 학생 목록 — 좌측 컬러바 패턴 */}
          {course.enrollments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-sm text-center py-8">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-text-secondary text-sm">배정된 학생이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {course.enrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-primary/40 transition-colors">
                  <div className={`w-1 self-stretch shrink-0 ${
                    enrollment.status === 'COMPLETED' ? 'bg-emerald-400' :
                    enrollment.status === 'ACTIVE' ? 'bg-primary' : 'bg-slate-200'
                  }`} />
                  <Link
                    href={`/courses/${id}/progress/${enrollment.student.username}`}
                    className="flex items-center justify-between flex-1 min-w-0 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary/60 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {enrollment.student.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-text-primary truncate">{enrollment.student.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[enrollment.status]}`}>
                            {STATUS_LABEL[enrollment.status]}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5">
                          {enrollment.student.username}
                          {enrollment.startedAt && ` · 시작 ${new Date(enrollment.startedAt).toLocaleDateString('ko-KR')}`}
                        </div>
                        {/* 현재 학습 개념 + 단계 */}
                        {enrollment.currentConceptTitle && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs text-text-primary">
                              {enrollment.currentConceptTitle}
                            </span>
                            <span className="text-xs text-text-secondary">
                              ({enrollment.currentConceptIndex}/{enrollment.totalConcepts})
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STAGE_BADGE[enrollment.currentStage] || STAGE_BADGE.NOT_STARTED}`}>
                              {STAGE_LABEL[enrollment.currentStage] || enrollment.currentStage}
                            </span>
                          </div>
                        )}
                        {enrollment.currentStage === 'ALL_COMPLETED' && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STAGE_BADGE.ALL_COMPLETED}`}>
                              {STAGE_LABEL.ALL_COMPLETED}
                            </span>
                          </div>
                        )}
                        {/* 개념별 진행 도트 */}
                        {enrollment.perConceptStatus?.length > 0 && (
                          <div className="flex items-center gap-0.5 mt-1.5">
                            {enrollment.perConceptStatus.map((status, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  status === 'completed' ? 'bg-emerald-400' :
                                  status === 'current' ? 'bg-primary ring-2 ring-primary/30' :
                                  'bg-slate-200'
                                }`}
                                title={`${i + 1}번째 개념${status === 'completed' ? ' (완료)' : status === 'current' ? ' (진행 중)' : ''}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="w-28 hidden sm:block">
                        <div className="flex justify-between text-xs text-text-secondary mb-0.5">
                          <span>{enrollment.completedConcepts}/{enrollment.totalConcepts}</span>
                          <span>{enrollment.progressPercent}%</span>
                        </div>
                        <ProgressBar value={enrollment.progressPercent} size="sm" />
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </Link>
                  {isManager && (
                    <button
                      onClick={() => handleRemoveEnrollment(enrollment.id, enrollment.student.name)}
                      className="p-1.5 mr-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
