import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const concepts = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true, fullContent: true },
  });

  let fixCount = 0;
  for (const c of concepts) {
    if (!c.fullContent) continue;
    // \frac → \dfrac (display-style fraction, 인라인에서도 큰 분수)
    if (c.fullContent.includes('\\frac')) {
      const fixed = c.fullContent.replace(/\\frac\{/g, '\\dfrac{');
      await p.concept.update({ where: { id: c.id }, data: { fullContent: fixed } });
      fixCount++;
      const count = (c.fullContent.match(/\\frac\{/g) || []).length;
      console.log(`  ${c.conceptCode}: \\frac → \\dfrac (${count}개)`);
    }
  }

  console.log(`\n수정: ${fixCount}개 개념`);

  // 초등도 확인
  const elemCount = await p.concept.count({
    where: { grade: { startsWith: 'elementary_' }, fullContent: { contains: '\\frac' } },
  });
  console.log(`\n참고: 초등 \\frac 사용 개념: ${elemCount}개`);
}
main().then(() => p.$disconnect());
