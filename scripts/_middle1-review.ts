import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const concepts = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { conceptCode: true, title: true, fullContent: true, keywords: true, section: true, sectionSub: true, chapter: true },
    orderBy: { sortOrder: 'asc' },
  });

  let prevChapter = '';
  for (const c of concepts) {
    if (c.chapter !== prevChapter) {
      console.log(`\n${'#'.repeat(60)}`);
      console.log(`# [${c.chapter}]`);
      console.log(`${'#'.repeat(60)}`);
      prevChapter = c.chapter!;
    }
    const len = c.fullContent?.length || 0;
    const lines = (c.fullContent || '').split('\n').length;
    const hasParen = /\(\d+\)/.test(c.fullContent || '');
    const hasCircled = /[①②③④⑤]/.test(c.fullContent || '');
    const flags: string[] = [];
    if (!hasParen && !hasCircled) flags.push('구조없음');
    if (len < 250) flags.push(`${len}자`);
    const dollars = ((c.fullContent || '').match(/\$/g) || []).length;
    if (dollars % 2 !== 0) flags.push('$홀수');
    const tag = flags.length > 0 ? ` ⚠ ${flags.join(',')}` : '';

    console.log(`\n--- ${c.conceptCode} | ${c.title} [${len}자, ${lines}줄]${tag} ---`);
    console.log(`  ${c.section} / ${c.sectionSub}`);
    console.log(c.fullContent);
  }

  console.log(`\n\n=== 요약 ===`);
  console.log(`총: ${concepts.length}개`);
  const shorts = concepts.filter(c => (c.fullContent?.length || 0) < 250);
  console.log(`250자 미만: ${shorts.length}개`);
  shorts.forEach(c => console.log(`  ${c.conceptCode}: ${c.fullContent?.length}자`));
}
main().then(() => p.$disconnect());
