import { prisma } from '../src/lib/db';
(async () => {
  const qs = await prisma.question.findMany({ where: { bookCode: '1-1', explanation: { contains: '전략' } }, take: 5, select: { questionNum: true, explanation: true } });
  qs.forEach(q => { console.log('===', q.questionNum, '==='); console.log(q.explanation?.slice(0, 400)); console.log(); });
  await prisma.$disconnect();
})();
