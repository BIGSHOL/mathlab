/**
 * 지점(Tenant) 구독 플랜 수동 배정.
 *
 * 사용법:
 *   node --env-file=.env.local scripts/set-tenant-plan.mjs <username|--slug=xxx> [plan]
 *   node --env-file=.env.local scripts/set-tenant-plan.mjs injaewon pro
 *   node --env-file=.env.local scripts/set-tenant-plan.mjs --slug=csganga enterprise
 *
 * plan: free | pro | enterprise (기본 pro)
 * - 유료 플랜: status=active, currentPeriodEnd=null(만료 없음) — 결제 허브 구독과 별개의 수동 배정
 * - free: status=inactive
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID = new Set(['free', 'pro', 'enterprise']);

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];
  const plan = (args[1] || 'pro').toLowerCase();

  if (!target) {
    console.error('사용법: node --env-file=.env.local scripts/set-tenant-plan.mjs <username|--slug=xxx> [plan]');
    process.exit(1);
  }
  if (!VALID.has(plan)) {
    console.error(`유효하지 않은 플랜: ${plan} (free|pro|enterprise)`);
    process.exit(1);
  }

  // 대상 tenantId 해소: --slug=xxx 면 슬러그로, 아니면 username(OWNER 등)으로
  let tenantId = null;
  let label = target;
  if (target.startsWith('--slug=')) {
    const slug = target.slice('--slug='.length);
    const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!tenant) { console.error(`slug=${slug} 지점 없음`); process.exit(1); }
    tenantId = tenant.id;
    label = `${tenant.name}(${slug})`;
  } else {
    const user = await prisma.user.findUnique({ where: { username: target }, select: { tenantId: true, name: true } });
    if (!user) { console.error(`사용자 ${target} 없음`); process.exit(1); }
    if (!user.tenantId) { console.error(`사용자 ${target}은(는) 소속 지점이 없습니다(SUPER_ADMIN?)`); process.exit(1); }
    tenantId = user.tenantId;
    label = `${user.name}(${target})`;
  }

  const isFree = plan === 'free';
  const sub = await prisma.tenantSubscription.upsert({
    where: { tenantId },
    create: { tenantId, plan, status: isFree ? 'inactive' : 'active', currentPeriodEnd: null },
    update: { plan, status: isFree ? 'inactive' : 'active', currentPeriodEnd: null },
  });

  console.log(`✅ ${label} → 지점 ${tenantId} 구독 플랜 = ${sub.plan} (status: ${sub.status})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
