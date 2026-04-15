import { prisma } from '../src/lib/db';

const FIXES: Record<number, string> = {
  // #690: 마지막 $ 닫힘 누락
  690: [
    '**전략** 분모에 분수를 대입할 때에는 생략된 나눗셈 기호를 다시 쓴다.',
    '',
    '$\\frac{bc-2ac-3ab}{abc}$',
    '',
    '$= \\left[\\frac{2}{3} \\times \\left(-\\frac{3}{4}\\right) - 2 \\times \\frac{1}{2} \\times \\left(-\\frac{3}{4}\\right) - 3 \\times \\frac{1}{2} \\times \\frac{2}{3}\\right] \\div \\left[\\frac{1}{2} \\times \\frac{2}{3} \\times \\left(-\\frac{3}{4}\\right)\\right]$',
    '',
    '$= \\left\\{-\\frac{1}{2} + \\frac{3}{4} - 1\\right\\} \\div \\left\\{-\\frac{1}{4}\\right\\}$',
    '',
    '$= \\left\\{-\\frac{2}{4} + \\frac{3}{4} - \\frac{4}{4}\\right\\} \\div \\left\\{-\\frac{1}{4}\\right\\}$',
    '',
    '$= \\left\\{-\\frac{3}{4}\\right\\} \\times (-4)$',
    '',
    '$= 3$',
  ].join('\n'),

  // #879: `$(이익) = (판매 가격) - (원가)이므로` — $ 잘못 붙음
  879: [
    '선풍기의 원가를 $x$원이라 하면',
    '',
    '(정가) $= x+\\frac{20}{100}x = \\frac{6}{5}x$(원)',
    '',
    '이므로 (판매 가격) $= \\frac{6}{5}x-6000$(원)',
    '',
    '(이익) = (판매 가격) $-$ (원가)이므로',
    '',
    '$\\frac{10}{100}x = \\left(\\frac{6}{5}x-6000\\right)-x$',
    '',
    '$\\frac{1}{10}x = \\frac{6}{5}x-6000-x$',
    '',
    '$x=12x-60000-10x$',
    '',
    '$-x=-60000$',
    '',
    '$\\therefore x=60000$',
    '',
    '따라서 선풍기의 원가는 $60000$원이다.',
  ].join('\n'),

  // #880: 같은 패턴
  880: [
    '물건의 원가를 $x$원이라 하면',
    '',
    '(정가) $= x+\\frac{50}{100}x = \\frac{3}{2}x$(원)',
    '',
    '이므로 (판매 가격) $= \\frac{3}{2}x-400$(원)',
    '',
    '(이익) = (판매 가격) $-$ (원가)이므로',
    '',
    '$800 = \\left(\\frac{3}{2}x-400\\right)-x$',
    '',
    '$1600=3x-800-2x$',
    '',
    '$-x=-2400$',
    '',
    '$\\therefore x=2400$',
    '',
    '따라서 물건의 원가는 $2400$원이다.',
  ].join('\n'),

  // #881: 같은 패턴
  881: [
    '상품의 정가를 $x$원이라 하면 정가의 $20\\%$를 할인한 판매 가격은',
    '',
    '$x-\\frac{20}{100}x = \\frac{4}{5}x$(원)',
    '',
    '(이익) = (판매 가격) $-$ (원가)이므로',
    '',
    '$8000 \\times \\frac{15}{100} = \\frac{4}{5}x-8000$',
    '',
    '$120000=80x-800000$',
    '',
    '$-80x=-920000$',
    '',
    '$\\therefore x=11500$',
    '',
    '따라서 상품의 정가는 $11500$원이다.',
  ].join('\n'),

  // #501: LaTeX \frac이 $ 없이 있음
  501: [
    '덧셈과 뺄셈 사이의 관계를 이용한다.',
    '',
    '$A+\\left(-\\frac{1}{2}\\right)=-\\frac{5}{6}$에서',
    '',
    '$A=-\\frac{5}{6}-\\left(-\\frac{1}{2}\\right)=-\\frac{5}{6}+\\frac{3}{6}=-\\frac{2}{6}=-\\frac{1}{3}$',
    '',
    '$1-B=-\\frac{4}{3}$에서',
    '',
    '$B=1-\\left(-\\frac{4}{3}\\right)=\\frac{3}{3}+\\frac{4}{3}=\\frac{7}{3}$',
    '',
    '$\\therefore A+B=-\\frac{1}{3}+\\frac{7}{3}=\\frac{6}{3}=2$',
  ].join('\n'),
};

async function main() {
  for (const [num, txt] of Object.entries(FIXES)) {
    const r = await prisma.question.updateMany({
      where: { questionNum: Number(num), source: '22개정 RPM 중 1-1 학생용' },
      data: { explanation: txt },
    });
    console.log(`#${num}: ${r.count}건`);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
