import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const codes = ['E3-NUM-05', 'E3-NUM-01', 'E5-ALG-01', 'E3-NUM-05-1', 'M1-NUM-04', 'M1-NUM-04-1'];
  for (const code of codes) {
    const c = await p.concept.findUnique({ where: { conceptCode: code }, select: { conceptCode: true, title: true } });
    console.log(code, c ? 'FOUND: '+c.title : 'NOT FOUND');
  }
  const like = await p.concept.findMany({ where: { conceptCode: { startsWith: 'E3-NUM-05' } }, select: { conceptCode: true, title: true } });
  console.log('\nE3-NUM-05*:', like.map(c => c.conceptCode).join(', '));
  const m1 = await p.concept.findMany({ where: { conceptCode: { startsWith: 'M1-NUM-04' } }, select: { conceptCode: true } });
  console.log('M1-NUM-04*:', m1.map(c => c.conceptCode).join(', '));
}
main().then(() => p.$disconnect());
