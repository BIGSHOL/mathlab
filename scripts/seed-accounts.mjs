import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Tenant 생성
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'csganga' },
    update: {},
    create: { slug: 'csganga', name: '씨에스강아학원' },
  });
  console.log('✅ Tenant:', tenant.slug, tenant.id);

  // 2. SUPER_ADMIN
  await prisma.user.upsert({
    where: { username: 'st2000423' },
    update: {},
    create: {
      username: 'st2000423',
      name: '슈퍼관리자',
      passwordHash: await bcrypt.hash('qkrthtjs1234@', 10),
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✅ SUPER_ADMIN: st2000423');

  // 3. OWNER (지점장) — csganga 테넌트 소속
  await prisma.user.upsert({
    where: { username: 'injaewon' },
    update: {},
    create: {
      username: 'injaewon',
      name: '인재원',
      passwordHash: await bcrypt.hash('mbplaza2*', 10),
      role: 'OWNER',
      tenantId: tenant.id,
    },
  });
  console.log('✅ OWNER: injaewon');

  // 4. TEACHER x10 — csganga 테넌트 소속
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, '0');
    const username = `csganga${num}`;
    const password = `csganga${num}!`;
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        username,
        name: `강사${num}`,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'TEACHER',
        tenantId: tenant.id,
      },
    });
    console.log(`✅ TEACHER: ${username} / ${password}`);
  }

  console.log('\n🎉 계정 생성 완료');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
