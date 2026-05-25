/**
 * injaewon, csganga01~csganga10 사용자 존재 확인
 * 사용법: npx tsx scripts/check-users-injaewon-csganga.ts
 */
import { prisma } from '../src/lib/db';

async function main() {
  const usernames = ['injaewon', ...Array.from({ length: 10 }, (_, i) => `csganga${String(i + 1).padStart(2, '0')}`)];
  // padStart 안 한 변형도 함께 조회 (csganga1, csganga2 ... csganga10)
  const altUsernames = ['injaewon', ...Array.from({ length: 10 }, (_, i) => `csganga${i + 1}`)];
  const allCandidates = Array.from(new Set([...usernames, ...altUsernames]));

  const users = await prisma.user.findMany({
    where: { username: { in: allCandidates } },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      tenantId: true,
      deletedAt: true,
      classroom: { select: { name: true } },
      tenant: { select: { name: true } },
    },
    orderBy: { username: 'asc' },
  });

  console.log(`\n[조회 대상] ${allCandidates.length}개 username`);
  console.log(`[DB 발견]   ${users.length}명\n`);

  const found = new Set(users.map((u) => u.username));
  const missing = allCandidates.filter((u) => !found.has(u));

  console.log('=== 존재하는 사용자 ===');
  for (const u of users) {
    const deleted = u.deletedAt ? ' [DELETED]' : '';
    console.log(
      `  ${u.username.padEnd(15)} | ${u.role.padEnd(11)} | tenant=${u.tenant?.name ?? '없음'} | class=${u.classroom?.name ?? '없음'} | name=${u.name}${deleted}`,
    );
  }

  if (missing.length > 0) {
    console.log('\n=== 없는 사용자 ===');
    for (const u of missing) console.log(`  ${u}`);
  }

  // injaewon은 어떤 역할? 기출분석 권한 추가 확인
  const injaewon = users.find((u) => u.username === 'injaewon');
  if (injaewon && injaewon.role !== 'STUDENT' && injaewon.tenantId) {
    const examLic = await prisma.tenantLicense.findFirst({
      where: { tenantId: injaewon.tenantId, feature: 'EXAM_ANALYSIS' },
      select: { isActive: true, maxSeats: true, usedSeats: true, expiresAt: true },
    });
    console.log('\n=== injaewon 지점의 EXAM_ANALYSIS 이용권 ===');
    console.log(examLic ?? '  (없음)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
