/**
 * 문제은행 + 관련 데이터 전체 초기화 스크립트
 *
 * 실행: npx tsx scripts/reset-questions.ts
 *
 * 삭제 순서 (Cascade 관계 활용):
 * 1. Test → TestAttempt(→AnswerLog), TestAssignment, LevelTestConfig 자동 삭제
 * 2. QuizSession → QuizParticipant(→QuizAnswerLog) 자동 삭제
 * 3. QuestionHomeworkPlan → QuestionHomeworkEnrollment, QuestionHomeworkAttempt 자동 삭제
 * 4. QuestionGenerationLog 삭제
 * 5. Question 삭제
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 문제은행 + 관련 데이터 전체 초기화 ===\n');

  // 1. Test 삭제 (Cascade: TestAttempt→AnswerLog, TestAssignment, LevelTestConfig)
  const testCount = await prisma.test.count();
  await prisma.test.deleteMany({});
  console.log(`✓ Test 삭제: ${testCount}건 (+ TestAttempt, AnswerLog, TestAssignment, LevelTestConfig 연쇄 삭제)`);

  // 2. QuizSession 삭제 (Cascade: QuizParticipant→QuizAnswerLog)
  const quizCount = await prisma.quizSession.count();
  await prisma.quizSession.deleteMany({});
  console.log(`✓ QuizSession 삭제: ${quizCount}건 (+ QuizParticipant, QuizAnswerLog 연쇄 삭제)`);

  // 3. QuestionHomeworkPlan 삭제 (Cascade: Enrollment, Attempt)
  const hwCount = await prisma.questionHomeworkPlan.count();
  await prisma.questionHomeworkPlan.deleteMany({});
  console.log(`✓ QuestionHomeworkPlan 삭제: ${hwCount}건 (+ Enrollment, Attempt 연쇄 삭제)`);

  // 4. QuestionGenerationLog 삭제
  const logCount = await prisma.questionGenerationLog.count();
  await prisma.questionGenerationLog.deleteMany({});
  console.log(`✓ QuestionGenerationLog 삭제: ${logCount}건`);

  // 5. Question 삭제
  const qCount = await prisma.question.count();
  await prisma.question.deleteMany({});
  console.log(`✓ Question 삭제: ${qCount}건`);

  console.log('\n=== 초기화 완료 ===');
}

main()
  .catch((e) => {
    console.error('초기화 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
