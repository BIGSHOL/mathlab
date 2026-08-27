'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Check, ShieldAlert, ShoppingCart } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { toast } from '@/components/ui/Toast';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { useSubscription, quotaLabel } from '@/components/providers/SubscriptionProvider';
import { PLAN_CARDS } from '@/lib/constants/billing';
import { CREDIT_PRODUCTS, paraxCheckoutHref } from '@/lib/constants/parax-products';
import { getPlanConfig, type PlanId } from '@/lib/billing/plans';

export default function BillingPage() {
  const { user, isLoading } = useAuth();
  const { plan, usage, billingManaged, currentPeriodEnd, refetch } = useSubscription();
  const params = useSearchParams();
  const [paying, setPaying] = useState<string | null>(null);
  const [cancelStep, setCancelStep] = useState<'idle' | 'confirm' | 'working'>('idle');

  // 결제 완료 리다이렉트(?success=true) → 토스트 + 3초 후 상태 갱신(웹훅 반영 대기)
  useEffect(() => {
    if (params.get('success') === 'true') {
      toast.success('결제가 완료되었습니다! 잠시 후 플랜이 반영됩니다.');
      const t = setTimeout(() => refetch(), 3000);
      return () => clearTimeout(t);
    }
  }, [params, refetch]);

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl">
        <div className="py-16 flex flex-col items-center gap-3 text-sm text-slate-400">
          <MathSpinner size="lg" />
          불러오는 중...
        </div>
      </PageContainer>
    );
  }
  if (!user || !hasRoleClient(user.role, 'OWNER')) {
    return (
      <PageContainer maxWidth="md">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">원장(OWNER) 이상 권한이 필요합니다</p>
          <p className="text-xs text-slate-400 mt-1">구독·결제는 지점 관리자만 접근할 수 있습니다.</p>
        </div>
      </PageContainer>
    );
  }

  const currentPlan = getPlanConfig(plan);
  const pct = usage.limit ? usage.used / usage.limit : 0;

  // 결제 허브로 이동. 체크아웃 URL은 서버에서 tenantId를 붙여 생성.
  const handleUpgrade = async (planKey: PlanId) => {
    setPaying(planKey);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error?.message || '결제 페이지를 열 수 없습니다.'); return; }
      const checkoutUrl = json.data?.checkoutUrl;
      if (checkoutUrl) { window.location.href = checkoutUrl; return; }
      toast.error('결제 페이지를 열 수 없습니다.');
    } catch {
      toast.error('결제 요청 중 오류가 발생했습니다.');
    } finally {
      setPaying(null);
    }
  };

  // 정기결제 해지 — 기간말 해지(결제한 기간이 끝날 때까지 이용 가능). 서버가 결제 허브에 서명 요청을 전달한다.
  const handleCancel = async () => {
    setCancelStep('working');
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error?.message || '해지 처리에 실패했습니다.'); setCancelStep('confirm'); return; }
      toast.success(
        json.data?.alreadyCanceled
          ? '이미 해지 신청이 접수된 구독입니다.'
          : '해지가 접수되었습니다. 결제한 기간이 끝날 때까지 계속 이용하실 수 있습니다.',
      );
      setCancelStep('idle');
      await refetch();
    } catch {
      toast.error('해지 요청 중 오류가 발생했습니다.');
      setCancelStep('confirm');
    }
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="결제"
        subtitle={`현재 플랜: ${currentPlan.label} · 이용권 잔여 ${usage.poolBalance}회`}
        icon={<CreditCard className="w-6 h-6 text-primary" />}
        backHref="/exam-analysis"
      />


      {/* 이용권 잔여 + 무료 분석 한도 */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 이용권 잔여(지점 풀) — 모든 기출분석이 여기서 차감 */}
        <div className="p-4 border border-slate-200 rounded-sm bg-white">
          <div className="text-sm font-semibold text-slate-700 mb-1">기출분석 이용권 잔여</div>
          <div className="text-2xl font-bold text-slate-800">{usage.poolBalance}<span className="text-sm font-normal text-slate-400 ml-1">회</span></div>
          <p className="text-[11px] text-slate-400 mt-1">모든 기출분석은 이용권에서 1회씩 차감됩니다. 아래에서 충전할 수 있습니다.</p>
        </div>
        {/* 무료 월 한도 — 이용권이 없을 때의 폴백 */}
        <div className="p-4 border border-slate-200 rounded-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">무료 분석 한도</span>
            <span className="text-sm font-bold text-slate-800">{quotaLabel(usage)}</span>
          </div>
          {usage.limit === null ? (
            <p className="text-xs text-slate-400">무제한 플랜입니다.</p>
          ) : (
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 1 ? 'bg-rose-500' : pct >= 0.8 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(pct, 1) * 100}%` }}
              />
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-1.5">
            이용권이 없을 때만 무료 한도가 쓰입니다.
            {usage.resetAt && <> · 갱신: {new Date(usage.resetAt).toLocaleDateString('ko-KR')}</>}
          </p>
        </div>
      </div>

      {/* ── 월 결제 (정기결제) ── */}
      <h2 className="text-sm font-semibold text-slate-700 mb-2.5">월 결제</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_CARDS.map((card) => {
          const isCurrent = card.key === plan;
          const isFree = card.key === 'free';
          return (
            <div
              key={card.key}
              className={`rounded-sm border p-5 flex flex-col overflow-hidden ${card.highlight ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'} ${isCurrent ? 'bg-indigo-50/40' : 'bg-white'}`}
            >
              {card.highlight && <div className="h-1 -mx-5 -mt-5 mb-4 bg-[linear-gradient(100deg,#4F46E5,#7C3AED)]" />}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">{card.name}</h3>
                {isCurrent && <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">현재 플랜</span>}
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{card.priceLabel}</p>
              <ul className="mt-4 space-y-1.5 flex-1">
                {card.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button size="sm" variant="secondary" disabled className="w-full">사용 중</Button>
                ) : isFree ? (
                  <Button size="sm" variant="secondary" disabled className="w-full">무료</Button>
                ) : (
                  <Button
                    size="sm"
                    variant="brand"
                    onClick={() => handleUpgrade(card.key)}
                    loading={paying === card.key}
                    className="w-full"
                  >
                    구독하기
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        매달 자동 결제되며 이용권이 자동 충전됩니다. 언제든 해지할 수 있고, 해지해도 결제한 기간이 끝날 때까지 이용할 수 있습니다.
      </p>

      {/* ── 구독 관리 (해지) ── */}
      {/* 여전법 시행령 §6조의16: 정기결제는 영업시간과 무관하게 신청 가능한 해지 채널이 있어야 한다.
          로그인한 원장이 상담 없이 즉시 해지할 수 있도록 이 자리에 상시 노출한다. */}
      <h2 className="text-sm font-semibold text-slate-700 mt-8 mb-2.5">구독 관리</h2>
      <div className="p-4 border border-slate-200 rounded-sm bg-white">
        {billingManaged ? (
          <>
            <p className="text-sm text-slate-600">
              현재 <b>{currentPlan.label}</b> 플랜이 매달 자동 결제되고 있습니다.
              {currentPeriodEnd && <> 다음 결제일은 {new Date(currentPeriodEnd).toLocaleDateString('ko-KR')} 입니다.</>}
            </p>
            {cancelStep === 'idle' ? (
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setCancelStep('confirm')}>
                구독 해지
              </Button>
            ) : (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-sm">
                <p className="text-xs text-rose-700 leading-relaxed">
                  해지하면 다음 결제부터 청구되지 않습니다.
                  {currentPeriodEnd
                    ? <> 이미 결제한 기간인 <b>{new Date(currentPeriodEnd).toLocaleDateString('ko-KR')}</b>까지는 그대로 이용하실 수 있습니다.</>
                    : <> 이미 결제한 기간이 끝날 때까지는 그대로 이용하실 수 있습니다.</>}
                  <br />구독에 포함된 월 이용권 중 사용하지 않은 분은 해당 결제 주기가 끝나면 소멸됩니다.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="danger" onClick={handleCancel} loading={cancelStep === 'working'}>
                    해지하기
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCancelStep('idle')} disabled={cancelStep === 'working'}>
                    유지하기
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            현재 자동 결제 중인 구독이 없습니다. 월 결제를 시작하면 이곳에서 언제든 직접 해지하실 수 있습니다.
          </p>
        )}
      </div>

      {/* ── 횟수 결제 (일회성 이용권) ── */}
      <h2 className="text-sm font-semibold text-slate-700 mt-8 mb-2.5">횟수 결제</h2>
      <div className="p-4 border border-slate-200 rounded-sm bg-white">
        <div className="flex flex-wrap gap-2">
          {CREDIT_PRODUCTS.map((p) => (
            <a
              key={p.id}
              href={paraxCheckoutHref(p.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> {p.label}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">필요할 때마다 구매하는 일회성 이용권입니다. 가격은 결제 화면에서 확인하세요.</p>
        <p className="text-[11px] text-slate-500 mt-1">
          건당 구매한 이용권은 <b>충전일로부터 1년간 유효</b>하고, 구독에 포함된 월 이용권은 <b>해당 결제 주기(당월) 내에만 사용</b>할 수 있으며 미사용분은 이월되지 않습니다.
          유효기간이 지난 이용권은 자동 소멸되며 환불 대상이 아니고, 현금화·양도·대여할 수 없습니다.
        </p>
      </div>

      <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
        결제는 안전하게 처리됩니다. 충전된 이용권 배정은 <Link href="/entitlements" className="text-indigo-600 hover:text-indigo-700 font-medium">이용권</Link> 페이지에서 할 수 있습니다.
      </p>
    </PageContainer>
  );
}
