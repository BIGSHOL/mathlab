import { prisma } from '../src/lib/db';

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });

  const unusual: Array<{ q: typeof qs[number]; reasons: string[]; samples: string[] }> = [];

  for (const q of qs) {
    const e = q.explanation || '';
    if (!e.trim() || /해설\s*없음/.test(e)) continue;
    const reasons: string[] = [];
    const samples: string[] = [];

    // 1) 3개 이상 연속 $
    const triple = e.match(/\${3,}/g);
    if (triple) { reasons.push(`TRIPLE_DOLLAR(${triple.length})`); samples.push(...triple.slice(0, 2)); }

    // 2) 빈 인라인 수식 $ $ 또는 $ ... $ 내 1~2자 공백만
    if (/\$\s{1,3}\$/.test(e)) reasons.push('EMPTY_MATH');

    // 3) $$ 가 줄 중간에 (앞뒤 모두 non-newline) — 인라인 중 display 마커 깨짐
    //    — 허용: `$$` 앞뒤로 공백/개행
    if (/[^\s\n]\$\$[^\s\n]/.test(e)) reasons.push('INLINE_DISPLAY');

    // 4) 글자에 $ 바로 붙음 + 뒤에 공백 없이 이어짐 (글루)
    const glued = e.match(/[가-힣a-zA-Z0-9]\$[^$\n]+\$[가-힣a-zA-Z0-9]/g);
    if (glued) { reasons.push(`GLUED(${glued.length})`); samples.push(...glued.slice(0, 2)); }

    // 5) 매우 긴 1줄 문장 (줄바꿈 없이 150자+) — 런온 가능성
    const lines = e.split('\n');
    const maxLine = Math.max(...lines.map(l => l.length));
    if (maxLine > 200 && lines.length <= 3) reasons.push(`RUNON(maxLine=${maxLine})`);

    // 6) 홀수 개 $ (열고 안 닫힘)
    const dollarCount = (e.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) reasons.push(`ODD_DOLLAR(${dollarCount})`);

    if (reasons.length) unusual.push({ q, reasons, samples });
  }

  console.log(`전체 RPM: ${qs.length}건 중 이상 ${unusual.length}건\n`);
  const tally: Record<string, number> = {};
  for (const u of unusual) for (const r of u.reasons) {
    const key = r.replace(/\(.*\)/, '');
    tally[key] = (tally[key] || 0) + 1;
  }
  console.log('카테고리:', tally);

  console.log('\n=== 이슈별 questionNum ===');
  for (const key of Object.keys(tally).sort()) {
    const nums = unusual.filter(u => u.reasons.some(r => r.startsWith(key))).map(u => u.q.questionNum).sort((a, b) => (a || 0) - (b || 0));
    console.log(`${key} (${nums.length}): ${nums.join(', ')}`);
  }

  // 샘플 출력
  console.log('\n\n=== 샘플 (상위 10건) ===');
  for (const u of unusual.slice(0, 10)) {
    console.log(`\n#${u.q.questionNum} [${u.reasons.join(', ')}]`);
    console.log((u.q.explanation || '').slice(0, 350));
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
