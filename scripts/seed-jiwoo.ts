/**
 * 강지우 학생 더미 데이터 시드
 * - 학습 과정 배정 + 개념 학습 진행 + 연산 + XP
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STUDENT_ID = 'cmmdeyguc000lvdb8yqihqg8y'; // 강지우

// 초등4 개념 IDs (seed-run.js 실행 후 갱신 필요)
const CONCEPT_IDS = [
  'cmmvjwafa0021vdsgk2dgpgby', // 큰 수
  'cmmvjwafq0023vdsglqot03lt', // 각도
  'cmmvjwag50025vdsgi6d3mpht', // 곱셈과 나눗셈
  'cmmvjwagk0027vdsg70sat9r4', // 평면도형의 이동
  'cmmvjwah00029vdsgnnebk3u8', // 막대그래프
];

const STAGES = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'] as const;
const XP_MAP = { READING: 5, BLANK_EASY: 10, BLANK_HARD: 15, BLANK_FULL: 20 };

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

async function main() {
  console.log('=== 강지우 학생 더미 데이터 시드 시작 ===');

  // 선생님 찾기
  const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  if (!teacher) { console.error('선생님 없음'); return; }
  console.log('선생님:', teacher.name);

  // ── 0. 기존 데이터 정리 ──
  console.log('\n0. 기존 시드 데이터 정리...');
  await prisma.pointTransaction.deleteMany({ where: { userId: STUDENT_ID } });
  await prisma.learningProgress.deleteMany({ where: { userId: STUDENT_ID } });
  await prisma.arithmeticAttempt.deleteMany({ where: { studentId: STUDENT_ID } });
  await prisma.learningCourseEnrollment.deleteMany({ where: { studentId: STUDENT_ID } });
  // 이 선생님이 만든 시드 과정 삭제
  const oldCourses = await prisma.learningCourse.findMany({
    where: { createdBy: teacher.id, title: { startsWith: '초4-1학기' } },
  });
  for (const c of oldCourses) {
    await prisma.learningCourseConcept.deleteMany({ where: { courseId: c.id } });
    await prisma.learningCourse.delete({ where: { id: c.id } });
  }
  console.log('  정리 완료');

  // ── 1. 학습 과정 생성 ──
  console.log('\n1. 학습 과정 생성...');
  const course1 = await prisma.learningCourse.create({
    data: {
      title: '초4-1학기 기초 다지기',
      description: '큰 수, 각도, 곱셈과 나눗셈 기초',
      createdBy: teacher.id,
      concepts: {
        create: CONCEPT_IDS.slice(0, 3).map((id, i) => ({
          conceptId: id,
          sortOrder: i,
        })),
      },
    },
  });
  console.log('  과정1:', course1.title, '(개념 3개)');

  const course2 = await prisma.learningCourse.create({
    data: {
      title: '초4-1학기 도형과 그래프',
      description: '평면도형의 이동, 막대그래프',
      createdBy: teacher.id,
      concepts: {
        create: CONCEPT_IDS.slice(3).map((id, i) => ({
          conceptId: id,
          sortOrder: i,
        })),
      },
    },
  });
  console.log('  과정2:', course2.title, '(개념 2개)');

  // ── 2. 학생 배정 ──
  console.log('\n2. 학생 배정...');
  await prisma.learningCourseEnrollment.create({
    data: {
      courseId: course1.id,
      studentId: STUDENT_ID,
      sortOrder: 0,
      status: 'ACTIVE',
      startedAt: daysAgo(14),
    },
  });
  await prisma.learningCourseEnrollment.create({
    data: {
      courseId: course2.id,
      studentId: STUDENT_ID,
      sortOrder: 1,
      status: 'LOCKED',
    },
  });
  console.log('  과정1 → ACTIVE, 과정2 → LOCKED');

  // ── 3. 개념 학습 진행 ──
  console.log('\n3. 개념 학습 진행 생성...');
  let totalXp = 0;

  // 개념1(큰 수): 전 단계 완료 (14~10일 전)
  for (let s = 0; s < 4; s++) {
    const stage = STAGES[s];
    const startDate = daysAgo(14 - s);
    await prisma.learningProgress.create({
      data: {
        userId: STUDENT_ID,
        conceptId: CONCEPT_IDS[0],
        stage,
        completed: true,
        attempts: s === 0 ? 1 : 2,
        score: 100,
        startedAt: startDate,
        completedAt: startDate,
      },
    });
    const xp = XP_MAP[stage];
    totalXp += xp;
    await prisma.pointTransaction.create({
      data: { userId: STUDENT_ID, amount: xp, type: 'EARN', reason: stage, referenceId: CONCEPT_IDS[0], createdAt: startDate },
    });
  }
  console.log('  큰 수: 전 단계 완료 ✓');

  // 개념2(각도): BLANK_HARD까지 (7~4일 전)
  for (let s = 0; s < 3; s++) {
    const stage = STAGES[s];
    const startDate = daysAgo(7 - s);
    await prisma.learningProgress.create({
      data: {
        userId: STUDENT_ID,
        conceptId: CONCEPT_IDS[1],
        stage,
        completed: true,
        attempts: s === 0 ? 1 : 3,
        score: s === 2 ? 85 : 100,
        startedAt: startDate,
        completedAt: startDate,
      },
    });
    const xp = XP_MAP[stage];
    totalXp += xp;
    await prisma.pointTransaction.create({
      data: { userId: STUDENT_ID, amount: xp, type: 'EARN', reason: stage, referenceId: CONCEPT_IDS[1], createdAt: startDate },
    });
  }
  console.log('  각도: BLANK_HARD까지 완료');

  // 개념3(곱셈과 나눗셈): READING만 (오늘)
  const todayStart = daysAgo(0);
  await prisma.learningProgress.create({
    data: {
      userId: STUDENT_ID,
      conceptId: CONCEPT_IDS[2],
      stage: 'READING',
      completed: true,
      attempts: 1,
      score: 100,
      startedAt: todayStart,
      completedAt: todayStart,
    },
  });
  totalXp += 5;
  await prisma.pointTransaction.create({
    data: { userId: STUDENT_ID, amount: 5, type: 'EARN', reason: 'READING', referenceId: CONCEPT_IDS[2], createdAt: todayStart },
  });
  console.log('  곱셈과 나눗셈: READING 완료');

  // ── 4. 연산 연습 추가 (최근 7일) ──
  console.log('\n4. 연산 연습 더미 추가...');
  const categories = ['add_2digit', 'sub_2digit', 'mul_1digit', 'mul_2x1digit'];
  for (let day = 0; day < 5; day++) {
    const cat = categories[day % categories.length];
    const correct = 7 + Math.floor(Math.random() * 4); // 7~10
    const total = 10;
    const xp = correct >= 8 ? 15 : 10;
    totalXp += xp;
    const dt = daysAgo(day);
    await prisma.arithmeticAttempt.create({
      data: {
        studentId: STUDENT_ID,
        category: cat,
        level: '1',
        problemCount: total,
        correctCount: correct,
        score: correct * 10,
        xpEarned: xp,
        comboMax: Math.min(correct, 5),
        totalTimeSeconds: 60 + Math.floor(Math.random() * 120),
        createdAt: dt,
      },
    });
    await prisma.pointTransaction.create({
      data: { userId: STUDENT_ID, amount: xp, type: 'EARN', reason: 'ARITHMETIC', createdAt: dt },
    });
  }
  console.log('  연산 5회 추가 완료');

  // ── 5. StudentProfile 업데이트 ──
  console.log('\n5. 프로필 업데이트...');
  const level = totalXp >= 250 ? 3 : totalXp >= 100 ? 2 : 1;
  await prisma.studentProfile.upsert({
    where: { userId: STUDENT_ID },
    update: { totalXp, level, lastActiveAt: new Date() },
    create: { userId: STUDENT_ID, totalXp, level, lastActiveAt: new Date() },
  });
  console.log('  총 XP:', totalXp, '레벨:', level);

  console.log('\n=== 시드 완료! ===');
  console.log('리포트 페이지에서 강지우 학생 선택 후 일간/주간/월간 리포트를 생성해보세요.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
