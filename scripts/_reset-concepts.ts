/**
 * 기존 개념 데이터 전체 교체 준비
 * 1) 기존 개념에 연결된 모든 의존 데이터 삭제
 * 2) 기존 개념 전체 삭제
 * 3) 기존 Subject 중 개념이 0개인 것 삭제
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const dryRun = !process.argv.includes('--apply');
  console.log(`=== 개념 데이터 전체 초기화 (${dryRun ? 'DRY-RUN' : '실제 적용'}) ===\n`);

  // 삭제 대상 집계
  const stats = {
    conceptPrerequisite: await p.conceptPrerequisite.count(),
    blankAnswerLog: await p.blankAnswerLog.count(),
    blankAttempt: await p.blankAttempt.count(),
    blankExercise: await p.blankExercise.count(),
    learningProgress: await p.learningProgress.count(),
    conceptHomeworkEnrollment: await p.conceptHomeworkEnrollment.count(),
    conceptHomeworkPlan: await p.conceptHomeworkPlan.count(),
    conceptMemo: await p.conceptMemo.count(),
    concept: await p.concept.count(),
  };

  // Question.conceptId null로 초기화
  const linkedQuestions = await p.question.count({ where: { conceptId: { not: null } } });

  console.log('삭제 대상:');
  for (const [k, v] of Object.entries(stats)) {
    console.log(`  ${k}: ${v}개`);
  }
  console.log(`  Question.conceptId 초기화: ${linkedQuestions}개`);

  // 빈 Subject 확인
  const subjects = await p.subject.findMany({
    select: { id: true, title: true, _count: { select: { concepts: true } } },
  });
  const nonEmptySubjects = subjects.filter((s) => s._count.concepts > 0);
  console.log(`\nSubject (개념 보유, 삭제 후 빈 Subject 후보): ${nonEmptySubjects.length}개`);
  for (const s of nonEmptySubjects) {
    console.log(`  - "${s.title}" (${s._count.concepts}개 개념)`);
  }

  if (dryRun) {
    console.log('\n⚠️  DRY-RUN 모드. 실제 삭제하려면: npx tsx scripts/_reset-concepts.ts --apply');
    await p.$disconnect();
    return;
  }

  // 실제 삭제 (의존성 순서대로)
  console.log('\n삭제 시작...');

  // 1) 선수관계
  const r1 = await p.conceptPrerequisite.deleteMany();
  console.log(`  conceptPrerequisite: ${r1.count}개 삭제`);

  // 2) 빈칸 답변 로그 → 빈칸 시도 → 빈칸 연습
  const r2a = await p.blankAnswerLog.deleteMany();
  console.log(`  blankAnswerLog: ${r2a.count}개 삭제`);
  const r2b = await p.blankAttempt.deleteMany();
  console.log(`  blankAttempt: ${r2b.count}개 삭제`);
  const r3 = await p.blankExercise.deleteMany();
  console.log(`  blankExercise: ${r3.count}개 삭제`);

  // 3) 학습 진행도
  const r4 = await p.learningProgress.deleteMany();
  console.log(`  learningProgress: ${r4.count}개 삭제`);

  // 4) 개념 숙제
  const r5 = await p.conceptHomeworkEnrollment.deleteMany();
  console.log(`  conceptHomeworkEnrollment: ${r5.count}개 삭제`);
  const r6 = await p.conceptHomeworkPlan.deleteMany();
  console.log(`  conceptHomeworkPlan: ${r6.count}개 삭제`);

  // 5) 개념 메모
  const r7 = await p.conceptMemo.deleteMany();
  console.log(`  conceptMemo: ${r7.count}개 삭제`);

  // 6) Question.conceptId 초기화
  const r8 = await p.question.updateMany({
    where: { conceptId: { not: null } },
    data: { conceptId: null },
  });
  console.log(`  Question.conceptId null: ${r8.count}개`);

  // 7) 개념 삭제
  const r9 = await p.concept.deleteMany();
  console.log(`  concept: ${r9.count}개 삭제`);

  // 8) 빈 Subject 삭제
  for (const s of subjects) {
    const remaining = await p.concept.count({ where: { subjectId: s.id } });
    if (remaining === 0) {
      // Subject에 연결된 다른 것들이 있을 수 있으므로 try-catch
      try {
        await p.subject.delete({ where: { id: s.id } });
        console.log(`  subject "${s.title}" 삭제`);
      } catch {
        console.log(`  subject "${s.title}" 유지 (다른 참조 존재)`);
      }
    }
  }

  console.log('\n✅ 초기화 완료!');
  await p.$disconnect();
}

main().catch(console.error);
