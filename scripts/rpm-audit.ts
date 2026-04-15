import { prisma } from '../src/lib/db';

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, source: true, bookCode: true, chapter: true, explanation: true, content: true, answer: true, questionNum: true, type: true, choices: true },
    orderBy: { questionNum: 'asc' },
  });
  console.log(`Total RPM: ${qs.length}`);
  const bySource: Record<string, number> = {};
  for (const q of qs) bySource[q.source || ''] = (bySource[q.source || ''] || 0) + 1;
  console.log('By source:', bySource);

  const unusual: Array<{ q: typeof qs[number]; reasons: string[] }> = [];
  for (const q of qs) {
    const e = q.explanation || '';
    const reasons: string[] = [];
    if (!e.trim()) {
      reasons.push('EMPTY');
    } else {
      if (e.length < 30 && !/해설\s*없음/.test(e)) reasons.push('TOO_SHORT');
      if (e.length > 2500) reasons.push('TOO_LONG');
      if (e.includes('\\n')) reasons.push('LITERAL_BSN');
      const outside = e.replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\$[^$\n]*\$/g, ' ');
      if (/\\textrm|\\text\{|\\mathrm/.test(outside)) reasons.push('TEXT_CMD_OUTSIDE');
      if (/\\dfrac/.test(e)) reasons.push('DFRAC');
      if (/\$[^$\n]+\$\$[^$\n]+\$/.test(e)) reasons.push('GLUED_INLINE');
      if (/\t/.test(e) || / {4,}/.test(e)) reasons.push('EXCESS_WS');
      if (/\n{4,}/.test(e)) reasons.push('EXCESS_NL');
      if (/\uFFFD/.test(e)) reasons.push('REPLACEMENT_CHAR');
      const blocks = e.match(/\$\$[\s\S]*?\$\$/g) || [];
      for (const b of blocks) {
        const eqc = (b.match(/=/g) || []).length;
        if (eqc >= 3 && !/aligned|array|cases/.test(b) && /\n/.test(b)) { reasons.push('NEEDS_ALIGNED'); break; }
      }
      if (/^\s*(정답|답)\s*[:：]/m.test(e)) reasons.push('ANSWER_IN_EXPL');
      if (q.type === 'MULTIPLE_CHOICE') {
        const ans = (q.answer || '').trim();
        if (ans && !/^[①②③④⑤\s,]+$/.test(ans) && !/^[1-5](\s*,\s*[1-5])*$/.test(ans)) reasons.push('MC_ANS_BAD');
      }
    }
    if (reasons.length) unusual.push({ q, reasons });
  }

  console.log(`\nUnusual: ${unusual.length} / ${qs.length}`);
  const tally: Record<string, number> = {};
  for (const u of unusual) for (const r of u.reasons) tally[r] = (tally[r] || 0) + 1;
  console.log('By reason:', tally);

  console.log('\n=== 이슈별 questionNum ===');
  for (const reason of Object.keys(tally).sort()) {
    const nums = unusual.filter(u => u.reasons.includes(reason)).map(u => u.q.questionNum).sort((a, b) => (a || 0) - (b || 0));
    console.log(`${reason} (${nums.length}): ${nums.join(', ')}`);
  }

  for (const reason of Object.keys(tally)) {
    console.log(`\n====== ${reason} ======`);
    const samples = unusual.filter(u => u.reasons.includes(reason)).slice(0, 2);
    for (const { q } of samples) {
      console.log(`-- #${q.questionNum} [${q.id}] ${q.source} / ${q.chapter} type=${q.type} --`);
      console.log(`A: ${JSON.stringify(q.answer)}`);
      console.log(`E(${(q.explanation || '').length}): ${(q.explanation || '').slice(0, 500)}`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
