import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

async function main() {
  const qs = await prisma.question.findMany({
    where: { questionNum: { in: [327, 520] }, source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });

  for (const q of qs) {
    const before = q.explanation || '';
    // literal \n (두 글자 백슬래시+n)을 실제 줄바꿈으로 변환
    const after = before.replace(/\\n/g, '\n');
    console.log(`\n===== #${q.questionNum} [${q.id}] =====`);
    console.log(`BEFORE (${before.length}자):`);
    console.log(before);
    console.log(`\nAFTER (${after.length}자):`);
    console.log(after);

    if (APPLY && before !== after) {
      await prisma.question.update({ where: { id: q.id }, data: { explanation: after } });
      console.log(`✅ UPDATED`);
    }
  }

  if (!APPLY) console.log('\n\n(dry-run — 적용하려면 --apply 옵션 추가)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
