/**
 * 가장 최근 DiagnosticResult 찾기 — W4-3.2 시각 검증용.
 */
import { prisma } from '../src/lib/db';

async function main() {
  const rows = await prisma.diagnosticResult.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const studentIds = rows.map((r) => r.studentId);
  const students = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, username: true, name: true },
  });
  const sMap = new Map(students.map((s) => [s.id, s]));
  for (const r of rows) {
    const s = sMap.get(r.studentId);
    console.log('────────────');
    console.log('resultId   :', r.id);
    console.log('attemptId  :', r.attemptId);
    console.log('studentId  :', r.studentId);
    console.log('username   :', s?.username);
    console.log('name       :', s?.name);
    console.log('level      :', r.recommendLevel);
    console.log('accuracy   :', r.overallAccuracy);
    console.log('weakAreas  :', JSON.stringify(r.weakAreas).slice(0, 120));
    console.log('strongAreas:', JSON.stringify(r.strongAreas).slice(0, 120));
    console.log('URL        : /diagnostics/' + r.attemptId + '/result');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
