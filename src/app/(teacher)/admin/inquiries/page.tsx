'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Inbox, RefreshCw, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { AdminTable, type AdminTableColumn, type AdminTableSort } from '@/components/admin-table';

type Row = {
  id: string;
  academyName: string;
  contactName: string;
  phone: string;
  email: string | null;
  region: string | null;
  message: string | null;
  status: 'PENDING' | 'ANSWERED';
  createdAt: string;
};

const STATUS_LABEL: Record<Row['status'], string> = { PENDING: '대기', ANSWERED: '회신완료' };

/** 도입 문의 관리 — 랜딩/데모의 [도입 문의] 접수 기록 (SUPER_ADMIN 전용) */
export default function AdminInquiriesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<AdminTableSort>({ columnId: 'createdAt', direction: 'desc' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/inquiries?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '불러오기 실패');
      setRows(json.data ?? []);
      setPendingCount(json.meta?.pendingCount ?? 0);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);
  useEffect(() => { void load(); }, [load]);

  const setStatus = async (r: Row, status: Row['status']) => {
    try {
      const res = await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, status }),
      });
      if (!res.ok) throw new Error('상태 변경 실패');
      toast.success(status === 'ANSWERED' ? '회신완료로 표시했습니다' : '대기로 되돌렸습니다');
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onSortChange = (columnId: string) =>
    setSort((s) => (s.columnId === columnId ? { columnId, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { columnId, direction: 'asc' }));

  const sortedRows = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    const val = (r: Row): string | number => {
      switch (sort.columnId) {
        case 'academyName': return r.academyName ?? '';
        case 'contactName': return r.contactName ?? '';
        case 'region': return r.region ?? '';
        case 'status': return r.status;
        case 'createdAt': return new Date(r.createdAt).getTime();
        default: return '';
      }
    };
    return [...rows].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'ko') * dir;
    });
  }, [rows, sort]);

  if (user && user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-slate-500">SUPER_ADMIN 전용 페이지입니다.</div>;
  }

  const columns: AdminTableColumn<Row>[] = [
    { id: 'academyName', header: '학원명', sortable: true, render: (r) => <b>{r.academyName}</b> },
    { id: 'contactName', header: '담당자', sortable: true, render: (r) => r.contactName },
    {
      id: 'contact', header: '연락처', render: (r) => (
        <div className="space-y-0.5">
          <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-slate-700 hover:text-primary" onClick={(e) => e.stopPropagation()}>
            <Phone className="w-3 h-3 text-slate-400" /> {r.phone}
          </a>
          {r.email && (
            <a href={`mailto:${r.email}`} className="flex items-center gap-1 text-slate-500 hover:text-primary text-xs" onClick={(e) => e.stopPropagation()}>
              <Mail className="w-3 h-3 text-slate-400" /> {r.email}
            </a>
          )}
        </div>
      ),
    },
    { id: 'region', header: '지역', sortable: true, render: (r) => r.region ?? '-' },
    {
      id: 'message', header: '문의 내용', render: (r) => {
        const msg = r.message?.trim();
        if (!msg) return <span className="text-slate-300">-</span>;
        const expanded = expandedId === r.id;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : r.id); }}
            className={`text-left text-slate-600 max-w-[320px] ${expanded ? 'whitespace-pre-wrap' : 'truncate block'}`}
            title={expanded ? '접기' : '펼치기'}
          >
            {msg}
          </button>
        );
      },
    },
    {
      id: 'status', header: '상태', sortable: true, render: (r) => (
        <select
          className={`border rounded-sm px-1 py-0.5 text-sm ${r.status === 'PENDING' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
          value={r.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => void setStatus(r, e.target.value as Row['status'])}
        >
          {(['PENDING', 'ANSWERED'] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      ),
    },
    {
      id: 'createdAt', header: '접수일', sortable: true,
      render: (r) => new Date(r.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
  ];

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="도입 문의"
        subtitle={pendingCount > 0 ? `대기 ${pendingCount}건 — 1영업일 내 회신 약속` : '대기 중인 문의가 없습니다'}
        icon={<Inbox className="w-6 h-6" />}
        backHref="/exam-analysis"
        actions={
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
          </Button>
        }
      />

      <div className="flex gap-2 mb-3 items-center">
        <span className="text-sm text-slate-500">상태</span>
        <select
          className="border border-slate-200 rounded-sm px-2 h-9 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">전체</option>
          <option value="PENDING">대기</option>
          <option value="ANSWERED">회신완료</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        rows={sortedRows}
        loading={loading}
        rowKey={(r) => r.id}
        sort={sort}
        onSortChange={onSortChange}
        emptyMessage="접수된 문의가 없습니다"
      />
    </PageContainer>
  );
}
