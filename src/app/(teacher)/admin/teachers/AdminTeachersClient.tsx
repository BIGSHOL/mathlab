'use client';

/**
 * /admin/teachers — Pattern F V1 (어드민 테이블) 선생님 관리.
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1
 *
 * 매니페스트 §C1 — 디자인이 정답 (마스터-디테일 → 단일 테이블).
 * 기존 데이터 fetch + 등록 폼 + 행 액션(비밀번호 초기화, 삭제) 유지.
 * 상세 패널은 제거 (V1 시안에 없음).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import {
  AdminTopbar,
  AdminFilterBar,
  AdminAppliedChips,
  AdminTable,
  AdminStatsRow,
  AdminPagination,
  type AdminTableColumn,
} from '@/components/admin-table';
import type { UserItem } from '@/components/teacher/students/types';

const ROLE_OPTIONS = [
  { value: 'TEACHER', label: '선생님', desc: '담당 반 학생 관리, 컨텐츠 CRUD' },
  { value: 'MANAGER', label: '팀장', desc: '테넌트 내 전체 교사/학생 관리' },
] as const;

const ROLE_LABEL: Record<string, string> = {
  TEACHER: '선생님',
  MANAGER: '팀장',
  OWNER: '학원장',
  SUPER_ADMIN: '관리자',
};

const ROLE_BADGE: Record<string, 'indigo' | 'gray' | 'green' | 'yellow'> = {
  TEACHER: 'indigo',
  MANAGER: 'green',
  OWNER: 'yellow',
  SUPER_ADMIN: 'gray',
};

interface TeacherForm {
  username: string;
  password: string;
  name: string;
  role: 'TEACHER' | 'MANAGER';
  phone: string;
  email: string;
}

const INITIAL_FORM: TeacherForm = {
  username: '',
  password: '',
  name: '',
  role: 'TEACHER',
  phone: '',
  email: '',
};

const PAGE_SIZE = 10;

export default function AdminTeachersClient() {
  const { user: currentUser } = useAuth();
  const isOwner = hasRoleClient(currentUser?.role, 'OWNER');

  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'MANAGER' | 'OWNER'>('ALL');
  const [page, setPage] = useState(1);

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
        setTeachers(all.filter((u) => u.role !== 'STUDENT'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const filtered = useMemo(() => {
    let arr = teachers;
    if (roleFilter !== 'ALL') arr = arr.filter((t) => t.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (t) =>
          t.name.toLowerCase().includes(q) || t.username.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [teachers, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── 통계 ──
  const total = teachers.length;
  const teacherCount = teachers.filter((t) => t.role === 'TEACHER').length;
  const managerCount = teachers.filter((t) => t.role === 'MANAGER').length;
  const ownerCount = teachers.filter((t) => t.role === 'OWNER').length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.username.trim()) {
      setFormError('아이디를 입력해주세요.');
      return;
    }
    if (form.password.length < 4) {
      setFormError('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('이름을 입력해주세요.');
      return;
    }

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
    if (
      !(await confirm({
        message: '비밀번호를 1234로 초기화하시겠습니까?',
        variant: 'warning',
        confirmLabel: '초기화',
      }))
    )
      return;
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
    if (
      !(await confirm({
        message: `${name} 계정을 삭제하시겠습니까?`,
        variant: 'danger',
        confirmLabel: '삭제',
      }))
    )
      return;
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('선생님 계정이 삭제되었습니다.');
      fetchTeachers();
    } else {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const appliedChips = [
    roleFilter !== 'ALL' && {
      id: 'role',
      label: ROLE_LABEL[roleFilter] ?? roleFilter,
      onRemove: () => setRoleFilter('ALL'),
    },
    search.trim() && {
      id: 'search',
      label: `검색: ${search}`,
      onRemove: () => setSearch(''),
    },
  ].filter(Boolean) as Array<{ id: string; label: React.ReactNode; onRemove?: () => void }>;

  const inputCls =
    'w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary';

  const columns: AdminTableColumn<UserItem>[] = [
    {
      id: 'name',
      header: '이름',
      render: (t) => (
        <div className="who">
          <div className="av" style={{ background: ROLE_BADGE_COLOR[t.role] ?? 'var(--primary)' }}>
            {t.name.trim()[0] ?? '?'}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{t.name}</div>
            <div className="role">@{t.username}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: '직급',
      render: (t) => (
        <span className={`badge ${ROLE_BADGE[t.role] ?? 'gray'}`}>{ROLE_LABEL[t.role] ?? t.role}</span>
      ),
    },
    {
      id: 'level',
      header: '레벨',
      render: (t) =>
        t.profile?.level != null ? (
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Lv.{t.profile.level}</span>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        ),
    },
    {
      id: 'last-active',
      header: '최근 활동',
      render: (t) =>
        t.profile?.lastActiveAt ? (
          <span style={{ color: 'var(--ink-2)', fontSize: 12 }}>
            {new Date(t.profile.lastActiveAt).toISOString().slice(0, 10)}
          </span>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        ),
      cellStyle: { fontFamily: 'ui-monospace, monospace' },
    },
    {
      id: 'created',
      header: '등록일',
      render: (t) => (t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : '—'),
      cellStyle: { fontFamily: 'ui-monospace, monospace', color: 'var(--ink-3)', fontSize: 12 },
    },
    {
      id: 'actions',
      header: '',
      className: 'row-actions',
      render: (t) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn"
            onClick={() => handleResetPassword(t.id)}
          >
            비번 초기화
          </button>
          {isOwner && t.role !== 'OWNER' && (
            <button
              type="button"
              className="btn accent"
              onClick={() => handleDeleteUser(t.id, t.name)}
            >
              삭제
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="app no-side" style={{ minHeight: 'auto', padding: '24px' }}>
      <div className="adm-frame">
        <AdminTopbar
          title="선생님 관리"
          meta={loading ? '불러오는 중...' : `총 ${total}명`}
          actions={
            isOwner ? (
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setShowForm(!showForm);
                  setForm(INITIAL_FORM);
                  setFormError('');
                  setShowPw(false);
                }}
              >
                + 새 선생님 등록
              </button>
            ) : null
          }
        />

        {!loading && (
          <AdminStatsRow
            stats={[
              { label: '총 인원', value: total, delta: `${teacherCount + managerCount + ownerCount}명 활성` },
              { label: '선생님', value: teacherCount },
              { label: '팀장', value: managerCount },
              { label: '학원장', value: ownerCount },
            ]}
          />
        )}

        <AdminFilterBar
          searchPlaceholder="🔍 이름·아이디 검색"
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filters={[
            {
              id: 'role',
              label: '직급',
              value: roleFilter,
              options: [
                { value: 'ALL', label: '전체' },
                { value: 'TEACHER', label: '선생님' },
                { value: 'MANAGER', label: '팀장' },
                { value: 'OWNER', label: '학원장' },
              ],
              onChange: (v) => {
                setRoleFilter(v as typeof roleFilter);
                setPage(1);
              },
            },
          ]}
        />

        {appliedChips.length > 0 && (
          <AdminAppliedChips
            chips={appliedChips}
            onClearAll={() => {
              setSearch('');
              setRoleFilter('ALL');
              setPage(1);
            }}
          />
        )}

        {showForm && (
          <div
            style={{
              padding: '20px 20px 24px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg)',
            }}
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>선생님 등록</h3>
              {formError && (
                <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputCls}
                    placeholder="이름"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
                    직급 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, role: opt.value })}
                        className={`flex-1 px-2 py-2 rounded-sm border text-sm font-medium ${
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
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
                    아이디 <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputCls}
                    placeholder="로그인 아이디"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, '') })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
                    초기 비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      className={`${inputCls} pr-9`}
                      type={showPw ? 'text' : 'password'}
                      placeholder="4자 이상"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>연락처</label>
                  <input
                    className={inputCls}
                    placeholder="010-0000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9-]/g, '') })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>이메일</label>
                  <input
                    className={inputCls}
                    type="email"
                    placeholder="teacher@math.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? '등록 중...' : '등록하기'}
                </Button>
              </div>
            </form>
          </div>
        )}

        <AdminTable
          columns={columns}
          rows={pageRows}
          rowKey={(t) => t.id}
          loading={loading}
          emptyMessage={search || roleFilter !== 'ALL' ? '검색 결과가 없습니다' : '등록된 선생님이 없습니다'}
        />

        <AdminPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalCount={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

const ROLE_BADGE_COLOR: Record<string, string> = {
  TEACHER: 'var(--primary)',
  MANAGER: 'var(--success)',
  OWNER: 'var(--gold)',
  SUPER_ADMIN: 'var(--ink-2)',
};
