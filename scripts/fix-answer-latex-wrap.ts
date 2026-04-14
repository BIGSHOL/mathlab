/**
 * 정답(answer) 필드에 LaTeX 명령어가 있지만 $...$로 감싸지지 않아 raw 텍스트로 렌더되는 문제 탐지/수정
 *
 * 예: answer = "\frac{5}{4}"  → "$\frac{5}{4}$"
 *     answer = "2\sqrt{3}"    → "$2\sqrt{3}$"
 *
 * 규칙:
 *  - answer에 LaTeX 커맨드(\frac, \sqrt, \times 등)나 수식 기호(^, _)가 있고
 *  - $ 가 전혀 없으면 → 전체를 $...$로 감싸기
 *  - 이미 $로 감싸진 부분이 있으면 건드리지 않음 (혼합 케이스는 수동 확인)
 *
 * 사용:
 *   npx tsx scripts/fix-answer-latex-wrap.ts              # dry-run
 *   npx tsx scripts/fix-answer-latex-wrap.ts --apply      # DB 반영
 */
import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

const LATEX_PATTERN = /\\(frac|dfrac|sqrt|times|div|cdot|pm|mp|leq|geq|neq|infty|pi|alpha|beta|gamma|theta|lambda|sum|int|lim|sin|cos|tan|log|ln|left|right)\b|[\^_]\{/;

function shouldWrap(answer: string): boolean {
  if (!answer) return false;
  if (answer.includes('$')) return false; // 이미 $가 있음 (혼합 케이스 - 수동 검토)
  return LATEX_PATTERN.test(answer);
}

function wrapAnswer(answer: string): string {
  // 콤마/세미콜론 구분된 여러 정답(예: "\frac{1}{2}, \frac{3}{4}") → 각각 감싸기
  if (/,\s*/.test(answer) && LATEX_PATTERN.test(answer)) {
    const parts = answer.split(/,\s*/);
    return parts.map((p) => (LATEX_PATTERN.test(p) ? `$${p.trim()}$` : p.trim())).join(', ');
  }
  return `$${answer.trim()}$`;
}

(async () => {
  const qs = await prisma.question.findMany({
    where: { isDraft: false, answer: { not: '' } },
    select: { id: true, bookCode: true, questionNum: true, answer: true },
  });

  const hits: { id: string; bookCode: string | null; questionNum: number | null; before: string; after: string }[] = [];
  for (const q of qs) {
    if (!shouldWrap(q.answer || '')) continue;
    const after = wrapAnswer(q.answer || '');
    hits.push({ id: q.id, bookCode: q.bookCode, questionNum: q.questionNum, before: q.answer || '', after });
  }

  console.log(`\n=== 정답 LaTeX 감싸기 ${APPLY ? '(DB 반영)' : '(dry-run)'} ===`);
  console.log(`총 ${qs.length}문제 중 ${hits.length}건 대상\n`);

  for (const h of hits.slice(0, 30)) {
    console.log(`[${h.bookCode ?? '?'} #${h.questionNum ?? '?'}]`);
    console.log(`  BEFORE: ${h.before}`);
    console.log(`  AFTER : ${h.after}`);
  }
  if (hits.length > 30) console.log(`\n… 외 ${hits.length - 30}건 생략`);

  if (APPLY) {
    for (const h of hits) {
      await prisma.question.update({ where: { id: h.id }, data: { answer: h.after } });
    }
    console.log(`\n✅ ${hits.length}건 반영 완료`);
  } else if (hits.length > 0) {
    console.log('\n💡 --apply 플래그로 실제 반영.');
  }

  process.exit(0);
})();
