'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Users, UserPlus, UserCog, X, Zap, Star, Flame, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { confirm } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { gradeLabel, SCHOOL_LEVEL_OPTIONS, gradeInLevel } from '@/components/teacher/students/helpers';
import type { ClassroomItem, StudentInClassroom } from './types';

interface StudentCourseInfo {
  courseTitle: string;
  courseSeq: number;
}

interface ClassroomDetailProps {
  classroom: ClassroomItem;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  onAssignStudents: () => void;
  onRemoveStudent: (studentId: string) => void;
  readOnly?: boolean;
  /** 담당 선생님 변경용 선생님 목록 */
  teachers?: { id: string; name: string; role: string }[];
  /** 현재 로그인 사용자 이름 */
  currentUserName?: string;
  /** 학생 ID → 배정된 코스 정보 (부모에서 계산해서 전달) */
  studentCourseMap?: Map<string, StudentCourseInfo[]>;
}

export function ClassroomDetail({
  classroom,
  onUpdate,
  onDelete,
  onAssignStudents,
  onRemoveStudent,
  readOnly = false,
  teachers = [],
  currentUserName,
  studentCourseMap,
}: ClassroomDetailProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(classroom.name);
  const [editSchoolLevel, setEditSchoolLevel] = useState(() => {
    const g = classroom.grade;
    if (!g) return '';
    if (g <= 6) return 'elementary';
    if (g <= 9) return 'middle';
    return 'high';
  });
  const [editGrade, setEditGrade] = useState(classroom.grade?.toString() ?? '');
  const [editTeacherId, setEditTeacherId] = useState(classroom.teacherId ?? '');
  const [saving, setSaving] = useState(false);

  // 반 통계 계산
  const studentCount = classroom.students.length;
  const avgXp = studentCount > 0
    ? Math.round(classroom.students.reduce((sum, s) => sum + (s.profile?.totalXp ?? 0), 0) / studentCount)
    : 0;
  const avgLevel = studentCount > 0
    ? (classroom.students.reduce((sum, s) => sum + (s.profile?.level ?? 1), 0) / studentCount).toFixed(1)
    : '-';
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeCount = classroom.students.filter(
    (s) => s.profile?.lastActiveAt && new Date(s.profile.lastActiveAt).getTime() > sevenDaysAgo
  ).length;
  const activeRate = studentCount > 0 ? Math.round((activeCount / studentCount) * 100) : 0;

  const handleStartEdit = () => {
    setEditName(classroom.name);
    const g = classroom.grade;
    setEditSchoolLevel(!g ? '' : g <= 6 ? 'elementary' : g <= 9 ? 'middle' : 'high');
    setEditGrade(g?.toString() ?? '');
    setEditTeacherId(classroom.teacherId ?? '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/classrooms/${classroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          grade: editGrade ? Number(editGrade) : null,
          teacherId: editTeacherId || null,
        }),
      });
      if (res.ok) {
        toast.success('반 정보가 수정되었습니다.');
        setEditing(false);
        onUpdate();
      } else {
        toast.error('수정에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm({
      message: `"${classroom.name}" 반을 삭제하시겠습니까? 배정된 학생들은 미배정 상태가 됩니다.`,
      variant: 'danger',
      confirmLabel: '삭제',
    }))) return;
    onDelete(classroom.id);
  };

  const handleRemoveStudent = async (student: StudentInClassroom) => {
    if (!(await confirm({
      message: `${student.name} 학생을 "${classroom.name}" 반에서 해제하시겠습니까?`,
      variant: 'warning',
      confirmLabel: '해제',
    }))) return;
    onRemoveStudent(student.id);
  };

  // 학생 정렬: XP 내림차순
  const sortedStudents = [...classroom.students].sort(
    (a, b) => (b.profile?.totalXp ?? 0) - (a.profile?.totalXp ?? 0)
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6">
        {/* ── 프로필 히어로 ── */}
        <div className="bg-gradient-to-r from-primary/5 via-blue-50/50 to-violet-50/30 border border-slate-200 rounded-sm p-4 sm:p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xl font-bold text-white">{classroom.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2.5 py-1 border border-slate-200 rounded-sm text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
                      placeholder="반 이름"
                      autoFocus
                    />
                    <select
                      value={editSchoolLevel}
                      onChange={(e) => { setEditSchoolLevel(e.target.value); setEditGrade(''); }}
                      className="h-8 px-2 border border-slate-200 rounded-sm text-xs focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">학제</option>
                      {SCHOOL_LEVEL_OPTIONS.map((sl) => (
                        <option key={sl.value} value={sl.value}>{sl.label}</option>
                      ))}
                    </select>
                    <select
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                      className="h-8 px-2 border border-slate-200 rounded-sm text-xs focus:ring-2 focus:ring-primary/30"
                      disabled={!editSchoolLevel}
                    >
                      <option value="">학년</option>
                      {editSchoolLevel && SCHOOL_LEVEL_OPTIONS.find((sl) => sl.value === editSchoolLevel)?.grades.map((g) => (
                        <option key={g} value={g}>{gradeInLevel(g)}</option>
                      ))}
                    </select>
                    <select
                      value={editTeacherId}
                      onChange={(e) => setEditTeacherId(e.target.value)}
                      className="h-8 px-2 border border-slate-200 rounded-sm text-xs focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">{currentUserName ? `본인 (${currentUserName})` : '담당 선생님'}</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}{t.role === 'OWNER' ? ' (지점장)' : t.role === 'MANAGER' ? ' (팀장)' : ''}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handleSave} loading={saving}>저장</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>취소</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">{classroom.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {classroom.grade ? gradeLabel(classroom.grade) : '학년 미지정'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                    <span>생성일 {new Date(classroom.createdAt).toLocaleDateString('ko-KR')}</span>
                    {classroom.teacher && (
                      <>
                        <span className="text-slate-300">&middot;</span>
                        <span className="flex items-center gap-1">
                          <UserCog className="w-3 h-3" />
                          담임 {classroom.teacher.name}
                        </span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* 핵심 수치 */}
            <div className="hidden sm:flex items-center gap-5 shrink-0">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Users className="w-4 h-4" />
                  <span className="text-lg font-bold">{studentCount}</span>
                </div>
                <div className="text-xs text-text-secondary">학생 수</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-500">
                  <Zap className="w-4 h-4" />
                  <span className="text-lg font-bold">{avgXp.toLocaleString()}</span>
                </div>
                <div className="text-xs text-text-secondary">평균 XP</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-violet-500">
                  <Star className="w-4 h-4" />
                  <span className="text-lg font-bold">Lv.{avgLevel}</span>
                </div>
                <div className="text-xs text-text-secondary">평균 레벨</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-500">
                  <Flame className="w-4 h-4" />
                  <span className="text-lg font-bold">{activeRate}%</span>
                </div>
                <div className="text-xs text-text-secondary">7일 활동률</div>
              </div>
            </div>
            {/* 편집/삭제 */}
            {!editing && !readOnly && (
              <div className="hidden sm:flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={handleStartEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> 편집
                </Button>
                <Button size="sm" variant="danger" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> 삭제
                </Button>
              </div>
            )}
          </div>
          {/* 모바일용 수치 */}
          <div className="grid grid-cols-2 gap-2 mt-3 sm:hidden">
            <div className="text-center bg-white/60 rounded-sm py-1.5">
              <div className="text-xs font-bold text-primary">{studentCount}명</div>
              <div className="text-xs text-text-secondary">학생</div>
            </div>
            <div className="text-center bg-white/60 rounded-sm py-1.5">
              <div className="text-xs font-bold text-amber-600">{avgXp.toLocaleString()}</div>
              <div className="text-xs text-text-secondary">평균 XP</div>
            </div>
            <div className="text-center bg-white/60 rounded-sm py-1.5">
              <div className="text-xs font-bold text-violet-600">Lv.{avgLevel}</div>
              <div className="text-xs text-text-secondary">레벨</div>
            </div>
            <div className="text-center bg-white/60 rounded-sm py-1.5">
              <div className="text-xs font-bold text-emerald-600">{activeRate}%</div>
              <div className="text-xs text-text-secondary">활동률</div>
            </div>
          </div>
          {/* 모바일 편집/삭제 */}
          {!editing && !readOnly && (
            <div className="flex gap-2 mt-3 sm:hidden">
              <Button size="sm" variant="ghost" onClick={handleStartEdit}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> 편집
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> 삭제
              </Button>
            </div>
          )}
        </div>

        {/* ── 학생 목록 섹션 ── */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-3 h-3 text-primary" />
            </div>
            <h3 className="text-xs font-bold text-text-primary">배정된 학생 ({studentCount}명)</h3>
          </div>
          {!readOnly && (
            <Button size="sm" variant="secondary" onClick={onAssignStudents}>
              <UserPlus className="w-3.5 h-3.5 mr-1" /> 학생 배정
            </Button>
          )}
        </div>

        {studentCount === 0 ? (
          <div className="bg-white border border-slate-200 rounded-sm">
            <div className="text-center py-8 text-text-secondary">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-15" />
              <p className="text-sm font-medium">배정된 학생이 없습니다.</p>
              <p className="text-xs mt-1">학생 배정 버튼으로 학생을 추가하세요.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sortedStudents.map((s) => (
              <div key={s.id} className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-primary/40 transition-colors">
                <div className={`w-1 self-stretch shrink-0 ${
                  (s.profile?.lastActiveAt && new Date(s.profile.lastActiveAt).getTime() > sevenDaysAgo) ? 'bg-emerald-400' : 'bg-slate-200'
                }`} />
                <Link
                  href={`/students?id=${s.id}`}
                  className="flex items-center justify-between flex-1 min-w-0 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{s.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{s.name}</div>
                      <div className="text-xs text-text-secondary">
                        {s.grade ? gradeLabel(s.grade) : '-'} · Lv.{s.profile?.level ?? 1} · {(s.profile?.totalXp ?? 0).toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {(() => {
                      const courses = studentCourseMap?.get(s.id);
                      if (courses && courses.length > 0) {
                        return (
                          <span className="text-xs text-primary font-medium hidden sm:inline" title={courses.map((c) => c.courseTitle).join(', ')}>
                            <BookOpen className="w-3 h-3 inline mr-0.5" />
                            {courses[0].courseTitle}{courses.length > 1 ? ` +${courses.length - 1}` : ''}
                          </span>
                        );
                      }
                      return (
                        <span className="text-xs text-slate-400 hidden sm:inline">미배정</span>
                      );
                    })()}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </Link>
                {!readOnly && (
                  <button
                    onClick={() => handleRemoveStudent(s)}
                    className="p-1.5 mr-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                    title="배정 해제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
