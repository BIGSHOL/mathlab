/**
 * student01에게 시험 배정 + 학습 과정 배정 더미 데이터 추가
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STUDENT_ID = 'cmmdeyfro0003vdb8atfcu41a';

async function main() {
  // ─── 1. 시험 배정 (TestAssignment) ───
  console.log('=== 시험 배정 추가 ===');

  // 기존 시험 가져오기
  const tests = await prisma.test.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  if (tests.length === 0) {
    console.log('시험이 없습니다. 먼저 시험을 생성해주세요.');
  } else {
    for (const test of tests) {
      const existing = await prisma.testAssignment.findFirst({
        where: { testId: test.id, studentId: STUDENT_ID },
      });
      if (existing) {
        console.log(`  이미 배정됨: ${test.title}`);
        continue;
      }

      const daysAgo = Math.floor(Math.random() * 7) + 1;
      const dueDate = new Date(Date.now() + (7 - daysAgo) * 86400000);

      await prisma.testAssignment.create({
        data: {
          testId: test.id,
          studentId: STUDENT_ID,
          dueDate,
          status: 'ASSIGNED',
        },
      });
      console.log(`  배정 완료: ${test.title} (마감: ${dueDate.toLocaleDateString('ko-KR')})`);
    }
  }

  // ─── 2. 학습 과정 배정 (LearningCourseEnrollment) ───
  console.log('\n=== 학습 과정 배정 ===');

  // 기존 과정 확인
  let course = await prisma.learningCourse.findFirst({ where: { isActive: true } });

  if (!course) {
    // 과정이 없으면 생성
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    if (!teacher) {
      console.log('선생님 계정이 없습니다.');
      return;
    }

    // 개념 가져오기 (최대 8개)
    const concepts = await prisma.concept.findMany({
      take: 8,
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true },
    });

    if (concepts.length === 0) {
      console.log('개념이 없습니다.');
      return;
    }

    course = await prisma.learningCourse.create({
      data: {
        title: '초등 5학년 수학 기초 과정',
        description: '초등 5학년 1학기 핵심 개념을 다루는 기초 과정입니다.',
        createdBy: teacher.id,
        concepts: {
          create: concepts.map((c, i) => ({
            conceptId: c.id,
            sortOrder: i,
          })),
        },
      },
    });
    console.log(`  새 과정 생성: ${course.title} (개념 ${concepts.length}개)`);
  } else {
    console.log(`  기존 과정 사용: ${course.title}`);
  }

  // 학생에게 과정 배정
  const existingEnrollment = await prisma.learningCourseEnrollment.findUnique({
    where: { courseId_studentId: { courseId: course.id, studentId: STUDENT_ID } },
  });

  if (existingEnrollment) {
    console.log('  이미 배정됨');
  } else {
    await prisma.learningCourseEnrollment.create({
      data: {
        courseId: course.id,
        studentId: STUDENT_ID,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });
    console.log('  과정 배정 완료!');
  }

  // ─── 결과 확인 ───
  const assignmentCount = await prisma.testAssignment.count({ where: { studentId: STUDENT_ID } });
  const enrollmentCount = await prisma.learningCourseEnrollment.count({ where: { studentId: STUDENT_ID } });
  console.log(`\n=== 결과 ===`);
  console.log(`  시험 배정: ${assignmentCount}건`);
  console.log(`  과정 배정: ${enrollmentCount}건`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
