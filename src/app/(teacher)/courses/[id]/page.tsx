'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import {
  ArrowLeft,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle,
  Lock,
  Play,
  Search,
  Check,
  UserPlus,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';

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

const STATUS_ICON = {
  LOCKED: <Lock className="w-3.5 h-3.5 text-slate-400" />,
  ACTIVE: <Play className="w-3.5 h-3.5 text-primary" />,
  COMPLETED: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
};
const STATUS_LABEL = { LOCKED: '대기', ACTIVE: '진행 중', COMPLETED: '완료' };
const STATUS_COLOR = {
  LOCKED: 'text-slate-400 bg-slate-50',
  ACTIVE: 'text-primary bg-primary/10',
  COMPLETED: 'text-emerald-600 bg-emerald-50',
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 학생 추가 배정용
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [addStudentSearch, setAddStudentSearch] = useState('');
  const [addStudentIds, setAddStudentIds] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);

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

  // 학생 목록 (배정 추가용)
  useEffect(() => {
    if (!showAddStudents) return;
    fetch('/api/users')
      .then((r) => r.json())
      .then((json) => setAllStudents((json.data ?? []).filter((u: StudentItem) => u.role === 'STUDENT')))
      .catch((err) => console.error('학생 목록 조회 실패:', err));
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
      <div className="px-6 py-8 max-w-[1200px] mx-auto">
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
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-1.5">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
        {/* 2열 그리드: 개념 (1/3) + 학생 (2/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
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
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-8 w-24 rounded" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-100">
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
      <div className="px-6 py-8 max-w-[1200px] mx-auto">
        <Card className="p-12 text-center">
          <p className="text-text-secondary">과정을 찾을 수 없습니다.</p>
          <Link href="/courses" className="text-primary text-sm hover:underline mt-2 inline-block">
            목록으로 돌아가기
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/courses" className="p-2 rounded-sm hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div className="flex-1">
          {editing ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-primary shrink-0" />
                <input
                  className="text-2xl font-bold text-text-primary bg-white border border-slate-200 rounded-sm px-2 py-1 w-full focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="과정명"
                  autoFocus
                />
              </div>
              <input
                className="text-sm text-text-secondary bg-white border border-slate-200 rounded-sm px-2 py-1 w-full focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="설명 (선택)"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={saving}>
                  {saving ? <MathSpinner size="sm" className="mr-1" /> : null}
                  저장
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-primary" />
                {course.title}
                <button onClick={startEdit} className="p-1 text-slate-400 hover:text-primary transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              </h1>
              {course.description && <p className="text-text-secondary text-sm mt-0.5">{course.description}</p>}
            </>
          )}
        </div>
        <span className="text-xs text-text-secondary shrink-0">
          #{course.seq} · {new Date(course.createdAt).toLocaleDateString('ko-KR')}
        </span>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card padding="base" className="text-center">
          <div className="text-2xl font-black text-primary">{course.concepts.length}</div>
          <div className="text-xs text-text-secondary mt-1">포함 개념</div>
        </Card>
        <Card padding="base" className="text-center">
          <div className="text-2xl font-black text-emerald-600">{course.enrollments.length}</div>
          <div className="text-xs text-text-secondary mt-1">배정 학생</div>
        </Card>
        <Card padding="base" className="text-center">
          <div className="text-2xl font-black text-secondary">
            {course.enrollments.length > 0
              ? Math.round(course.enrollments.reduce((sum, e) => sum + e.progressPercent, 0) / course.enrollments.length)
              : 0}%
          </div>
          <div className="text-xs text-text-secondary mt-1">평균 진행률</div>
        </Card>
        <Card padding="base" className="text-center">
          <div className="text-2xl font-black text-violet-600">
            {course.enrollments.filter((e) => e.status === 'COMPLETED').length}
          </div>
          <div className="text-xs text-text-secondary mt-1">완료 학생</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 포함 개념 */}
        <div>
          <Card padding="md">
            <h2 className="font-bold text-text-primary flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-primary" />
              학습 개념 ({course.concepts.length}개)
            </h2>
            <div className="flex flex-col gap-1.5">
              {course.concepts.map((concept, idx) => (
                <div
                  key={concept.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm bg-slate-50 border border-slate-100 text-xs hover:border-primary/20 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-text-primary font-medium truncate block">{concept.title}</span>
                    {concept.chapter && concept.chapter !== concept.title && (
                      <span className="text-[10px] text-text-secondary">{concept.chapter}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: 배정 학생 */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                배정 학생 ({course.enrollments.length}명)
              </h2>
              <Button size="sm" onClick={() => setShowAddStudents(!showAddStudents)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                학생 추가
              </Button>
            </div>

            {/* 학생 추가 패널 */}
            {showAddStudents && (
              <div className="mb-4 p-4 bg-slate-50 rounded-sm border border-slate-200">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    className="w-full h-8 pl-8 pr-3 rounded-sm border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="이름 또는 아이디 검색"
                    value={addStudentSearch}
                    onChange={(e) => setAddStudentSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto rounded border border-slate-200 bg-white mb-2">
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

            {/* 학생 목록 */}
            {course.enrollments.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-text-secondary text-sm">배정된 학생이 없습니다.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {course.enrollments.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${id}/progress/${enrollment.student.username}`}
                    className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group bg-white"
                  >
                    {/* 아바타 */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary/60 text-white flex items-center justify-center text-sm font-bold shrink-0 group-hover:scale-105 transition-transform">
                      {enrollment.student.name[0]}
                    </div>

                    {/* 이름 + 상태 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-sm">{enrollment.student.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${STATUS_COLOR[enrollment.status]}`}>
                          {STATUS_ICON[enrollment.status]}
                          {STATUS_LABEL[enrollment.status]}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {enrollment.student.username}
                        {enrollment.startedAt && ` · 시작 ${new Date(enrollment.startedAt).toLocaleDateString('ko-KR')}`}
                        {enrollment.completedAt && ` · 완료 ${new Date(enrollment.completedAt).toLocaleDateString('ko-KR')}`}
                      </p>
                    </div>

                    {/* 진행률 */}
                    <div className="w-32 shrink-0">
                      <div className="flex justify-between text-xs text-text-secondary mb-1">
                        <span>{enrollment.completedConcepts}/{enrollment.totalConcepts}</span>
                        <span>{enrollment.progressPercent}%</span>
                      </div>
                      <ProgressBar value={enrollment.progressPercent} size="sm" />
                    </div>

                    {/* 삭제 */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleRemoveEnrollment(enrollment.id, enrollment.student.name); }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
