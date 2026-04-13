/**
 * 감사 결과 기반 자동 수정:
 *  D. \dfrac → \frac (content / choices / explanation 전역 치환)
 *  F. 객관식 choices에 ①~⑤ 접두어 부여 (누락분)
 *
 * 사용:
 *   npx tsx scripts/fix-questions-audit.ts           (dry-run)
 *   npx tsx scripts/fix-questions-audit.ts --apply   (실제 DB 반영)
 */

import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

function replaceDfrac(s: string | null): string | null {
  if (!s) return s;
  return s.replace(/\\dfrac(?![a-zA-Z])/g, '\\frac');
}

function ensureChoiceNumbers(choices: unknown): string[] | null {
  if (!Array.isArray(choices)) return null;
  const arr = choices as string[];
  const allNumbered = arr.every((c) => /^[ \t]*[①②③④⑤⑥⑦⑧⑨⑩]/.test(c) || /^[ \t]*\(\d+\)/.test(c));
  if (allNumbered) return null; // 변경 없음
  return arr.map((c, i) => {
    const trimmed = c.trim();
    if (/^[①-⑩]/.test(trimmed)) return trimmed;
    if (/^\(\d+\)/.test(trimmed)) return trimmed;
    return `${CIRCLE_NUMS[i] ?? `(${i + 1})`} ${trimmed}`;
  });
}

(async () => {
  console.log(`모드: ${APPLY ? '\x1b[31m실제 반영 (--apply)\x1b[0m' : 'dry-run (미리보기)'}\n`);

  // ── D. \dfrac → \frac ──
  const dfracTargets = await prisma.question.findMany({
    where: {
      OR: [
        { content: { contains: '\\dfrac' } },
        { explanation: { contains: '\\dfrac' } },
      ],
    },
    select: { id: true, bookCode: true, questionNum: true, content: true, choices: true, explanation: true },
  });
  console.log(`[D] \\dfrac 포함: ${dfracTargets.length}문제`);

  let dfracUpdated = 0;
  for (const q of dfracTargets) {
    const newContent = replaceDfrac(q.content);
    const newExplanation = replaceDfrac(q.explanation);
    const choicesArr = Array.isArray(q.choices) ? (q.choices as string[]) : null;
    const newChoices = choicesArr ? choicesArr.map((c) => replaceDfrac(c) ?? c) : null;
    const contentChanged = newContent !== q.content;
    const explChanged = newExplanation !== q.explanation;
    const choicesChanged = newChoices && JSON.stringify(newChoices) !== JSON.stringify(choicesArr);
    if (!contentChanged && !explChanged && !choicesChanged) continue;
    dfracUpdated++;
    if (APPLY) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          ...(contentChanged ? { content: newContent! } : {}),
          ...(explChanged ? { explanation: newExplanation } : {}),
          ...(choicesChanged ? { choices: newChoices! } : {}),
        },
      });
    }
  }
  console.log(`  → ${dfracUpdated}문제 ${APPLY ? '수정 완료' : '수정 예정'}`);

  // ── F. 객관식 보기 ①~⑤ 접두어 부여 ──
  const mcTargets = await prisma.question.findMany({
    where: { type: 'MULTIPLE_CHOICE', isDraft: false, variantOfId: null },
    select: { id: true, bookCode: true, questionNum: true, choices: true },
  });
  let mcUpdated = 0;
  for (const q of mcTargets) {
    const fixed = ensureChoiceNumbers(q.choices);
    if (!fixed) continue;
    mcUpdated++;
    if (mcUpdated <= 5) {
      console.log(`  [F] ${q.bookCode} #${q.questionNum}`);
      console.log(`      before: ${JSON.stringify(q.choices).slice(0, 120)}`);
      console.log(`      after:  ${JSON.stringify(fixed).slice(0, 120)}`);
    }
    if (APPLY) {
      await prisma.question.update({ where: { id: q.id }, data: { choices: fixed } });
    }
  }
  console.log(`[F] 보기 번호 누락: ${mcUpdated}문제 ${APPLY ? '수정 완료' : '수정 예정'}`);

  console.log('\n완료.');
  if (!APPLY) console.log('실제 반영하려면 --apply 옵션을 붙여 다시 실행하세요.');
  process.exit(0);
})();
