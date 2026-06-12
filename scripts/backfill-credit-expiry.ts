/**
 * 크레딧 만료일 백필 — 약관 제6조(충전일로부터 1년 유효, 경과 시 소멸) 소급 적용.
 *
 * 기존 카운터 기반 데이터(TenantEntitlement.balance, StudentLicense.allocated/used)를
 * EntitlementLedger 를 시간순 재생(replay)하여 충전 단위 lot(EntitlementCreditLot)으로 변환:
 *   - purchase → 지점 풀 lot (grantedAt = 원장 기록 시각 = 지급일, expiresAt = 지급일 + 1년)
 *   - allocate → 풀 lot 에서 만료 임박순(FIFO by expiresAt) 분할 → 학생 lot (만료일 승계)
 *   - consume  → 학생 lot 에서 만료 임박순 차감
 * 재생 결과와 현재 카운터가 다르면 보정 lot(지급일 = 풀/배정 레코드 생성일)으로 일치시킨다.
 *
 * 실행:
 *   npx tsx scripts/backfill-credit-expiry.ts                  # dry-run (변경 없음)
 *   npx tsx scripts/backfill-credit-expiry.ts --apply          # 적용
 *   npx tsx scripts/backfill-credit-expiry.ts --apply --force  # 기존 lot 전체 삭제 후 재생성
 */
import { PrismaClient, type LicenseFeature } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

function plusOneYear(d: Date): Date {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + 1);
  return x;
}

interface Lot {
  tenantId: string;
  userId: string | null;
  feature: LicenseFeature;
  granted: number;
  remaining: number;
  grantedAt: Date;
  expiresAt: Date;
  refOrderId: string | null;
}

/**
 * 만료 임박순 차감 — 해당 시점(at) 미만료분 우선, 부족하면 만료분에서도 차감(과거 시점 일관성 유지).
 * 차감된 조각 목록 반환. 풀 잔량이 모자라면 가능한 만큼만 차감(부족분은 보정 단계에서 카운터에 맞춤).
 */
function takeFifo(lots: Lot[], qty: number, at: Date): { lot: Lot; take: number }[] {
  const slices: { lot: Lot; take: number }[] = [];
  let left = qty;
  const ordered = [...lots].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  for (const wantLive of [true, false]) {
    for (const lot of ordered) {
      if (left <= 0) break;
      if (lot.remaining <= 0) continue;
      const isLive = lot.expiresAt > at;
      if (isLive !== wantLive) continue;
      const take = Math.min(lot.remaining, left);
      lot.remaining -= take;
      left -= take;
      slices.push({ lot, take });
    }
  }
  return slices;
}

