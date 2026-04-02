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

    // 학습 진행 기록
    const stages = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL', 'BLANK_PAGE'] as const;
    let progressCount = 0;
    for (const student of demoStudents) {
      for (let i = 0; i < conceptsWithBlanks.length; i++) {
        const existing = await prisma.learningProgress.findFirst({
          where: { userId: student.id, conceptId: conceptsWithBlanks[i].id },
        });
        if (!existing) {
          const stageIdx = Math.min(i + 1, 4); // 학생마다 다른 진도
          await prisma.learningProgress.create({
            data: {
              id: uid(),
              userId: student.id,
              conceptId: conceptsWithBlanks[i].id,
              stage: stages[stageIdx],
              completedAt: stageIdx >= 3 ? new Date() : null,
              updatedAt: new Date(),
            },
          });
          progressCount++;
        }
      }
    }
    console.log(`  ✅ 학습 진행: ${progressCount}건`);

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

  const arithTitle = '중1 정수 사칙연산 연습';
  const existingArith = await prisma.arithmeticHomeworkPlan.findFirst({
    where: { title: arithTitle, tenantId: tenant.id },
  });
  if (!existingArith) {
    const hw = await prisma.arithmeticHomeworkPlan.create({
      data: {
        id: uid(),
        title: arithTitle,
        tenant: { connect: { id: tenant.id } },
        creator: { connect: { id: demoTeacher.id } },
        categories: ['int_add', 'int_sub', 'int_mul', 'int_div'],
        level: 'medium',
        dailyCount: 10,
        totalDays: 5,
        dailyProblems: [],
        passingScore: 80,
        startDate: new Date(),
        updatedAt: new Date(),
      },
    });
    for (const student of demoStudents) {
      await prisma.arithmeticHomeworkEnrollment.create({
        data: { id: uid(), planId: hw.id, studentId: student.id },
      });
    }
    console.log(`  ✅ 연산 숙제: ${arithTitle}`);
  } else {
    console.log(`  ↳ 연산 숙제 존재`);
  }

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
