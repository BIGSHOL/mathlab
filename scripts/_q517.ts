import { prisma } from '../src/lib/db';
(async () => {
  const q = await prisma.question.findFirst({ where: { questionNum: 517 }, select: { id: true, questionNum: true, bookCode: true, chapter: true, section: true, content: true, choices: true, answer: true, explanation: true } });
  console.log(JSON.stringify(q, null, 2));
  await prisma.$disconnect();
})();
