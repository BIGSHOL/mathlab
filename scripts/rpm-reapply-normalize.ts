import { prisma } from '../src/lib/db';
import { normalizeMathText } from '../src/lib/pdf-extract-engine/ai/post-processor';

const APPLY = process.argv.includes('--apply');

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });

  let updated = 0;
  const samples: { num: number; before: string; after: string }[] = [];

  for (const q of qs) {
    const before = q.explanation || '';
    if (!before) continue;
    const after = normalizeMathText(before);
    if (before === after) continue;
    updated++;
    if (samples.length < 5) samples.push({ num: q.questionNum!, before, after });
    if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { explanation: after } });
  }

  console.log(`변경 대상: ${updated}건 / ${qs.length}건`);
  for (const s of samples) {
    console.log(`\n===== #${s.num} =====\nBEFORE: ${s.before.slice(0, 300)}\nAFTER : ${s.after.slice(0, 300)}`);
  }
  console.log(APPLY ? `\n✅ ${updated}건 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
