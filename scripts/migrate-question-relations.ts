/**
 * 기존 questionIds Json → 중간테이블(TestQuestion, QuizSessionQuestion, HomeworkQuestion) 데이터 이전
 * 실행: npx tsx scripts/migrate-question-relations.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateTestQuestions() {
  const tests = await prisma.test.findMany({
    select: { id: true, questionIds: true },
  });

  let created = 0;
  for (const test of tests) {
    const ids = test.questionIds as string[];
    if (!ids || ids.length === 0) continue;

    // 이미 마이그레이션된 데이터 스킵
    const existing = await prisma.testQuestion.count({ where: { testId: test.id } });
    if (existing > 0) continue;

    await prisma.testQuestion.createMany({
      data: ids.map((qId, idx) => ({
        testId: test.id,
        questionId: qId,
        sortOrder: idx,
      })),
      skipDuplicates: true,
    });
    created += ids.length;
  }
  console.log(`TestQuestion: ${tests.length}개 시험 → ${created}개 레코드 생성`);
}

async function migrateQuizSessionQuestions() {
  const sessions = await prisma.quizSession.findMany({
    select: { id: true, questionIds: true },
  });

  let created = 0;
  for (const session of sessions) {
    const ids = session.questionIds as string[];
    if (!ids || ids.length === 0) continue;

    const existing = await prisma.quizSessionQuestion.count({ where: { sessionId: session.id } });
    if (existing > 0) continue;

    await prisma.quizSessionQuestion.createMany({
      data: ids.map((qId, idx) => ({
        sessionId: session.id,
        questionId: qId,
        sortOrder: idx,
      })),
      skipDuplicates: true,
    });
    created += ids.length;
  }
  console.log(`QuizSessionQuestion: ${sessions.length}개 세션 → ${created}개 레코드 생성`);
}

async function migrateHomeworkQuestions() {
  const plans = await prisma.questionHomeworkPlan.findMany({
    select: { id: true, dailyQuestions: true },
  });

  let created = 0;
  for (const plan of plans) {
    const daily = plan.dailyQuestions as unknown as string[][];
    if (!daily || daily.length === 0) continue;

    const existing = await prisma.homeworkQuestion.count({ where: { planId: plan.id } });
    if (existing > 0) continue;

    const data: { planId: string; questionId: string; dayIndex: number; sortOrder: number }[] = [];
    for (let dayIdx = 0; dayIdx < daily.length; dayIdx++) {
      const dayQuestions = daily[dayIdx];
      if (!dayQuestions) continue;
      for (let sortIdx = 0; sortIdx < dayQuestions.length; sortIdx++) {
        data.push({
          planId: plan.id,
          questionId: dayQuestions[sortIdx],
          dayIndex: dayIdx,
          sortOrder: sortIdx,
        });
      }
    }

    if (data.length > 0) {
      await prisma.homeworkQuestion.createMany({ data, skipDuplicates: true });
      created += data.length;
    }
  }
  console.log(`HomeworkQuestion: ${plans.length}개 플랜 → ${created}개 레코드 생성`);
}

async function main() {
  console.log('=== questionIds Json → 관계 테이블 마이그레이션 시작 ===\n');

  await migrateTestQuestions();
  await migrateQuizSessionQuestions();
  await migrateHomeworkQuestions();

  console.log('\n=== 마이그레이션 완료 ===');
}

main()
  .catch((e) => {
    console.error('마이그레이션 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
