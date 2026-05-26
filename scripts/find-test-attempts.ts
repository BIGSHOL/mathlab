/**
 * 가장 최근 완료된 TestAttempt 한 건 찾기 — W4 시각 검증용.
 */
import { prisma } from '../src/lib/db';

async function main() {
  const attempts = await prisma.testAttempt.findMany({
    where: { completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    take: 5,
    include: {
      test: { select: { seq: true, title: true, testType: true, tenantId: true } },
      student: { select: { id: true, username: true, name: true } },
    },
  });

  for (const a of attempts) {
    console.log('────────────');
    console.log('testSeq    :', a.test?.seq);
    console.log('testTitle  :', a.test?.title);
    console.log('testType   :', a.test?.testType);
    console.log('studentId  :', a.studentId);
    console.log('username   :', a.student?.username);
    console.log('name       :', a.student?.name);
    console.log('score      :', a.score, '/', a.maxScore);
    console.log('completedAt:', a.completedAt?.toISOString());
    console.log('URL        : /my-tests/' + a.test?.seq + '/result?_as=' + a.studentId);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
