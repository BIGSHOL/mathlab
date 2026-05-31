'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Save, Trash2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { AdminTable, type AdminTableColumn } from '@/components/admin-table';

const ROLES = ['TEACHER', 'MANAGER', 'OWNER', 'SUPER_ADMIN'];

type Row = {
  id: string; username: string; name: string; role: string;
  tenantId: string | null; tenant: { name: string; slug: string } | null; createdAt: string;
};
type TenantOpt = { id: string; name: string };

/** 사용자(User) 관리 — 기출분석 전용 간소화 (계정 CRUD). SUPER_ADMIN 전용. */
export default function AdminUsersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [tenants, setTenants] = useState<TenantOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'TEACHER', tenantId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (roleFilter) params.set('role', roleFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '불러오기 실패');
      setRows(json.data ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((j) => setTenants((j.data ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))))
      .catch(() => {});
  }, []);

  const create = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '생성 실패');
      toast.success('계정이 생성되었습니다');
      setForm({ username: '', name: '', password: '', role: 'TEACHER', tenantId: '' });
      setShowCreate(false);
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const patch = async (body: Record<string, unknown>, okMsg?: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('수정 실패');
      if (okMsg) toast.success(okMsg);
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resetPw = (r: Row) => {
    const pw = window.prompt(`${r.username} 의 새 비밀번호를 입력하세요`);
    if (pw) void patch({ id: r.id, password: pw }, '비밀번호가 변경되었습니다');
  };

  const del = async (r: Row) => {
    if (!window.confirm(`${r.username} 계정을 삭제할까요?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${r.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      toast.success('삭제되었습니다');
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (user && user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-slate-500">SUPER_ADMIN 전용 페이지입니다.</div>;
  }

  const columns: AdminTableColumn<Row>[] = [
    { id: 'username', header: '아이디', render: (r) => <b>{r.username}</b> },
    { id: 'name', header: '이름', render: (r) => r.name },
    {
      id: 'role', header: '역할', render: (r) => (
        <select
          className="border border-slate-200 rounded px-1 py-0.5 text-sm"
          value={r.role}
          onChange={(e) => void patch({ id: r.id, role: e.target.value })}
        >
          {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      ),
    },
    { id: 'tenant', header: '지점', render: (r) => r.tenant?.name ?? '-' },
    {
      id: 'actions', header: '', render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => resetPw(r)} title="비밀번호 재설정">
            <KeyRound className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => del(r)} title="삭제">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5" /> 사용자 관리
        </h1>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="w-4 h-4 mr-1" /> 새 계정
        </Button>
      </div>
      <div className="flex gap-2 mb-3 items-center">
        <Input placeholder="아이디·이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          className="border border-slate-200 rounded px-2 h-11 text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">전체 역할</option>
          {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      </div>
      {showCreate && (
        <div className="mb-4 p-4 border border-slate-200 rounded-lg grid grid-cols-2 gap-2 bg-slate-50">
          <Input label="아이디" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="비밀번호" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="flex gap-2 items-end">
            <select className="border border-slate-200 rounded px-2 h-11 text-sm flex-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <select className="border border-slate-200 rounded px-2 h-11 text-sm flex-1" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
              <option value="">지점 없음</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <Button size="sm" onClick={create}><Save className="w-4 h-4 mr-1" /> 생성</Button>
          </div>
        </div>
      )}
      <AdminTable columns={columns} rows={rows} loading={loading} rowKey={(r) => r.id} emptyMessage="사용자가 없습니다" />
    </div>
  );
}
