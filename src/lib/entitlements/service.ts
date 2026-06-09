import { prisma } from '@/lib/db';
import type { LicenseFeature } from '@prisma/client';

// LicenseFeature enum 값 (schema.prisma 와 동기화)
const VALID_FEATURES: readonly LicenseFeature[] = [
  'CONCEPT', 'ARITHMETIC', 'TIME_ATTACK', 'TEST', 'REVENGE', 'DIAGNOSTIC', 'QUIZ',
  'EXAM_ANALYSIS', 'HOMEWORK', 'WORKSHEET', 'EXAM_PREP', 'OX_QUIZ', 'WORKBOOK',
];

export function isLicenseFeature(v: unknown): v is LicenseFeature {
  return typeof v === 'string' && (VALID_FEATURES as readonly string[]).includes(v);
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e
    && (e as { code?: string }).code === 'P2002';
}

export interface GrantResult {
  applied: boolean; // false = 멱등(이미 적립된 주문)
  balance?: number;
  totalPurchased?: number;
}

/**
 * 지점(Tenant) 이용권 풀에 크레딧 충전 — para-x 결제 승인 → 적립.
 * 원장(EntitlementLedger) 기록 + 풀(TenantEntitlement) 증가를 한 트랜잭션으로.
 * 멱등: refOrderId 가 EntitlementLedger 에서 유니크 → 같은 주문 재시도는 중복 적립 안 함
 *       (선조회 + 유니크 제약 백스톱으로 동시성 레이스까지 차단).
 */
export async function grantCredits(
  tenantId: string,
  feature: LicenseFeature,
  qty: number,
  opts: { refOrderId?: string | null; userId?: string | null; amount?: number | null } = {},
): Promise<GrantResult> {
  const { refOrderId = null, userId = null, amount = null } = opts;
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('qty must be a positive integer');

  try {
    return await prisma.$transaction(async (tx) => {
      // 멱등 가드: 원장에 먼저 기록(refOrderId 유니크) → 중복이면 P2002 로 롤백
      await tx.entitlementLedger.create({
        data: { tenantId, userId, feature, delta: qty, reason: 'purchase', refOrderId, amount },
      });
      const pool = await tx.tenantEntitlement.upsert({
        where: { tenantId_feature: { tenantId, feature } },
        create: { tenantId, feature, balance: qty, totalPurchased: qty },
        update: { balance: { increment: qty }, totalPurchased: { increment: qty } },
      });
      return { applied: true, balance: pool.balance, totalPurchased: pool.totalPurchased };
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { applied: false }; // 이미 적립된 주문(멱등)
    throw e;
  }
}
