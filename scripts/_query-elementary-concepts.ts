import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const concepts = await prisma.concept.findMany({
    where: {
      grade: { startsWith: 'elementary_' },
    },
    select: {
      id: true,
      title: true,
      grade: true,
      semester: true,
      chapter: true,
      section: true,
      sectionSub: true,
      fullContent: true,
    },
    orderBy: [
      { grade: 'asc' },
      { semester: 'asc' },
      { chapter: 'asc' },
      { section: 'asc' },
    ],
  });

  console.log(`\n총 초등 개념 수: ${concepts.length}\n`);
  console.log('='.repeat(120));

  for (const c of concepts) {
    const contentPreview = c.fullContent ? c.fullContent.substring(0, 100).replace(/\n/g, '\\n') : '(없음)';
    console.log(`ID: ${c.id}`);
    console.log(`  title: ${c.title}`);
    console.log(`  grade: ${c.grade} | semester: ${c.semester} | chapter: ${c.chapter}`);
    console.log(`  section: ${c.section} | sectionSub: ${c.sectionSub}`);
    console.log(`  content(100자): ${contentPreview}`);
    console.log('-'.repeat(120));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
