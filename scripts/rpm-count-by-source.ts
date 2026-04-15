import { prisma } from '../src/lib/db';

async function main() {
  const qs = await prisma.question.groupBy({
    by: ['source'],
    where: { source: { contains: 'RPM', mode: 'insensitive' } },
    _count: { _all: true },
    orderBy: { _count: { source: 'desc' } },
  });
  let total = 0;
  for (const r of qs) {
    console.log(`${r._count._all.toString().padStart(4)}건  ${r.source}`);
    total += r._count._all;
  }
  console.log(`\n총 ${total}건`);
}
main().finally(() => prisma.$disconnect());