async function main() {
  const existing = await prisma.entitlementCreditLot.count();
  if (existing > 0 && !FORCE) {
    console.log(`이미 EntitlementCreditLot ${existing}개 존재 — 재생성하려면 --force. 중단합니다.`);
    return;
  }

  const [ledger, pools, lics] = await Promise.all([
    prisma.entitlementLedger.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.tenantEntitlement.findMany(),
    prisma.studentLicense.findMany(),
  ]);
  console.log(`원장 ${ledger.length}행, 풀 ${pools.length}개, 학생 라이선스 ${lics.length}개 재생 시작`);

  const poolLots = new Map<string, Lot[]>(); // `${tenantId}|${feature}`
  const studentLots = new Map<string, Lot[]>(); // `${tenantId}|${userId}|${feature}`

  // 1) 원장 재생
  for (const row of ledger) {
    if (!row.feature) continue;
    const pk = `${row.tenantId}|${row.feature}`;
    if (row.reason === 'purchase' && row.delta > 0) {
      const arr = poolLots.get(pk) ?? [];
      arr.push({
        tenantId: row.tenantId, userId: null, feature: row.feature,
        granted: row.delta, remaining: row.delta,
        grantedAt: row.createdAt, expiresAt: plusOneYear(row.createdAt), refOrderId: row.refOrderId,
      });
      poolLots.set(pk, arr);
    } else if (row.reason === 'allocate' && row.userId && row.delta > 0) {
      const slices = takeFifo(poolLots.get(pk) ?? [], row.delta, row.createdAt);
      const sk = `${row.tenantId}|${row.userId}|${row.feature}`;
      const arr = studentLots.get(sk) ?? [];
      for (const { lot, take } of slices) {
        arr.push({ ...lot, userId: row.userId, granted: take, remaining: take });
      }
      studentLots.set(sk, arr);
    } else if (row.reason === 'consume' && row.userId && row.delta < 0) {
      const sk = `${row.tenantId}|${row.userId}|${row.feature}`;
      takeFifo(studentLots.get(sk) ?? [], -row.delta, row.createdAt);
    }
  }

  // 2) 보정 — 풀 카운터(balance)와 lot 합 일치
  const adjustments: string[] = [];
  for (const pool of pools) {
    const pk = `${pool.tenantId}|${pool.feature}`;
    const lots = poolLots.get(pk) ?? [];
    const sum = lots.reduce((s, l) => s + l.remaining, 0);
    if (sum < pool.balance) {
      const diff = pool.balance - sum;
      lots.push({
        tenantId: pool.tenantId, userId: null, feature: pool.feature,
        granted: diff, remaining: diff,
        grantedAt: pool.createdAt, expiresAt: plusOneYear(pool.createdAt), refOrderId: null,
      });
      poolLots.set(pk, lots);
      adjustments.push(`풀 ${pk}: 원장 재생 ${sum} < 카운터 ${pool.balance} → 보정 lot +${diff} (지급일=${pool.createdAt.toISOString().slice(0, 10)})`);
    } else if (sum > pool.balance) {
      takeFifo(lots, sum - pool.balance, new Date(0)); // epoch 기준 → 전부 미만료 취급, 임박순 차감
      adjustments.push(`풀 ${pk}: 원장 재생 ${sum} > 카운터 ${pool.balance} → 임박분 -${sum - pool.balance}`);
    }
  }

  // 3) 보정 — 학생 카운터(allocated-used)와 lot 합 일치
  for (const lic of lics) {
    const sk = `${lic.tenantId}|${lic.userId}|${lic.feature}`;
    const lots = studentLots.get(sk) ?? [];
    const target = Math.max(0, lic.allocated - lic.used);
    const sum = lots.reduce((s, l) => s + l.remaining, 0);
    if (sum < target) {
      const diff = target - sum;
      lots.push({
        tenantId: lic.tenantId, userId: lic.userId, feature: lic.feature,
        granted: diff, remaining: diff,
        grantedAt: lic.createdAt, expiresAt: plusOneYear(lic.createdAt), refOrderId: null,
      });
      studentLots.set(sk, lots);
      adjustments.push(`학생 ${sk}: 재생 ${sum} < 잔여 ${target} → 보정 lot +${diff} (배정일=${lic.createdAt.toISOString().slice(0, 10)})`);
    } else if (sum > target) {
      takeFifo(lots, sum - target, new Date(0));
      adjustments.push(`학생 ${sk}: 재생 ${sum} > 잔여 ${target} → 임박분 -${sum - target}`);
    }
  }

  // 4) 잔량 있는 lot 만 적재 (소진된 lot 의 이력은 원장이 보유)
  const allLots = [...poolLots.values(), ...studentLots.values()].flat().filter((l) => l.remaining > 0);

  console.log('\n── 보정 내역 ──');
  if (adjustments.length === 0) console.log('(없음 — 원장 재생과 카운터 완전 일치)');
  adjustments.forEach((a) => console.log('  ' + a));

  console.log(`\n── 생성할 lot ${allLots.length}개 ──`);
  for (const l of allLots) {
    console.log(
      `  ${l.userId ? `학생 ${l.userId}` : '지점 풀'} | ${l.feature} | 잔량 ${l.remaining}/${l.granted}`
      + ` | 지급 ${l.grantedAt.toISOString().slice(0, 10)} → 만료 ${l.expiresAt.toISOString().slice(0, 10)}`
      + (l.expiresAt <= new Date() ? ' ⚠️ 이미 만료' : ''),
    );
  }

  if (!APPLY) {
    console.log('\n[dry-run] 변경 없음 — 적용하려면 --apply');
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (FORCE && existing > 0) {
      const del = await tx.entitlementCreditLot.deleteMany({});
      console.log(`기존 lot ${del.count}개 삭제 (--force)`);
    }
    if (allLots.length > 0) {
      await tx.entitlementCreditLot.createMany({
        data: allLots.map((l) => ({
          tenantId: l.tenantId, userId: l.userId, feature: l.feature,
          granted: l.granted, remaining: l.remaining,
          grantedAt: l.grantedAt, expiresAt: l.expiresAt, refOrderId: l.refOrderId,
        })),
      });
    }
  });
  console.log(`\n✅ lot ${allLots.length}개 생성 완료`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
