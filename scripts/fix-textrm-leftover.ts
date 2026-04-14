/**
 * 해설/본문/정답의 수식 밖에 남은 LaTeX 커맨드 잔재 정리
 *
 * 대상:
 *  - (\textrm{X}) → (X)           예: (\textrm{i}) → (i)
 *  - (\text{X})   → (X)
 *  - (\mathrm{X}) → (X)
 *  - \textbf{X}   → **X**          (마크다운 볼드로)
 *  - \textit{X}   → *X*            (마크다운 이탤릭으로)
 *
 * 수식($...$ / $$...$$) 내부는 보호.
 *
 * 사용:
 *   npx tsx scripts/fix-textrm-leftover.ts              # dry-run
 *   npx tsx scripts/fix-textrm-leftover.ts --apply      # 반영
 *   npx tsx scripts/fix-textrm-leftover.ts --id <qid>   # 단일 문제
 */
import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const ID_IDX = process.argv.indexOf('--id');
const TARGET_ID = ID_IDX >= 0 ? process.argv[ID_IDX + 1] : null;

function withMathProtected(text: string, transform: (t: string) => string): string {
  const blocks: string[] = [];
  const tmp = text
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => {
      const i = blocks.push(m) - 1;
      return `\u0000M${i}\u0000`;
    })
    .replace(/\$[^$\n]*\$/g, (m) => {
      const i = blocks.push(m) - 1;
      return `\u0000M${i}\u0000`;
    });
  const out = transform(tmp);
  return out.replace(/\u0000M(\d+)\u0000/g, (_, i) => blocks[Number(i)] ?? '');
}

function cleanTextrm(text: string): string {
  return withMathProtected(text, (t) => {
    return t
      .replace(/\\textrm\{([^}]*)\}/g, '$1')
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\mathrm\{([^}]*)\}/g, '$1')
      .replace(/\\textbf\{([^}]*)\}/g, '**$1**')
      .replace(/\\textit\{([^}]*)\}/g, '*$1*');
  });
}

function preview(t: string, n = 300): string {
  return t.length > n ? t.slice(0, n) + '…' : t;
}

(async () => {
  const where: any = { isDraft: false };
  if (TARGET_ID) where.id = TARGET_ID;

  const qs = await prisma.question.findMany({
    where,
    select: { id: true, bookCode: true, questionNum: true, content: true, explanation: true, answer: true },
  });

  let changed = 0;
  const samples: string[] = [];
  for (const q of qs) {
    const updates: { content?: string; explanation?: string; answer?: string } = {};
    for (const field of ['content', 'explanation', 'answer'] as const) {
      const src = q[field];
      if (!src) continue;
      const fixed = cleanTextrm(src);
      if (fixed !== src) {
        updates[field] = fixed;
        if (samples.length < 8) {
          samples.push(
            `\n── [${q.bookCode ?? '?'} #${q.questionNum ?? '?'}] (${field}) ─────\n` +
              `BEFORE: ${preview(src)}\nAFTER : ${preview(fixed)}`,
          );
        }
      }
    }
    if (Object.keys(updates).length === 0) continue;
    changed++;
    if (APPLY) {
      await prisma.question.update({ where: { id: q.id }, data: updates });
    }
  }

  console.log(`\n=== \\textrm 잔재 정리 ${APPLY ? '(DB 반영)' : '(dry-run)'} ===`);
  console.log(`대상 ${qs.length}문제, 변경 ${changed}문제\n`);
  console.log('[샘플 최대 8건]');
  console.log(samples.join('\n'));
  if (!APPLY && changed > 0) console.log('\n💡 --apply 플래그로 반영.');
  process.exit(0);
})();
