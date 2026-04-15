import { prisma } from '../src/lib/db';

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { questionNum: true },
    orderBy: { questionNum: 'asc' },
  });
  const nums = qs.map(q => q.questionNum).filter((n): n is number => n != null);
  console.log(`총 ${nums.length}건`);
  console.log(`최소 #${nums[0]} ~ 최대 #${nums[nums.length - 1]}`);
  // 연속된 범위를 구간으로
  const ranges: Array<[number, number]> = [];
  let start = nums[0], prev = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === prev + 1) { prev = nums[i]; continue; }
    ranges.push([start, prev]);
    start = prev = nums[i];
  }
  ranges.push([start, prev]);
  console.log(`연속 구간 ${ranges.length}개:`);
  for (const [a, b] of ranges) console.log(`  ${a === b ? `#${a}` : `#${a}~#${b}`} (${b - a + 1}건)`);
}
main().finally(() => prisma.$disconnect());
