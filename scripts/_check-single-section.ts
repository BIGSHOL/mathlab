import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const concepts = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { conceptCode: true, title: true, fullContent: true },
    orderBy: { conceptCode: 'asc' },
  });
  for (const c of concepts) {
    if (!c.fullContent) continue;
    const re = /^\(\d+\)/gm;
    const matches = [...c.fullContent.matchAll(re)];
    if (matches.length === 1) {
      console.log(`${c.conceptCode} ${c.title} → (1)만 있음`);
    } else if (matches.length === 0) {
      console.log(`${c.conceptCode} ${c.title} → (N) 없음`);
    }
  }
  console.log('\n전체:', concepts.length, '개');
}
main().then(() => p.$disconnect());
