import { prisma } from '../src/lib/db';

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, source: true, bookCode: true, chapter: true, explanation: true, content: true, answer: true, questionNum: true },
  });
  console.log(`Total RPM: ${qs.length}`);
  const bySource: Record<string, number> = {};
  for (const q of qs) bySource[q.source || ''] = (bySource[q.source || ''] || 0) + 1;
  console.log('By source:', bySource);

  const unusual: Array<{q: any, reasons: string[]}> = [];
  for (const q of qs) {
    const e = q.explanation || '';
    const reasons: string[] = [];
    if (!e.trim()) reasons.push('EMPTY');
    else {
      if (e.length < 20) reasons.push('TOO_SHORT');
      if (e.length > 2500) reasons.push('TOO_LONG');
      if (/\n/.test(e)) reasons.push('LITERAL_BACKSLASH_N');
      const outsideMath = e.replace(/\$[^$]*\$/g, '').replace(/\$\$[\s\S]*?\$\$/g, '');
      if (/\textrm|\text\{|\mathrm/.test(outsideMath)) reasons.push('TEXT_CMD_OUTSIDE_MATH');
      if (/\dfrac/.test(e)) reasons.push('DFRAC');
      if (/\$[^$\n]+\$\$[^$\n]+\$/.test(e)) reasons.push('GLUED_INLINE');
      if (/[^\x00-\x7F가-힣\s\.,!?①②③④⑤ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ\u2200-\u22FF\u2070-\u209F\u00B0-\u00BF★☆△▲▽▼□■○●◎※]/.test(outsideMath.replace(/[a-zA-Z0-9+\-*\/=<>()\[\]{}|:;'"`~@#$%^&_\]/g, ''))) reasons.push('STRANGE_CHARS');
      // aligned check: block math with many = but no aligned
      const blocks = e.match(/\$\$[\s\S]*?\$\$/g) || [];
      for (const b of blocks) {
        const eqCount = (b.match(/=/g) || []).length;
        if (eqCount >= 3 && !/aligned|array|cases/.test(b) && /\n/.test(b)) {
          reasons.push('NEEDS_ALIGNED');
          break;
        }
      }
      if (/정답\s*[:：]/.test(e) || /^\s*답\s*[:：]/m.test(e)) reasons.push('ANSWER_IN_EXPLANATION');
    }
    if (reasons.length) unusual.push({ q, reasons });
  }

  console.log(`\nUnusual count: ${unusual.length}`);
  const reasonTally: Record<string, number> = {};
  for (const u of unusual) for (const r of u.reasons) reasonTally[r] = (reasonTally[r]||0)+1;
  console.log('By reason:', reasonTally);

  // Sample 3 per reason
  for (const reason of Object.keys(reasonTally)) {
    console.log(`\n\n====== ${reason} (${reasonTally[reason]}) ======`);
    const samples = unusual.filter(u => u.reasons.includes(reason)).slice(0, 3);
    for (const { q } of samples) {
      console.log(`\n-- [${q.id}] ${q.source} / ${q.chapter} #${q.questionNum} --`);
      console.log(`A: ${q.answer}`);
      console.log(`E(${(q.explanation||'').length}): ${(q.explanation||'').slice(0, 500)}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
