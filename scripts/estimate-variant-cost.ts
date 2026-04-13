import { prisma } from '../src/lib/db';

(async () => {
  const samples = await prisma.question.findMany({
    where: { bookCode: '1-1', isDraft: false },
    select: { content: true, choices: true, explanation: true },
    take: 200,
  });
  const lens = samples.map(
    (q) => (q.content?.length ?? 0) + JSON.stringify(q.choices ?? []).length + (q.explanation?.length ?? 0),
  );
  const avg = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
  console.log(`샘플 ${samples.length}개 / 평균 입력 문자수: ${avg}`);
  process.exit(0);
})();
