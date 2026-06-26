import { prisma } from '@/lib/db';
(async () => {
  const total = await prisma.labProblem.count();
  const withDia = await prisma.labProblem.count({ where: { diagram: { not: null } } });
  const geo = await prisma.labProblem.count({ where: { conceptId: { startsWith: 'lab-cur-mid-16-' } } });
  const rows = await prisma.labProblem.findMany({
    where: { source: '지학사(장경윤) 중2 도형 복구 [세션비전·도형렌더v2]' },
    select: { conceptId: true, provenance: true, diagram: true },
  });
  console.log('TOTAL', total, '| withDiagram', withDia, '| 중2 도형', geo);
  console.log('복구 source 행수:', rows.length);
  console.log('복구 author:', JSON.stringify((rows[0]?.provenance as { author?: string })?.author));
  console.log('복구 diagram 존재:', rows.filter((r) => r.diagram != null).length, '/', rows.length);
  await prisma.$disconnect();
})();
