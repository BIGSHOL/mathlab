import { prisma } from '../src/lib/db';

const NUMS = [279, 299, 300, 405, 408, 431, 471, 474, 475, 476, 497, 500, 501, 521, 631, 690, 692, 739, 741, 748, 770, 772, 774, 776, 778, 780, 781, 788, 801, 820, 851, 879, 880, 881, 887, 895, 907, 913];

async function main() {
  const qs = await prisma.question.findMany({
    where: { questionNum: { in: NUMS }, source: '22개정 RPM 중 1-1 학생용' },
    select: { questionNum: true, type: true, answer: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });
  for (const q of qs) {
    console.log(`\n═══ #${q.questionNum} (${q.type}) 답: ${JSON.stringify(q.answer)} ═══`);
    console.log(q.explanation || '(해설 없음)');
  }
}
main().finally(()=>prisma.$disconnect());
