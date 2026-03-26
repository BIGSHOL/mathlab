import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const concepts = await p.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { 
      conceptCode: true, title: true, 
      chapter: true, section: true, sectionSub: true,
      part: true, fullContent: true 
    },
    orderBy: { conceptCode: 'asc' },
  });
  
  console.log(`중1-1 개념 ${concepts.length}개 교육과정 배정 현황:\n`);
  console.log('코드         | 영역   | 대단원(chapter)              | 중단원(section)              | 소단원(sectionSub)           | 콘텐츠 | 제목');
  console.log('-'.repeat(160));
  for (const c of concepts) {
    const len = c.fullContent?.length || 0;
    console.log(
      `${(c.conceptCode||'').padEnd(12)} | ${(c.part||'-').padEnd(6)} | ${(c.chapter||'-').padEnd(28)} | ${(c.section||'-').padEnd(28)} | ${(c.sectionSub||'-').padEnd(28)} | ${String(len).padStart(4)}자 | ${c.title}`
    );
  }
}
main().then(() => p.$disconnect());
