import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/** 블록 수식 ($$...$$) 내부의 \frac을 \tfrac으로 변환 (인라인과 동일 크기로) */
function shrinkDisplayFracs(text: string): { fixed: string; hits: number } {
  let hits = 0;
  const fixed = text.replace(/\$\$([\s\S]*?)\$\$/g, (full, inner: string) => {
    if (!/\\frac\b/.test(inner)) return full;
    const replaced = inner.replace(/\\frac\b/g, () => { hits++; return '\\tfrac'; });
    return `$$${replaced}$$`;
  });
  return { fixed, hits };
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });

  let targetCount = 0, totalHits = 0;
  const samples: { num: number; before: string; after: string }[] = [];

  for (const q of qs) {
    const before = q.explanation || '';
    if (!before || !/\$\$[\s\S]*?\\frac[\s\S]*?\$\$/.test(before)) continue;
    const { fixed, hits } = shrinkDisplayFracs(before);
    if (hits > 0 && before !== fixed) {
      targetCount++;
      totalHits += hits;
      if (samples.length < 3) samples.push({ num: q.questionNum!, before, after: fixed });
      if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { explanation: fixed } });
    }
  }

  console.log(`블록 수식 내 \\frac 포함 해설: ${targetCount}건, 치환 총 ${totalHits}개`);
  for (const s of samples) {
    console.log(`\n===== #${s.num} =====\nBEFORE:\n${s.before}\n\nAFTER:\n${s.after}`);
  }
  console.log(APPLY ? `\n✅ ${targetCount}건 업데이트 완료` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
