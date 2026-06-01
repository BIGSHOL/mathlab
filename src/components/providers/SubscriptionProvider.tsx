'use client';

/**
 * 테넌트 구독 상태(plan/usage/features)를 클라이언트 트리에 제공.
 * useAuth().user엔 tenantId/plan이 없으므로 GET /api/billing을 1회 fetch.
 * 비-2xx/네트워크오류/미설정 → FREE_FALLBACK (절대 throw 안 함) → 게이트는 항상 안전.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PlanId } from '@/lib/billing/plans';

export type SubStatus = 'inactive' | 'active' | 'cancelled' | 'expired' | 'past_due';
export interface SubUsage { used: number; limit: number | null; resetAt: string | null } // limit null = 무제한
export interface SubFeatures { commentary: boolean; nearby: boolean }
export interface SubscriptionState {
  plan: PlanId;
  status: SubStatus;
  usage: SubUsage;
  features: SubFeatures;
  lemonSqueezyConfigured: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const FREE_FALLBACK = {
  plan: 'free' as PlanId,
  status: 'inactive' as SubStatus,
  usage: { used: 0, limit: 3 as number | null, resetAt: null as string | null },
  features: { commentary: false, nearby: false },
  lemonSqueezyConfigured: false,
};

const Ctx = createContext<SubscriptionState | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(FREE_FALLBACK);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/billing', { cache: 'no-store' });
      if (!res.ok) { setData(FREE_FALLBACK); return; }
      const j = (await res.json())?.data ?? {};
      setData({
        plan: j.plan ?? 'free',
        status: j.status ?? 'inactive',
        usage: j.usage ?? FREE_FALLBACK.usage,
        features: j.features ?? FREE_FALLBACK.features,
        lemonSqueezyConfigured: !!j.lemonSqueezyConfigured,
      });
    } catch {
      setData(FREE_FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return <Ctx.Provider value={{ ...data, loading, refetch }}>{children}</Ctx.Provider>;
}

export function useSubscription(): SubscriptionState {
  const v = useContext(Ctx);
  if (!v) return { ...FREE_FALLBACK, loading: false, refetch: async () => {} };
  return v;
}

// 순수 헬퍼 — 모든 게이트가 동일 기준으로 읽도록
export const quotaExceeded = (u: SubUsage) => u.limit !== null && u.used >= u.limit;
export const quotaLabel = (u: SubUsage) => (u.limit === null ? `${u.used}/무제한` : `${u.used}/${u.limit}`);
export const remaining = (u: SubUsage) => (u.limit === null ? Infinity : Math.max(0, u.limit - u.used));
