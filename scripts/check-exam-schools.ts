import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const papers = await p.examPaper.findMany({
    where: { status: 'COMPLETED', schoolName: { not: null } },
    select: { schoolName: true },
    distinct: ['schoolName'],
    orderBy: { schoolName: 'asc' },
  });
  console.log(`기출 schoolName 목록 (${papers.length}개):`);
  for (const paper of papers) {
    // School 테이블에서 정확히 매칭되는지 확인
    const exact = await p.school.count({ where: { name: paper.schoolName! } });
    const contains = await p.school.count({ where: { name: { contains: paper.schoolName!, mode: 'insensitive' } } });
    const mark = exact > 0 ? 'O' : contains > 0 ? '~' : 'X';
    console.log(`  [${mark}] "${paper.schoolName}" → exact:${exact}, contains:${contains}`);
  }
  await p.$disconnect();
}
main();
