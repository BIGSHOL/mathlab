/**
 * 기출분석 게이팅 end-to-end 검증 (dev DB, 전용 테스트 테넌트 자체 정리).
 *
 * 구조(2026-06-12 결정): 분석 1건당 게이트는 정확히 하나만 적용 — AND 게이트 아님.
 *   - 학생 연결 시험지(studentId 있음, 크레딧 차감) → 학생 이용권 게이트만 (월 쿼터 면제)
 *   - 블랭크/템플릿(studentId 없음) → 플랜 월 쿼터만 (Gemini 비용 남용 가드)
 *   - 월 쿼터 카운트도 블랭크 분석만 집계 (크레딧 분석이 블랭크 한도를 잠식하지 않음)
 *
 * 시나리오:
 *   1. free 플랜 블랭크 — 쿼터 내(0/3) → 통과
 *   2. 블랭크 분석 3건 적재 → 4번째 블랭크 403 QUOTA_EXCEEDED
 *   3. 같은 상태에서 크레딧 0 학생 시험지 → 403 ENTITLEMENT_EXHAUSTED (쿼터 에러 아님 — 게이트 분리)
 *   4. 🎯 핵심 버그픽스: 일회성 크레딧 팩 충전 + 학생 배정 → 쿼터 소진 상태에서도 학생 시험지 통과
 *   5. 차감 1회 → 잔여 감소 / 재분석(이미 차감)은 통과 + 중복 차감 없음(멱등)
 *   6. 학생 분석은 월 쿼터 미집계 — 학생 분석 다수 적재해도 getMonthlyAnalysisCount 불변
 *   7. 블랭크 재분석 — 한도 소진 상태여도 자기 자신 제외(excludeExamPaperId)로 통과
 *   8. 유료 플랜 이월/추가팩 — basic(월 20) 활성 + 이번 달 학생 분석 21건 적재돼도
 *      크레딧이 남아 있으면 통과 (월 지급량 초과 사용 가능 = 이월 크레딧 + 추가 팩 시나리오)
 *
 * 실행: npx tsx scripts/verify-analysis-gates.ts
 */
import crypto from 'crypto';
import { prisma } from '../src/lib/db';
import { assertAnalysisGate, assertAnalysisQuota, getMonthlyAnalysisCount, getTenantPlan } from '../src/lib/billing/guard';
import { grantCredits, allocateToStudent, consumeExamAnalysisCredit } from '../src/lib/entitlements/service';

process.env.BETA_ALL_PRO = '0'; // 베타 floor 가 플랜 판정을 가리지 않게

const SLUG = 'test-analysis-gates';
const UPREFIX = 'test-anlgate-';
let pass = 0, fail = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

/** 게이트 결과 → { allowed, code } (NextResponse 403 파싱) */
async function gateResult(res: Awaited<ReturnType<typeof assertAnalysisGate>>) {
  if (res === null) return { allowed: true, code: null as string | null, status: null as number | null };
  const json = await res.json().catch(() => ({}));
  return { allowed: false, code: (json?.error?.code as string) ?? null, status: res.status };
}

async function studentLotRemaining(tenantId: string, userId: string) {
  const agg = await prisma.entitlementCreditLot.aggregate({
    where: { tenantId, userId, feature: 'EXAM_ANALYSIS', remaining: { gt: 0 }, expiresAt: { gt: new Date() } },
    _sum: { remaining: true },
  });
  return agg._sum.remaining ?? 0;
}

async function cleanup() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (tenant) {
    await prisma.examPaper.deleteMany({ where: { tenantId: tenant.id } }); // 분석은 cascade
  }
  await prisma.user.deleteMany({ where: { username: { startsWith: UPREFIX } } });
  // Tenant cascade 로 subscription/entitlement/lot/ledger/license 정리
  await prisma.tenant.deleteMany({ where: { slug: SLUG } });
}

