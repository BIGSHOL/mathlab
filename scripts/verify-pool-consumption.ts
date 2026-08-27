/**
 * 지점 풀 직접 차감 모델 검증 (dev DB, 전용 테스트 테넌트 자체 정리).
 *
 * 설계(2026-06-17): 분석 주체는 지점 선생님. 모든 분석이 지점 풀(userId=null)에서 FIFO 1 차감 —
 * 학생 연결 여부 무관, 학생별 배정 불필요. 풀이 비면 무료 월 한도(free=3)로 폴백(ledger reason='quota' 집계).
 *
 * 실행: npx tsx scripts/verify-pool-consumption.ts
 */
import { prisma } from '../src/lib/db';
import { grantCredits, consumeExamAnalysisCredit, poolUsableBalance } from '../src/lib/entitlements/service';
import { assertAnalysisGate, getMonthlyQuotaUsed } from '../src/lib/billing/guard';

const SLUG = 'test-pool-consumption';
let pass = 0, fail = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

type Paper = { id: string; tenantId: string; studentId: string | null };
async function gate(p: Paper): Promise<{ allowed: boolean; code: string | null }> {
  const res = await assertAnalysisGate(p, p.tenantId);
  if (res === null) return { allowed: true, code: null };
  const json = await res.json().catch(() => ({} as Record<string, unknown>));
  return { allowed: false, code: ((json as { error?: { code?: string } })?.error?.code) ?? null };
}

async function cleanup() {
  await prisma.tenant.deleteMany({ where: { slug: SLUG } }); // cascade: lot/ledger/entitlement
}

async function main() {
  await cleanup();
  const t = await prisma.tenant.create({ data: { slug: SLUG, name: '풀소비 테스트 지점' } });
  const T = t.id;
  const paper = (id: string, studentId: string | null = null): Paper => ({ id: `pool-test-${id}`, tenantId: T, studentId });

  try {
    // ── 1. 풀 충전 ──
    await grantCredits(T, 'EXAM_ANALYSIS', 5, { refOrderId: 'pool-test-grant-1' });
    check('풀 잔액 5 (1년 충전)', (await poolUsableBalance(T)) === 5, `bal=${await poolUsableBalance(T)}`);

    // ── 2. 블랭크 분석(학생 없음)도 풀에서 차감 ──
    const g1 = await gate(paper('A'));
    check('블랭크 분석 게이트 통과 (풀 있음)', g1.allowed, JSON.stringify(g1));
    await consumeExamAnalysisCredit(paper('A'));
    check('풀에서 1 차감 → 잔액 4', (await poolUsableBalance(T)) === 4, `bal=${await poolUsableBalance(T)}`);
    check('무료 쿼터 사용 0 (풀 차감은 quota 미집계)', (await getMonthlyQuotaUsed(T)) === 0, `q=${await getMonthlyQuotaUsed(T)}`);

    // ── 3. 학생 연결 분석도 동일하게 풀에서 차감 (배정 불필요) ──
    await consumeExamAnalysisCredit(paper('B', 'student-x'));
    check('학생 연결 분석도 풀에서 차감 → 잔액 3', (await poolUsableBalance(T)) === 3, `bal=${await poolUsableBalance(T)}`);

    // ── 4. 재분석 멱등 ──
    await consumeExamAnalysisCredit(paper('A'));
    check('재분석 멱등 — 중복 차감 없음(잔액 3 유지)', (await poolUsableBalance(T)) === 3, `bal=${await poolUsableBalance(T)}`);
    check('재분석 게이트 통과 (이미 차감)', (await gate(paper('A'))).allowed);

    // ── 5. 풀 소진 → 무료 월 한도(free=3) 폴백 ──
    await consumeExamAnalysisCredit(paper('C'));
    await consumeExamAnalysisCredit(paper('D'));
    await consumeExamAnalysisCredit(paper('E'));
    check('풀 소진 → 잔액 0', (await poolUsableBalance(T)) === 0, `bal=${await poolUsableBalance(T)}`);

    const gq1 = await gate(paper('Q1'));
    check('풀 0 · 무료한도 내 → 통과', gq1.allowed, JSON.stringify(gq1));
    await consumeExamAnalysisCredit(paper('Q1'));
    await consumeExamAnalysisCredit(paper('Q2'));
    await consumeExamAnalysisCredit(paper('Q3'));
    check('무료 쿼터 3 사용 (ledger quota 집계)', (await getMonthlyQuotaUsed(T)) === 3, `q=${await getMonthlyQuotaUsed(T)}`);
    const gq4 = await gate(paper('Q4'));
    check('무료한도(3) 초과 → 403 QUOTA_EXCEEDED', !gq4.allowed && gq4.code === 'QUOTA_EXCEEDED', JSON.stringify(gq4));

    // ── 6. 풀 재충전 → 한도 초과여도 풀 우선 통과 ──
    await grantCredits(T, 'EXAM_ANALYSIS', 2, { refOrderId: 'pool-test-grant-2' });
    check('풀 재충전 후 통과 (풀 우선, 무료한도 초과 무관)', (await gate(paper('Q4'))).allowed);

    console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
    if (fail > 0) process.exitCode = 1;
  } finally {
    await cleanup();
    console.log('테스트 데이터 정리 완료');
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
