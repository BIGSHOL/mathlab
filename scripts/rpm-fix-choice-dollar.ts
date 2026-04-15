import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/** 각 줄이 ①②③④⑤ 또는 ㄱ.ㄴ.ㄷ. 로 시작하고, 줄 안의 $ 개수가 홀수면 끝에 $ 추가 */
function fixChoiceDollar(text: string): { out: string; fixed: number } {
  let fixed = 0;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^[①②③④⑤⑥⑦⑧⑨⑩㉠㉡㉢ㄱ\.\sㄴㄷㄹ]/.test(line)) continue;
    const count = (line.match(/\$/g) || []).length;
    if (count === 0 || count % 2 === 0) continue;
    // 줄이 $로 끝나지 않으면 (닫힘 누락) $ 추가
    if (!line.trimEnd().endsWith('$')) {
      lines[i] = line.trimEnd() + '$';
      fixed++;
    }
  }
  return { out: lines.join('\n'), fixed };
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
    const { out, fixed } = fixChoiceDollar(before);
    if (fixed > 0) {
      updated++;
      if (samples.length < 3) samples.push({ num: q.questionNum!, before, after: out });
      if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { explanation: out } });
    }
  }

  console.log(`${updated}건 수정 대상`);
  for (const s of samples) {
    console.log(`\n===== #${s.num} =====\nBEFORE:\n${s.before.slice(0, 600)}\n\nAFTER:\n${s.after.slice(0, 600)}`);
  }
  console.log(APPLY ? `\n✅ ${updated}건 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
