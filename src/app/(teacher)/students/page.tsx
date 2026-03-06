'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';

interface Student {
  id: string;
  username: string;
  name: string;
  role: string;
  grade: number | null;
  createdAt: string;
  profile: { totalXp: number; level: number } | null;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', grade: 5 });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
      const json = await res.json();
      setStudents((json.data ?? []).filter((u: Student) => u.role === 'STUDENT'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const json = await res.json();
      setFormError(json.error?.message ?? '생성 실패');
      return;
    }
    setShowForm(false);
    setFormData({ username: '', password: '', name: '', grade: 5 });
    fetchStudents();
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('비밀번호를 1234로 초기화하시겠습니까?')) return;
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '1234' }),
    });
    alert('비밀번호가 초기화되었습니다.');
  };

  const filtered = students.filter((s) =>
    s.name.includes(search) || s.username.includes(search)
  );

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">학생 관리</h1>
          <p className="text-text-secondary text-sm mt-1">학생 계정을 생성하고 관리합니다.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <UserPlus className="w-4 h-4 mr-2" />
          학생 추가
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-6">
          <h3 className="font-bold text-text-primary mb-4">새 학생 추가</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formError && (
              <div className="col-span-full p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {formError}
              </div>
            )}
            <input
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="이름"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="아이디"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <input
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
              type="password"
              placeholder="초기 비밀번호"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <select
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                <option key={g} value={g}>{g <= 6 ? `초등 ${g}학년` : `중등 ${g - 6}학년`}</option>
              ))}
            </select>
            <div className="col-span-full flex gap-3">
              <Button type="submit">생성</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="max-w-sm">
        <SearchInput
          placeholder="학생 이름 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">이름</th>
                <th className="px-6 py-4">아이디</th>
                <th className="px-6 py-4">학년</th>
                <th className="px-6 py-4">레벨</th>
                <th className="px-6 py-4">총 XP</th>
                <th className="px-6 py-4">액션</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">로딩 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">학생이 없습니다.</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{s.name}</td>
                    <td className="px-6 py-4">{s.username}</td>
                    <td className="px-6 py-4">{s.grade ? (s.grade <= 6 ? `초등 ${s.grade}학년` : `중등 ${s.grade - 6}학년`) : '-'}</td>
                    <td className="px-6 py-4">Lv.{s.profile?.level ?? 1}</td>
                    <td className="px-6 py-4">{s.profile?.totalXp ?? 0}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleResetPassword(s.id)}
                        className="text-primary text-sm font-semibold hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        비밀번호 초기화
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
