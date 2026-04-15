import { prisma } from '../src/lib/db';

async function main() {
  // #470: scoring에 `\times` 수식 밖 → `$\times$`로 감싸기
  await prisma.question.updateMany({
    where: { questionNum: 470, source: '22개정 RPM 중 1-1 학생용' },
    data: {
      scoringCriteria: '1. A의 값 구하기 40%\n2. B의 값 구하기 40%\n3. $A \\times B$의 값 구하기 20%',
    },
  });
  console.log('#470 scoring 수정');

  // #624: choice[5] 닫는 $ 추가
  const q624 = await prisma.question.findFirst({
    where: { questionNum: 624, source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, choices: true },
  });
  if (q624) {
    const choices = [...(q624.choices as string[])];
    if (!choices[4].endsWith('$')) choices[4] = choices[4] + '$';
    await prisma.question.update({ where: { id: q624.id }, data: { choices } });
    console.log('#624 choice[5] 수정');
  }

  // #663: choice[1] 잘못된 `$...$a$...` 구조 + choice[5] 닫는 $
  const q663 = await prisma.question.findFirst({
    where: { questionNum: 663, source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, choices: true },
  });
  if (q663) {
    const choices = [...(q663.choices as string[])];
    choices[0] = '① $(-4) \\times a \\times (-0.1) = -0.4a$';
    if (!choices[4].endsWith('$')) choices[4] = choices[4] + '$';
    await prisma.question.update({ where: { id: q663.id }, data: { choices } });
    console.log('#663 choices 수정');
  }

  // #798: `\text{\textcircled{1}}` 안에 textcircled 남아있음 — 유니코드로 치환
  const q798 = await prisma.question.findFirst({
    where: { questionNum: 798, source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, explanation: true },
  });
  if (q798 && q798.explanation) {
    const fixed = q798.explanation
      .replace(/\\text\{\\textcircled\{(\d+)\}\}/g, (_m, n: string) => {
        const num = Number(n);
        if (num >= 1 && num <= 20) return `\\text{${String.fromCharCode(0x2460 + num - 1)}}`;
        return _m;
      })
      .replace(/\\textcircled\{(\d+)\}/g, (_m, n: string) => {
        const num = Number(n);
        if (num >= 1 && num <= 20) return String.fromCharCode(0x2460 + num - 1);
        return _m;
      });
    await prisma.question.update({ where: { id: q798.id }, data: { explanation: fixed } });
    console.log('#798 explanation 수정');
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
