const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const e5 = await prisma.concept.findMany({
    where: { grade: 'elementary_5' },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, conceptCode: true, title: true, fullContent: true, category: true, part: true, sortOrder: true,
              subject: { select: { title: true } } }
  });
  console.log('초5 개념 총:', e5.length);
  e5.forEach(c => {
    console.log('\n[' + c.sortOrder + '] ' + c.conceptCode + ' | ' + c.category + ' | ' + c.part + ' | ' + c.title);
    console.log('  ' + c.fullContent);
  });
}

main().finally(() => prisma.$disconnect());
