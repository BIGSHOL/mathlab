/**
 * 문제은행 전체 \dfrac → \frac 일괄 치환 스크립트
 * \dfrac은 displaystyle 분수를 강제하여 인라인 수식에서 거대하게 렌더링됨.
 * \frac으로 통일하여 자연스러운 크기로 표시.
 *
 * 대상 필드: content, choices (JSON 배열), answer, explanation
 *
 * 사용법:
 *   npx tsx scripts/fix-dfrac.ts            # dry-run (미리보기)
 *   npx tsx scripts/fix-dfrac.ts --apply    # 실제 적용
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

function replaceDfrac(text: string): string {
  return text.replace(/\\dfrac(?![a-zA-Z])/g, '\\frac');
}

async function main() {
  // Raw SQL로 dfrac이 포함된 문제 검색 (content, choices, answer, explanation 모두)
  const ids: { id: string }[] = await prisma.$queryRawUnsafe(`
    SELECT id FROM "Question"
    WHERE content LIKE '%dfrac%'
       OR choices::text LIKE '%dfrac%'
       OR answer LIKE '%dfrac%'
       OR explanation LIKE '%dfrac%'
  `);

  console.log(`\\dfrac이 포함된 문제: ${ids.length}개\n`);

  if (ids.length === 0) {
    await prisma.$disconnect();
    return;
  }

  // 해당 문제들 가져오기
  const questions = await prisma.question.findMany({
    where: { id: { in: ids.map(r => r.id) } },
    select: {
      id: true,
      questionNum: true,
      bookCode: true,
      content: true,
      choices: true,
      answer: true,
      explanation: true,
    },
  });

  let updatedCount = 0;

  for (const q of questions) {
    const newContent = replaceDfrac(q.content);
    const newAnswer = replaceDfrac(q.answer);
    const newExplanation = q.explanation ? replaceDfrac(q.explanation) : q.explanation;

    // choices는 JSON 배열
    let newChoices = q.choices;
    let choicesChanged = false;
    if (Array.isArray(q.choices)) {
      const fixed = (q.choices as string[]).map(c => replaceDfrac(c));
      choicesChanged = fixed.some((c, i) => c !== (q.choices as string[])[i]);
      if (choicesChanged) newChoices = fixed;
    }

    const hasChange =
      newContent !== q.content ||
      newAnswer !== q.answer ||
      newExplanation !== q.explanation ||
      choicesChanged;

    if (!hasChange) continue;

    updatedCount++;
    console.log(`[${q.bookCode}] #${q.questionNum} (${q.id})`);

    if (newContent !== q.content) {
      const diff = q.content.match(/\\dfrac/g)?.length || 0;
      console.log(`  content: ${diff}개 \\dfrac → \\frac`);
    }
    if (newAnswer !== q.answer) {
      console.log(`  answer: \\dfrac → \\frac`);
    }
    if (newExplanation !== q.explanation) {
      const diff = (q.explanation || '').match(/\\dfrac/g)?.length || 0;
      console.log(`  explanation: ${diff}개 \\dfrac → \\frac`);
    }
    if (choicesChanged) {
      console.log(`  choices: \\dfrac → \\frac`);
    }

    if (APPLY) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          content: newContent,
          answer: newAnswer,
          explanation: newExplanation,
          ...(choicesChanged && { choices: newChoices }),
        },
      });
    }
  }

  console.log(`\n총 ${updatedCount}개 문제 ${APPLY ? '수정 완료' : '수정 예정 (--apply로 실행하세요)'}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
