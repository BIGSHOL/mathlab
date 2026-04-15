import { prisma } from '../src/lib/db';

const TXT = [
  '**전략** 먼저 $a \\times b \\times c \\times d > 0$, $a \\times c \\times d < 0$임을 이용하여 $b$의 부호를 구한다.',
  '',
  '$a \\times b \\times c \\times d > 0$, $a \\times c \\times d < 0$이므로',
  '',
  '$b < 0$',
  '',
  '$a < b$이므로',
  '',
  '$a < 0$',
  '',
  '$a < 0$, $a \\times c \\times d < 0$에서 $c \\times d > 0$이므로 $c$, $d$의 부호는 같다.',
  '',
  '이때 $c + d < 0$이므로',
  '',
  '$c < 0,\\ d < 0$',
  '',
  '$\\therefore a < 0,\\ b < 0,\\ c < 0,\\ d < 0$',
].join('\n');

async function main() {
  const r = await prisma.question.updateMany({
    where: { questionNum: 521, source: '22개정 RPM 중 1-1 학생용' },
    data: { explanation: TXT },
  });
  console.log(`#521 업데이트: ${r.count}건`);
}
main().finally(() => prisma.$disconnect());
