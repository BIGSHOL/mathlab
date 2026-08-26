'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Ticket, RefreshCw, BarChart3, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import { PURCHASABLE_PRODUCT_IDS, paraxCheckoutHref } from '@/lib/constants/parax-products';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';

const FEATURE_LABELS: Record<string, string> = {
  EXAM_ANALYSIS: '기출분석', WORKSHEET: '학습지', CONCEPT: '개념', ARITHMETIC: '연산',
  TIME_ATTACK: '타임어택', TEST: '테스트', REVENGE: '리벤지', DIAGNOSTIC: '진단',
  QUIZ: '퀴즈', HOMEWORK: '과제', EXAM_PREP: '시험대비', OX_QUIZ: 'OX퀴즈', WORKBOOK: '워크북',
};
const featureLabel = (f: string) => FEATURE_LABELS[f] ?? f;

type Pool = { feature: string; balance: number; totalPurchased: number; nextExpiry?: { qty: number; at: string } | null };

const formatExpiry = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/** 이용권 — 원장(OWNER+)이 지점 이용권 풀을 확인·충전. 기출분석 시 풀에서 자동 차감(선생님 누구나, 학생 배정 불필요). */
export default function EntitlementsPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(false);

  // 랜딩 구매 CTA(`/entitlements?product=...`) → 결제 화면으로 자동 인계.
  // OWNER 확인 후에만 이동한다(그 아래 라우트가 OWNER 가드라 비원장은 401 JSON 을 보게 됨).
  const wantedProduct = params.get('product');
  useEffect(() => {
    if (!wantedProduct || !PURCHASABLE_PRODUCT_IDS.has(wantedProduct)) return;
    if (!user || !hasRoleClient(user.role, 'OWNER')) return;
    setForwarding(true);
    window.location.href = paraxCheckoutHref(wantedProduct);
  }, [wantedProduct, user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entitlements');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '불러오기 실패');
      setPools(json.data?.pools ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (user && !hasRoleClient(user.role, 'OWNER')) {
    return <div className="p-8 text-center text-slate-500">원장 전용 페이지입니다.</div>;
  }

  if (forwarding) {
    return <div className="p-8 text-center text-sm text-slate-500">결제 화면으로 이동 중입니다…</div>;
  }

  // EXAM_ANALYSIS 는 항상 노출, 그 외 기능은 풀이 있을 때만.
  const features = Array.from(new Set<string>(['EXAM_ANALYSIS', ...pools.map((p) => p.feature)]));

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="이용권"
        icon={<Ticket className="w-6 h-6" />}
        backHref="/exam-analysis"
        actions={
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
          </Button>
        }
      />

      {/* 구매는 결제 페이지에서 — 이 페이지는 잔여 확인·배정 전용 */}
      <div className="mb-5 p-4 border border-slate-200 rounded-sm bg-white flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          이용권이 부족하면 결제 페이지에서 <b>월 결제</b> 또는 <b>횟수 결제</b>로 충전할 수 있습니다.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors shrink-0"
        >
          <CreditCard className="w-3.5 h-3.5" /> 결제 바로가기 →
        </Link>
      </div>

      {/* 지점 이용권 잔여 */}
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">불러오는 중…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {features.map((f) => {
            const p = pools.find((x) => x.feature === f);
            return (
              <div key={f} className="text-left p-4 border border-slate-200 rounded-sm bg-white">
                <div className="text-xs text-slate-500">{featureLabel(f)} 이용권 잔여</div>
                <div className="text-2xl font-bold text-slate-800">
                  {p?.balance ?? 0}<span className="text-sm font-normal text-slate-400 ml-1">회</span>
                </div>
                <div className="text-[11px] text-slate-400">누적 구매 {p?.totalPurchased ?? 0}</div>
                {p?.nextExpiry && (
                  <div className="text-[11px] text-amber-600 mt-0.5">
                    {p.nextExpiry.qty}개 · {formatExpiry(p.nextExpiry.at)} 만료 예정
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 사용 안내 + 강사별 활동 */}
      <div className="p-4 border border-slate-200 rounded-sm bg-slate-50/60 text-sm text-slate-600">
        <p>
          기출분석을 실행하면 <b>우리 지점 이용권에서 1회씩 자동 차감</b>됩니다.
          선생님 누구나 바로 사용할 수 있고, 학생별로 따로 배정할 필요가 없습니다.
        </p>
        <Link href="/exam-analysis/admin" className="inline-flex items-center gap-1.5 mt-2 text-indigo-600 hover:text-indigo-700 font-medium">
          <BarChart3 className="w-3.5 h-3.5" /> 선생님별 분석 활동 보기
        </Link>
      </div>
    </PageContainer>
  );
}
