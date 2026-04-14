import { prisma } from '../src/lib/db';

(async () => {
  const all = await prisma.question.findMany({
    select: { id: true, questionNum: true, bookCode: true, chapter: true, section: true, explanation: true, answer: true },
    orderBy: [{ bookCode: 'asc' }, { questionNum: 'asc' }],
  });

  // HWP 잔존 패턴: ;N!D;, ;N#D;, :특수문자:, 한글 조합형 숫자(Á£¢»等)
  const hwpPattern = /;[0-9¢»ÁÂÃÄÅ£¤¥¦§¨©!#]{2,};|:[0-9¢»ÁÂÃÄÅ£¤¥¦§¨©!#]{2,}:|[¢»ÁÂÃÄÅ£¤¥¦§¨©]/;

  const hits: typeof all = [];
  for (const q of all) {
    const text = `${q.explanation ?? ''}\n${q.answer ?? ''}`;
    if (hwpPattern.test(text)) hits.push(q);
  }

  console.log(`총 ${all.length}개 중 ${hits.length}개 HWP 잔존 의심\n`);
  // 책별 집계
  const byBook: Record<string, number> = {};
  for (const h of hits) byBook[h.bookCode ?? 'NULL'] = (byBook[h.bookCode ?? 'NULL'] ?? 0) + 1;
  console.log('=== bookCode별 ===');
  for (const [k, v] of Object.entries(byBook).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}개`);
  }

  console.log('\n=== 목록 (questionNum | bookCode | chapter | section) ===');
  for (const h of hits) {
    console.log(`${h.questionNum}\t${h.bookCode}\t${h.chapter}\t${h.section}`);
  }

  await prisma.$disconnect();
})();
