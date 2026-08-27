/**
 * 파라엑스/PG 심사용 지점(slug=review) 데이터 시드 — 심사역이 전 기능을 돌려볼 수 있게 채운다.
 *
 * 실행:
 *   npx tsx scripts/seed-review-tenant.ts            # 미리보기 (기본, 쓰기 없음)
 *   npx tsx scripts/seed-review-tenant.ts --apply    # 실제 반영
 *   npx tsx scripts/seed-review-tenant.ts --clean    # 이 스크립트가 넣은 것만 원복 (미리보기)
 *   npx tsx scripts/seed-review-tenant.ts --clean --apply
 *
 * 넣는 것 (전부 고정 id/refOrderId → 몇 번 돌려도 중복 없음):
 *   1) 구독      pro/active (currentPeriodEnd=null) — AI 총평·주변학교 비교 해금
 *   2) 이용권    EXAM_ANALYSIS 크레딧 30회 (충전일+1년 만료 lot)
 *   3) 분석본    익명화 픽스처(src/lib/demo/demo-exams.json) 3건을 실제 DB 행으로
 *
 * ⚠️ 분석본은 /demo 공개 데모와 같은 익명화본이다 — 실존 학교명은 OO고/A고로 마스킹돼 있다.
 *    심사역에게 실제 학원 고객의 시험지를 노출하지 않기 위한 것이니 원본으로 바꾸지 말 것.
 * ⚠️ 원본 PDF 는 없다(fileUrls=''). 시드된 3건의 '재분석'은 동작하지 않는다 —
 *    심사역이 확인할 신규 업로드→분석 경로는 크레딧으로 정상 동작한다.
 */
import { prisma } from '../src/lib/db';
import { grantCredits } from '../src/lib/entitlements/service';
import fixtures from '../src/lib/demo/demo-exams.json';

const SLUG = 'review';
const CREDIT_QTY = 30;
const CREDIT_REF = 'seed-review-credits-v1'; // 멱등 키 — 바꾸면 추가 충전된다
const PLAN = 'pro';

const apply = process.argv.includes('--apply');
const clean = process.argv.includes('--clean');

/** 픽스처 id(demo-g1) → 심사 지점 행 id(review-g1). /demo 리터럴 라우트와 겹치지 않게 접두사 분리. */
const paperId = (fixtureId: string) => fixtureId.replace(/^demo-/, 'review-');

