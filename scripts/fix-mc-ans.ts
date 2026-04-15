import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

async function main() {
  const qs = await prisma.question.findMany({
    where: {
      source: '22개정 RPM 중 1-1 학생용',
      type: 'MULTIPLE_CHOICE',
    },
    select: { id: true, questionNum: true, answer: true, choices: true },
  });

  let updated = 0;
  for (const q of qs) {
    const ans = (q.answer || '').trim();
    if (!ans || ans === '미입력') continue;
    // 이미 올바른 형식 (①②③④⑤ 또는 "①, ②" 등)
    if (/^[①②③④⑤⑥⑦⑧⑨⑩,\s]+$/.test(ans)) continue;
    // 한글 기호 답(ㄱㄴㄷ, ㉠㉡㉢) — 그대로 유지
    if (/^[ㄱㄴㄷㄹㅁㅂㅅㅇ㉠㉡㉢㉣㉤,\s]+$/.test(ans)) continue;

    const choices = q.choices as string[] | null;
    if (!Array.isArray(choices) || choices.length === 0) continue;

    // 각 choice의 값 추출 — "① $9$" → "9", "② $120$" → "120"
    const normalizeValue = (s: string) => s
      .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
      .replace(/\$/g, '')
      .replace(/\s+/g, '')
      .replace(/[^0-9A-Za-z\-+\/\\{}.()]/g, '');

    const normalizedAns = normalizeValue(ans);
    if (!normalizedAns) continue;

    const matched = choices.findIndex(c => normalizeValue(c) === normalizedAns);
    if (matched < 0) continue;

    const newAns = '①②③④⑤⑥⑦⑧⑨⑩'[matched] || String(matched + 1);
    console.log(`#${q.questionNum}: "${ans}" → "${newAns}" (보기 ${matched + 1}번 매칭)`);
    updated++;
    if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { answer: newAns } });
  }

  console.log(`\n${APPLY ? `✅ ${updated}건 업데이트` : `(dry-run) ${updated}건 대상 — --apply로 적용`}`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
