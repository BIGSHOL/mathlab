import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const noGps = await prisma.school.findMany({
    where: { latitude: null },
    select: { id: true, name: true, address: true, schoolType: true, regionName: true, district: true },
    orderBy: { name: 'asc' },
  });

  console.log(`GPS 없는 학교: ${noGps.length}개\n`);

  const withAddr = noGps.filter(s => s.address);
  const noAddr = noGps.filter(s => !s.address);

  if (withAddr.length > 0) {
    console.log(`=== 주소 있지만 Geocoding 실패 (${withAddr.length}개) ===`);
    withAddr.forEach(s => console.log(`${s.name} | ${s.address} | ${s.regionName}`));
  }

  if (noAddr.length > 0) {
    console.log(`\n=== 주소 없음 (${noAddr.length}개) ===`);
    noAddr.forEach(s => console.log(`${s.name} | ${s.schoolType} | ${s.regionName || '?'} ${s.district || ''}`));
  }

  await prisma.$disconnect();
}

main();
