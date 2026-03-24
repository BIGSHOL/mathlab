'use client';

import { useState } from 'react';
import { Pencil, Trash2, Users, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { confirm } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { gradeLabel, relativeTime } from '@/components/teacher/students/helpers';
import type { ClassroomItem, StudentInClassroom } from './types';

interface ClassroomDetailProps {
  classroom: ClassroomItem;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  onAssignStudents: () => void;
  onRemoveStudent: (studentId: string) => void;
}

export function ClassroomDetail({
  classroom,
  onUpdate,
  onDelete,
  onAssignStudents,
  onRemoveStudent,
}: ClassroomDetailProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(classroom.name);
  const [editGrade, setEditGrade] = useState(classroom.grade?.toString() ?? '');
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
    setEditGrade(classroom.grade?.toString() ?? '');
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
      <div className="p-6 max-w-[900px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            {editing ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-sm text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="학년"
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-20 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button size="sm" onClick={handleSave} loading={saving}>저장</Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>취소</Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-text-primary">{classroom.name}</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {classroom.grade ? `${gradeLabel(classroom.grade)}` : '학년 미지정'}
                  <span className="text-slate-300 mx-1.5">&middot;</span>
                  생성일 {new Date(classroom.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </>
            )}
          </div>
          {!editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleStartEdit}>
                <Pencil className="w-4 h-4 mr-1" /> 편집
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> 삭제
              </Button>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="학생 수" value={`${studentCount}명`} color="blue" />
          <StatCard label="평균 XP" value={avgXp.toLocaleString()} color="amber" />
          <StatCard label="평균 레벨" value={avgLevel !== '-' ? `Lv.${avgLevel}` : '-'} color="violet" />
          <StatCard label="7일 활동률" value={`${activeRate}%`} color="emerald" />
        </div>

        {/* 학생 목록 */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            배정된 학생 ({studentCount}명)
          </h3>
          <Button size="sm" variant="secondary" onClick={onAssignStudents}>
            <UserPlus className="w-3.5 h-3.5 mr-1" /> 학생 배정
          </Button>
        </div>

        {studentCount === 0 ? (
          <Card padding="md">
            <div className="text-center py-8 text-text-secondary">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-15" />
              <p className="text-sm font-medium">배정된 학생이 없습니다.</p>
              <p className="text-xs mt-1">학생 배정 버튼으로 학생을 추가하세요.</p>
            </div>
          </Card>
        ) : (
          <Card padding="none">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-text-secondary">
                  <th className="text-left px-4 py-2.5 font-medium">학생</th>
                  <th className="text-left px-4 py-2.5 font-medium">학년</th>
                  <th className="text-left px-4 py-2.5 font-medium">레벨</th>
                  <th className="text-right px-4 py-2.5 font-medium">XP</th>
                  <th className="text-right px-4 py-2.5 font-medium">최근 활동</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{s.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-text-primary">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-text-secondary">
                      {s.grade ? gradeLabel(s.grade) : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-medium text-primary">Lv.{s.profile?.level ?? 1}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm text-text-secondary">
                      {(s.profile?.totalXp ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-text-secondary">
                      {relativeTime(s.profile?.lastActiveAt ?? null)}
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        onClick={() => handleRemoveStudent(s)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                        title="배정 해제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className={`rounded-sm px-4 py-3 ${colorMap[color] ?? 'bg-slate-50 text-slate-600'}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
