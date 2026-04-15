import { prisma } from '../src/lib/db';

const TXT = [
  '$6-\\frac{x+a}{2}=a+5x$에 $x=3$을 대입하면',
  '',
  '$6-\\frac{3+a}{2}=a+15$',
  '',
  '양변에 $2$를 곱하면 $12-(3+a)=2a+30$',
  '',
  '$12-3-a=2a+30$, $-3a=21$',
  '',
  '$\\therefore a=-7$',
].join('\n');

async function main() {
  const r = await prisma.question.updateMany({
    where: { questionNum: 770, source: '22개정 RPM 중 1-1 학생용' },
    data: { explanation: TXT },
  });
  console.log('updated:', r.count);
  const q = await prisma.question.findFirst({
    where: { questionNum: 770, source: '22개정 RPM 중 1-1 학생용' },
    select: { explanation: true },
  });
  console.log('verify:', JSON.stringify(q?.explanation));
}
main().finally(() => prisma.$disconnect());
