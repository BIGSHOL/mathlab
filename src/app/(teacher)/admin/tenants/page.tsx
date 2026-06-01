'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Building2, Plus, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { AdminTable, type AdminTableColumn, type AdminTableSort } from '@/components/admin-table';

type PlanId = 'free' | 'pro' | 'enterprise';
type Tenant = {
  id: string; slug: string; name: string; logo: string | null;
  isActive: boolean; userCount: number; createdAt: string;
  plan: PlanId; subStatus: string | null; currentPeriodEnd: string | null; managedByLs: boolean;
};

const PLAN_LABEL: Record<PlanId, string> = { free: '무료', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_BADGE: Record<PlanId, string> = {
  free: 'bg-slate-100 text-slate-500',
  pro: 'bg-violet-100 text-violet-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

/** 지점(Tenant) 관리 — 기출분석 전용 간소화 (기본 CRUD + 검색/정렬). SUPER_ADMIN 전용. */
export default function AdminTenantsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<AdminTableSort>({ columnId: 'name', direction: 'asc' });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [betaAllPro, setBetaAllPro] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '불러오기 실패');
      setRows(json.data ?? []);
      setBetaAllPro(!!json?.meta?.betaAllPro);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const onSortChange = (columnId: string) =>
    setSort((s) => (s.columnId === columnId ? { columnId, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { columnId, direction: 'asc' }));

  const view = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = rows.filter((t) => !s || t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s));
    const dir = sort.direction === 'asc' ? 1 : -1;
    const planRank: Record<PlanId, number> = { free: 0, pro: 1, enterprise: 2 };
    const val = (t: Tenant): string | number => {
      switch (sort.columnId) {
        case 'name': return t.name;
        case 'slug': return t.slug;
        case 'users': return t.userCount;
        case 'plan': return planRank[t.plan];
        case 'active': return t.isActive ? 1 : 0;
        case 'createdAt': return new Date(t.createdAt).getTime();
        default: return '';
      }
    };
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'ko') * dir;
    });
  }, [rows, q, sort]);

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

  const assignPlan = async (t: Tenant, plan: PlanId) => {
    if (plan === t.plan) return;
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '플랜 변경 실패');
      toast.success(`${t.name} → ${PLAN_LABEL[plan]} 플랜으로 변경되었습니다`);
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (user && user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-slate-500">SUPER_ADMIN 전용 페이지입니다.</div>;
  }

  const columns: AdminTableColumn<Tenant>[] = [
    { id: 'name', header: '지점명', sortable: true, render: (t) => <b>{t.name}</b> },
    { id: 'slug', header: 'slug', sortable: true, render: (t) => <code className="text-xs text-slate-500">{t.slug}</code> },
    { id: 'users', header: '사용자', sortable: true, render: (t) => `${t.userCount}명` },
    {
      id: 'plan', header: '구독', sortable: true, render: (t) => (
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${PLAN_BADGE[t.plan]}`}>{PLAN_LABEL[t.plan]}</span>
          <select
            value={t.plan}
            onChange={(e) => assignPlan(t, e.target.value as PlanId)}
            title={t.managedByLs ? '결제로 생성된 구독입니다. 수동 변경 시 실제 결제 상태와 어긋날 수 있습니다.' : '플랜 수동 배정'}
            className="text-xs border border-slate-200 rounded-sm pl-1.5 pr-5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="free">무료</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          {t.managedByLs && <span title="결제 연동 구독" className="text-amber-500 text-xs leading-none">●</span>}
        </div>
      ),
    },
    { id: 'active', header: '상태', sortable: true, render: (t) => (t.isActive ? '활성' : '비활성') },
    { id: 'createdAt', header: '생성일', sortable: true, render: (t) => new Date(t.createdAt).toLocaleDateString('ko-KR') },
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
      {betaAllPro && (
        <div className="mb-3 px-3 py-2 bg-violet-50 border border-violet-200 rounded-sm text-xs text-violet-700">
          <strong>베타 기간(BETA_ALL_PRO)</strong> 활성 — 아래 배정 플랜과 무관하게 <b>모든 지점이 최소 Pro로 동작</b> 중입니다.
          여기서 배정한 플랜은 베타 종료 후 적용됩니다(상위 플랜은 베타 중에도 유지).
        </div>
      )}
      <div className="flex gap-2 mb-3 items-center">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="지점명·slug 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9 pr-3 rounded-sm border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-64"
          />
        </div>
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
      <AdminTable
        columns={columns}
        rows={view}
        loading={loading}
        rowKey={(t) => t.id}
        sort={sort}
        onSortChange={onSortChange}
        emptyMessage="지점이 없습니다"
      />
    </div>
  );
}
