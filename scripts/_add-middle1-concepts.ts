import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // 기존 FUNC 개념 확인
  const existing = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1, part: 'func' },
    select: { conceptCode: true, title: true, section: true, sectionSub: true, sortOrder: true, subjectId: true },
    orderBy: { conceptCode: 'asc' },
  });
  console.log('기존 FUNC 개념:');
  for (const x of existing) console.log(` ${x.conceptCode} [sort:${x.sortOrder}] ${x.section} / ${x.sectionSub} — ${x.title} (subjectId: ${x.subjectId})`);

  // 전체 중1-1 sortOrder 확인
  const all = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { conceptCode: true, sortOrder: true, title: true },
    orderBy: { sortOrder: 'asc' },
  });
  console.log('\n전체 중1-1 sortOrder:');
  for (const x of all) console.log(` ${x.conceptCode} [sort:${x.sortOrder}] ${x.title}`);
}
main().then(() => p.$disconnect());
