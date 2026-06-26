import { prisma } from '@/lib/db';
(async () => {
  const srcs = await prisma.labProblem.groupBy({ by: ['source'], _count: true, orderBy: { _count: { source: 'desc' } } });
  console.log('=== sources ===');
  for (const s of srcs) console.log(`${String(s._count).padStart(4)}  ${s.source}`);
  // grade split by conceptId prefix
  const all = await prisma.labProblem.findMany({ select: { conceptId: true, diagram: true } });
  const byGrade: Record<string, number> = {};
  let dia = 0;
  for (const p of all) {
    const m = p.conceptId.match(/lab-cur-(mid|high|elem)-(\d+)-/);
    const g = m ? `${m[1]}-${m[2]}` : 'other';
    byGrade[g] = (byGrade[g] || 0) + 1;
    if (p.diagram != null) dia++;
  }
  console.log('\n=== by concept-group ===');
  for (const [k, v] of Object.entries(byGrade).sort((a, b) => b[1] - a[1])) console.log(`${String(v).padStart(4)}  ${k}`);
  console.log(`\nTOTAL ${all.length} | withDiagram ${dia}`);
  await prisma.$disconnect();
})();
