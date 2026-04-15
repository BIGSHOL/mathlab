import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/**
 * `=으로 시작하는 줄 + $ 개수 홀수 + 끝이 $` → 여는 $가 누락된 연속식. 맨 앞에 $ 삽입.
 */
function fixEqLineOddDollar(text: string): { out: string; hits: number } {
  let hits = 0;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!/^=/.test(trimmed)) continue;
    const dollarCount = (line.match(/\$/g) || []).length;
    if (dollarCount === 0 || dollarCount % 2 === 0) continue;
    if (!line.trimEnd().endsWith('$')) continue;
    const ws = line.match(/^\s*/)?.[0] || '';
    lines[i] = `${ws}$${line.slice(ws.length)}`;
    hits++;
  }
  return { out: lines.join('\n'), hits };
}

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
    const { out, hits } = fixEqLineOddDollar(before);
    if (hits === 0) continue;
    updated++;
    if (samples.length < 3) samples.push({ num: q.questionNum!, before, after: out });
    if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { explanation: out } });
  }
  console.log(`대상 ${updated}건`);
  for (const s of samples) console.log(`\n#${s.num}\nAFTER:\n${s.after}`);
  console.log(APPLY ? `\n✅ ${updated}건 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
