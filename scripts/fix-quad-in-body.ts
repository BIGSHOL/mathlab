/**
 * E 이슈: 본문(수식 밖) \quad, \qquad 을 &nbsp; 로 치환
 * 수식($...$ / $$...$$) 내부는 건드리지 않음
 */
import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

function stripQuadOutsideMath(text: string | null): string | null {
  if (!text) return text;
  // 수식 구간을 placeholder로 치환 → 본문에서만 \quad 제거 → 복원
  const placeholders: string[] = [];
  const stash = (s: string) => {
    const i = placeholders.push(s) - 1;
    return `__MATH_${i}__`;
  };
  let tmp = text
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => stash(m))
    .replace(/\$[^$]*\$/g, (m) => stash(m));

  tmp = tmp
    .replace(/\\qquad/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/\\quad/g, '&nbsp;&nbsp;');

  tmp = tmp.replace(/__MATH_(\d+)__/g, (_, i) => placeholders[Number(i)]);
  return tmp;
}

(async () => {
  const targets = await prisma.question.findMany({
    where: { isDraft: false, variantOfId: null },
    select: { id: true, bookCode: true, questionNum: true, content: true, explanation: true },
  });

  let updated = 0;
  for (const q of targets) {
    const newContent = stripQuadOutsideMath(q.content);
    const newExpl = stripQuadOutsideMath(q.explanation);
    if (newContent === q.content && newExpl === q.explanation) continue;
    updated++;
    console.log(`[${q.bookCode} #${q.questionNum}]`);
    if (APPLY) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          ...(newContent !== q.content ? { content: newContent! } : {}),
          ...(newExpl !== q.explanation ? { explanation: newExpl } : {}),
        },
      });
    }
  }
  console.log(`\n${updated}문제 ${APPLY ? '수정 완료' : '수정 예정 (dry-run)'}`);
  process.exit(0);
})();
