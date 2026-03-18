/**
 * 시드 실행 스크립트
 * node scripts/seed-run.js
 */

const { PrismaClient } = require('@prisma/client');
const { GRADES } = require('./seed-test-data');
const { QUESTIONS_BY_GRADE } = require('./seed-questions');

const p = new PrismaClient();

async function main() {
  console.log('=== 테스트 시드 데이터 생성 시작 ===\n');

  let totalSubjects = 0;
  let totalConcepts = 0;
  let totalQuestions = 0;

  for (const grade of GRADES) {
    console.log(`\n── ${grade.title} (${grade.grade}) ──`);

    // 1. Subject 생성
    const subject = await p.subject.create({
      data: {
        title: grade.title,
        description: `${grade.title} 교과 과정`,
        gradeLevel: grade.gradeLevel,
        sortOrder: grade.gradeLevel,
      },
    });
    totalSubjects++;
    console.log(`  Subject: ${subject.title} (id: ${subject.id})`);

    // 2. Concepts 생성
    const conceptMap = {};  // chapter -> conceptId (문제와 매핑용)
    for (let i = 0; i < grade.concepts.length; i++) {
      const c = grade.concepts[i];
      const concept = await p.concept.create({
        data: {
          subjectId: subject.id,
          title: c.title,
          fullContent: c.fullContent,
          conceptCode: `${grade.bookCode}-C${String(i + 1).padStart(2, '0')}`,
          grade: grade.grade,
          semester: grade.semester,
          chapter: c.chapter,
          section: c.section,
          part: c.part,
          category: 'concept',
          sortOrder: i + 1,
          keywords: c.title,
        },
      });
      conceptMap[c.chapter] = concept.id;
      totalConcepts++;
    }
    console.log(`  Concepts: ${grade.concepts.length}개 생성`);

    // 3. Questions 생성
    const questions = QUESTIONS_BY_GRADE[grade.bookCode] || [];
    for (const q of questions) {
      // 해당 chapter의 concept 매핑
      const conceptId = conceptMap[q.chapter] || null;

      await p.question.create({
        data: {
          bookCode: grade.bookCode,
          chapter: q.chapter,
          section: q.section,
          questionNum: q.questionNum,
          difficulty: q.difficulty,
          type: q.type,
          content: q.content,
          choices: q.choices || undefined,
          answer: q.answer,
          explanation: q.explanation,
          domain: q.domain,
          conceptId,
        },
      });
      totalQuestions++;
    }
    console.log(`  Questions: ${questions.length}개 생성`);
  }

  console.log('\n=== 시드 완료 ===');
  console.log(`  Subject: ${totalSubjects}개`);
  console.log(`  Concept: ${totalConcepts}개`);
  console.log(`  Question: ${totalQuestions}개`);
}

main()
  .catch((e) => { console.error('시드 실패:', e); process.exit(1); })
  .finally(() => p.$disconnect());
