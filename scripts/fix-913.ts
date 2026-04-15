import { prisma } from '../src/lib/db';

const TXT = [
  '**전략** 정사각형 모양의 종이의 수를 $n$이라 하고 주어진 도형의 둘레의 길이를 식으로 나타낸다.',
  '',
  '한 변의 길이가 $8$인 정사각형 모양의 종이 $n$장의 둘레의 길이의 합은 $n \\times 4 \\times 8 = 32n$',
  '',
  '겹쳐지는 부분은 한 변의 길이가 $4$인 정사각형 모양이므로 겹쳐지는 부분의 둘레의 길이의 합은',
  '',
  '$(n-1) \\times 4 \\times 4 = 16n-16$',
  '',
  '따라서 종이 $n$장을 이어 붙인 도형의 둘레의 길이는',
  '',
  '$32n-(16n-16)=16n+16$',
  '',
  '이때 둘레의 길이가 $240$이 되려면',
  '',
  '$16n+16=240$, $16n=224$',
  '',
  '$\\therefore n=14$',
  '',
  '따라서 종이 $14$장을 이어 붙이면 된다.',
].join('\n');

async function main() {
  const r = await prisma.question.updateMany({
    where: { questionNum: 913, source: '22개정 RPM 중 1-1 학생용' },
    data: { explanation: TXT, answer: '②' },
  });
  console.log('#913 업데이트 (explanation + answer=②):', r.count);
}
main().finally(() => prisma.$disconnect());
