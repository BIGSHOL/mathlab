'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2, School } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Student { id: string; name: string; grade?: string | null }
interface Classroom {
  id: string;
  name: string;
  grade: number | null;
  students: Student[];
}

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [crRes, stRes] = await Promise.all([
      fetch('/api/admin/classrooms'),
      fetch('/api/admin/users?role=STUDENT&limit=999'),
    ]);
    const crJson = await crRes.json();
    const stJson = await stRes.json();
    if (crJson.data) setClassrooms(crJson.data);
    if (stJson.data) setAllStudents(stJson.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    const res = await fetch('/api/admin/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName.trim(), grade: formGrade ? Number(formGrade) : null }),
    });
    if (res.ok) {
      setFormName('');
      setFormGrade('');
      await fetchData();
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!formName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/classrooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName.trim(), grade: formGrade ? Number(formGrade) : null }),
    });
    if (res.ok) {
      setEditingId(null);
      setFormName('');
      setFormGrade('');
      await fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 반을 삭제하시겠습니까?')) return;
    await fetch(`/api/admin/classrooms/${id}`, { method: 'DELETE' });
    await fetchData();
  };

  const startAssigning = (cr: Classroom) => {
    setAssigningId(cr.id);
    setSelectedStudents(new Set(cr.students.map((s) => s.id)));
  };

  const toggleStudent = (sid: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  };

  const saveAssignment = async () => {
    if (!assigningId) return;
    setSaving(true);
    await fetch(`/api/admin/classrooms/${assigningId}/students`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: Array.from(selectedStudents) }),
    });
    setAssigningId(null);
    await fetchData();
    setSaving(false);
  };

  // 이미 다른 반에 배정된 학생 ID
  const assignedMap = new Map<string, string>();
  for (const cr of classrooms) {
    for (const s of cr.students) assignedMap.set(s.id, cr.name);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-8 max-w-[900px] mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-50 rounded-sm">
          <School className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">반 관리</h1>
          <p className="text-text-secondary text-sm">반을 만들고 학생을 배정합니다.</p>
        </div>
      </div>

      {/* 새 반 만들기 */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> 새 반 만들기
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="반 이름 (예: 3-A반)"
            value={editingId ? '' : formName}
            onChange={(e) => { if (!editingId) setFormName(e.target.value); }}
            disabled={!!editingId}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="number"
            placeholder="학년"
            value={editingId ? '' : formGrade}
            onChange={(e) => { if (!editingId) setFormGrade(e.target.value); }}
            disabled={!!editingId}
            className="w-20 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button onClick={handleCreate} loading={saving && !editingId} disabled={!!editingId}>
            만들기
          </Button>
        </div>
      </Card>

      {/* 반 목록 */}
      <div className="space-y-4">
        {classrooms.map((cr) => (
          <Card key={cr.id} className="p-5">
            {editingId === cr.id ? (
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="number"
                  placeholder="학년"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  className="w-20 px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button size="sm" onClick={() => handleUpdate(cr.id)} loading={saving}>저장</Button>
                <Button size="sm" variant="secondary" onClick={() => { setEditingId(null); setFormName(''); setFormGrade(''); }}>취소</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-text-primary">{cr.name}</h3>
                  <p className="text-xs text-text-secondary">
                    {cr.grade ? `${cr.grade}학년` : '학년 미지정'} · 학생 {cr.students.length}명
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startAssigning(cr)}>
                    <Users className="w-3.5 h-3.5 mr-1" /> 학생 배정
                  </Button>
                  <button
                    onClick={() => { setEditingId(cr.id); setFormName(cr.name); setFormGrade(cr.grade?.toString() ?? ''); }}
                    className="p-2 rounded-sm hover:bg-slate-100 text-slate-500"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cr.id)} className="p-2 rounded-sm hover:bg-red-50 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 배정된 학생 목록 */}
            {cr.students.length > 0 && editingId !== cr.id && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cr.students.map((s) => (
                  <span key={s.id} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-sm font-medium">
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}

        {classrooms.length === 0 && (
          <p className="text-center text-text-secondary py-12">등록된 반이 없습니다.</p>
        )}
      </div>

      {/* 학생 배정 모달 */}
      {assigningId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAssigningId(null)}>
          <div className="bg-white rounded-sm p-6 w-full max-w-md max-h-[70vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-text-primary mb-4">학생 배정</h3>
            <div className="space-y-1 mb-4">
              {allStudents.map((s) => {
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
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={saveAssignment} loading={saving}>저장</Button>
              <Button className="flex-1" variant="secondary" onClick={() => setAssigningId(null)}>취소</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
