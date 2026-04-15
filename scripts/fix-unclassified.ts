import { prisma } from '../src/lib/db';

const FIXES: Record<number, { chapter: string; section: string }> = {
  510: { chapter: '정수와 유리수', section: '정수와 유리수의 곱셈과 나눗셈' }, // 주사위 곱
  511: { chapter: '정수와 유리수', section: '정수와 유리수의 곱셈과 나눗셈' }, // A, B 나눗셈
  512: { chapter: '정수와 유리수', section: '정수와 유리수의 곱셈과 나눗셈' }, // 혼합계산
  513: { chapter: '정수와 유리수', section: '정수와 유리수의 곱셈과 나눗셈' }, // 곱셈 박스
  690: { chapter: '문자의 사용과 식', section: '문자의 사용과 식의 계산' }, // 식의 값
  801: { chapter: '일차방정식', section: '일차방정식의 풀이' }, // 항등식
};

async function main() {
  for (const [num, { chapter, section }] of Object.entries(FIXES)) {
    const r = await prisma.question.updateMany({
      where: { questionNum: Number(num), source: '22개정 RPM 중 1-1 학생용' },
      data: { chapter, section },
    });
    console.log(`#${num}: ${chapter}/${section} (${r.count}건)`);
  }
}
main().finally(() => prisma.$disconnect());
