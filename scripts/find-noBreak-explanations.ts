/**
 * 줄바꿈이 거의/전혀 없는 긴 해설을 찾아 목록 출력 (읽기 전용)
 *
 * 기준:
 *  - 해설 길이 >= 120자
 *  - 줄 수 <= 2 (즉 전체 1~2줄)
 *
 * 사용:
 *   npx tsx scripts/find-noBreak-explanations.ts
 *   npx tsx scripts/find-noBreak-explanations.ts --min 200   # 최소 길이 변경
 */
import { prisma } from '../src/lib/db';

const args = process.argv.slice(2);
const minIdx = args.indexOf('--min');
const MIN_LEN = minIdx >= 0 ? Number(args[minIdx + 1]) || 120 : 120;

function preview(t: string, n = 200): string {
  return t.length > n ? t.slice(0, n) + '…' : t;
}

(async () => {
  const qs = await prisma.question.findMany({
    where: { isDraft: false, explanation: { not: null } },
    select: { id: true, bookCode: true, questionNum: true, explanation: true },
  });

  const hits = qs
    .filter((q) => {
      const t = q.explanation || '';
      if (t.length < MIN_LEN) return false;
      const lines = t.split(/\r?\n/).filter((l) => l.trim().length > 0);
      return lines.length <= 2;
    })
    .sort((a, b) => (b.explanation?.length ?? 0) - (a.explanation?.length ?? 0));

  console.log(`\n=== 줄바꿈 없는 긴 해설 (길이 ≥ ${MIN_LEN}자, 줄수 ≤ 2) ===`);
  console.log(`총 ${qs.length}문제 중 ${hits.length}건 의심\n`);

  for (const q of hits) {
    const t = q.explanation || '';
    const lines = t.split(/\r?\n/).length;
    console.log(`── [${q.bookCode ?? '?'} #${q.questionNum ?? '?'}] ${t.length}자 / ${lines}줄 ──`);
    console.log(`   id: ${q.id}`);
    console.log(`   ${preview(t).replace(/\n/g, '⏎')}`);
    console.log();
  }

  console.log(`\n총 ${hits.length}건. 수동 편집이 필요한 해설 목록입니다.`);
  process.exit(0);
})();
