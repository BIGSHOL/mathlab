import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.school.count();
  const hasGps = await prisma.school.count({ where: { latitude: { not: null } } });
  const hasAddr = await prisma.school.count({ where: { address: { not: null } } });

  console.log(`총 학교: ${total} | GPS 있음: ${hasGps} | 주소 있음: ${hasAddr}`);

  const sample = await prisma.school.findFirst({
    where: { address: { not: null } },
    select: { name: true, address: true, latitude: true, longitude: true },
  });
  console.log('샘플:', JSON.stringify(sample, null, 2));

  await prisma.$disconnect();
}

main();
