import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest } from '@/lib/api';
import { mintHandoffToken } from '@/lib/parax/handoff';

export const dynamic = 'force-dynamic';

/** 결제 허브 API 오리진 — 체크아웃 페이지 URL(.../checkout.html)과 같은 호스트에서 서빙된다. */
function hubApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_PARAX_CHECKOUT_URL;
  if (!base) throw new Error('NEXT_PUBLIC_PARAX_CHECKOUT_URL 미설정');
  return new URL(path, new URL(base).origin).toString();
}

/**
 * POST /api/billing/cancel — 정기결제 기간말 해지. (OWNER+)
 *
 * 여전법 시행령 §6조의16이 요구하는 "정규 영업시간 외에도 가능한 해지 신청 채널" 이다 —
 * 로그인한 원장이 24시간 언제나 스스로 해지할 수 있어야 하므로 상담 채널로 대체할 수 없다.
 *
 * 식별은 체크아웃과 같은 서명 핸드오프 토큰(tenantId 는 서버가 세션에서 결정, 클라가 보내지 않음).
 * 결제 허브가 기간말 해지 처리 후 `subscription_canceled` 를 /api/webhooks/parax 로 통지하지만,
 * 그 통지는 best-effort 라 도착이 지연/유실될 수 있다. 허브가 성공을 확인해 준 시점에
 * 로컬 상태도 같은 값으로 맞춰 둔다 — 웹훅과 동일한 전이(status='cancelled', 기간은 유지)라 멱등이다.
 * 플랜 자체는 currentPeriodEnd 가 지난 뒤 getTenantPlan 이 free 로 강등한다(즉시 차단 아님).
 */
export async function POST() {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) return badRequest('소속 지점이 없습니다.');

  let url: string;
  let token: string;
  try {
    url = hubApiUrl('/api/cancel-subscription');
    token = mintHandoffToken({ tenantId, userId: user.id, role: user.role });
  } catch (e) {
    console.error('[billing/cancel] 결제 허브 설정 누락:', (e as Error).message);
    return NextResponse.json(
      { error: { code: 'NOT_CONFIGURED', message: '지금은 해지를 처리할 수 없습니다. 고객센터로 문의해 주세요.' } },
      { status: 503 },
    );
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, site: 'mathlab' }),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[billing/cancel] 결제 허브 호출 실패:', e);
    return NextResponse.json(
      { error: { code: 'UPSTREAM_UNREACHABLE', message: '해지 요청을 전달하지 못했습니다. 잠시 후 다시 시도해 주세요.' } },
      { status: 502 },
    );
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 404) {
    // 허브에 정기결제 구독이 없음 — 관리자가 수동 배정한 플랜이거나 이미 만료된 경우.
    return NextResponse.json(
      { error: { code: 'NO_SUBSCRIPTION', message: '해지할 정기결제 구독이 없습니다.' } },
      { status: 404 },
    );
  }
  if (!res.ok) {
    console.error('[billing/cancel] 결제 허브 오류:', res.status, body);
    return NextResponse.json(
      { error: { code: 'CANCEL_FAILED', message: '해지 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' } },
      { status: 502 },
    );
  }

  // 허브 확인 완료 → 로컬 상태를 웹훅과 같은 값으로 수렴(멱등). 구독 행이 없으면 no-op.
  const periodEnd = body?.subscription?.currentPeriodEnd ? new Date(body.subscription.currentPeriodEnd) : null;
  await prisma.tenantSubscription.updateMany({
    where: { tenantId },
    data: { status: 'cancelled', ...(periodEnd && !Number.isNaN(periodEnd.getTime()) ? { currentPeriodEnd: periodEnd } : {}) },
  });

  return NextResponse.json({
    data: {
      canceled: true,
      alreadyCanceled: !!body?.alreadyCanceled,
      currentPeriodEnd: body?.subscription?.currentPeriodEnd ?? null,
    },
  });
}
