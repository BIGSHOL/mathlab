import { prisma } from '@/lib/db';
(async () => {
  const total = await prisma.labProblem.count();
  const withDia = await prisma.labProblem.count({ where: { diagram: { not: null } } });
  const srcs = await prisma.labProblem.groupBy({ by: ['source'], _count: true, where: { source: { contains: '지학사' } } });
  // 중2 도형(16-xx) 개념별 카운트
  const geo = await prisma.labProblem.groupBy({
    by: ['conceptId'], _count: true,
    where: { conceptId: { startsWith: 'lab-cur-mid-16-' } },
  });
  const geoTotal = geo.reduce((s, g) => s + g._count, 0);
  console.log('TOTAL', total, '| withDiagram', withDia);
  console.log('중2 도형(16-xx) total', geoTotal);
  console.log('지학사 sources:', JSON.stringify(srcs.map((s) => ({ s: s.source, n: s._count })), null, 1));
  await prisma.$disconnect();
})();
