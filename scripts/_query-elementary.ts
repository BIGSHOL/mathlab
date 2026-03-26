import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { grade: true, semester: true, chapter: true, section: true, sortOrder: true, conceptCode: true, part: true, title: true },
    orderBy: [{ grade: 'asc' }, { semester: 'asc' }, { sortOrder: 'asc' }]
  });

  const chapterMap = new Map<string, any[]>();
  for (const c of concepts) {
    const key = `${c.grade}|${c.semester}|${c.chapter}`;
    if (!chapterMap.has(key)) chapterMap.set(key, []);
    chapterMap.get(key)!.push({ section: c.section, sortOrder: c.sortOrder, conceptCode: c.conceptCode, part: c.part, title: c.title });
  }

  for (const [key, items] of chapterMap) {
    console.log(`\n=== ${key} ===`);
    for (const item of items) {
      console.log(`  sortOrder=${item.sortOrder} code=${item.conceptCode} part=${item.part} section="${item.section}" title="${item.title}"`);
    }
  }
}

main().then(() => prisma.$disconnect());
