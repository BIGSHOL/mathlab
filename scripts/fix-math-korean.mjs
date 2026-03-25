import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const concepts = await db.concept.findMany({
  where: { grade: { startsWith: 'elementary' } },
  select: { id: true, conceptCode: true, fullContent: true },
});

let updated = 0;

for (const c of concepts) {
  let text = c.fullContent;
  const original = text;

  // 1) 거대한 단일 $...한글...$ 블록 — 전체가 수식으로 감싸진 경우
  //    한글이 20자 이상 포함된 $...$ 블록은 수식이 아닌 본문
  text = text.replace(/\$([^$]{50,})\$/g, (match, inner) => {
    if (!/[가-힣]/.test(inner)) return match; // 한글 없으면 유지
    // \text{cm} → cm, \text{ cm} → cm
    let fixed = inner
      .replace(/\\text\{[\s]*([^}]+)[\s]*\}/g, '$1')
      .replace(/\\div/g, '÷')
      .replace(/\\times/g, '×')
      .replace(/\\dots/g, '…')
      .replace(/\\cdot/g, '·')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
      .replace(/\\sim/g, '~');
    return fixed;
  });

  // 2) 짧은 수식 안에 한글이 포함된 경우: $한글텍스트$
  text = text.replace(/\$([^$]+)\$/g, (match, inner) => {
    if (!/[가-힣]/.test(inner)) return match; // 한글 없으면 유지
    let fixed = inner
      .replace(/\\text\{[\s]*([^}]+)[\s]*\}/g, '$1')
      .replace(/\\div/g, '÷')
      .replace(/\\times/g, '×')
      .replace(/\\dots/g, '…')
      .replace(/\\cdot/g, '·');
    return fixed;
  });

  // 3) \text{} 가 수식 밖에 남아있는 경우도 정리
  text = text.replace(/\\text\{[\s]*([^}]+)[\s]*\}/g, '$1');

  // 4) 수식이 아닌데 남은 단독 \ 정리 (LaTeX 명령어 잔재)
  //    단, $...$ 안의 \는 유지

  // 5) 본문 속 단독 숫자를 다시 $숫자$로 래핑
  //    먼저 기존 $...$를 보호
  const mathBlocks = [];
  let temp = text.replace(/\$[^$]+\$/g, (m) => {
    mathBlocks.push(m);
    return `__MATH${mathBlocks.length - 1}__`;
  });

  // 단독 숫자 래핑 (이미 래핑된 건 __MATH__로 보호됨)
  temp = temp.replace(/(?<![A-Za-z_])(\d+(?:\.\d+)?)(?![A-Za-z_\d])/g, (match, num, offset) => {
    // __MATH 바로 뒤이거나 바로 앞이면 스킵
    const before = temp.substring(Math.max(0, offset - 8), offset);
    if (before.includes('__MATH') || before.includes('MATH')) return match;
    return `$${num}$`;
  });

  // 인접한 $num$ op $num$ 병합
  let prev;
  do {
    prev = temp;
    temp = temp.replace(
      /\$([^$]+)\$(\s*[÷×+\-=…·]\s*)\$([^$]+)\$/g,
      (_, a, op, b) => {
        const latexOp = op.replace(/÷/g, ' \\div ').replace(/×/g, ' \\times ').replace(/…/g, ' \\dots ').replace(/·/g, ' \\cdot ').trim();
        return `$${a} ${latexOp} ${b}$`;
      }
    );
  } while (temp !== prev);

  // 복원
  text = temp.replace(/__MATH(\d+)__/g, (_, idx) => mathBlocks[parseInt(idx)]);

  if (text !== original) {
    await db.concept.update({ where: { id: c.id }, data: { fullContent: text } });
    updated++;
    if (updated <= 5) {
      console.log(`\n--- ${c.conceptCode} ---`);
      console.log(text.substring(0, 200));
    }
  }
}

console.log(`\n완료: ${updated}/${concepts.length}개 수정`);

// 한글 포함 수식 남아있는지 최종 체크
const check = await db.concept.findMany({
  where: { grade: { startsWith: 'elementary' } },
  select: { conceptCode: true, fullContent: true },
});
let remaining = 0;
for (const c of check) {
  const matches = c.fullContent.match(/\$[^$]*[가-힣][^$]*\$/g);
  if (matches) {
    remaining++;
    console.log(`아직 남음 — ${c.conceptCode}: ${matches[0].substring(0, 60)}`);
  }
}
console.log(`한글 포함 수식 잔여: ${remaining}개`);

await db.$disconnect();
