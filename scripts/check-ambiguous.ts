import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const dong = await p.school.findMany({ where: { name: { contains: '동도중' } }, select: { name: true, district: true, regionName: true, city: true } });
  console.log('동도중:', JSON.stringify(dong, null, 2));
  const sam = await p.school.findMany({ where: { name: { contains: '삼육중' } }, select: { name: true, district: true, regionName: true, city: true } });
  console.log('삼육중:', JSON.stringify(sam, null, 2));
  await p.$disconnect();
}
main();
