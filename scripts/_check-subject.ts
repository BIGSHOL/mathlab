import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const results = await p.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { grade: true, subjectId: true, semester: true },
    distinct: ['subjectId'],
  });
  for (const r of results) console.log(`grade=${r.grade} semester=${r.semester} subjectId=${r.subjectId}`);
  
  // Also check Subject table for elementary
  const subjects = await p.subject.findMany({
    where: { OR: [{ name: { contains: '초등' } }, { name: { contains: 'elementary' } }, { name: { contains: '수학' } }] },
    select: { id: true, name: true },
  });
  console.log('\nSubjects:');
  for (const s of subjects) console.log(`  id=${s.id} name=${s.name}`);
}
main().then(() => p.$disconnect());
