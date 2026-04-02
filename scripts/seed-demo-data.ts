/**
 * 데모 데이터 시드 — 3가지 핵심 기능 집중
 * 1. 개념 5단계: LearningCourse + LearningProgress
 * 2. 연산 문제: ArithmeticHomeworkPlan
 * 3. 기출 분석: ExamPaper + ExamAnalysis 복제
 *
 * Usage: npx tsx scripts/seed-demo-data.ts
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const uid = () => crypto.randomUUID();

async function main() {
  console.log('🎯 데모 데이터 시드 (3가지 핵심 기능)...\n');

  // ── 기본 데이터 조회 ──
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } });
  if (!tenant) throw new Error('데모 테넌트 없음. seed-demo.ts 먼저 실행');

  const demoTeacher = await prisma.user.findFirst({ where: { username: 'demo-teacher' } });
  const demoStudents = await prisma.user.findMany({ where: { username: { startsWith: 'demo-s' } } });
  if (!demoTeacher || demoStudents.length === 0) throw new Error('데모 유저 없음');

  console.log(`  테넌트: ${tenant.name} | 선생님: ${demoTeacher.name} | 학생: ${demoStudents.length}명\n`);

  // ═══════════════════════════════════════
  // 1. 개념 5단계 데이터
  // ═══════════════════════════════════════
  console.log('── 1. 개념 5단계 ──');

  // 빈칸 연습이 있는 중등 개념 5개 선택
  const conceptsWithBlanks = await prisma.concept.findMany({
    where: {
      subject: { gradeLevel: { in: [7, 8] } },
      blanks: { some: {} },
    },
    include: { subject: { select: { title: true } } },
    take: 5,
  });
  console.log(`  빈칸 있는 개념: ${conceptsWithBlanks.length}개`);

  if (conceptsWithBlanks.length > 0) {
    // 학습 과정 생성
    const courseTitle = '중1 수학 핵심 개념 마스터';
    let course = await prisma.learningCourse.findFirst({
      where: { title: courseTitle, tenantId: tenant.id },
    });
    if (!course) {
      course = await prisma.learningCourse.create({
        data: {
          id: uid(),
          title: courseTitle,
          description: '소인수분해, 정수, 기본 도형 등 핵심 개념 5단계 학습',
          tenant: { connect: { id: tenant.id } },
          creator: { connect: { id: demoTeacher.id } },
          mode: 'SEQUENTIAL',
          updatedAt: new Date(),
        },
      });
      // 개념 연결
      for (let i = 0; i < conceptsWithBlanks.length; i++) {
        await prisma.learningCourseConcept.create({
          data: { id: uid(), courseId: course.id, conceptId: conceptsWithBlanks[i].id, sortOrder: i },
        });
      }
      console.log(`  ✅ 학습 과정: ${courseTitle} (개념 ${conceptsWithBlanks.length}개)`);
    } else {
      console.log(`  ↳ 학습 과정 존재: ${courseTitle}`);
    }

    // 학생 등록
    for (let i = 0; i < demoStudents.length; i++) {
      const existing = await prisma.learningCourseEnrollment.findFirst({
        where: { courseId: course.id, studentId: demoStudents[i].id },
      });
      if (!existing) {
        await prisma.learningCourseEnrollment.create({
          data: {
            id: uid(),
            courseId: course.id,
            studentId: demoStudents[i].id,
            status: i < 2 ? 'COMPLETED' : 'ACTIVE',
            updatedAt: new Date(),
          },
        });
      }
    }
    console.log(`  ✅ 학생 등록: ${demoStudents.length}명`);

    // 학습 진행 기록 — 각 단계별로 별도 record 생성 (completed: true)
    // 그리드는 stage별 completed=true인 record를 개별 조회
    const stages = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'] as const;
    let progressCount = 0;

    // 학생별 다른 진도: 학생0→전부 완료, 학생1→3단계, 학생2→2단계, ...
    const studentMaxStages = [4, 3, 2, 4, 1]; // 학생별 완료 단계 수

    for (let si = 0; si < demoStudents.length; si++) {
      const student = demoStudents[si];
      const maxStage = studentMaxStages[si % studentMaxStages.length];

      for (let ci = 0; ci < conceptsWithBlanks.length; ci++) {
        // 개념별로 약간 다르게: 앞쪽 개념은 더 많이, 뒤쪽은 덜
        const conceptMaxStage = Math.max(1, Math.min(maxStage, maxStage - ci + 1));

        for (let stageIdx = 0; stageIdx < conceptMaxStage; stageIdx++) {
          const existing = await prisma.learningProgress.findFirst({
            where: {
              userId: student.id,
              conceptId: conceptsWithBlanks[ci].id,
              stage: stages[stageIdx],
            },
          });
          if (!existing) {
            await prisma.learningProgress.create({
              data: {
                id: uid(),
                userId: student.id,
                conceptId: conceptsWithBlanks[ci].id,
                stage: stages[stageIdx],
                completed: true,
                completedAt: new Date(Date.now() - (conceptsWithBlanks.length - ci) * 86400000),
                updatedAt: new Date(),
              },
            });
            progressCount++;
          }
        }
      }
    }
    console.log(`  ✅ 학습 진행: ${progressCount}건 (단계별 개별 record)`);

    // 개념 숙제
    const conceptHomeworkTitle = '중1 핵심 개념 복습 숙제';
    const existingConceptHw = await prisma.conceptHomeworkPlan.findFirst({
      where: { title: conceptHomeworkTitle, tenantId: tenant.id },
    });
    if (!existingConceptHw) {
      const conceptIds = conceptsWithBlanks.map(c => c.id);
      const dailyConcepts = [conceptIds.slice(0, 2), conceptIds.slice(2, 4), conceptIds.slice(4)];
      const hw = await prisma.conceptHomeworkPlan.create({
        data: {
          id: uid(),
          title: conceptHomeworkTitle,
          tenant: { connect: { id: tenant.id } },
          creator: { connect: { id: demoTeacher.id } },
          totalDays: dailyConcepts.length,
          dailyConcepts,
          requiredStage: 'BLANK_FULL',
          startDate: new Date(),
          updatedAt: new Date(),
        },
      });
      // 학생 등록
      for (const student of demoStudents) {
        await prisma.conceptHomeworkEnrollment.create({
          data: { id: uid(), planId: hw.id, studentId: student.id },
        });
      }
      console.log(`  ✅ 개념 숙제: ${conceptHomeworkTitle}`);
    } else {
      console.log(`  ↳ 개념 숙제 존재`);
    }
  }

  // ═══════════════════════════════════════
  // 2. 연산 숙제
  // ═══════════════════════════════════════
  console.log('\n── 2. 연산 문제 ──');

  // 기존 데모 연산 숙제 삭제 후 재생성 (dailyProblems가 비어있을 수 있으므로)
  const arithTitle = '중1 정수 사칙연산 연습';
  const existingArith = await prisma.arithmeticHomeworkPlan.findFirst({
    where: { title: arithTitle, tenantId: tenant.id },
  });
  if (existingArith) {
    await prisma.arithmeticAttempt.deleteMany({ where: { homeworkPlanId: existingArith.id } });
    await prisma.arithmeticHomeworkEnrollment.deleteMany({ where: { planId: existingArith.id } });
    await prisma.arithmeticHomeworkPlan.delete({ where: { id: existingArith.id } });
    console.log(`  🗑️ 기존 연산 숙제 삭제`);
  }

  // 문제 생성 (arithmetic-generator 사용)
  const { generateProblems } = await import('../src/lib/services/arithmetic-generator');
  const categories = ['int_add', 'int_sub', 'int_mul', 'int_div'] as const;
  const totalDays = 5;
  const dailyCount = 10;
  const dailyProblems = [];
  for (let d = 0; d < totalDays; d++) {
    const dayProblems = generateProblems(
      categories[d % categories.length],
      'medium',
      dailyCount
    );
    dailyProblems.push(dayProblems);
  }
  console.log(`  📝 문제 생성: ${totalDays}일 × ${dailyCount}문제`);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 3); // 3일 전 시작 (일부 일차 완료 상태)

  const hw = await prisma.arithmeticHomeworkPlan.create({
    data: {
      id: uid(),
      title: arithTitle,
      tenant: { connect: { id: tenant.id } },
      creator: { connect: { id: demoTeacher.id } },
      categories: [...categories],
      level: 'medium',
      dailyCount,
      totalDays,
      dailyProblems,
      passingScore: 80,
      startDate,
      updatedAt: new Date(),
    },
  });

  for (const student of demoStudents) {
    await prisma.arithmeticHomeworkEnrollment.create({
      data: { id: uid(), planId: hw.id, studentId: student.id },
    });
  }

  // 학생별 연산 시도 (과거 일차에 대해)
  const attemptScores = [
    [90, 80, 100],  // 학생0: 1~3일차
    [70, 90],       // 학생1: 1~2일차
    [100, 100, 80], // 학생2: 1~3일차
    [60],           // 학생3: 1일차만
    [80, 90, 70],   // 학생4: 1~3일차
  ];
  let attemptCount = 0;
  for (let si = 0; si < demoStudents.length; si++) {
    const scores = attemptScores[si % attemptScores.length];
    for (let d = 0; d < scores.length; d++) {
      const score = scores[d];
      const correctCount = Math.round((score / 100) * dailyCount);
      const attemptId = uid();
      const totalTime = 120 + Math.floor(Math.random() * 180);
      await prisma.arithmeticAttempt.create({
        data: {
          id: attemptId,
          studentId: demoStudents[si].id,
          homeworkPlanId: hw.id,
          homeworkDayIndex: d,
          category: String(categories[d % categories.length]),
          level: 'medium',
          problemCount: dailyCount,
          correctCount,
          score,
          totalTimeSeconds: totalTime,
          completedAt: new Date(startDate.getTime() + d * 86400000 + 36000000),
        },
      });

      // 개별 답안 생성 (ArithmeticAnswer) — 채점현황 표시에 필요
      const dayProbs = dailyProblems[d] ?? [];
      for (let qi = 0; qi < dayProbs.length; qi++) {
        const prob = dayProbs[qi];
        // correctCount개 정답, 나머지 오답
        const isCorrect = qi < correctCount;
        const wrongChoices = prob.choices.filter((c: string) => c !== prob.answer);
        const selectedAnswer = isCorrect
          ? prob.answer
          : wrongChoices[Math.floor(Math.random() * wrongChoices.length)] ?? prob.choices[0];
        await prisma.arithmeticAnswer.create({
          data: {
            id: uid(),
            attemptId,
            problemIndex: qi,
            content: prob.content,
            choices: prob.choices,
            selectedAnswer,
            correctAnswer: prob.answer,
            isCorrect,
            timeSpentSeconds: Math.round(totalTime / dailyCount),
          },
        });
      }
      attemptCount++;
    }
  }
  console.log(`  ✅ 연산 숙제: ${arithTitle} (시도 ${attemptCount}건)`);

  // ═══════════════════════════════════════
  // 3. 기출 분석 (기존 데이터 복제)
  // ═══════════════════════════════════════
  console.log('\n── 3. 기출 분석 ──');

  // 완료된 기출 3개를 소스로 사용
  const sourceIds = [
    'cmnei3qrp000fvd7c2a5146x9', // 대구일중
    'cmnei408f000hvd7cvg4vq5h3', // 경명여중
    'cmnfl66jq0003vdpktxc6v3q1', // 침산중
  ];

  for (const sourceId of sourceIds) {
    const source = await prisma.examPaper.findUnique({
      where: { id: sourceId },
      include: {
        analyses: { include: { extensions: true } },
      },
    });
    if (!source) {
      console.log(`  ⚠️ 소스 ExamPaper 없음: ${sourceId}`);
      continue;
    }

    // 이미 데모 테넌트에 같은 제목이 있으면 스킵
    const existing = await prisma.examPaper.findFirst({
      where: { title: source.title, tenantId: tenant.id },
    });
    if (existing) {
      console.log(`  ↳ 존재: ${source.title}`);
      continue;
    }

    // ExamPaper 복제
    const newPaperId = uid();
    await prisma.examPaper.create({
      data: {
        id: newPaperId,
        tenantId: tenant.id,
        teacherId: demoTeacher.id,
        title: source.title,
        subject: source.subject,
        grade: source.grade,
        category: source.category,
        unit: source.unit,
        examScope: source.examScope ?? undefined,
        schoolName: source.schoolName,
        schoolId: source.schoolId,
        examType: source.examType,
        fileUrls: source.fileUrls,
        fileType: source.fileType,
        status: 'COMPLETED',
        analysisStep: 4,
        updatedAt: new Date(),
      },
    });

    // ExamAnalysis 복제
    for (const analysis of source.analyses) {
      const newAnalysisId = uid();
      await prisma.examAnalysis.create({
        data: {
          id: newAnalysisId,
          examPaperId: newPaperId,
          questions: analysis.questions ?? undefined,
          summary: analysis.summary ?? undefined,
          markDetection: analysis.markDetection ?? undefined,
          crossValidation: analysis.crossValidation ?? undefined,
          modelVersion: analysis.modelVersion,
          totalQuestions: analysis.totalQuestions,
          totalPoints: analysis.totalPoints,
          earnedPoints: analysis.earnedPoints,
        },
      });

      // Extension 복제
      for (const ext of (analysis.extensions || [])) {
        await prisma.examAnalysisExtension.create({
          data: {
            id: uid(),
            analysisId: newAnalysisId,
            type: ext.type,
            content: ext.content ?? undefined,
          },
        });
      }
    }

    console.log(`  ✅ 복제: ${source.title}`);
  }

  // ═══════════════════════════════════════
  // 보너스: 뱃지 + XP
  // ═══════════════════════════════════════
  console.log('\n── 보너스: 뱃지/XP ──');

  const badges = await prisma.badge.findMany({ take: 5 });
  let badgeCount = 0;
  for (const student of demoStudents) {
    for (let i = 0; i < Math.min(2, badges.length); i++) {
      const existing = await prisma.userBadge.findFirst({
        where: { userId: student.id, badgeId: badges[i].id },
      });
      if (!existing) {
        await prisma.userBadge.create({
          data: { id: uid(), userId: student.id, badgeId: badges[i].id, earnedAt: new Date() },
        });
        badgeCount++;
      }
    }
  }
  console.log(`  ✅ 뱃지: ${badgeCount}건`);

  console.log('\n🎉 데모 데이터 시드 완료!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
