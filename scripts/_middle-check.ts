import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const total = await p.concept.count({ where: { grade: { startsWith: 'middle_' } } });
  const withBlanks = await p.concept.count({ where: { grade: { startsWith: 'middle_' }, blanks: { some: {} } } });
  console.log(`중등 개념: ${total}개 / 빈칸 있음: ${withBlanks}개`);

  const byGrade = await p.concept.groupBy({ by: ['grade'], where: { grade: { startsWith: 'middle_' } }, _count: true, orderBy: { grade: 'asc' } });
  for (const g of byGrade) console.log(`  ${g.grade}: ${g._count}개`);

  const noBlanks = await p.concept.findMany({
    where: { grade: { startsWith: 'middle_' }, blanks: { none: {} } },
    select: { conceptCode: true, title: true, grade: true, fullContent: true },
    take: 5,
    orderBy: { grade: 'asc' },
  });
  console.log(`\n빈칸 없는 중등 개념 샘플:`);
  for (const c of noBlanks) {
    const hasContent = c.fullContent && c.fullContent.length > 20;
    console.log(`  ${c.grade} ${c.conceptCode} [${hasContent ? c.fullContent!.length + '자' : '콘텐츠 없음'}] ${c.title}`);
  }
}
main().then(() => p.$disconnect());
