/**
 * 더미 워크북 시드 스크립트
 *
 * 기존 DB의 Test/Question/Concept을 활용하여 실제 작동하는 워크북 1~2개 생성.
 *
 * 1. 첫 번째 OWNER/SUPER_ADMIN 계정을 creator로 사용
 * 2. 그 계정의 tenant 또는 첫 번째 활성 tenant
 * 3. 해당 tenant의 데이터로 다양한 kind 섹션 구성:
 *    - Concept(개념) — 빈칸 옵션 포함
 *    - Question(문제 은행) — 여러 문제
 *    - Test(시험지) — 통째로
 *    - OxStatement(O/X 묶음) — 있을 때
 *    - ExamPaper(기출) — 추출 완료된 시험지가 있을 때
 *    - HomeworkQuestion(문제 숙제 일차) — 있을 때
 * 4. 결과 URL 출력 (예: /workbooks/{id})
 *
 * Usage: npx tsx scripts/seed-workbook.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PRINT_PRESET = {
  template: 'default',
  color: '#135bec',
  columns: 1,
  spacing: 16,
  showAnswers: false,
  quickAnswerOnly: false,
  showDate: true,
  showChapter: true,
  showDifficulty: false,
  showDivider: true,
};

async function main() {
  console.log('📚 더미 워크북 시드 시작...\n');

  // 1. Creator 후보 (OWNER 또는 SUPER_ADMIN)
  const creator = await prisma.user.findFirst({
    where: { role: { in: ['OWNER', 'SUPER_ADMIN'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, role: true, tenantId: true },
  });
  if (!creator) {
    throw new Error('OWNER 또는 SUPER_ADMIN 계정이 없습니다. 먼저 npm run db:seed로 기본 계정을 만드세요.');
  }
  console.log(`✅ Creator: ${creator.name} (${creator.role})`);

  // 2. Tenant 결정 — creator의 tenant 우선, 없으면 첫 번째 활성 tenant
  let tenantId = creator.tenantId;
  if (!tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (!tenant) throw new Error('활성 Tenant가 없습니다.');
    tenantId = tenant.id;
    console.log(`✅ Tenant (auto): ${tenant.name}`);
  } else {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    console.log(`✅ Tenant: ${tenant?.name ?? tenantId}`);
  }

  // 3. WORKBOOK 라이선스가 없으면 자동 발급 (테스트용)
  const license = await prisma.tenantLicense.findFirst({
    where: { tenantId, feature: 'WORKBOOK' },
    select: { id: true, isActive: true, expiresAt: true },
  });
  if (!license) {
    await prisma.tenantLicense.create({
      data: {
        tenantId,
        feature: 'WORKBOOK',
        maxSeats: 999,
        usedSeats: 0,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('✅ WORKBOOK 라이선스 자동 발급 (1년)');
  } else if (!license.isActive) {
    await prisma.tenantLicense.update({
      where: { id: license.id },
      data: { isActive: true, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    });
    console.log('✅ WORKBOOK 라이선스 활성화');
  } else {
    console.log('✅ WORKBOOK 라이선스 이미 활성');
  }

  // 4. 컨텐츠 후보 수집 (테넌트 스코프)
  const [tests, questions, concepts, oxStatements, examPapers, questionHomeworkPlans, arithmeticPlans] = await Promise.all([
    prisma.test.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }], isActive: true, questionCount: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, questionCount: true },
    }),
    prisma.question.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, content: true, bookCode: true, questionNum: true },
    }),
    prisma.concept.findMany({
      where: { fullContent: { not: '' } },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { id: true, title: true, fullContent: true },
    }),
    prisma.oxStatement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true, categoryId: true, level: true },
    }),
    prisma.examPaper.findMany({
      where: { tenantId, status: 'COMPLETED', extractedToBankAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { id: true, title: true },
    }),
    prisma.questionHomeworkPlan.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }], isActive: true, totalDays: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { id: true, title: true, totalDays: true },
    }),
    prisma.arithmeticHomeworkPlan.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }], isActive: true, totalDays: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { id: true, title: true, totalDays: true },
    }),
  ]);

  console.log(`\n📦 후보 데이터 수집:`);
  console.log(`   Tests: ${tests.length}`);
  console.log(`   Questions: ${questions.length}`);
  console.log(`   Concepts: ${concepts.length}`);
  console.log(`   OxStatements: ${oxStatements.length}`);
  console.log(`   ExamPapers (extracted): ${examPapers.length}`);
  console.log(`   QuestionHomeworkPlans: ${questionHomeworkPlans.length}`);
  console.log(`   ArithmeticHomeworkPlans: ${arithmeticPlans.length}`);

  if (tests.length === 0 && questions.length === 0 && concepts.length === 0) {
    throw new Error('컨텐츠가 부족합니다. 시험/문제/개념 데이터가 최소 1개는 있어야 합니다.');
  }

  // 5. 섹션 + 아이템 구성
  type SectionInput = {
    title: string;
    description?: string;
    items: Array<{
      kind: 'TEST_PAPER' | 'QUESTION' | 'CONCEPT_DOC' | 'OX_BUNDLE' | 'EXAM_PAPER' | 'HOMEWORK_DAY' | 'ARITHMETIC_DAY';
      questionId?: string | null;
      testId?: string | null;
      conceptId?: string | null;
      examPaperId?: string | null;
      arithmeticPlanId?: string | null;
      arithmeticDayIndex?: number | null;
      homeworkPlanId?: string | null;
      homeworkDayIndex?: number | null;
      inlineData?: Record<string, unknown> | null;
      answerSpace: 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';
      customLabel?: string | null;
      hideQuestionNum: boolean;
    }>;
  };

  const sections: SectionInput[] = [];

  // 섹션 1: 개념 정리 (CONCEPT_DOC)
  if (concepts.length > 0) {
    sections.push({
      title: '1단원 · 개념 정리',
      description: '학습할 개념을 먼저 정리하세요',
      items: concepts.map((c, idx) => ({
        kind: 'CONCEPT_DOC' as const,
        conceptId: c.id,
        answerSpace: 'NONE' as const,
        hideQuestionNum: false,
        inlineData: { blankLevel: idx === 0 ? 0 : 1 }, // 첫 번째는 원본, 두 번째는 빈칸 쉬움
      })),
    });
  }

  // 섹션 2: 문제 풀기 (QUESTION + TEST_PAPER)
  const sec2Items: SectionInput['items'] = [];
  questions.slice(0, 5).forEach((q) => {
    sec2Items.push({
      kind: 'QUESTION',
      questionId: q.id,
      answerSpace: 'MEDIUM',
      hideQuestionNum: false,
    });
  });
  if (tests[0]) {
    sec2Items.push({
      kind: 'TEST_PAPER',
      testId: tests[0].id,
      answerSpace: 'MEDIUM',
      customLabel: `[시험지: ${tests[0].title}]`,
      hideQuestionNum: false,
    });
  }
  if (sec2Items.length > 0) {
    sections.push({
      title: '2단원 · 문제 풀이',
      description: `문제 ${questions.length}개${tests[0] ? ' + 시험지 1세트' : ''}`,
      items: sec2Items,
    });
  }

  // 섹션 3: 추가 컨텐츠 (OX + ExamPaper + Homework day)
  const sec3Items: SectionInput['items'] = [];
  if (oxStatements.length >= 5) {
    const cat = oxStatements[0].categoryId;
    const lv = oxStatements[0].level;
    const sameCatStmts = oxStatements.filter((s) => s.categoryId === cat && s.level === lv).slice(0, 5);
    sec3Items.push({
      kind: 'OX_BUNDLE',
      answerSpace: 'NONE',
      hideQuestionNum: false,
      inlineData: {
        category: cat,
        level: lv,
        statementIds: sameCatStmts.map((s) => s.id),
        count: sameCatStmts.length,
      },
    });
  }
  if (examPapers[0]) {
    sec3Items.push({
      kind: 'EXAM_PAPER',
      examPaperId: examPapers[0].id,
      answerSpace: 'MEDIUM',
      customLabel: `[기출: ${examPapers[0].title}]`,
      hideQuestionNum: false,
    });
  }
  if (questionHomeworkPlans[0]) {
    sec3Items.push({
      kind: 'HOMEWORK_DAY',
      homeworkPlanId: questionHomeworkPlans[0].id,
      homeworkDayIndex: 0,
      answerSpace: 'MEDIUM',
      hideQuestionNum: false,
    });
  }
  if (arithmeticPlans[0]) {
    sec3Items.push({
      kind: 'ARITHMETIC_DAY',
      arithmeticPlanId: arithmeticPlans[0].id,
      arithmeticDayIndex: 0,
      answerSpace: 'SMALL',
      hideQuestionNum: false,
    });
  }
  if (sec3Items.length > 0) {
    sections.push({
      title: '3단원 · 종합 연습',
      description: 'O/X 진술 + 기출 + 숙제 통합',
      items: sec3Items,
    });
  }

  if (sections.length === 0) {
    throw new Error('섹션을 구성할 컨텐츠가 부족합니다.');
  }

  // 6. 워크북 생성 (transaction)
  const workbook = await prisma.workbook.create({
    data: {
      title: '더미 워크북 — 종합 학습지 샘플',
      subtitle: '시드 스크립트로 자동 생성',
      studentLabel: '데모 학생',
      semesterLabel: '2026년 1학기',
      academyName: '인재원',
      ownerName: '홍길동 원장',
      printPreset: DEFAULT_PRINT_PRESET,
      defaultAnswerSpace: 'MEDIUM',
      separateAnswerKey: true,
      showCover: true,
      showToc: true,
      createdBy: creator.id,
      tenantId,
      sections: {
        create: sections.map((s, sIdx) => ({
          title: s.title,
          description: s.description ?? null,
          startNewPage: true,
          sortOrder: sIdx,
          items: {
            create: s.items.map((it, iIdx) => ({
              sortOrder: iIdx,
              kind: it.kind,
              questionId: it.questionId ?? null,
              testId: it.testId ?? null,
              conceptId: it.conceptId ?? null,
              examPaperId: it.examPaperId ?? null,
              arithmeticPlanId: it.arithmeticPlanId ?? null,
              arithmeticDayIndex: it.arithmeticDayIndex ?? null,
              homeworkPlanId: it.homeworkPlanId ?? null,
              homeworkDayIndex: it.homeworkDayIndex ?? null,
              inlineData: (it.inlineData ?? null) as never,
              answerSpace: it.answerSpace,
              customLabel: it.customLabel ?? null,
              hideQuestionNum: it.hideQuestionNum,
            })),
          },
        })),
      },
    },
    include: {
      sections: { include: { items: true } },
    },
  });

  console.log(`\n✅ 워크북 생성 완료!`);
  console.log(`   ID: ${workbook.id}`);
  console.log(`   Seq: #${workbook.seq}`);
  console.log(`   Title: ${workbook.title}`);
  console.log(`   Sections: ${workbook.sections.length}개`);
  console.log(`   Total items: ${workbook.sections.reduce((sum, s) => sum + s.items.length, 0)}`);
  console.log(`\n🌐 브라우저에서 확인:`);
  console.log(`   - 상세: http://localhost:3000/workbooks/${workbook.id}`);
  console.log(`   - 인쇄 미리보기: http://localhost:3000/workbooks/${workbook.id}/print`);
  console.log(`   - 목록: http://localhost:3000/workbooks`);
}

main()
  .catch((e) => {
    console.error('❌ 시드 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
