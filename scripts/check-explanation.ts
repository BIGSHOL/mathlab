import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // 해설이 있는 중1 문제 확인
  const withExpl = await db.question.findMany({
    where: {
      bookCode: '1-1',
      explanation: { not: null },
      NOT: { explanation: '' }
    },
    select: { id: true, questionNum: true, source: true, explanation: true, content: true, answer: true },
    orderBy: { source: 'asc' }
  });
  console.log(`=== 해설 있는 중1 문제 (${withExpl.length}개) ===`);
  for (const q of withExpl) {
    console.log(`source: ${q.source}`);
    console.log(`Q${q.questionNum}: ${q.content?.substring(0, 80)}`);
    console.log(`answer: ${q.answer?.substring(0, 40)}`);
    console.log(`해설: ${q.explanation?.substring(0, 100)}`);
    console.log('---');
  }

  // 해설이 없지만 answer가 있는 문제 수
  const noExplHasAnswer = await db.question.count({
    where: {
      bookCode: '1-1',
      OR: [{ explanation: null }, { explanation: '' }],
      NOT: [{ answer: '' }]
    }
  });
  console.log(`\n해설 없지만 정답 있는 문제: ${noExplHasAnswer}개`);

  // source에 '지도서' 포함된 문제
  const guidebook = await db.question.findMany({
    where: {
      OR: [
        { source: { contains: '지도서' } },
        { source: { contains: '교사용' } },
        { source: { contains: 'guide' } },
      ]
    },
    select: { id: true, source: true, bookCode: true },
    take: 20
  });
  console.log(`\n=== 지도서/교사용 출처 문제: ${guidebook.length}개 ===`);
  for (const q of guidebook) {
    console.log(`bookCode: ${q.bookCode} | source: ${q.source}`);
  }

  await db.$disconnect();
}

main();
