'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ticket, RefreshCw, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { AdminTable, type AdminTableColumn, type AdminTableSort } from '@/components/admin-table';

const FEATURE_LABELS: Record<string, string> = {
  EXAM_ANALYSIS: '기출분석', WORKSHEET: '학습지', CONCEPT: '개념', ARITHMETIC: '연산',
  TIME_ATTACK: '타임어택', TEST: '테스트', REVENGE: '리벤지', DIAGNOSTIC: '진단',
  QUIZ: '퀴즈', HOMEWORK: '과제', EXAM_PREP: '시험대비', OX_QUIZ: 'OX퀴즈', WORKBOOK: '워크북',
};
const featureLabel = (f: string) => FEATURE_LABELS[f] ?? f;

// 구매 가능한 이용권 상품(para-x 카탈로그와 id 일치). 가격은 결제 화면에서 확정 표시.
const CREDIT_PRODUCTS = [
  { id: 'credit-exam-10', label: '기출분석 10회' },
  { id: 'credit-exam-20', label: '기출분석 20회' },
  { id: 'credit-exam-30', label: '기출분석 30회' },
];

type Pool = { feature: string; balance: number; totalPurchased: number; nextExpiry?: { qty: number; at: string } | null };
type Lic = { feature: string; allocated: number; used: number; usable?: number };

const formatExpiry = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};
type Student = { id: string; name: string; username: string; grade: number | null; licenses: Lic[] };

/** 이용권 배정 — 원장(OWNER+)이 지점 풀을 학생에게 배정. para-x 결제로 충전된 풀 사용. */
export default function EntitlementsPage() {
  const { user } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [feature, setFeature] = useState('EXAM_ANALYSIS');
  const [sort, setSort] = useState<AdminTableSort>({ columnId: 'name', direction: 'asc' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entitlements');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '불러오기 실패');
      setPools(json.data?.pools ?? []);
      setStudents(json.data?.students ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const featureOptions = useMemo(() => {
    const set = new Set<string>(pools.map((p) => p.feature));
    set.add('EXAM_ANALYSIS');
    return Array.from(set);
  }, [pools]);

  const pool = pools.find((p) => p.feature === feature);
  const licOf = useCallback((s: Student) => s.licenses.find((l) => l.feature === feature), [feature]);
  // 잔여 = 만료분 제외 사용 가능량 (서버 lot 집계 — 구버전 응답은 allocated-used 폴백)
  const remainingOf = useCallback((s: Student) => { const l = licOf(s); return l ? (l.usable ?? l.allocated - l.used) : 0; }, [licOf]);

  const allocate = async (s: Student) => {
    const raw = window.prompt(`${s.name} 학생에게 배정할 ${featureLabel(feature)} 수량`, '5');
    if (raw == null) return;
    const qty = Number(raw);
    if (!Number.isInteger(qty) || qty <= 0) { toast.error('양의 정수를 입력하세요'); return; }
    try {
      const res = await fetch('/api/entitlements/allocate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: s.id, feature, qty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '배정 실패');
      toast.success(`${s.name}에게 ${qty}개 배정했습니다`);
      void load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const onSortChange = (columnId: string) =>
    setSort((s) => (s.columnId === columnId ? { columnId, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { columnId, direction: 'asc' }));

  const sortedStudents = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    const val = (s: Student): string | number => {
      switch (sort.columnId) {
        case 'name': return s.name ?? '';
        case 'username': return s.username ?? '';
        case 'grade': return s.grade ?? 0;
        case 'allocated': return licOf(s)?.allocated ?? 0;
        case 'used': return licOf(s)?.used ?? 0;
        case 'remaining': return remainingOf(s);
        default: return '';
      }
    };
    return [...students].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'ko') * dir;
    });
  }, [students, sort, licOf, remainingOf]);

  if (user && !hasRoleClient(user.role, 'OWNER')) {
    return <div className="p-8 text-center text-slate-500">원장 전용 페이지입니다.</div>;
  }

  const columns: AdminTableColumn<Student>[] = [
    { id: 'name', header: '이름', sortable: true, render: (s) => <b>{s.name}</b> },
    { id: 'username', header: '아이디', sortable: true, render: (s) => <span className="text-slate-500">{s.username}</span> },
    { id: 'grade', header: '학년', sortable: true, render: (s) => (s.grade ? `${s.grade}학년` : '-') },
    { id: 'allocated', header: '배정', sortable: true, render: (s) => licOf(s)?.allocated ?? 0 },
    { id: 'used', header: '사용', sortable: true, render: (s) => licOf(s)?.used ?? 0 },
    { id: 'remaining', header: '잔여', sortable: true, render: (s) => <b className={remainingOf(s) > 0 ? 'text-emerald-600' : 'text-slate-400'}>{remainingOf(s)}</b> },
    { id: 'actions', header: '', render: (s) => <Button size="sm" variant="secondary" onClick={() => allocate(s)}>배정</Button> },
  ];

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="이용권 배정"
        icon={<Ticket className="w-6 h-6" />}
        backHref="/exam-analysis"
        actions={
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
          </Button>
        }
      />

      {/* 이용권 구매 (para-x 결제 → 지점 풀 충전) */}
      <div className="mb-5 p-4 border border-slate-200 rounded-sm bg-white">
        <div className="text-sm font-semibold text-slate-700 mb-2.5">이용권 구매</div>
        <div className="flex flex-wrap gap-2">
          {CREDIT_PRODUCTS.map((p) => (
            <a
              key={p.id}
              href={`/api/parax/checkout?product=${p.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> {p.label}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">결제하면 지점 풀에 충전됩니다. 가격은 결제 화면에서 확인하세요.</p>
        <p className="text-[11px] text-slate-500 mt-1">
          이용권(크레딧)은 <b>충전일로부터 1년간 유효</b>하며, 유효기간이 지나면 자동 소멸됩니다.
          소멸된 이용권은 환불 대상이 아니며, 현금화·양도·대여할 수 없습니다.
        </p>
      </div>

      {/* 지점 풀 잔액 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {featureOptions.map((f) => {
          const p = pools.find((x) => x.feature === f);
          return (
            <button
              key={f}
              onClick={() => setFeature(f)}
              className={`text-left p-4 border rounded-sm transition-colors ${f === feature ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <div className="text-xs text-slate-500">{featureLabel(f)} 풀 잔여</div>
              <div className="text-2xl font-bold text-slate-800">{p?.balance ?? 0}</div>
              <div className="text-[11px] text-slate-400">누적 구매 {p?.totalPurchased ?? 0}</div>
              {p?.nextExpiry && (
                <div className="text-[11px] text-amber-600 mt-0.5">
                  {p.nextExpiry.qty}개 · {formatExpiry(p.nextExpiry.at)} 만료 예정
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 기능 선택 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-sm text-slate-500">기능</span>
        <select className="border border-slate-200 rounded px-2 h-9 text-sm" value={feature} onChange={(e) => setFeature(e.target.value)}>
          {featureOptions.map((f) => <option key={f} value={f}>{featureLabel(f)}</option>)}
        </select>
        <span className="text-sm text-slate-400">· {featureLabel(feature)} 풀 잔여 <b className="text-slate-700">{pool?.balance ?? 0}</b></span>
      </div>

      <AdminTable
        columns={columns}
        rows={sortedStudents}
        loading={loading}
        rowKey={(s) => s.id}
        sort={sort}
        onSortChange={onSortChange}
        emptyMessage="학생이 없습니다"
      />
    </PageContainer>
  );
}
