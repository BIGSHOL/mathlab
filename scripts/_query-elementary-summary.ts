import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { grade: true, semester: true, chapter: true, section: true },
    orderBy: [{ grade: 'asc' }, { semester: 'asc' }, { chapter: 'asc' }, { section: 'asc' }],
  });

  // Group by grade+semester+chapter
  const groups: Record<string, Record<string, number>> = {};
  for (const c of concepts) {
    const key = `${c.grade} | ${c.semester}학기`;
    if (!groups[key]) groups[key] = {};
    const ch = c.chapter || '(없음)';
    groups[key][ch] = (groups[key][ch] || 0) + 1;
  }

  console.log(`\n=== 초등 개념 요약 (총 ${concepts.length}개) ===\n`);
  for (const [key, chapters] of Object.entries(groups)) {
    const total = Object.values(chapters).reduce((a, b) => a + b, 0);
    console.log(`\n[${key}] — ${total}개`);
    for (const [ch, cnt] of Object.entries(chapters)) {
      console.log(`  ${ch}: ${cnt}개`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
