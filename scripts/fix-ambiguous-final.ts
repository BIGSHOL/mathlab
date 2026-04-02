import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // 영남삼육 찾기
  const sam = await p.school.findMany({ where: { name: { contains: '영남삼육' } }, select: { id: true, name: true, district: true, regionName: true } });
  console.log('영남삼육:', JSON.stringify(sam, null, 2));

  // 삼육 전체 검색
  const all = await p.school.findMany({ where: { name: { contains: '삼육' } }, select: { id: true, name: true, district: true, regionName: true } });
  console.log('\n삼육 전체:', JSON.stringify(all, null, 2));

  // 동도중 매핑
  const dongdo = await p.school.findFirst({
    where: { name: '동도중학교', district: '수성구', regionName: { not: null } },
    select: { id: true, name: true },
  });
  if (dongdo) {
    const r = await p.examPaper.updateMany({
      where: { schoolName: '동도중', schoolId: null },
      data: { schoolId: dongdo.id },
    });
    console.log(`\n✅ 동도중 → ${dongdo.name}: ${r.count}건 매핑`);
  }

  await p.$disconnect();
}
main();
