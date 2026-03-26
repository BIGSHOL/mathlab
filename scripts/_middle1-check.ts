import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const concepts = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true, title: true, grade: true, semester: true, fullContent: true, blanks: { select: { id: true } } },
    orderBy: { conceptCode: 'asc' },
  });
  console.log(`중1-1 개념: ${concepts.length}개\n`);
  for (const c of concepts) {
    const len = c.fullContent?.length || 0;
    const hasBlanks = c.blanks.length > 0;
    console.log(`${c.conceptCode} [${len}자] ${hasBlanks ? '✓빈칸' : '✗빈칸없음'} ${c.title}`);
  }
  const withContent = concepts.filter(c => (c.fullContent?.length || 0) > 50);
  const withBlanks = concepts.filter(c => c.blanks.length > 0);
  const noBlanks = concepts.filter(c => c.blanks.length === 0 && (c.fullContent?.length || 0) > 50);
  console.log(`\n콘텐츠 50자+: ${withContent.length}개 / 빈칸 있음: ${withBlanks.length}개 / 생성 대상: ${noBlanks.length}개`);
}
main().then(() => p.$disconnect());
