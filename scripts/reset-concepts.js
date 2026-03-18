/**
 * 개념 관리 + 관련 데이터 전체 초기화
 *
 * 삭제 순서:
 * 1. ConceptHomeworkPlan → Enrollment 자동 삭제
 * 2. ConceptMemo
 * 3. LearningProgress
 * 4. BlankExercise
 * 5. ConceptPrerequisite
 * 6. Concept
 * 7. Subject
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== 개념 관리 + 관련 데이터 전체 초기화 ===\n');

  const hwCount = await p.conceptHomeworkPlan.count();
  await p.conceptHomeworkPlan.deleteMany({});
  console.log('- ConceptHomeworkPlan 삭제:', hwCount, '건 (+ Enrollment 연쇄 삭제)');

  const memoCount = await p.conceptMemo.count();
  await p.conceptMemo.deleteMany({});
  console.log('- ConceptMemo 삭제:', memoCount, '건');

  const progressCount = await p.learningProgress.count();
  await p.learningProgress.deleteMany({});
  console.log('- LearningProgress 삭제:', progressCount, '건');

  const blankCount = await p.blankExercise.count();
  await p.blankExercise.deleteMany({});
  console.log('- BlankExercise 삭제:', blankCount, '건');

  const prereqCount = await p.conceptPrerequisite.count();
  await p.conceptPrerequisite.deleteMany({});
  console.log('- ConceptPrerequisite 삭제:', prereqCount, '건');

  const conceptCount = await p.concept.count();
  await p.concept.deleteMany({});
  console.log('- Concept 삭제:', conceptCount, '건');

  const subjectCount = await p.subject.count();
  await p.subject.deleteMany({});
  console.log('- Subject 삭제:', subjectCount, '건');

  console.log('\n=== 초기화 완료 ===');
}

main()
  .catch((e) => { console.error('초기화 실패:', e); process.exit(1); })
  .finally(() => p.$disconnect());
