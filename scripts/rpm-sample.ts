import { prisma } from '../src/lib/db';

const SAMPLES = [138, 151, 200, 415];

async function main() {
  const qs = await prisma.question.findMany({
    where: { questionNum: { in: SAMPLES }, source: { contains: 'RPM', mode: 'insensitive' } },
    select: { questionNum: true, content: true, answer: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });
  for (const q of qs) {
    console.log(`\n======== #${q.questionNum} ========`);
    console.log(`\n[문제]\n${q.content}`);
    console.log(`\n[정답] ${q.answer}`);
    console.log(`\n[현재 해설]\n${q.explanation}`);
  }
}
main().finally(() => prisma.$disconnect());
