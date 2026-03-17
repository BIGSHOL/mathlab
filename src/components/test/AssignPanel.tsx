'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Check, Users, X, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Student {
  id: string;
  name: string;
  username: string;
  grade: number | null;
}

interface AssignPanelProps {
  testId: string;
  testGrade: number;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignPanel({ testId, testGrade, onClose, onAssigned }: AssignPanelProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | undefined>(testGrade);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState('');
  const [allowLate, setAllowLate] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role: 'STUDENT' });
      if (gradeFilter) params.set('grade', String(gradeFilter));
      const res = await fetch(`/api/users?${params}`);
      if (res.ok) {
        const json = await res.json();
        setStudents(json.data ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [gradeFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filtered = students.filter((s) =>
    !search || s.name.includes(search) || s.username.includes(search)
  );

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tests/${testId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          dueDate: dueDate || null,
          allowLateSubmission: allowLate,
        }),
      });
      if (res.ok) {
        onAssigned();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error?.message || '배정 실패');
      }
    } catch {
      toast.error('배정 중 오류 발생');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            학생 배정
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex gap-2">
            {[undefined, 7, 8, 9].map((g) => (
              <button
                key={g ?? 'all'}
                onClick={() => setGradeFilter(g)}
                className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                  gradeFilter === g ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                {g ? `중${g - 6}` : '전체'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="학생 검색..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-sm text-sm"
            />
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-text-secondary py-8 text-sm">학생이 없습니다</p>
          ) : (
            <>
              <button
                onClick={toggleAll}
                className="mb-3 text-xs font-medium text-primary hover:underline"
              >
                {selectedIds.size === filtered.length ? '전체 해제' : `전체 선택 (${filtered.length}명)`}
              </button>
              <div className="space-y-1">
                {filtered.map((s) => {
                  const isSelected = selectedIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-text-primary">{s.name}</span>
                        <span className="text-xs text-text-secondary ml-2">@{s.username}</span>
                      </div>
                      {s.grade && (
                        <span className="text-xs text-text-secondary">중{s.grade - 6}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Options + Submit */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-text-secondary">마감일 (선택)</span>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-sm text-sm"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowLate}
              onChange={(e) => setAllowLate(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary"
            />
            <span className="text-sm text-text-secondary">지각 제출 허용</span>
          </label>
          <Button
            className="w-full"
            onClick={handleAssign}
            loading={saving}
            disabled={selectedIds.size === 0}
          >
            <Users className="w-4 h-4 mr-1" />
            {selectedIds.size}명에게 배정
          </Button>
        </div>
      </Card>
    </div>
  );
}
