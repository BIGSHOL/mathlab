import { prisma } from '../src/lib/db';

// 채점 요소 텍스트 (PDF 원문에서 수동 정제)
const SCORING: Record<number, string> = {
  157: '1. 최소공배수를 $n$을 사용하여 나타내기 40%\n2. $n$의 값 구하기 30%\n3. 최대공약수 구하기 30%',
  458: '1. $n+1$, $2n$이 홀수인지 짝수인지 알기 30%\n2. 주어진 식 계산하기 70%',
  515: '1. $a$, $b$의 값 구하기 20%\n2. $M$의 값 구하기 30%\n3. $m$의 값 구하기 30%\n4. $M-m$의 값 구하기 20%',
  684: '1. $a$의 값 구하기 40%\n2. $b$의 값 구하기 40%\n3. $ab$의 값 구하기 20%',
  690: '1. 어떤 다항식 구하기 50%\n2. 바르게 계산한 식 구하기 40%\n3. $b-a$의 값 구하기 10%',
  732: '1. 절댓값이 $3$인 수 구하기 20%\n2. 방정식의 해 구하기 80%',
  773: '1. $a$의 값 구하기 40%\n2. $b$의 값 구하기 50%\n3. $a+b$의 값 구하기 10%',
};

async function main() {
  for (const [num, txt] of Object.entries(SCORING)) {
    const r = await prisma.question.updateMany({
      where: { questionNum: Number(num), source: '22개정 RPM 중 1-1 학생용' },
      data: { scoringCriteria: txt },
    });
    console.log(`#${num}: ${r.count}건`);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
