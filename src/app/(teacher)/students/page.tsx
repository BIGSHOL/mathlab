'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, RotateCcw, Trash2, AlertTriangle, Download, Filter } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';

interface UserItem {
  id: string;
  username: string;
  name: string;
  role: string;
  grade: number | null;
  createdAt: string;
  profile: { totalXp: number; level: number } | null;
}

export default function StudentsPage() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const isAdmin = currentUser?.role === 'ADMIN';
  const initialTab = searchParams.get('tab') === 'teachers' ? 'teachers' : 'students';

  const [tab, setTab] = useState<'students' | 'teachers'>(initialTab);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', grade: 5 });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    if (res.ok) {
      const json = await res.json();
      setUsers(json.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
    fetchUsers();
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

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`${name} 계정을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) fetchUsers();
    else alert('삭제 실패');
  };

  const showTeachers = isAdmin && tab === 'teachers';
  const filteredUsers = users
    .filter((u) => showTeachers ? u.role === 'TEACHER' : u.role === 'STUDENT')
    .filter((u) => u.name.includes(search) || u.username.includes(search))
    .filter((u) => {
      if (showTeachers) return true;
      if (gradeFilter !== 'all' && String(u.grade) !== gradeFilter) return false;
      if (levelFilter !== 'all') {
        const level = u.profile?.level ?? 1;
        if (levelFilter === 'low' && level > 2) return false;
        if (levelFilter === 'mid' && (level < 3 || level > 5)) return false;
        if (levelFilter === 'high' && level < 6) return false;
      }
      if (activityFilter !== 'all') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const isRecent = new Date(u.createdAt).getTime() > sevenDaysAgo;
        // Approximate: users with XP > 0 considered active
        const hasActivity = (u.profile?.totalXp ?? 0) > 0;
        if (activityFilter === 'active' && !hasActivity) return false;
        if (activityFilter === 'inactive' && hasActivity) return false;
        if (activityFilter === 'new' && !isRecent) return false;
      }
      return true;
    });

  const handleExportCSV = () => {
    const headers = ['이름', '아이디', '학년', '레벨', 'XP', '가입일'];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.username,
      u.grade ? (u.grade <= 6 ? `초등 ${u.grade}학년` : `중등 ${u.grade - 6}학년`) : '-',
      `Lv.${u.profile?.level ?? 1}`,
      String(u.profile?.totalXp ?? 0),
      new Date(u.createdAt).toLocaleDateString('ko-KR'),
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학생목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {showTeachers ? '선생님 관리' : '학생 관리'}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {showTeachers ? '선생님 계정을 관리합니다.' : '학생 계정을 생성하고 관리합니다.'}
          </p>
        </div>
        {!showTeachers && (
          <Button onClick={() => setShowForm(!showForm)}>
            <UserPlus className="w-4 h-4 mr-2" />
            학생 추가
          </Button>
        )}
      </div>

      {/* Admin: Tab switch */}
      {isAdmin && (
        <div className="flex gap-2">
          <button
            onClick={() => { setTab('students'); setSearch(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'students' ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            학생 ({users.filter((u) => u.role === 'STUDENT').length})
          </button>
          <button
            onClick={() => { setTab('teachers'); setSearch(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'teachers' ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            선생님 ({users.filter((u) => u.role === 'TEACHER').length})
          </button>
        </div>
      )}

      {/* Create Form (students only) */}
      {showForm && !showTeachers && (
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

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput
            placeholder={showTeachers ? '선생님 이름 검색...' : '학생 이름 검색...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!showTeachers && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-text-secondary shrink-0" />
              <select
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-text-primary"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="all">전체 학년</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                  <option key={g} value={String(g)}>{g <= 6 ? `초등 ${g}학년` : `중등 ${g - 6}학년`}</option>
                ))}
              </select>
              <select
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-text-primary"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">전체 레벨</option>
                <option value="low">초급 (Lv.1-2)</option>
                <option value="mid">중급 (Lv.3-5)</option>
                <option value="high">고급 (Lv.6+)</option>
              </select>
              <select
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-text-primary"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
              >
                <option value="all">전체 상태</option>
                <option value="active">활동 중</option>
                <option value="inactive">미참여</option>
                <option value="new">최근 가입</option>
              </select>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-text-secondary border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              CSV 내보내기
            </button>
          </>
        )}
      </div>
      {!showTeachers && (gradeFilter !== 'all' || levelFilter !== 'all' || activityFilter !== 'all') && (
        <p className="text-xs text-text-secondary">
          필터 결과: <span className="font-bold text-text-primary">{filteredUsers.length}명</span>
          <button
            onClick={() => { setGradeFilter('all'); setLevelFilter('all'); setActivityFilter('all'); }}
            className="ml-2 text-primary font-semibold hover:underline"
          >
            필터 초기화
          </button>
        </p>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">이름</th>
                <th className="px-6 py-4">아이디</th>
                {!showTeachers && <th className="px-6 py-4">학년</th>}
                {!showTeachers && <th className="px-6 py-4">레벨</th>}
                {!showTeachers && <th className="px-6 py-4">총 XP</th>}
                <th className="px-6 py-4">가입일</th>
                <th className="px-6 py-4">액션</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {loading ? (
                <tr><td colSpan={showTeachers ? 4 : 7} className="px-6 py-8 text-center">로딩 중...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={showTeachers ? 4 : 7} className="px-6 py-8 text-center">
                  {showTeachers ? '선생님이 없습니다.' : '학생이 없습니다.'}
                </td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{u.name}</td>
                    <td className="px-6 py-4">{u.username}</td>
                    {!showTeachers && (
                      <td className="px-6 py-4">{u.grade ? (u.grade <= 6 ? `초등 ${u.grade}학년` : `중등 ${u.grade - 6}학년`) : '-'}</td>
                    )}
                    {!showTeachers && <td className="px-6 py-4">Lv.{u.profile?.level ?? 1}</td>}
                    {!showTeachers && <td className="px-6 py-4">{u.profile?.totalXp ?? 0}</td>}
                    <td className="px-6 py-4 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {!showTeachers && (
                          <Link
                            href={`/students/${u.id}/wrong-answers`}
                            className="text-amber-600 text-sm font-semibold hover:underline flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            오답 관리
                          </Link>
                        )}
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="text-primary text-sm font-semibold hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          비밀번호 초기화
                        </button>
                        {isAdmin && showTeachers && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="text-red-500 text-sm font-semibold hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            삭제
                          </button>
                        )}
                      </div>
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
