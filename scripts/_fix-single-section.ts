import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const concepts = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true, title: true, fullContent: true },
    orderBy: { conceptCode: 'asc' },
  });

  let fixCount = 0;
  for (const c of concepts) {
    if (!c.fullContent) continue;
    const re = /^\(\d+\)/gm;
    const matches = [...c.fullContent.matchAll(re)];

    // (1)만 단독으로 있는 경우 → (1) 제거
    if (matches.length === 1) {
      const fixed = c.fullContent.replace(/^\(1\) /m, '');
      if (fixed !== c.fullContent) {
        await p.concept.update({ where: { id: c.id }, data: { fullContent: fixed } });
        fixCount++;
        console.log(`  ${c.conceptCode}: (1) 제거`);
      }
    }
  }
  console.log(`\n수정: ${fixCount}개`);
}
main().then(() => p.$disconnect());
