/**
 * diagnostic 라이선스 활성 학생 + 그 학생의 DiagnosticResult 찾기 — W4-3.2 검증용.
 */
import { prisma } from '../src/lib/db';

async function main() {
  // 활성 student diagnostic 라이선스
  const licenses = await prisma.studentLicense.findMany({
    where: {
      feature: 'DIAGNOSTIC',
      revokedAt: null,
    },
    take: 20,
  });
  const studentIds = licenses.map((l) => l.studentId);
  if (studentIds.length === 0) {
    console.log('No diagnostic-licensed students found.');
    return;
  }

  const results = await prisma.diagnosticResult.findMany({
    where: { studentId: { in: studentIds } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: results.map((r) => r.studentId) } },
    select: { id: true, username: true, name: true },
  });
  const sMap = new Map(users.map((u) => [u.id, u]));
  for (const r of results) {
    const u = sMap.get(r.studentId);
    console.log('────────────');
    console.log('attemptId  :', r.attemptId);
    console.log('username   :', u?.username);
    console.log('name       :', u?.name);
    console.log('level      :', r.recommendLevel);
    console.log('accuracy   :', r.overallAccuracy);
    console.log('weakAreas  :', JSON.stringify(r.weakAreas).slice(0, 120));
    console.log('URL        : http://localhost:3000/diagnostics/' + r.attemptId + '/result');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
