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

function daysAgo(n: number, hour?: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour ?? (9 + Math.floor(Math.random() * 8)), Math.floor(Math.random() * 60), 0, 0);
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
  // BlankAttempt 삭제 시 BlankAnswerLog도 cascade 삭제됨
  await prisma.blankAttempt.deleteMany({ where: { studentId: STUDENT_ID } });
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

  // ── 3b. 빈칸 학습 답변 이력 (BlankAttempt + BlankAnswerLog) ──
  console.log('\n3b. 빈칸 학습 답변 이력 생성...');

  // 각 개념의 BlankExercise에서 blanks 정보 가져오기
  const exerciseMap = new Map<string, Array<{ position: number; answer: string; hint?: string }>>();
  for (const cid of CONCEPT_IDS) {
    const ex = await prisma.blankExercise.findFirst({
      where: { conceptId: cid },
      select: { blanks: true },
    });
    if (ex) {
      exerciseMap.set(cid, ex.blanks as Array<{ position: number; answer: string; hint?: string }>);
    }
  }

  // 빈칸 답변 생성 헬퍼
  type BlankInfo = { position: number; answer: string; hint?: string };
  function makeAnswers(blanks: BlankInfo[], allCorrect: boolean, wrongCount = 1) {
    return blanks.map((b, i) => ({
      blankPosition: b.position,
      submittedAnswer: (!allCorrect && i < wrongCount) ? (b.hint || '모르겠어요') : b.answer,
      correctAnswer: b.answer,
      isCorrect: allCorrect || i >= wrongCount,
    }));
  }

  // 개념1(큰 수): BLANK_EASY 2회, BLANK_HARD 2회, BLANK_FULL 2회
  // 시간순: 오전 → 오후 (1차 오답 → 2차 정답)
  const blanks0 = exerciseMap.get(CONCEPT_IDS[0]);
  if (blanks0) {
    // BLANK_EASY: 1차(오전 10시) 틀림 → 2차(오후 2시) 정답
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[0], stage: 'BLANK_EASY',
        score: Math.round(((blanks0.length - 2) / blanks0.length) * 100),
        allCorrect: false, hintCount: 1, revealCount: 0, createdAt: daysAgo(13, 10),
        answers: { create: makeAnswers(blanks0, false, 2) },
      },
    });
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[0], stage: 'BLANK_EASY',
        score: 100, allCorrect: true, hintCount: 0, revealCount: 0, createdAt: daysAgo(13, 14),
        answers: { create: makeAnswers(blanks0, true) },
      },
    });
    // BLANK_HARD: 1차(오전 10시) 틀림 → 2차(오후 3시) 정답
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[0], stage: 'BLANK_HARD',
        score: Math.round(((blanks0.length - 1) / blanks0.length) * 100),
        allCorrect: false, hintCount: 2, revealCount: 0, createdAt: daysAgo(12, 10),
        answers: { create: makeAnswers(blanks0, false, 1) },
      },
    });
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[0], stage: 'BLANK_HARD',
        score: 100, allCorrect: true, hintCount: 0, revealCount: 0, createdAt: daysAgo(12, 15),
        answers: { create: makeAnswers(blanks0, true) },
      },
    });
    // BLANK_FULL: 1차(오전 11시) 틀림 → 2차(오후 4시) 정답
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[0], stage: 'BLANK_FULL',
        score: Math.round(((blanks0.length - 1) / blanks0.length) * 100),
        allCorrect: false, hintCount: 1, revealCount: 0, createdAt: daysAgo(11, 11),
        answers: { create: makeAnswers(blanks0, false, 1) },
      },
    });
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[0], stage: 'BLANK_FULL',
        score: 100, allCorrect: true, hintCount: 0, revealCount: 0, createdAt: daysAgo(11, 16),
        answers: { create: makeAnswers(blanks0, true) },
      },
    });
    console.log('  큰 수: BLANK_EASY/HARD/FULL 각 2회 ✓');
  }

  // 개념2(각도): BLANK_EASY 3회, BLANK_HARD 3회
  // 시간순: 오전 → 오후 (점차 개선)
  const blanks1 = exerciseMap.get(CONCEPT_IDS[1]);
  if (blanks1) {
    // BLANK_EASY: 1차(10시) 많이틀림 → 2차(13시) 조금틀림 → 3차(16시) 전부정답
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[1], stage: 'BLANK_EASY',
        score: Math.round(((blanks1.length - 3) / blanks1.length) * 100),
        allCorrect: false, hintCount: 2, revealCount: 0, createdAt: daysAgo(6, 10),
        answers: { create: makeAnswers(blanks1, false, 3) },
      },
    });
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[1], stage: 'BLANK_EASY',
        score: Math.round(((blanks1.length - 1) / blanks1.length) * 100),
        allCorrect: false, hintCount: 1, revealCount: 0, createdAt: daysAgo(6, 13),
        answers: { create: makeAnswers(blanks1, false, 1) },
      },
    });
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[1], stage: 'BLANK_EASY',
        score: 100, allCorrect: true, hintCount: 0, revealCount: 0, createdAt: daysAgo(6, 16),
        answers: { create: makeAnswers(blanks1, true) },
      },
    });
    // BLANK_HARD: 1차(10시) 많이틀림 → 2차(13시) 조금틀림 → 3차(16시) 거의정답
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[1], stage: 'BLANK_HARD',
        score: Math.round(((blanks1.length - 3) / blanks1.length) * 100),
        allCorrect: false, hintCount: 3, revealCount: 0, createdAt: daysAgo(5, 10),
        answers: { create: makeAnswers(blanks1, false, 3) },
      },
    });
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[1], stage: 'BLANK_HARD',
        score: Math.round(((blanks1.length - 2) / blanks1.length) * 100),
        allCorrect: false, hintCount: 1, revealCount: 0, createdAt: daysAgo(5, 13),
        answers: { create: makeAnswers(blanks1, false, 2) },
      },
    });
    // 3차: 1개 틀림 (85점)
    const hardAnswers3 = blanks1.map((b, i) => ({
      blankPosition: b.position,
      submittedAnswer: i === blanks1.length - 1 ? '잘 모르겠어요' : b.answer,
      correctAnswer: b.answer,
      isCorrect: i !== blanks1.length - 1,
    }));
    await prisma.blankAttempt.create({
      data: {
        studentId: STUDENT_ID, conceptId: CONCEPT_IDS[1], stage: 'BLANK_HARD',
        score: 85, allCorrect: false, hintCount: 0, revealCount: 0, createdAt: daysAgo(5, 16),
        answers: { create: hardAnswers3 },
      },
    });
    console.log('  각도: BLANK_EASY 3회, BLANK_HARD 3회 ✓');
  }

  const blankAttemptCount = await prisma.blankAttempt.count({ where: { studentId: STUDENT_ID } });
  console.log(`  총 BlankAttempt: ${blankAttemptCount}개`);

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
