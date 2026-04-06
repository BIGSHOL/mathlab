'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserCog, X, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { TeacherListPanel } from '@/components/teacher/teachers/TeacherListPanel';
import { TeacherDetail } from '@/components/teacher/students/TeacherDetail';
import type { UserItem, TeacherStats } from '@/components/teacher/students/types';

const ROLE_OPTIONS = [
  { value: 'TEACHER', label: '선생님', desc: '담당 반 학생 관리, 컨텐츠 CRUD' },
  { value: 'MANAGER', label: '팀장', desc: '테넌트 내 전체 교사/학생 관리' },
] as const;

interface TeacherForm {
  username: string;
  password: string;
  name: string;
  role: 'TEACHER' | 'MANAGER';
  phone: string;
  email: string;
}

const INITIAL_FORM: TeacherForm = {
  username: '', password: '', name: '', role: 'TEACHER', phone: '', email: '',
};

export default function AdminTeachersClient() {
  const { user: currentUser } = useAuth();
  const isOwner = hasRoleClient(currentUser?.role, 'OWNER');

  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 선생님 등록 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TeacherForm>(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users?limit=100');
      if (res.ok) {
        const json = await res.json();
        const all: UserItem[] = json.data ?? [];
        // TEACHER + MANAGER + OWNER (선생님 이상 전부 표시)
        setTeachers(all.filter((u) => u.role !== 'STUDENT'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const fetchStats = useCallback(async (userId: string) => {
    setStatsLoading(true);
    setStats(null);
    try {
      const res = await fetch(`/api/users/${userId}/stats`);
      if (res.ok) {
        const json = await res.json();
        if (json.data?.type === 'teacher') setStats(json.data);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(q) || t.username.toLowerCase().includes(q));
  }, [teachers, search]);

  const handleSelect = (user: UserItem) => {
    setShowForm(false);
    setSelectedUser(user);
    fetchStats(user.id);
  };

  const handleAddClick = () => {
    setSelectedUser(null);
    setStats(null);
    setForm(INITIAL_FORM);
    setFormError('');
    setShowPw(false);
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.username.trim()) { setFormError('아이디를 입력해주세요.'); return; }
    if (form.password.length < 4) { setFormError('비밀번호는 4자 이상이어야 합니다.'); return; }
    if (!form.name.trim()) { setFormError('이름을 입력해주세요.'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
          name: form.name.trim(),
          role: form.role,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setFormError(json.error.message);
        return;
      }
      toast.success(`${form.name} ${form.role === 'MANAGER' ? '팀장' : '선생님'}이 등록되었습니다`);
      setShowForm(false);
      setForm(INITIAL_FORM);
      fetchTeachers();
    } catch {
      setFormError('선생님 등록에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!(await confirm({ message: '비밀번호를 1234로 초기화하시겠습니까?', variant: 'warning', confirmLabel: '초기화' }))) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '1234' }),
      });
      if (res.ok) toast.success('비밀번호가 초기화되었습니다.');
      else toast.error('비밀번호 초기화에 실패했습니다.');
    } catch {
      toast.error('비밀번호 초기화에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!(await confirm({ message: `${name} 계정을 삭제하시겠습니까?`, variant: 'danger', confirmLabel: '삭제' }))) return;
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      if (selectedUser?.id === userId) { setSelectedUser(null); setStats(null); }
      toast.success('선생님 계정이 삭제되었습니다.');
      fetchTeachers();
    } else {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary';

  return (
    <div className="flex-1 flex min-h-0">
      {/* 좌측 패널 */}
      <TeacherListPanel
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        teachers={filteredTeachers}
        selectedId={selectedUser?.id ?? null}
        onSelect={handleSelect}
        onAddClick={handleAddClick}
        isOwner={isOwner}
      />

      {/* 우측: 폼 / 상세 / 빈 상태 */}
      {showForm ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-lg font-bold text-text-primary mb-1">선생님 등록</h2>
            <p className="text-sm text-text-secondary mb-5">선생님 계정 정보를 입력하세요.</p>

            <form onSubmit={handleCreate} className="space-y-5">
              {formError && (
                <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-red-600 text-sm">{formError}</div>
              )}

              {/* 필수 입력 */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                  필수 입력 사항
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">이름 <span className="text-red-500">*</span></label>
                    <input className={inputCls} placeholder="이름을 입력하세요." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">직급 <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      {ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm({ ...form, role: opt.value })}
                          className={`flex-1 px-2 py-2 rounded-sm border text-sm font-medium transition-colors ${
                            form.role === opt.value
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-200 text-text-secondary hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">아이디 <span className="text-red-500">*</span></label>
                    <input className={inputCls} placeholder="로그인 아이디" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, '') })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">초기 비밀번호 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input className={`${inputCls} pr-9`} type={showPw ? 'text' : 'password'} placeholder="초기 비밀번호" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                      <button type="button" tabIndex={-1} onClick={() => setShowPw((p) => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* 선택 입력 */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                  선택 입력 사항
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">연락처</label>
                    <input className={inputCls} placeholder="숫자만 입력하세요." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9-]/g, '') })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">이메일</label>
                    <input className={inputCls} type="email" placeholder="예시 : teacher@math.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={creating}>{creating ? '등록 중...' : '등록하기'}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </form>
          </div>
        </div>
      ) : selectedUser ? (
        <div className="flex-1 overflow-y-auto">
          <TeacherDetail
            user={selectedUser}
            stats={stats}
            statsLoading={statsLoading}
            isOwner={isOwner}
            onResetPassword={handleResetPassword}
            onDelete={handleDeleteUser}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          <div className="text-center">
            <UserCog className="w-12 h-12 mx-auto mb-3 opacity-15" />
            <p className="text-sm font-medium">선생님을 선택하세요</p>
            <p className="text-xs mt-1">좌측 목록에서 선생님을 선택하면 상세 정보를 확인할 수 있습니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
