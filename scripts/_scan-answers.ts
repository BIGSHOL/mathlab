import { prisma } from '../src/lib/db';

(async () => {
  const all = await prisma.question.findMany({
    select: { id: true, questionNum: true, bookCode: true, chapter: true, section: true, answer: true, type: true },
    orderBy: [{ bookCode: 'asc' }, { questionNum: 'asc' }],
  });

  const hits: { q: any; reason: string }[] = [];
  for (const q of all) {
    const a = (q.answer ?? '').trim();
    if (!a) { hits.push({ q, reason: '빈 정답' }); continue; }
    // HWP 잔존
    if (/[¢»ÁÂÃÄÅ£¤¥¦§¨©]/.test(a)) { hits.push({ q, reason: `HWP잔존: ${a}` }); continue; }
    if (/;[0-9!#]+;/.test(a) || /:[0-9!#]+:/.test(a)) { hits.push({ q, reason: `HWP분수: ${a}` }); continue; }
    // 너무 긴 정답(비정상)
    if (a.length > 80) { hits.push({ q, reason: `너무김(${a.length}): ${a.slice(0, 50)}...` }); continue; }
    // 원형 숫자(①②③④⑤) 아닌데 객관식 답으로 여러 개
    // 이상한 제어문자/유니코드
    if (/[\u0000-\u001f\u007f-\u009f]/.test(a)) { hits.push({ q, reason: `제어문자: ${JSON.stringify(a)}` }); continue; }
  }

  console.log(`총 ${all.length}개 중 ${hits.length}개 이상 정답`);
  const byReason: Record<string, number> = {};
  for (const h of hits) {
    const key = h.reason.split(':')[0];
    byReason[key] = (byReason[key] ?? 0) + 1;
  }
  console.log('\n=== 사유별 ===');
  for (const [k, v] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}개`);
  }

  console.log('\n=== 목록 ===');
  for (const h of hits) {
    console.log(`${h.q.questionNum}\t${h.q.bookCode}\t[${h.reason}]`);
  }

  await prisma.$disconnect();
})();
