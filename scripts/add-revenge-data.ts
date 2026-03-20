/**
 * 복수전 더미 데이터 추가
 * - 같은 chapter+difficulty에 오답 3개 이상 있어야 복수전 대상으로 표시됨
 * - student01에게 특정 chapter 문제들에 대한 오답 AnswerLog를 추가
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STUDENT_ID = 'cmmdeyfro0003vdb8atfcu41a';

async function main() {
  // 1. chapter별 객관식 문제 수 확인
  const groups = await prisma.question.groupBy({
    by: ['chapter', 'difficulty'],
    where: { chapter: { not: '' }, type: 'MULTIPLE_CHOICE' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 15,
  });
  console.log('=== chapter별 객관식 문제 수 (상위 15) ===');
  for (const g of groups) {
    console.log(`  ${g.chapter} [${g.difficulty}]: ${g._count.id}개`);
  }

  // 2. 3개 이상 문제가 있는 chapter+difficulty 그룹 선택 (최대 3개 그룹)
  const targetGroups = groups.filter(g => g._count.id >= 4).slice(0, 4);

  if (targetGroups.length === 0) {
    console.log('\n3개 이상 문제가 있는 그룹이 없습니다. 문제를 먼저 추가해야 합니다.');
    return;
  }

  console.log('\n=== 복수전 대상 그룹 ===');
  for (const g of targetGroups) {
    console.log(`  ${g.chapter} [${g.difficulty}]: ${g._count.id}개`);
  }

  // 3. 기존 테스트 찾기 (또는 새로 생성)
  let test = await prisma.test.findFirst({
    where: { title: '복수전 더미 테스트 2' },
  });

  if (!test) {
    const teacherId = (await prisma.user.findFirst({ where: { role: 'TEACHER' } }))!.id;
    test = await prisma.test.create({
      data: {
        title: '복수전 더미 테스트',
        description: '복수전 기능 테스트용 더미 시험',
        questionCount: 20,
        grade: 3,
        testType: 'concept',
        questionIds: [],
        createdBy: teacherId,
      },
    });
    console.log('\n새 테스트 생성:', test.id);
  }

  // 4. 각 그룹에서 문제를 가져와서 오답 AnswerLog 생성
  for (const group of targetGroups) {
    const questions = await prisma.question.findMany({
      where: {
        chapter: group.chapter,
        difficulty: group.difficulty as any,
        type: 'MULTIPLE_CHOICE',
      },
      take: 5,
    });

    console.log(`\n--- ${group.chapter} [${group.difficulty}]: ${questions.length}개 문제 처리 ---`);

    // 이 그룹 문제들로 TestAttempt 생성
    const daysAgo = Math.floor(Math.random() * 5) + 1;
    const attemptDate = new Date(Date.now() - daysAgo * 86400000);

    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        studentId: STUDENT_ID,
        startedAt: attemptDate,
        completedAt: new Date(attemptDate.getTime() + 20 * 60000),
        score: Math.round(questions.length * 0.3) * 20,
        maxScore: questions.length * 20,
        correctCount: Math.round(questions.length * 0.3),
        totalCount: questions.length,
        xpEarned: 5,
      },
    });

    // 각 문제에 대해 오답 AnswerLog 생성 (70% 오답)
    let wrongCount = 0;
    for (const q of questions) {
      const isCorrect = Math.random() < 0.15; // 15%만 정답 → 더 많은 오답
      const selectedAnswer = isCorrect ? q.answer : '오답입니다';

      // 중복 체크 (attemptId + questionId unique)
      const existing = await prisma.answerLog.findUnique({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: q.id } },
      });
      if (existing) continue;

      await prisma.answerLog.create({
        data: {
          attemptId: attempt.id,
          questionId: q.id,
          selectedAnswer,
          isCorrect,
          timeSpentSeconds: Math.floor(Math.random() * 60) + 30,
          createdAt: new Date(attemptDate.getTime() + Math.random() * 20 * 60000),
        },
      });
      if (!isCorrect) wrongCount++;
    }
    console.log(`  생성: ${questions.length}개 AnswerLog (오답 ${wrongCount}개)`);
  }

  // 5. 결과 확인
  const result = await prisma.$queryRaw<
    Array<{ chapter: string; difficulty: string; wrongCount: bigint }>
  >`
    SELECT q.chapter, q.difficulty::text, COUNT(DISTINCT al."questionId") as "wrongCount"
    FROM "AnswerLog" al
    JOIN "TestAttempt" ta ON ta.id = al."attemptId"
    JOIN "Question" q ON q.id = al."questionId"
    WHERE ta."studentId" = ${STUDENT_ID}
      AND al."isCorrect" = false
      AND q.chapter IS NOT NULL
    GROUP BY q.chapter, q.difficulty
    HAVING COUNT(DISTINCT al."questionId") >= 3
    ORDER BY COUNT(DISTINCT al."questionId") DESC
  `;

  console.log('\n=== 복수전 가능 그룹 (오답 3개+) ===');
  for (const r of result) {
    console.log(`  ${r.chapter} [${r.difficulty}]: 오답 ${r.wrongCount}개`);
  }

  if (result.length === 0) {
    console.log('  아직 없음 - 문제 수가 부족할 수 있습니다.');
  } else {
    console.log(`\n완료! ${result.length}개 그룹이 복수전 대상으로 표시됩니다.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
