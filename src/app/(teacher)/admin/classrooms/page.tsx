'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { School, Users, Search } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ClassroomListPanel } from '@/components/teacher/classrooms/ClassroomListPanel';
import { ClassroomDetail } from '@/components/teacher/classrooms/ClassroomDetail';
import type { ClassroomItem, AllStudent } from '@/components/teacher/classrooms/types';

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [allStudents, setAllStudents] = useState<AllStudent[]>([]);
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
    const [crRes, stRes] = await Promise.all([
      fetch('/api/admin/classrooms'),
      fetch('/api/admin/users?role=STUDENT&limit=999'),
    ]);
    const crJson = await crRes.json();
    const stJson = await stRes.json();
    if (crJson.data) setClassrooms(crJson.data);
    if (stJson.data) {
      // API가 전체 유저를 반환하므로 클라이언트에서 STUDENT만 필터
      const students = (stJson.data as Array<AllStudent & { role?: string }>)
        .filter((u) => u.role === 'STUDENT');
      setAllStudents(students);
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

  // 반 생성
  const handleCreate = async () => {
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
        setCreateName('');
        setCreateGrade('');
        setShowCreate(false);
        await fetchData();
        if (json.data?.id) setSelectedId(json.data.id);
      } else {
        toast.error('반 생성에 실패했습니다.');
      }
    } finally {
      setCreating(false);
    }
  };

  // 반 삭제
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/classrooms/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('반이 삭제되었습니다.');
      if (selectedId === id) setSelectedId(null);
      await fetchData();
    } else {
      toast.error('삭제에 실패했습니다.');
    }
  };

  // 학생 배정 모달 열기
  const openAssignModal = (classroomId?: string) => {
    const id = classroomId ?? selectedId;
    if (!id) return;
    const cr = classrooms.find((c) => c.id === id);
    setAssigningId(id);
    setSelectedStudents(new Set(cr?.students.map((s) => s.id) ?? []));
    setStudentSearch('');
  };

  // 학생 개별 해제
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
    } finally {
      setSaving(false);
    }
  };

  // 학생 배정 저장
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
      } else {
        toast.error('배정 저장에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStudent = (sid: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  };

  // 다른 반에 배정된 학생 맵
  const assignedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cr of classrooms) {
      for (const s of cr.students) map.set(s.id, cr.name);
    }
    return map;
  }, [classrooms]);

  // 학생 검색 필터
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudents;
    const q = studentSearch.toLowerCase();
    return allStudents.filter((s) => s.name.toLowerCase().includes(q));
  }, [allStudents, studentSearch]);

  return (
    <div className="flex-1 flex min-h-0">
      {/* 좌측 패널 */}
      <ClassroomListPanel
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        classrooms={filteredClassrooms}
        selectedId={selectedId}
        onSelect={(cr) => setSelectedId(cr.id)}
        onAddClick={() => setShowCreate(true)}
      />

      {/* 우측 상세 */}
      {selectedClassroom ? (
        <ClassroomDetail
          classroom={selectedClassroom}
          onUpdate={fetchData}
          onDelete={handleDelete}
          onAssignStudents={() => openAssignModal()}
          onRemoveStudent={handleRemoveStudent}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          <div className="text-center">
            <School className="w-12 h-12 mx-auto mb-3 opacity-15" />
            <p className="text-sm font-medium">반을 선택하세요</p>
            <p className="text-xs mt-1">좌측 목록에서 반을 선택하거나 새로 만들어보세요.</p>
          </div>
        </div>
      )}

      {/* 새 반 만들기 모달 */}
      {showCreate && (
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
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
              <Button className="flex-1" onClick={handleCreate} loading={creating} disabled={!createName.trim()}>
                만들기
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => setShowCreate(false)}>
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 학생 배정 모달 */}
      {assigningId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAssigningId(null)}>
          <div className="bg-white rounded-sm p-5 w-full max-w-md max-h-[70vh] flex flex-col mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-text-primary mb-3">
              학생 배정 — {classrooms.find((c) => c.id === assigningId)?.name}
            </h3>
            {/* 학생 검색 */}
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
              {filteredStudents.map((s) => {
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
                    {inOther && (
                      <span className="text-xs text-orange-500">({otherClass})</span>
                    )}
                  </label>
                );
              })}
              {filteredStudents.length === 0 && (
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
