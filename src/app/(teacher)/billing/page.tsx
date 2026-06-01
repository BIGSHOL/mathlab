'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Check, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { useSubscription, quotaLabel } from '@/components/providers/SubscriptionProvider';
import { PLAN_CARDS } from '@/lib/constants/billing';
import { getPlanConfig, type PlanId } from '@/lib/billing/plans';

export default function BillingPage() {
  const { user, isLoading } = useAuth();
  const { plan, status, usage, lemonSqueezyConfigured, refetch } = useSubscription();
  const params = useSearchParams();
  const [paying, setPaying] = useState<string | null>(null);

  // lemon.js 임베드 체크아웃 초기화 (스크립트는 이 페이지에만 로드)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.createLemonSqueezy) window.createLemonSqueezy();
  }, []);

  // 결제 완료 리다이렉트(?success=true) → 토스트 + 3초 후 상태 갱신(웹훅 반영 대기)
  useEffect(() => {
    if (params.get('success') === 'true') {
      toast.success('결제가 완료되었습니다! 잠시 후 플랜이 반영됩니다.');
      const t = setTimeout(() => refetch(), 3000);
      return () => clearTimeout(t);
    }
  }, [params, refetch]);

  if (isLoading) {
    return <PageContainer maxWidth="xl"><div className="py-16 text-center text-sm text-slate-400">불러오는 중...</div></PageContainer>;
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
  const subscribed = status !== 'inactive' && status !== 'expired';
  const pct = usage.limit ? usage.used / usage.limit : 0;

  const handleUpgrade = async (planKey: PlanId) => {
    setPaying(planKey);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error?.message || '체크아웃 생성에 실패했습니다.'); return; }
      const data = json.data ?? {};
      if (data.upgraded) { toast.success('데모 모드: 플랜이 변경되었습니다.'); await refetch(); return; }
      if (data.demo) { toast.info(data.message || '결제 시스템 준비 중입니다.'); return; }
      if (data.checkoutUrl) {
        if (window.LemonSqueezy?.Url?.Open) window.LemonSqueezy.Url.Open(data.checkoutUrl);
        else window.open(data.checkoutUrl, '_blank');
      }
    } catch {
      toast.error('결제 요청 중 오류가 발생했습니다.');
    } finally {
      setPaying(null);
    }
  };

  const openPortal = async () => {
    try {
      const res = await fetch('/api/billing/portal');
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error?.message || '구독 관리 페이지를 열 수 없습니다.'); return; }
      if (json.data?.portalUrl) window.open(json.data.portalUrl, '_blank');
    } catch {
      toast.error('구독 관리 페이지를 여는 중 오류가 발생했습니다.');
    }
  };

  return (
    <PageContainer maxWidth="xl">
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="lazyOnload" />
      <PageHeader
        title="구독 / 결제"
        subtitle={`현재 플랜: ${currentPlan.label} · 이번 달 분석 ${quotaLabel(usage)}`}
        icon={<CreditCard className="w-6 h-6 text-violet-600" />}
        actions={subscribed && lemonSqueezyConfigured ? (
          <Button size="sm" variant="secondary" onClick={openPortal}>구독 관리</Button>
        ) : undefined}
      />

      {!lemonSqueezyConfigured && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-2.5">
          <span className="text-amber-500 text-sm mt-0.5 shrink-0">&#9888;</span>
          <p className="text-xs text-amber-700">결제 시스템이 아직 연결되지 않았습니다 (준비 중). 현재는 Free 플랜으로 기본 기능을 이용하실 수 있습니다.</p>
        </div>
      )}

      {/* 이번 달 사용량 */}
      <div className="mb-6 p-4 border border-slate-200 rounded-sm bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">이번 달 분석 사용량</span>
          <span className="text-sm font-bold text-slate-800">{quotaLabel(usage)}</span>
        </div>
        {usage.limit === null ? (
          <p className="text-xs text-slate-400">무제한 플랜입니다.</p>
        ) : (
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 1 ? 'bg-rose-500' : pct >= 0.8 ? 'bg-amber-500' : 'bg-violet-500'}`}
              style={{ width: `${Math.min(pct, 1) * 100}%` }}
            />
          </div>
        )}
        {usage.resetAt && (
          <p className="text-[11px] text-slate-400 mt-1.5">갱신: {new Date(usage.resetAt).toLocaleDateString('ko-KR')}</p>
        )}
      </div>

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_CARDS.map((card) => {
          const isCurrent = card.key === plan;
          const isFree = card.key === 'free';
          return (
            <div
              key={card.key}
              className={`rounded-sm border p-5 flex flex-col ${card.highlight ? 'border-violet-300 ring-1 ring-violet-200' : 'border-slate-200'} ${isCurrent ? 'bg-violet-50/40' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">{card.name}</h3>
                {isCurrent && <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">현재 플랜</span>}
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{card.priceLabel}</p>
              <ul className="mt-4 space-y-1.5 flex-1">
                {card.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
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
                    onClick={() => handleUpgrade(card.key)}
                    loading={paying === card.key}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    구독하기
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
        결제는 Lemon Squeezy(해외 결제 대행)를 통해 처리되며, 구독 변경·취소·결제수단 관리는 &quot;구독 관리&quot;에서 가능합니다.
        가격은 상품 연결 후 확정됩니다.
      </p>
    </PageContainer>
  );
}
