'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { GRADE_LEVEL_LABELS } from '@/lib/constants/labels';

interface StudentItem {
  id: string;
  name: string;
  username: string;
  grade: number | null;
}

const GRADE_LABELS = GRADE_LEVEL_LABELS;

interface StudentSelectorProps {
  selectedStudent: StudentItem | null;
  onSelect: (student: StudentItem) => void;
  preselectedId?: string;
}

export function StudentSelector({ selectedStudent, onSelect, preselectedId }: StudentSelectorProps) {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users?role=STUDENT&limit=500');
      if (res.ok) {
        const json = await res.json();
        setStudents(json.data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // 자동 선택 (URL param)
  useEffect(() => {
    if (preselectedId && students.length > 0 && !selectedStudent) {
      const found = students.find((s) => s.id === preselectedId);
      if (found) onSelect(found);
    }
  }, [preselectedId, students, selectedStudent, onSelect]);

  // 학년별 그룹
  const gradeGroups = new Map<number, StudentItem[]>();
  for (const s of students) {
    const g = s.grade ?? 0;
    if (!gradeGroups.has(g)) gradeGroups.set(g, []);
    gradeGroups.get(g)!.push(s);
  }
  const sortedGrades = [...gradeGroups.keys()].sort((a, b) => a - b);

  // 필터링
  const filtered = students.filter((s) => {
    if (gradeFilter !== 'all' && String(s.grade ?? 0) !== gradeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.username.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // 학년 필터용 칩 — 실제 존재하는 학년만
  const availableGrades = sortedGrades.filter((g) => g > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-text-secondary">학생 선택</label>
        <Link
          href="/students"
          className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
        >
          <UserPlus className="w-3 h-3" />
          빠른 등록
        </Link>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 아이디..."
          className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-sm bg-white"
        />
      </div>

      {/* 학년 필터 */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setGradeFilter('all')}
          className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold transition-colors ${
            gradeFilter === 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          전체
        </button>
        {availableGrades.map((g) => (
          <button
            key={g}
            onClick={() => setGradeFilter(String(g))}
            className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold transition-colors ${
              gradeFilter === String(g) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {GRADE_LABELS[g] ?? `${g}학년`}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {loading ? (
          <p className="text-[10px] text-slate-400 text-center py-3">로딩 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-3">학생이 없습니다</p>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors ${
                selectedStudent?.id === s.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">{s.name}</span>
                {s.grade && (
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                    {GRADE_LABELS[s.grade] ?? `${s.grade}`}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">{s.username}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
