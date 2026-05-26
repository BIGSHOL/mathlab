import { prisma } from '../src/lib/db';
import bcrypt from 'bcryptjs';

const TENANT_ID = 'cmnmo9luj0000vdgkt8e5xf9a'; // 침산점 (cs)
const USERNAME = 'injaewon';
const PASSWORD = 'mbplaza2*';
const NAME = '인재원 관리자';
const ROLE = 'OWNER' as const;

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { username: USERNAME } });

  if (existing) {
    await prisma.user.update({
      where: { username: USERNAME },
      data: { passwordHash, name: NAME, role: ROLE, tenantId: TENANT_ID },
    });
    console.log(`UPDATED: ${USERNAME} (was: ${existing.name}/${existing.role})`);
  } else {
    await prisma.user.create({
      data: { username: USERNAME, passwordHash, name: NAME, role: ROLE, tenantId: TENANT_ID },
    });
    console.log(`CREATED: ${USERNAME} / ${PASSWORD} / ${ROLE} / 침산점`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
