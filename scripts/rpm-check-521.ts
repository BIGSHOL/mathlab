import { prisma } from '../src/lib/db';

async function main() {
  const q = await prisma.question.findFirst({
    where: { questionNum: 521, source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, questionNum: true, content: true, choices: true, answer: true, explanation: true },
  });
  if (!q) { console.log('not found'); return; }
  console.log(`#${q.questionNum} [${q.id}]`);
  console.log(`\n[CONTENT]\n${q.content}`);
  console.log(`\n[CHOICES] ${JSON.stringify(q.choices)}`);
  console.log(`\n[ANSWER] ${q.answer}`);
  console.log(`\n[EXPLANATION] (${(q.explanation||'').length}자)\n${q.explanation}`);
}
main().finally(() => prisma.$disconnect());
