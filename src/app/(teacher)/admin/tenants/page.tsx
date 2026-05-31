'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { AdminTable, type AdminTableColumn } from '@/components/admin-table';

type Tenant = {
  id: string; slug: string; name: string; logo: string | null;
  isActive: boolean; userCount: number; createdAt: string;
};

/** 지점(Tenant) 관리 — 기출분석 전용 간소화 (기본 CRUD). SUPER_ADMIN 전용. */
export default function AdminTenantsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '불러오기 실패');
      setRows(json.data ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '생성 실패');
      toast.success('지점이 생성되었습니다');
      setName('');
      setSlug('');
      setShowCreate(false);
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggleActive = async (t: Tenant) => {
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, isActive: !t.isActive }),
      });
      if (!res.ok) throw new Error('수정 실패');
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (user && user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-slate-500">SUPER_ADMIN 전용 페이지입니다.</div>;
  }

  const columns: AdminTableColumn<Tenant>[] = [
    { id: 'name', header: '지점명', render: (t) => <b>{t.name}</b> },
    { id: 'slug', header: 'slug', render: (t) => <code className="text-xs text-slate-500">{t.slug}</code> },
    { id: 'users', header: '사용자', render: (t) => `${t.userCount}명` },
    { id: 'active', header: '상태', render: (t) => (t.isActive ? '활성' : '비활성') },
    {
      id: 'actions', header: '', render: (t) => (
        <Button size="sm" variant="secondary" onClick={() => toggleActive(t)}>
          {t.isActive ? '비활성화' : '활성화'}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5" /> 지점 관리
        </h1>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="w-4 h-4 mr-1" /> 새 지점
        </Button>
      </div>
      {showCreate && (
        <div className="mb-4 p-4 border border-slate-200 rounded-lg flex gap-2 items-end bg-slate-50">
          <Input label="지점명" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="slug (영소문자/숫자/-)" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Button size="sm" onClick={create}>
            <Save className="w-4 h-4 mr-1" /> 생성
          </Button>
        </div>
      )}
      <AdminTable columns={columns} rows={rows} loading={loading} rowKey={(t) => t.id} emptyMessage="지점이 없습니다" />
    </div>
  );
}
