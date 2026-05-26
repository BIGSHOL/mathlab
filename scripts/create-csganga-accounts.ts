import { prisma } from '../src/lib/db';
import bcrypt from 'bcryptjs';

const TENANT_ID = 'cmnmo9luj0000vdgkt8e5xf9a'; // 침산점 (cs)
const ROLE = 'TEACHER' as const;

async function main() {
  const results: Array<{ username: string; password: string; status: string }> = [];

  for (let i = 1; i <= 10; i++) {
    const username = `csganga${String(i).padStart(2, '0')}`;
    const password = `${username}!`;

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const existing = await prisma.user.findUnique({ where: { username } });

      if (existing) {
        await prisma.user.update({
          where: { username },
          data: { passwordHash, name: username, role: ROLE, tenantId: TENANT_ID },
        });
        results.push({ username, password, status: `UPDATED (was: ${existing.name}/${existing.role})` });
      } else {
        await prisma.user.create({
          data: { username, passwordHash, name: username, role: ROLE, tenantId: TENANT_ID },
        });
        results.push({ username, password, status: 'CREATED' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ username, password, status: `ERROR: ${msg}` });
    }
  }

  console.log(`\n  [완료] 침산점(cs) TEACHER 계정 ${results.length}개 처리\n`);
  console.table(results);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
