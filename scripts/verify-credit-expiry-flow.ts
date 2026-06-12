/**
 * 크레딧 1년 만료 시스템 end-to-end 검증 (dev DB, 테스트 데이터 자체 정리).
 *
 * A. 백필 재생 검증 — 합성 레거시 원장(WORKSHEET) 시드 → backfill-credit-expiry.ts --apply →
 *    lot 분할/만료일 승계/카운터 일치 확인.
 * B. 런타임 흐름 검증 — grantCredits(만료일 기록·멱등) → 만료 lot 제외 잔액 → allocate(FIFO·승계)
 *    → consume(멱등·FIFO) → 만료분 사용 차단(403).
 *
 * 실행: npx tsx scripts/verify-credit-expiry-flow.ts
 */
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import {
  grantCredits, allocateToStudent, assertExamAnalysisCredit, consumeExamAnalysisCredit,
  getEntitlementOverview,
} from '../src/lib/entitlements/service';

const prisma = new PrismaClient();
const STUDENT = 'test-student-credit-expiry'; // StudentLicense.userId 는 FK 없음 → 가짜 id 사용 가능
let pass = 0, fail = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function cleanup(tenantId: string) {
  await prisma.entitlementCreditLot.deleteMany({ where: { tenantId, OR: [{ userId: STUDENT }, { userId: null, feature: { in: ['WORKSHEET', 'EXAM_ANALYSIS'] } }] } });
  await prisma.entitlementLedger.deleteMany({ where: { tenantId, OR: [{ userId: STUDENT }, { refOrderId: { startsWith: 'bk-test-' } }, { refOrderId: { startsWith: 'test-credit-exp-' } }, { refOrderId: { startsWith: 'examPaper:test-paper-' } }, { refOrderId: { startsWith: 'examPaper:bk-test-' } }] } });
  await prisma.studentLicense.deleteMany({ where: { tenantId, userId: STUDENT } });
  await prisma.tenantEntitlement.deleteMany({ where: { tenantId, feature: { in: ['WORKSHEET', 'EXAM_ANALYSIS'] } } });
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  if (!tenant) { console.error('테넌트 없음 — seed-accounts 먼저 실행'); process.exitCode = 1; return; }
  const T = tenant.id;

  // 사전 상태 확인 (풀이 이미 있으면 검증 수치가 달라지므로 중단)
  const pre = await prisma.tenantEntitlement.count({ where: { tenantId: T, feature: { in: ['WORKSHEET', 'EXAM_ANALYSIS'] } } });
  const preLots = await prisma.entitlementCreditLot.count();
  if (pre > 0 || preLots > 0) { console.error(`기존 풀(${pre})/lot(${preLots}) 존재 — 검증은 빈 상태에서만 실행`); process.exitCode = 1; return; }

  try {
    // ── A. 백필 재생 검증 ─────────────────────────────────────
    console.log('A. 백필 재생 (합성 레거시 원장: WORKSHEET)');
    const d = (s: string) => new Date(s);
    await prisma.entitlementLedger.createMany({
      data: [
        { tenantId: T, feature: 'WORKSHEET', delta: 10, reason: 'purchase', refOrderId: 'bk-test-1', createdAt: d('2025-01-10T00:00:00Z') },
        { tenantId: T, feature: 'WORKSHEET', delta: 5, reason: 'purchase', refOrderId: 'bk-test-2', createdAt: d('2026-03-01T00:00:00Z') },
        { tenantId: T, userId: STUDENT, feature: 'WORKSHEET', delta: 8, reason: 'allocate', createdAt: d('2026-04-01T00:00:00Z') },
        { tenantId: T, userId: STUDENT, feature: 'WORKSHEET', delta: -2, reason: 'consume', refOrderId: 'examPaper:bk-test-paper', createdAt: d('2026-05-01T00:00:00Z') },
      ],
    });
    await prisma.tenantEntitlement.create({ data: { tenantId: T, feature: 'WORKSHEET', balance: 7, totalPurchased: 15 } });
    await prisma.studentLicense.create({ data: { tenantId: T, userId: STUDENT, feature: 'WORKSHEET', allocated: 8, used: 2 } });

    execSync('npx tsx scripts/backfill-credit-expiry.ts --apply', { stdio: 'pipe', cwd: process.cwd() });

    const poolLots = await prisma.entitlementCreditLot.findMany({ where: { tenantId: T, feature: 'WORKSHEET', userId: null } });
    const stuLots = await prisma.entitlementCreditLot.findMany({ where: { tenantId: T, feature: 'WORKSHEET', userId: STUDENT }, orderBy: { expiresAt: 'asc' } });
    // 기대: 풀 = 2025-01-10 lot 잔량 7 (만료일 2026-01-10, 이미 만료). 2026-03-01 lot 은 배정으로 소진(잔량 0 → 미적재)
    check('풀 lot 1개 (잔량 7, 만료 2026-01-10)',
      poolLots.length === 1 && poolLots[0].remaining === 7 && poolLots[0].expiresAt.toISOString().startsWith('2026-01-10'),
      JSON.stringify(poolLots.map((l) => ({ r: l.remaining, e: l.expiresAt.toISOString().slice(0, 10) }))));
    // 기대: 배정 8 = 미만료(2027-03-01) 5 우선 + 만료분(2026-01-10) 3 / 소비 2 는 미만료분 우선 차감 → 3@2027 + 3@2026
    check('학생 lot = 3@2026-01-10(만료) + 3@2027-03-01(만료일 승계)',
      stuLots.length === 2 && stuLots[0].remaining === 3 && stuLots[0].expiresAt.toISOString().startsWith('2026-01-10')
        && stuLots[1].remaining === 3 && stuLots[1].expiresAt.toISOString().startsWith('2027-03-01'),
      JSON.stringify(stuLots.map((l) => ({ r: l.remaining, e: l.expiresAt.toISOString().slice(0, 10) }))));

    const ovA = await getEntitlementOverview(T);
    const wsPool = ovA.pools.find((p) => p.feature === 'WORKSHEET');
    check('풀 잔액 표시 = 0 (만료분 7 제외, 카운터는 7)', wsPool?.balance === 0, `balance=${wsPool?.balance}`);

    await cleanup(T); // A 데이터 정리 후 B 진행
    console.log('');

    // ── B. 런타임 흐름 검증 ───────────────────────────────────
    console.log('B. 런타임 흐름 (EXAM_ANALYSIS)');
    const g1 = await grantCredits(T, 'EXAM_ANALYSIS', 5, { refOrderId: 'test-credit-exp-1' });
    const expectExpiry = new Date(); expectExpiry.setFullYear(expectExpiry.getFullYear() + 1);
    check('지급 시 만료일 기록 (충전일 + 1년)',
      g1.applied && !!g1.expiresAt && Math.abs(new Date(g1.expiresAt).getTime() - expectExpiry.getTime()) < 60_000,
      `expiresAt=${g1.expiresAt}`);

    const g2 = await grantCredits(T, 'EXAM_ANALYSIS', 5, { refOrderId: 'test-credit-exp-1' });
    const lotCount = await prisma.entitlementCreditLot.count({ where: { tenantId: T, feature: 'EXAM_ANALYSIS' } });
    check('같은 주문 재시도 멱등 (lot 중복 생성 없음)', g2.applied === false && lotCount === 1, `applied=${g2.applied}, lots=${lotCount}`);

    // 만료된 충전분 시뮬레이션 (2년 전 충전 → 1년 전 만료)
    const past = new Date(); past.setFullYear(past.getFullYear() - 2);
    const pastExp = new Date(); pastExp.setFullYear(pastExp.getFullYear() - 1);
    await prisma.entitlementCreditLot.create({
      data: { tenantId: T, feature: 'EXAM_ANALYSIS', granted: 3, remaining: 3, grantedAt: past, expiresAt: pastExp, refOrderId: 'test-credit-exp-old' },
    });
    await prisma.tenantEntitlement.update({
      where: { tenantId_feature: { tenantId: T, feature: 'EXAM_ANALYSIS' } },
      data: { balance: { increment: 3 }, totalPurchased: { increment: 3 } },
    });

    const ovB = await getEntitlementOverview(T);
    const eaPool = ovB.pools.find((p) => p.feature === 'EXAM_ANALYSIS');
    check('잔액 표시 만료분 제외 (카운터 8 → 표시 5)', eaPool?.balance === 5, `balance=${eaPool?.balance}`);
    check('최근접 만료 예정 표시 (5개 · +1년)', eaPool?.nextExpiry?.qty === 5, `nextExpiry=${JSON.stringify(eaPool?.nextExpiry)}`);

    const al = await allocateToStudent(T, STUDENT, 'EXAM_ANALYSIS', 2);
    const sLot = await prisma.entitlementCreditLot.findFirst({ where: { tenantId: T, userId: STUDENT, feature: 'EXAM_ANALYSIS' } });
    check('배정 시 만료일 승계 + 풀 사용가능 3', al.poolBalance === 3 && sLot?.remaining === 2 && !!g1.expiresAt && sLot?.expiresAt.toISOString() === g1.expiresAt,
      `poolBalance=${al.poolBalance}, lot=${sLot?.remaining}@${sLot?.expiresAt.toISOString()}`);

    let insufficient = false;
    try { await allocateToStudent(T, STUDENT, 'EXAM_ANALYSIS', 4); } catch (e) { insufficient = (e as Error).message === 'INSUFFICIENT_POOL'; }
    check('만료분은 배정 불가 (사용가능 3 < 4 → INSUFFICIENT_POOL, 카운터는 6)', insufficient);

    const paperA = { id: 'test-paper-A', tenantId: T, studentId: STUDENT };
    check('잔여 있음 → 분석 게이트 통과', (await assertExamAnalysisCredit(paperA)) === null);

    await consumeExamAnalysisCredit(paperA);
    await consumeExamAnalysisCredit(paperA); // 같은 시험지 재분석 — 멱등
    const lic1 = await prisma.studentLicense.findUnique({ where: { tenantId_userId_feature: { tenantId: T, userId: STUDENT, feature: 'EXAM_ANALYSIS' } } });
    const sLot1 = await prisma.entitlementCreditLot.findFirst({ where: { id: sLot!.id } });
    check('차감 멱등 (재분석 중복 차감 없음: used=1, lot 잔량 1)', lic1?.used === 1 && sLot1?.remaining === 1, `used=${lic1?.used}, lot=${sLot1?.remaining}`);

    await consumeExamAnalysisCredit({ id: 'test-paper-B', tenantId: T, studentId: STUDENT });
    const gate0 = await assertExamAnalysisCredit({ id: 'test-paper-C', tenantId: T, studentId: STUDENT });
    check('잔여 0 → 분석 게이트 403', gate0 !== null && gate0.status === 403, `status=${gate0?.status}`);

    // 핵심: 만료된 학생 배정분은 카운터 잔여가 있어도 사용 불가
    await allocateToStudent(T, STUDENT, 'EXAM_ANALYSIS', 1);
    await prisma.entitlementCreditLot.updateMany({ where: { tenantId: T, userId: STUDENT, feature: 'EXAM_ANALYSIS', remaining: { gt: 0 } }, data: { expiresAt: pastExp } });
    const gateExp = await assertExamAnalysisCredit({ id: 'test-paper-D', tenantId: T, studentId: STUDENT });
    check('만료된 배정분 사용 차단 (카운터 잔여 1이어도 403)', gateExp !== null && gateExp.status === 403, `status=${gateExp?.status}`);

    console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
    if (fail > 0) process.exitCode = 1;
  } finally {
    await cleanup(T);
    console.log('테스트 데이터 정리 완료');
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
