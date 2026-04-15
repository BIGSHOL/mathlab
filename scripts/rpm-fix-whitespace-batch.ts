import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const TARGETS = [415, 513, 514, 516, 517, 518, 519, 520, 523];

function cleanExplanation(text: string): string {
  let t = text;
  t = t.replace(/\t/g, ' ');
  t = t.replace(/[ ]+$/gm, '');
  t = t.replace(/^[ ]{2,}/gm, '');
  t = t.replace(/[ ]{4,}/g, ' ');
  t = t.replace(/\n{4,}/g, '\n\n');
  t = t.replace(/\n\s*(정답|답)\s*[:：]\s*[^\n]*\s*$/g, '');
  return t.trim();
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { questionNum: { in: TARGETS }, source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });

  let updated = 0;
  for (const q of qs) {
    const before = q.explanation || '';
    const after = cleanExplanation(before);
    if (before === after) {
      console.log(`#${q.questionNum}: 변경 없음`);
      continue;
    }
    console.log(`\n#${q.questionNum}: ${before.length} → ${after.length}자`);
    if (APPLY) {
      await prisma.question.update({ where: { id: q.id }, data: { explanation: after } });
      updated++;
    }
  }
  console.log(`\n총 ${qs.length}건 중 ${APPLY ? updated + '건 업데이트' : '(dry-run)'}`);
  if (!APPLY) console.log('적용: --apply 옵션 추가');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
