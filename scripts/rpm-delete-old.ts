import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const SOURCE = 'RPM 중1-1';

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: SOURCE },
    select: { id: true, questionNum: true },
  });
  console.log(`대상: source="${SOURCE}" → ${qs.length}건`);
  const ids = qs.map(q => q.id);

  // FK 참조 체크
  const [testRefs, quizRefs, hwRefs, answerLogs, reviews, dailyQs] = await Promise.all([
    prisma.testQuestion.count({ where: { questionId: { in: ids } } }),
    prisma.quizSessionQuestion.count({ where: { questionId: { in: ids } } }),
    prisma.homeworkQuestion.count({ where: { questionId: { in: ids } } }),
    prisma.answerLog.count({ where: { questionId: { in: ids } } }),
    prisma.reviewSchedule.count({ where: { questionId: { in: ids } } }),
    prisma.dailyQuestion.count({ where: { questionId: { in: ids } } }),
  ]);
  console.log('\n외부 참조:');
  console.log(`  TestQuestion: ${testRefs}`);
  console.log(`  QuizSessionQuestion: ${quizRefs}`);
  console.log(`  HomeworkQuestion: ${hwRefs}`);
  console.log(`  AnswerLog: ${answerLogs}`);
  console.log(`  ReviewSchedule: ${reviews}`);
  console.log(`  DailyQuestion: ${dailyQs}`);

  if (!APPLY) {
    console.log('\n(dry-run — 적용하려면 --apply)');
    return;
  }

  // 참조 먼저 삭제 후 Question 삭제
  await prisma.$transaction(async (tx) => {
    await tx.testQuestion.deleteMany({ where: { questionId: { in: ids } } });
    await tx.quizSessionQuestion.deleteMany({ where: { questionId: { in: ids } } });
    await tx.homeworkQuestion.deleteMany({ where: { questionId: { in: ids } } });
    await tx.answerLog.deleteMany({ where: { questionId: { in: ids } } });
    await tx.reviewSchedule.deleteMany({ where: { questionId: { in: ids } } });
    await tx.dailyQuestion.deleteMany({ where: { questionId: { in: ids } } });
    const del = await tx.question.deleteMany({ where: { id: { in: ids } } });
    console.log(`\n✅ Question ${del.count}건 삭제`);
  });
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
