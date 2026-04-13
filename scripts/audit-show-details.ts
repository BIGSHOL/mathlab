import { prisma } from '../src/lib/db';

const MULTILINE_ENV = /\$(?!\$)[^$]*\\begin\{(?:cases|align|aligned|array|matrix|pmatrix|bmatrix)\}/;
const TEXT_HANGUL = /\\text\{[^{}]*[\uAC00-\uD7A3][^{}]*\}/;
const UNICODE_IN_MATH = /\$(?!\$)[^$]*[℃℉Ω㎡㎥㎝㎜㎞㎏Å][^$]*\$/;

(async () => {
  const all = await prisma.question.findMany({
    where: { isDraft: false, variantOfId: null },
    select: { id: true, bookCode: true, questionNum: true, content: true, type: true, choices: true },
  });

  const aList = [], bList = [], eList = [];
  for (const q of all) {
    const c = q.content ?? '';
    if (MULTILINE_ENV.test(c)) aList.push(q);
    if (TEXT_HANGUL.test(c)) bList.push(q);
    const noMath = c.replace(/\$\$[\s\S]*?\$\$/g, '').replace(/\$[^$]*\$/g, '');
    if (/\\(?:quad|qquad)/.test(noMath)) eList.push(q);
  }

  console.log('=== A. 인라인 \\begin{cases} (1건) ===');
  for (const q of aList) {
    console.log(`\n[${q.bookCode} #${q.questionNum}] ${q.id}`);
    console.log(q.content);
  }

  console.log('\n\n=== B. \\text{한글} (10건) ===');
  for (const q of bList) {
    console.log(`\n[${q.bookCode} #${q.questionNum}] ${q.id}`);
    console.log(q.content?.slice(0, 400));
  }

  console.log('\n\n=== E. \\quad 본문 노출 (2건) ===');
  for (const q of eList) {
    console.log(`\n[${q.bookCode} #${q.questionNum}] ${q.id}`);
    console.log(q.content);
  }

  process.exit(0);
})();
