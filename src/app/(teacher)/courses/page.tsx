'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { School, Users, Search, Plus, GraduationCap, BookOpen, Trash2, ChevronRight, Lock, Unlock } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { confirm } from '@/components/ui/ConfirmDialog';
import { ClassroomListPanel } from '@/components/teacher/classrooms/ClassroomListPanel';
import { ClassroomDetail } from '@/components/teacher/classrooms/ClassroomDetail';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { SCHOOL_LEVEL_OPTIONS, gradeInLevel, gradeLabel } from '@/components/teacher/students/helpers';
import type { ClassroomItem, AllStudent } from '@/components/teacher/classrooms/types';

interface CourseItem {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  mode: 'free' | 'sequential';
  conceptCount: number;
  enrollmentCount: number;
  enrollments: { student: { id: string } }[];
}

export default function CoursesPage() {
  const { user } = useAuth();
  const isManager = hasRoleClient(user?.role, 'MANAGER');

  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [allStudents, setAllStudents] = useState<AllStudent[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [listFilterLevel, setListFilterLevel] = useState('');
  const [listFilterGrade, setListFilterGrade] = useState('');

  // 선생님 목록 (반 배정용)
  const [teachers, setTeachers] = useState<{ id: string; name: string; role: string }[]>([]);

  // 새 반 만들기 모달
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSchoolLevel, setCreateSchoolLevel] = useState('');
  const [createGradeNum, setCreateGradeNum] = useState('');
  const [createTeacherId, setCreateTeacherId] = useState('');
  const [creating, setCreating] = useState(false);

  // 학생 배정 모달
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [assignFilterLevel, setAssignFilterLevel] = useState('');
  const [assignFilterGrade, setAssignFilterGrade] = useState('');
  const [assignPage, setAssignPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const ASSIGN_PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    try {
      const [crRes, stRes, courseRes] = await Promise.all([
        fetch('/api/classrooms'),
        fetch('/api/users'),
        fetch('/api/learning-courses'),
      ]);
      const crJson = await crRes.json();
      const stJson = await stRes.json();
      const courseJson = await courseRes.json();
      if (crJson.data) setClassrooms(crJson.data);
      if (stJson.data) {
        const all = stJson.data as Array<AllStudent & { role?: string }>;
        setAllStudents(all.filter((u) => !u.role || u.role === 'STUDENT'));
        setTeachers(all.filter((u) => u.role && u.role !== 'STUDENT' && u.id !== user?.id).map((u) => ({ id: u.id, name: u.name, role: u.role! })));
      }
      if (courseJson.data) setCourses(courseJson.data);
    } catch {
      toast.error('데이터를 불러오지 못했습니다');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 선택 반 → URL 동기화
  const selectClassroom = useCallback((id: string | null) => {
    setSelectedId(id);
    const url = id ? `/courses?id=${id}` : '/courses';
    window.history.replaceState(null, '', url);
  }, []);

  const filteredClassrooms = useMemo(() => {
    let list = classrooms;
    // 학제+학년 필터
    if (listFilterGrade) {
      const g = Number(listFilterGrade);
      list = list.filter((cr) => cr.grade === g);
    } else if (listFilterLevel) {
      const sl = SCHOOL_LEVEL_OPTIONS.find((o) => o.value === listFilterLevel);
      if (sl) list = list.filter((cr) => cr.grade && (sl.grades as readonly number[]).includes(cr.grade));
    }
    // 이름 검색
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((cr) => cr.name.toLowerCase().includes(q));
    }
    return list;
  }, [classrooms, search, listFilterLevel, listFilterGrade]);

  const selectedClassroom = useMemo(
    () => classrooms.find((cr) => cr.id === selectedId) ?? null,
    [classrooms, selectedId]
  );

  // 해당 반 학생들이 배정된 코스 필터
  const classroomCourses = useMemo(() => {
    if (!selectedClassroom) return [];
    const studentIds = new Set(selectedClassroom.students.map((s) => s.id));
    return courses.filter((c) =>
      c.enrollments?.some((e) => studentIds.has(e.student.id))
    );
  }, [selectedClassroom, courses]);

  // 학생 ID → 배정된 코스 정보 매핑
  const studentCourseMap = useMemo(() => {
    const map = new Map<string, { courseTitle: string; courseSeq: number }[]>();
    for (const course of courses) {
      for (const e of course.enrollments ?? []) {
        const list = map.get(e.student.id) ?? [];
        list.push({ courseTitle: course.title, courseSeq: course.seq });
        map.set(e.student.id, list);
      }
    }
    return map;
  }, [courses]);

  // ── 반 CRUD ──

  const handleCreateClassroom = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const grade = createGradeNum ? Number(createGradeNum) : null;
      const res = await fetch('/api/admin/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          grade,
          teacherId: createTeacherId || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`"${createName.trim()}" 반이 생성되었습니다.`);
        setCreateName(''); setCreateSchoolLevel(''); setCreateGradeNum(''); setCreateTeacherId(''); setShowCreate(false);
        await fetchData();
        if (json.data?.id) selectClassroom(json.data.id);
      } else toast.error('반 생성에 실패했습니다.');
    } finally { setCreating(false); }
  };

  const handleDeleteClassroom = async (id: string) => {
    const res = await fetch(`/api/admin/classrooms/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('반이 삭제되었습니다.');
      if (selectedId === id) selectClassroom(null);
      await fetchData();
    } else toast.error('삭제에 실패했습니다.');
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedId) return;
    const cr = classrooms.find((c) => c.id === selectedId);
    if (!cr) return;
    const remaining = cr.students.filter((s) => s.id !== studentId).map((s) => s.id);
    setSaving(true);
    try {
      await fetch(`/api/admin/classrooms/${selectedId}/students`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: remaining }),
      });
      toast.success('학생 배정이 해제되었습니다.');
      await fetchData();
    } finally { setSaving(false); }
  };

  // ── 학생 배정 모달 ──

  const openAssignModal = () => {
    if (!selectedId) return;
    const cr = classrooms.find((c) => c.id === selectedId);
    setAssigningId(selectedId);
    setSelectedStudents(new Set(cr?.students.map((s) => s.id) ?? []));
    setStudentSearch('');
    setAssignFilterLevel('');
    setAssignFilterGrade('');
    setAssignPage(0);
  };

  const saveAssignment = async () => {
    if (!assigningId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/classrooms/${assigningId}/students`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: Array.from(selectedStudents) }),
      });
      if (res.ok) {
        toast.success('학생 배정이 저장되었습니다.');
        setAssigningId(null);
        await fetchData();
      } else toast.error('배정 저장에 실패했습니다.');
    } finally { setSaving(false); }
  };

  const toggleStudent = (sid: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  };

  const assignedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cr of classrooms) for (const s of cr.students) map.set(s.id, cr.name);
    return map;
  }, [classrooms]);

  const filteredStudentsForAssign = useMemo(() => {
    let list = allStudents;
    // 학제+학년 필터
    if (assignFilterGrade) {
      const g = Number(assignFilterGrade);
      list = list.filter((s) => s.grade === g);
    } else if (assignFilterLevel) {
      const sl = SCHOOL_LEVEL_OPTIONS.find((o) => o.value === assignFilterLevel);
      if (sl) list = list.filter((s) => s.grade && (sl.grades as readonly number[]).includes(s.grade));
    }
    // 이름 검색
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [allStudents, studentSearch, assignFilterLevel, assignFilterGrade]);

  const assignTotalPages = Math.ceil(filteredStudentsForAssign.length / ASSIGN_PAGE_SIZE);
  const pagedStudentsForAssign = useMemo(() => {
    const start = assignPage * ASSIGN_PAGE_SIZE;
    return filteredStudentsForAssign.slice(start, start + ASSIGN_PAGE_SIZE);
  }, [filteredStudentsForAssign, assignPage]);

  // ── 코스 삭제 ──

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!(await confirm({ message: `"${title}" 과정을 삭제하시겠습니까?`, variant: 'danger', confirmLabel: '삭제' }))) return;
    try {
      const res = await fetch(`/api/learning-courses/${courseId}`, { method: 'DELETE' });
      if (res.ok) { toast.success('과정이 삭제되었습니다'); await fetchData(); }
      else toast.error('삭제에 실패했습니다');
    } catch { toast.error('삭제 중 오류가 발생했습니다'); }
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* 좌측 패널: 반 목록 */}
      <ClassroomListPanel
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        search={search}
        onSearchChange={setSearch}
        filterLevel={listFilterLevel}
        onFilterLevelChange={setListFilterLevel}
        filterGrade={listFilterGrade}
        onFilterGradeChange={setListFilterGrade}
        loading={loading}
        classrooms={filteredClassrooms}
        totalCount={classrooms.length}
        selectedId={selectedId}
        onSelect={(cr) => selectClassroom(cr.id)}
        onAddClick={isManager ? () => setShowCreate(true) : undefined}
      />

      {/* 우측: 반 상세 + 학습 코스 */}
      {selectedClassroom ? (
        <div className="flex-1 overflow-y-auto">
          {/* 기존 반 상세 (학생 목록) */}
          <ClassroomDetail
            classroom={selectedClassroom}
            onUpdate={fetchData}
            onDelete={handleDeleteClassroom}
            onAssignStudents={openAssignModal}
            onRemoveStudent={handleRemoveStudent}
            readOnly={!isManager}
            teachers={teachers}
            currentUserName={user?.name}
            studentCourseMap={studentCourseMap}
          />

          {/* 학습 코스 섹션 */}
          <div className="px-4 sm:px-6 pb-6">
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-3 h-3 text-primary" />
                  </div>
                  <h3 className="text-xs font-bold text-text-primary">학습 코스 ({classroomCourses.length}개)</h3>
                </div>
                {isManager && (
                  <Link href={`/courses/create?classroomId=${selectedClassroom.id}`}>
                    <Button size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1" /> 새 코스 만들기
                    </Button>
                  </Link>
                )}
              </div>

              {classroomCourses.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-sm">
                  <div className="text-center py-6 text-text-secondary">
                    <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-15" />
                    <p className="text-sm">이 반에 배정된 학습 코스가 없습니다.</p>
                    <p className="text-xs mt-1">새 코스를 만들어 반 학생들에게 배정하세요.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {classroomCourses.map((course) => {
                    const classStudentIds = new Set(selectedClassroom.students.map((s) => s.id));
                    const enrolledInClass = course.enrollments?.filter((e) => classStudentIds.has(e.student.id)).length ?? 0;
                    const totalInClass = selectedClassroom.students.length;
                    const enrollPct = totalInClass > 0 ? Math.round((enrolledInClass / totalInClass) * 100) : 0;
                    const unenrolledNames = selectedClassroom.students
                      .filter((s) => !course.enrollments?.some((e) => e.student.id === s.id))
                      .map((s) => s.name);
                    return (
                      <div key={course.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-primary/40 transition-colors group">
                        <Link href={`/courses/${course.seq}`} className="flex items-center gap-3 px-3 py-2.5">
                          {/* 아이콘 */}
                          <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          {/* 제목 + 모드 */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-text-primary truncate">{course.title}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                                {course.mode === 'sequential' ? <><Lock className="w-2.5 h-2.5 inline mr-0.5" />순차</> : <><Unlock className="w-2.5 h-2.5 inline mr-0.5" />자유</>}
                              </span>
                            </div>
                            <div className="text-xs text-text-secondary mt-0.5">
                              개념 {course.conceptCount}개 · 전체 {course.enrollmentCount}명
                              {unenrolledNames.length > 0 && (
                                <span className="text-amber-600"> · 미배정: {unenrolledNames.join(', ')}</span>
                              )}
                            </div>
                          </div>
                          {/* 이 반 배정 바 */}
                          <div className="w-28 shrink-0 hidden sm:block">
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-text-secondary">이 반</span>
                              <span className="font-medium text-text-primary">{enrolledInClass}/{totalInClass}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${enrollPct === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${enrollPct}%` }}
                              />
                            </div>
                          </div>
                          {isManager && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCourse(course.id, course.title); }}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          <div className="text-center">
            <School className="w-12 h-12 mx-auto mb-3 opacity-15" />
            <p className="text-sm font-medium">반을 선택하세요</p>
            <p className="text-xs mt-1">좌측 목록에서 반을 선택하거나 새로 만들어보세요.</p>
          </div>
        </div>
      )}

      {/* 새 반 만들기 모달 (OWNER+) */}
      {isManager && showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-sm p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-text-primary mb-4">새 반 만들기</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">반 이름 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="예: 중등 A반, 초6 심화반"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">학제</label>
                  <select
                    value={createSchoolLevel}
                    onChange={(e) => { setCreateSchoolLevel(e.target.value); setCreateGradeNum(''); }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">선택</option>
                    {SCHOOL_LEVEL_OPTIONS.map((sl) => (
                      <option key={sl.value} value={sl.value}>{sl.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">학년</label>
                  <select
                    value={createGradeNum}
                    onChange={(e) => setCreateGradeNum(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    disabled={!createSchoolLevel}
                  >
                    <option value="">선택</option>
                    {createSchoolLevel && SCHOOL_LEVEL_OPTIONS.find((sl) => sl.value === createSchoolLevel)?.grades.map((g) => (
                      <option key={g} value={g}>{gradeInLevel(g)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">담당 선생님</label>
                <select
                  value={createTeacherId}
                  onChange={(e) => setCreateTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">본인 ({user?.name})</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.role === 'OWNER' ? ' (지점장)' : t.role === 'MANAGER' ? ' (팀장)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateClassroom} loading={creating} disabled={!createName.trim()}>만들기</Button>
              <Button className="flex-1" variant="secondary" onClick={() => setShowCreate(false)}>취소</Button>
            </div>
          </div>
        </div>
      )}

      {/* 학생 배정 모달 (OWNER+) */}
      {isManager && assigningId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAssigningId(null)}>
          <div className="bg-white rounded-sm p-5 w-full max-w-md max-h-[70vh] flex flex-col mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-text-primary mb-3">
              학생 배정 — {classrooms.find((c) => c.id === assigningId)?.name}
            </h3>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                placeholder="학생 이름 검색..."
                value={studentSearch}
                onChange={(e) => { setStudentSearch(e.target.value); setAssignPage(0); }}
              />
            </div>
            <div className="flex gap-2 mb-3">
              <select
                value={assignFilterLevel}
                onChange={(e) => { setAssignFilterLevel(e.target.value); setAssignFilterGrade(''); setAssignPage(0); }}
                className="flex-1 h-8 px-2 border border-slate-200 rounded-sm text-xs focus:ring-2 focus:ring-primary/40"
              >
                <option value="">전체 학제</option>
                {SCHOOL_LEVEL_OPTIONS.map((sl) => (
                  <option key={sl.value} value={sl.value}>{sl.label}</option>
                ))}
              </select>
              <select
                value={assignFilterGrade}
                onChange={(e) => { setAssignFilterGrade(e.target.value); setAssignPage(0); }}
                className="flex-1 h-8 px-2 border border-slate-200 rounded-sm text-xs focus:ring-2 focus:ring-primary/40"
                disabled={!assignFilterLevel}
              >
                <option value="">전체 학년</option>
                {assignFilterLevel && SCHOOL_LEVEL_OPTIONS.find((sl) => sl.value === assignFilterLevel)?.grades.map((g) => (
                  <option key={g} value={g}>{gradeInLevel(g)}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-text-secondary mb-1 px-1">
              전체 {filteredStudentsForAssign.length}명{assignTotalPages > 1 && ` · {assignPage + 1}/{assignTotalPages} 페이지`}
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 mb-2">
              {pagedStudentsForAssign.map((s) => {
                const otherClass = assignedMap.get(s.id);
                const isThisClass = classrooms.find((c) => c.id === assigningId)?.students.some((st) => st.id === s.id);
                const inOther = otherClass && !isThisClass;
                return (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-text-primary flex-1">{s.name}</span>
                    <span className="text-xs text-text-secondary">{gradeLabel(s.grade)}</span>
                    {inOther && <span className="text-xs text-orange-500">({otherClass})</span>}
                  </label>
                );
              })}
              {pagedStudentsForAssign.length === 0 && (
                <p className="text-center text-sm text-text-secondary py-4">검색 결과가 없습니다.</p>
              )}
            </div>
            {assignTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-2 shrink-0">
                <button
                  onClick={() => setAssignPage((p) => Math.max(0, p - 1))}
                  disabled={assignPage === 0}
                  className="px-2 py-1 text-xs rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
                >
                  이전
                </button>
                <span className="text-xs text-text-secondary">{assignPage + 1} / {assignTotalPages}</span>
                <button
                  onClick={() => setAssignPage((p) => Math.min(assignTotalPages - 1, p + 1))}
                  disabled={assignPage >= assignTotalPages - 1}
                  className="px-2 py-1 text-xs rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
                >
                  다음
                </button>
              </div>
            )}
            <div className="flex gap-2 shrink-0">
              <Button className="flex-1" onClick={saveAssignment} loading={saving}>
                <Users className="w-3.5 h-3.5 mr-1" /> 저장 ({selectedStudents.size}명)
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => setAssigningId(null)}>취소</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
