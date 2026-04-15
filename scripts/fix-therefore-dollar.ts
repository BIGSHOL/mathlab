import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/**
 * `∴ 수식$` 패턴: 닫는 $만 있고 여는 $ 누락 → `∴ $수식$`로 교정
 * `∵`, `\therefore`, `\because`도 동일 처리
 */
function fixThereforeDollar(text: string): { out: string; hits: number } {
  let hits = 0;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // ∴/∵로 시작 (앞 공백 허용)
    const m = line.match(/^(\s*)([∴∵])\s*(.+)$/);
    if (!m) continue;
    const [, ws, sym, rest] = m;
    // rest의 $ 개수가 홀수이고 끝에 $가 있으면 (여는 $ 누락)
    const dollarCount = (rest.match(/\$/g) || []).length;
    if (dollarCount === 0 || dollarCount % 2 === 0) continue;
    if (!rest.trimEnd().endsWith('$')) continue;
    // rest가 이미 $로 시작(깨진 `$ $X$` 같은 구조) — 건드리지 않음
    if (rest.startsWith('$')) continue;
    // rest 앞에 $ 삽입
    lines[i] = `${ws}${sym} $${rest.trimEnd()}`;
    // 이미 끝에 $ 있으므로 그대로 두면 `$...$` 완성
    // 위 교체는 끝 $ 유지됨 (trimEnd만)
    hits++;
  }
  return { out: lines.join('\n'), hits };
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
    const { out, hits } = fixThereforeDollar(before);
    if (hits === 0) continue;
    updated++;
    if (samples.length < 5) samples.push({ num: q.questionNum!, before, after: out });
    if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { explanation: out } });
  }
  console.log(`대상 ${updated}건`);
  for (const s of samples) {
    console.log(`\n#${s.num}\nBEFORE (끝부분): ${s.before.slice(-200)}\nAFTER  (끝부분): ${s.after.slice(-200)}`);
  }
  console.log(APPLY ? `\n✅ ${updated}건 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
