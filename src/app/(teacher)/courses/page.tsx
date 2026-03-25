'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { School, Users, Search, Plus, GraduationCap, BookOpen, Trash2, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { confirm } from '@/components/ui/ConfirmDialog';
import { ClassroomListPanel } from '@/components/teacher/classrooms/ClassroomListPanel';
import { ClassroomDetail } from '@/components/teacher/classrooms/ClassroomDetail';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import type { ClassroomItem, AllStudent } from '@/components/teacher/classrooms/types';

interface CourseItem {
  id: string;
  seq: number;
  title: string;
  description: string | null;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  // 새 반 만들기 모달
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createGrade, setCreateGrade] = useState('');
  const [creating, setCreating] = useState(false);

  // 학생 배정 모달
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);

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
        const students = (stJson.data as Array<AllStudent & { role?: string }>)
          .filter((u) => !u.role || u.role === 'STUDENT');
        setAllStudents(students);
      }
      if (courseJson.data) setCourses(courseJson.data);
    } catch {
      toast.error('데이터를 불러오지 못했습니다');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredClassrooms = useMemo(() => {
    if (!search.trim()) return classrooms;
    const q = search.toLowerCase();
    return classrooms.filter((cr) => cr.name.toLowerCase().includes(q));
  }, [classrooms, search]);

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

  // ── 반 CRUD ──

  const handleCreateClassroom = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), grade: createGrade ? Number(createGrade) : null }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`"${createName.trim()}" 반이 생성되었습니다.`);
        setCreateName(''); setCreateGrade(''); setShowCreate(false);
        await fetchData();
        if (json.data?.id) setSelectedId(json.data.id);
      } else toast.error('반 생성에 실패했습니다.');
    } finally { setCreating(false); }
  };

  const handleDeleteClassroom = async (id: string) => {
    const res = await fetch(`/api/admin/classrooms/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('반이 삭제되었습니다.');
      if (selectedId === id) setSelectedId(null);
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
    if (!studentSearch.trim()) return allStudents;
    const q = studentSearch.toLowerCase();
    return allStudents.filter((s) => s.name.toLowerCase().includes(q));
  }, [allStudents, studentSearch]);

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
        loading={loading}
        classrooms={filteredClassrooms}
        selectedId={selectedId}
        onSelect={(cr) => setSelectedId(cr.id)}
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
                    return (
                      <div key={course.id} className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-primary/40 transition-colors group">
                        <div className="w-1 self-stretch bg-primary/40 shrink-0" />
                        <Link
                          href={`/courses/${course.seq}`}
                          className="flex items-center justify-between flex-1 min-w-0 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-text-primary truncate">{course.title}</div>
                              <div className="text-xs text-text-secondary">
                                개념 {course.conceptCount}개 · 이 반 {enrolledInClass}/{selectedClassroom.students.length}명 배정
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-2" />
                        </Link>
                        {isManager && (
                          <button
                            onClick={(e) => { e.preventDefault(); handleDeleteCourse(course.id, course.title); }}
                            className="p-1.5 mr-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
          <div className="bg-white rounded-sm p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-text-primary mb-4">새 반 만들기</h3>
            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="반 이름 (예: 3-A반)"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateClassroom()}
              />
              <input
                type="number"
                placeholder="학년 (선택)"
                value={createGrade}
                onChange={(e) => setCreateGrade(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
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
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                placeholder="학생 이름 검색..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 mb-4">
              {filteredStudentsForAssign.map((s) => {
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
                    <span className="text-sm text-text-primary">{s.name}</span>
                    {inOther && <span className="text-xs text-orange-500">({otherClass})</span>}
                  </label>
                );
              })}
              {filteredStudentsForAssign.length === 0 && (
                <p className="text-center text-sm text-text-secondary py-4">검색 결과가 없습니다.</p>
              )}
            </div>
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