async function main() {
  await cleanup(); // 이전 크래시 잔재 정리
  const tenant = await prisma.tenant.create({ data: { slug: SLUG, name: '분석 게이트 테스트 지점' } });
  const T = tenant.id;
  const teacher = await prisma.user.create({
    data: { username: `${UPREFIX}teacher`, passwordHash: 'x', name: '게이트 테스트 교사', role: 'TEACHER', tenantId: T },
  });
  const student = await prisma.user.create({
    data: { username: `${UPREFIX}student`, passwordHash: 'x', name: '게이트 테스트 학생', role: 'STUDENT', tenantId: T },
  });

  const makePaper = (i: number, studentId: string | null) => prisma.examPaper.create({
    data: {
      id: `test-anlgate-paper-${i}`, tenantId: T, teacherId: teacher.id, studentId,
      title: `게이트 테스트 ${i}`, grade: '중1', fileUrls: '/test.pdf', fileType: 'pdf', status: 'COMPLETED',
    },
  });
  const addAnalysis = (examPaperId: string) => prisma.examAnalysis.create({
    data: { examPaperId, questions: [] },
  });

  try {
    console.log('1. free 플랜 블랭크 — 쿼터 내 → 통과');
    check('구독 행 없음 → getTenantPlan=free', (await getTenantPlan(T)) === 'free', `plan=${await getTenantPlan(T)}`);
    const blank1 = await makePaper(1, null);
    const r1 = await gateResult(await assertAnalysisGate(blank1, T));
    check('블랭크 0/3 → 게이트 통과', r1.allowed, `code=${r1.code}`);

    console.log('\n2. 블랭크 한도 소진 → QUOTA_EXCEEDED');
    const blank2 = await makePaper(2, null);
    const blank3 = await makePaper(3, null);
    for (const p of [blank1, blank2, blank3]) await addAnalysis(p.id);
    check('이번 달 쿼터 사용량 = 3 (블랭크만 집계)', (await getMonthlyAnalysisCount(T)) === 3,
      `count=${await getMonthlyAnalysisCount(T)}`);
    const blank4 = await makePaper(4, null);
    const r2 = await gateResult(await assertAnalysisGate(blank4, T));
    check('4번째 블랭크 → 403 QUOTA_EXCEEDED', !r2.allowed && r2.code === 'QUOTA_EXCEEDED',
      `allowed=${r2.allowed}, code=${r2.code}`);

    console.log('\n3. 크레딧 0 학생 시험지 — 쿼터 에러가 아니라 크레딧 에러 (게이트 분리)');
    const sp1 = await makePaper(101, student.id);
    const r3 = await gateResult(await assertAnalysisGate(sp1, T));
    check('학생 시험지(크레딧 0) → 403 ENTITLEMENT_EXHAUSTED', !r3.allowed && r3.code === 'ENTITLEMENT_EXHAUSTED',
      `allowed=${r3.allowed}, code=${r3.code}`);

    console.log('\n4. 🎯 핵심: 쿼터 소진 + 일회성 크레딧 팩 → 학생 분석 통과 (쿼터가 유료 크레딧을 막지 않음)');
    const granted = await grantCredits(T, 'EXAM_ANALYSIS', 10, { refOrderId: `test-anlgate-${crypto.randomUUID()}` });
    check('크레딧 팩 10 충전', granted.applied === true && granted.balance === 10, JSON.stringify(granted));
    await allocateToStudent(T, student.id, 'EXAM_ANALYSIS', 3);
    check('학생 배정 3 (lot 잔여)', (await studentLotRemaining(T, student.id)) === 3,
      `remaining=${await studentLotRemaining(T, student.id)}`);
    const r4 = await gateResult(await assertAnalysisGate(sp1, T));
    check('월 쿼터 3/3 소진 상태에서도 학생 시험지 통과', r4.allowed, `code=${r4.code}`);

    console.log('\n5. 차감 + 재분석 멱등');
    await consumeExamAnalysisCredit(sp1);
    check('차감 후 lot 잔여 2', (await studentLotRemaining(T, student.id)) === 2,
      `remaining=${await studentLotRemaining(T, student.id)}`);
    const r5 = await gateResult(await assertAnalysisGate(sp1, T));
    check('재분석(이미 차감) → 통과', r5.allowed, `code=${r5.code}`);
    await consumeExamAnalysisCredit(sp1); // 같은 시험지 재차감 시도
    check('재차감 없음 (refOrderId 멱등)', (await studentLotRemaining(T, student.id)) === 2,
      `remaining=${await studentLotRemaining(T, student.id)}`);

    console.log('\n6. 학생 분석은 월 쿼터 미집계');
    await addAnalysis(sp1.id);
    check('학생 분석 적재 후에도 쿼터 사용량 = 3 유지', (await getMonthlyAnalysisCount(T)) === 3,
      `count=${await getMonthlyAnalysisCount(T)}`);

    console.log('\n7. 블랭크 재분석 — 자기 자신 제외로 한도에서도 통과');
    const r7 = await gateResult(await assertAnalysisGate(blank3, T)); // blank3 는 이미 분석 보유
    check('분석 보유 블랭크 재분석 → 통과 (excludeExamPaperId)', r7.allowed, `code=${r7.code}`);
    const r7b = await assertAnalysisQuota(T, blank3.id);
    check('assertAnalysisQuota 단독 호출도 동일 (2/3)', r7b === null);

    console.log('\n8. 유료 플랜 이월/추가팩 — 월 지급량(20) 초과 학생 분석도 크레딧 있으면 통과');
    await prisma.tenantSubscription.upsert({
      where: { tenantId: T },
      create: { tenantId: T, plan: 'basic', status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 86400_000) },
      update: { plan: 'basic', status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 86400_000) },
    });
    check('getTenantPlan=basic', (await getTenantPlan(T)) === 'basic', `plan=${await getTenantPlan(T)}`);
    // 이번 달 학생 분석 21건 적재 (basic 월 쿼터 20 초과 상황 재현)
    const ids = Array.from({ length: 21 }, (_, i) => `test-anlgate-bulk-${i}`);
    await prisma.examPaper.createMany({
      data: ids.map((id, i) => ({
        id, tenantId: T, teacherId: teacher.id, studentId: student.id,
        title: `대량 학생 분석 ${i}`, grade: '중1', fileUrls: '/test.pdf', fileType: 'pdf', status: 'COMPLETED' as const,
      })),
    });
    await prisma.examAnalysis.createMany({ data: ids.map((id) => ({ examPaperId: id, questions: [] })) });
    check('학생 분석 21건 적재 후에도 쿼터 사용량 = 3 (블랭크만)', (await getMonthlyAnalysisCount(T)) === 3,
      `count=${await getMonthlyAnalysisCount(T)}`);
    const sp2 = await makePaper(102, student.id);
    const r8 = await gateResult(await assertAnalysisGate(sp2, T));
    check('월 지급량 초과 상태에서도 크레딧 잔여(2) → 학생 분석 통과', r8.allowed, `code=${r8.code}`);
    // 블랭크는 basic 쿼터(20)로 다시 여유 → 통과 (쿼터는 플랜 따라 동작 유지)
    const r8b = await gateResult(await assertAnalysisGate(blank4, T));
    check('basic 승격 후 블랭크 3/20 → 통과', r8b.allowed, `code=${r8b.code}`);

    console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
    if (fail > 0) process.exitCode = 1;
  } finally {
    await cleanup();
    console.log('테스트 데이터 정리 완료');
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
