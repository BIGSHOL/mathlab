import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const all = await db.question.findMany({
    where: { bookCode: '1-1', OR: [{ explanation: null }, { explanation: '' }] },
    select: { difficulty: true, source: true, content: true, type: true }
  });

  // 난이도 분포
  const byDiff: Record<string, number> = {};
  for (const q of all) byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1;
  console.log('난이도 분포:', byDiff);

  // source 패턴별
  const patterns = ['형성 평가', '종합 문제', '단원마무리', '해결해요'];
  for (const p of patterns) {
    const filtered = all.filter(q => q.source?.includes(p));
    const dist: Record<string, number> = {};
    for (const q of filtered) dist[q.difficulty] = (dist[q.difficulty] || 0) + 1;
    const total = filtered.length;
    if (total > 0) console.log(`${p} (${total}문제):`, dist);
  }

  // 난이도별 샘플 (BASIC vs HIGHEST)
  const basicSample = all.find(q => q.difficulty === 'BASIC');
  const highestSample = all.find(q => q.difficulty === 'HIGHEST');
  console.log('\nBASIC 샘플:', basicSample?.content?.substring(0, 100));
  console.log('HIGHEST 샘플:', highestSample?.content?.substring(0, 100));

  await db.$disconnect();
}
main();
