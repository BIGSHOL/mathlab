import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 학생 조회
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, name: true },
    take: 5,
  });
  console.log(`학생 ${students.length}명 발견`);
  if (students.length === 0) { console.log('학생이 없습니다'); return; }

  // 문제 조회
  const questions = await prisma.question.findMany({
    select: { id: true, chapter: true, difficulty: true },
    take: 30,
  });
  console.log(`문제 ${questions.length}개 발견`);

  // 개념 조회
  const concepts = await prisma.concept.findMany({
    select: { id: true, title: true, conceptCode: true },
    take: 20,
  });
  console.log(`개념 ${concepts.length}개 발견`);

  // 기존 ReviewSchedule 삭제
  const deleted = await prisma.reviewSchedule.deleteMany({});
  console.log(`기존 복습 스케줄 ${deleted.count}개 삭제\n`);

  const INTERVALS = [3, 7, 14, 30, 60];
  const now = new Date();
  const records: any[] = [];

  for (const student of students) {
    console.log(`=== ${student.name} ===`);

    // 1. 오늘 복습 예정 (문제) — 3~5개
    const todayQuestions = questions.slice(0, Math.min(5, questions.length));
    for (let i = 0; i < todayQuestions.length; i++) {
      const q = todayQuestions[i];
      const interval = INTERVALS[i % INTERVALS.length];
      const daysAgo = interval; // interval일 전에 생성된 것처럼
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);
      const reviewAt = new Date(now);
      reviewAt.setHours(0, 0, 0, 0); // 오늘 0시

      records.push({
        studentId: student.id,
        questionId: q.id,
        conceptId: null,
        sourceType: 'test',
        sourceId: null,
        interval,
        reviewAt,
        completedAt: null,
        score: null,
        streak: Math.max(0, INTERVALS.indexOf(interval)),
        createdAt,
      });
      console.log(`  [오늘] 문제 "${q.chapter}" (${interval}일차, streak=${Math.max(0, INTERVALS.indexOf(interval))})`);
    }

    // 2. 오늘 복습 예정 (개념) — 2~3개
    const todayConcepts = concepts.slice(0, Math.min(3, concepts.length));
    for (let i = 0; i < todayConcepts.length; i++) {
      const c = todayConcepts[i];
      const interval = INTERVALS[i % 3];
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - interval);
      const reviewAt = new Date(now);
      reviewAt.setHours(0, 0, 0, 0);

      records.push({
        studentId: student.id,
        questionId: null,
        conceptId: c.id,
        sourceType: 'blank',
        sourceId: null,
        interval,
        reviewAt,
        completedAt: null,
        score: null,
        streak: i,
        createdAt,
      });
      console.log(`  [오늘] 개념 "${c.title}" (${interval}일차, streak=${i})`);
    }

    // 3. 내일 복습 예정 — 3개 (아직 안 뜸)
    for (let i = 0; i < Math.min(3, questions.length - 5); i++) {
      const q = questions[5 + i];
      const interval = INTERVALS[1]; // 7일차
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - 6); // 6일 전 생성
      const reviewAt = new Date(now);
      reviewAt.setDate(reviewAt.getDate() + 1); // 내일

      records.push({
        studentId: student.id,
        questionId: q.id,
        conceptId: null,
        sourceType: 'test',
        sourceId: null,
        interval,
        reviewAt,
        completedAt: null,
        score: null,
        streak: 1,
        createdAt,
      });
    }

    // 4. 이미 완료된 복습 — 5개 (통계용)
    for (let i = 0; i < Math.min(5, questions.length - 8); i++) {
      const q = questions[8 + i];
      const interval = INTERVALS[i % INTERVALS.length];
      const daysAgo = interval + 2;
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);
      const reviewAt = new Date(now);
      reviewAt.setDate(reviewAt.getDate() - 2);
      const completedAt = new Date(reviewAt);
      completedAt.setHours(14, 30, 0, 0);

      records.push({
        studentId: student.id,
        questionId: q.id,
        conceptId: null,
        sourceType: 'test',
        sourceId: null,
        interval,
        reviewAt,
        completedAt,
        score: i < 3 ? 100 : 0, // 3개 정답, 2개 오답
        streak: i < 3 ? i + 1 : 0,
        createdAt,
      });
    }

    // 5. 과거 오답으로 리셋된 복습 — 2개 (3일 후 다시 복습)
    for (let i = 0; i < Math.min(2, concepts.length - 3); i++) {
      const c = concepts[3 + i];
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - 1); // 어제 리셋됨
      const reviewAt = new Date(now);
      reviewAt.setDate(reviewAt.getDate() + 2); // 2일 후

      records.push({
        studentId: student.id,
        questionId: null,
        conceptId: c.id,
        sourceType: 'blank',
        sourceId: null,
        interval: 3, // 리셋됨
        reviewAt,
        completedAt: null,
        score: null,
        streak: 0, // 리셋됨
        createdAt,
      });
    }

    console.log(`  총 ${records.filter(r => r.studentId === student.id).length}개 스케줄 생성\n`);
  }

  // 일괄 생성
  const result = await prisma.reviewSchedule.createMany({ data: records });
  console.log(`\n✅ 총 ${result.count}개 ReviewSchedule 생성 완료`);

  // 통계 확인
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  for (const student of students) {
    const pending = await prisma.reviewSchedule.count({
      where: { studentId: student.id, reviewAt: { lte: todayEnd }, completedAt: null },
    });
    const completed = await prisma.reviewSchedule.count({
      where: { studentId: student.id, completedAt: { not: null } },
    });
    const future = await prisma.reviewSchedule.count({
      where: { studentId: student.id, reviewAt: { gt: todayEnd }, completedAt: null },
    });
    console.log(`  ${student.name}: 오늘 복습=${pending}개, 완료=${completed}개, 예정=${future}개`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
