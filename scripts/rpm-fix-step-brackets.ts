import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/**
 * `[1단계]`, `[n단계]`, `[k단계]`, `[34단계]` 등 → `**1단계**` (bold)
 * 단, 마크다운 링크 `[text](url)` / 이미지 `![alt](url)`는 건드리지 않음
 */
function convertStepBrackets(text: string): { out: string; hits: number } {
  let hits = 0;
  const out = text.replace(/(?<!!)\[([^\]\n]*단계)\](?!\()/g, (_m, inner: string) => {
    hits++;
    return `**${inner}**`;
  });
  return { out, hits };
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true, content: true },
    orderBy: { questionNum: 'asc' },
  });

  let updated = 0, totalHits = 0;
  const samples: { num: number; before: string; after: string }[] = [];

  for (const q of qs) {
    const beforeE = q.explanation || '';
    const beforeC = q.content || '';
    const { out: outE, hits: hitsE } = convertStepBrackets(beforeE);
    const { out: outC, hits: hitsC } = convertStepBrackets(beforeC);
    const hits = hitsE + hitsC;
    if (hits === 0) continue;
    updated++;
    totalHits += hits;
    if (samples.length < 3 && hitsE > 0) samples.push({ num: q.questionNum!, before: beforeE, after: outE });
    if (APPLY) {
      const data: Record<string, string> = {};
      if (outE !== beforeE) data.explanation = outE;
      if (outC !== beforeC) data.content = outC;
      await prisma.question.update({ where: { id: q.id }, data });
    }
  }

  console.log(`업데이트 대상: ${updated}건, 치환 총 ${totalHits}회`);
  for (const s of samples) {
    console.log(`\n#${s.num}\nBEFORE: ${s.before.slice(0, 200)}\nAFTER : ${s.after.slice(0, 200)}`);
  }
  console.log(APPLY ? `\n✅ ${updated}건 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