function log(action: string, detail: string) {
  console.log(`${apply ? '✔' : '·'} ${action.padEnd(12)} ${detail}`);
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG }, select: { id: true, name: true } });
  if (!tenant) throw new Error(`지점(slug=${SLUG})이 없습니다.`);

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, username: true, role: true },
  });
  const owner = users.find((u) => u.role === 'OWNER');
  const teacher = users.find((u) => u.role === 'TEACHER') ?? owner;
  if (!owner || !teacher) throw new Error('심사 지점에 OWNER/TEACHER 계정이 없습니다.');

  console.log(`\n지점: ${tenant.name} (${SLUG}) · OWNER=${owner.username} · 시험지 귀속=${teacher.username}`);
  console.log(apply ? '모드: 반영\n' : '모드: 미리보기 (--apply 로 실제 반영)\n');

  const ids = (fixtures as Array<{ id: string }>).map((f) => paperId(f.id));

  if (clean) {
    // 자식(분석·확장)은 FK cascade 로 함께 지워지지만, 명시적으로 지워 의도를 드러낸다.
    const papers = await prisma.examPaper.findMany({ where: { id: { in: ids } }, select: { id: true } });
    log('분석본 삭제', `${papers.length}건 ${papers.map((p) => p.id).join(', ') || '(없음)'}`);
    const lots = await prisma.entitlementCreditLot.count({ where: { tenantId: tenant.id, refOrderId: CREDIT_REF } });
    log('크레딧 회수', `lot ${lots}건 (${CREDIT_REF})`);
    log('구독 삭제', `${SLUG} → 구독 행 제거(free 로 복귀)`);
    if (!apply) return;

    await prisma.examPaper.deleteMany({ where: { id: { in: ids } } });
    await prisma.entitlementCreditLot.deleteMany({ where: { tenantId: tenant.id, refOrderId: CREDIT_REF } });
    await prisma.entitlementLedger.deleteMany({ where: { tenantId: tenant.id, refOrderId: CREDIT_REF } });
    await prisma.tenantEntitlement.deleteMany({ where: { tenantId: tenant.id, feature: 'EXAM_ANALYSIS' } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenant.id } });
    console.log('\n원복 완료.');
    return;
  }

  // ── 1) 구독 ──
  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenant.id } });
  log('구독', `${sub ? `${sub.plan}/${sub.status}` : '없음'} → ${PLAN}/active (만료 없음)`);
  if (apply) {
    await prisma.tenantSubscription.upsert({
      where: { tenantId: tenant.id },
      create: { tenantId: tenant.id, plan: PLAN, status: 'active', currentPeriodEnd: null },
      update: { plan: PLAN, status: 'active', currentPeriodEnd: null },
    });
  }

  // ── 2) 이용권 크레딧 ──
  const existingLot = await prisma.entitlementCreditLot.findFirst({
    where: { tenantId: tenant.id, refOrderId: CREDIT_REF },
    select: { granted: true, remaining: true },
  });
  log('이용권', existingLot
    ? `이미 충전됨 (${existingLot.remaining}/${existingLot.granted}회 잔여) — 건너뜀`
    : `EXAM_ANALYSIS ${CREDIT_QTY}회 충전 (충전일+1년 만료)`);
  if (apply && !existingLot) {
    const r = await grantCredits(tenant.id, 'EXAM_ANALYSIS', CREDIT_QTY, {
      refOrderId: CREDIT_REF,
      userId: owner.id,
    });
    console.log(`    → applied=${r.applied} expiresAt=${r.expiresAt}`);
  }

  // ── 3) 분석본 ──
  for (const f of fixtures as Array<Record<string, any>>) {
    const pid = paperId(f.id);
    const exists = await prisma.examPaper.findUnique({ where: { id: pid }, select: { id: true } });
    log('분석본', `${pid} — ${f.title} ${exists ? '(이미 있음, 덮어씀)' : '(신규)'}`);
    if (!apply) continue;

    const paperData = {
      tenantId: tenant.id,
      teacherId: teacher.id,
      title: f.title,
      subject: f.subject,
      grade: f.grade,
      category: f.category ?? null,
      examScope: f.examScope ?? undefined,
      schoolName: f.schoolName ?? null,
      schoolId: null,
      examType: f.examType ?? 'blank',
      fileUrls: '', // 원본 PDF 없음 — 시드된 건의 재분석은 불가(위 주석 참고)
      fileType: 'pdf',
      status: f.status,
      analysisStep: f.analysisStep ?? 4,
      createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
    };
    await prisma.examPaper.upsert({ where: { id: pid }, create: { id: pid, ...paperData }, update: paperData });

    // 분석·확장은 매번 새로 심는다(픽스처가 정본) — 고정 id 라 중복 누적 없음
    await prisma.examAnalysis.deleteMany({ where: { examPaperId: pid } });
    for (const a of f.analyses ?? []) {
      const aid = paperId(a.id);
      await prisma.examAnalysis.create({
        data: {
          id: aid,
          examPaperId: pid,
          questions: a.questions,
          summary: a.summary ?? undefined,
          modelVersion: a.modelVersion ?? null,
          totalQuestions: a.totalQuestions ?? null,
          totalPoints: a.totalPoints ?? null,
          earnedPoints: a.earnedPoints ?? null,
          analyzedAt: a.analyzedAt ? new Date(a.analyzedAt) : new Date(),
          analyzedBy: teacher.id,
        },
      });
      for (const e of a.extensions ?? []) {
        await prisma.examAnalysisExtension.create({
          data: {
            id: `${aid}-${e.agentType}`,
            analysisId: aid,
            agentType: e.agentType,
            result: e.result,
            lastRunBy: teacher.id,
            lastRunAt: a.analyzedAt ? new Date(a.analyzedAt) : new Date(),
          },
        });
      }
    }
  }

  console.log(apply ? '\n반영 완료.' : '\n미리보기입니다. 실제 반영하려면 --apply 를 붙이세요.');
}

main()
  .catch((e) => { console.error('실패:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
