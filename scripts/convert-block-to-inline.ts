import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const TARGETS = [471, 474, 475, 476];

/** `$$\begin{aligned}...\end{aligned}$$` (단일 라인) → `$\begin{aligned}...\end{aligned}$` */
function convertBlockToInline(text: string): { out: string; hits: number } {
  let hits = 0;
  const out = text.replace(
    /\$\$\s*(\\begin\{(aligned|array|cases|matrix|pmatrix|bmatrix)\}[^\n]*?\\end\{\2\})\s*\$\$/g,
    (_m, inner: string) => {
      hits++;
      return `$${inner}$`;
    }
  );
  return { out, hits };
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { questionNum: { in: TARGETS }, source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });
  let updated = 0;
  for (const q of qs) {
    const before = q.explanation || '';
    const { out, hits } = convertBlockToInline(before);
    if (hits === 0) continue;
    console.log(`#${q.questionNum}: ${hits}개 블록 변환`);
    updated++;
    if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { explanation: out } });
  }
  console.log(APPLY ? `\n✅ ${updated}건 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
