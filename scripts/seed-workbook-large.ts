/**
 * 100페이지급 짜임새 있는 더미 워크북 시드
 *
 * 기존 DB의 Concept(개념) / Question(문제) / Test(시험지) / OxStatement(O/X) /
 * ArithmeticHomeworkPlan / QuestionHomeworkPlan을 활용하여
 * 9개 섹션·100~180p급 종합 학습지 1권을 생성한다.
 *
 * 구성:
 *   1) 개념 정리         CONCEPT_DOC × 6  (원본)
 *   2) 빈칸으로 외우기    CONCEPT_DOC × 4  (빈칸 쉬움/어려움/통문장 분산)
 *   3) 기본 문제 30선    QUESTION × 30   (BASIC, SMALL 풀이공간)
 *   4) 응용 문제 30선    QUESTION × 30   (MEDIUM, MEDIUM 풀이공간)
 *   5) 심화 문제 20선    QUESTION × 20   (HIGH/HIGHEST, LARGE 풀이공간)
 *   6) O/X 진단          OX_BUNDLE × 3   (카테고리·레벨별)
 *   7) 일일 연산 훈련    ARITHMETIC_DAY × 10  (가장 큰 plan)
 *   8) 단원별 숙제       HOMEWORK_DAY × 5 + ARITHMETIC_DAY × 5
 *   9) 종합 평가         TEST_PAPER × 1~3
 *
 * Usage: npx tsx scripts/seed-workbook-large.ts
 */
import { PrismaClient } from '@prisma/client';
import { inferAnswerSpace, inferColumns, type ItemHeuristic } from '../src/lib/services/workbook/auto-options';

const prisma = new PrismaClient();

const PRINT_PRESET = {
  template: 'default',
  color: '#135bec',
  columns: 1,
  spacing: 18,
  showAnswers: false,
  quickAnswerOnly: false,
  showDate: true,
  showChapter: true,
  showDifficulty: true,
  showDivider: true,
};

type ItemKind = 'TEST_PAPER' | 'QUESTION' | 'CONCEPT_DOC' | 'OX_BUNDLE' | 'EXAM_PAPER' | 'HOMEWORK_DAY' | 'ARITHMETIC_DAY';
type AnswerSpace = 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

interface ItemInput {
  kind: ItemKind;
  questionId?: string | null;
  testId?: string | null;
  conceptId?: string | null;
  examPaperId?: string | null;
  arithmeticPlanId?: string | null;
  arithmeticDayIndex?: number | null;
  homeworkPlanId?: string | null;
  homeworkDayIndex?: number | null;
  inlineData?: Record<string, unknown> | null;
  answerSpace: AnswerSpace;
  customLabel?: string | null;
  hideQuestionNum: boolean;
}

interface SectionInput {
  title: string;
  description?: string;
  startNewPage?: boolean;
  /** 섹션별 columns override — null이면 워크북 전역 columns 따름 */
  columnsOverride?: 1 | 2 | null;
  /** 헬퍼 추론 입력 — 모든 항목 push 후 inferColumns로 columnsOverride 결정 */
  heuristics?: ItemHeuristic[];
  items: ItemInput[];
}

async function main() {
  console.log('📚 100페이지급 더미 워크북 시드 시작\n');

  // 1) Creator + Tenant 결정 ─────────────────────────────────
  const creator = await prisma.user.findFirst({
    where: { role: { in: ['OWNER', 'SUPER_ADMIN'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, role: true, tenantId: true },
  });
  if (!creator) throw new Error('OWNER/SUPER_ADMIN 계정이 없습니다.');

  let tenantId = creator.tenantId;
  if (!tenantId) {
    const t = await prisma.tenant.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (!t) throw new Error('활성 Tenant가 없습니다.');
    tenantId = t.id;
    console.log(`✅ Creator: ${creator.name} (${creator.role}) | Tenant(auto): ${t.name}`);
  } else {
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    console.log(`✅ Creator: ${creator.name} (${creator.role}) | Tenant: ${t?.name ?? tenantId}`);
  }

  // 2) WORKBOOK 라이선스 자동 발급 ─────────────────────────
  const license = await prisma.tenantLicense.findFirst({
    where: { tenantId, feature: 'WORKBOOK' },
    select: { id: true, isActive: true },
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
    console.log('✅ WORKBOOK 라이선스 활성');
  }

  const tenantOr = { OR: [{ tenantId }, { tenantId: null }] };

  // 3) 컨텐츠 후보 수집 (난이도별 문제 분리) ─────────────
  const [
    concepts,
    basicQs,
    mediumQs,
    advancedQs,
    fallbackQs,
    oxAll,
    arithmeticPlans,
    qHomeworkPlans,
    tests,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; title: string; chapter: string | null; section: string | null; source: string | null; len: number }>>`
      SELECT id, title, chapter, section, source, length("fullContent") AS len
        FROM "Concept"
       WHERE "fullContent" IS NOT NULL
         AND length("fullContent") > 200
       ORDER BY
         CASE WHEN source = 'textbook-rich' THEN 0 ELSE 1 END,  -- 풍부 본문 우선
         length("fullContent") DESC,                             -- 긴 것 우선
         "createdAt" DESC
       LIMIT 12
    `,
    prisma.question.findMany({
      where: { ...tenantOr, difficulty: 'BASIC' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, bookCode: true, chapter: true, questionNum: true, type: true, content: true, diagramSpec: true },
    }),
    prisma.question.findMany({
      where: { ...tenantOr, difficulty: 'MEDIUM' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, bookCode: true, chapter: true, questionNum: true, type: true, content: true, diagramSpec: true },
    }),
    prisma.question.findMany({
      where: { ...tenantOr, difficulty: { in: ['HIGH', 'HIGHEST'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, bookCode: true, chapter: true, questionNum: true, type: true, content: true, diagramSpec: true },
    }),
    // 난이도 분포가 부족할 때 채울 fallback (난이도 무관 최신 80개)
    prisma.question.findMany({
      where: tenantOr,
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { id: true, bookCode: true, chapter: true, questionNum: true, type: true, content: true, diagramSpec: true },
    }),
    prisma.oxStatement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, categoryId: true, level: true },
    }),
    prisma.arithmeticHomeworkPlan.findMany({
      where: { ...tenantOr, isActive: true, totalDays: { gt: 0 } },
      orderBy: { totalDays: 'desc' },
      take: 5,
      select: { id: true, title: true, totalDays: true },
    }),
    prisma.questionHomeworkPlan.findMany({
      where: { ...tenantOr, isActive: true, totalDays: { gt: 0 } },
      orderBy: { totalDays: 'desc' },
      take: 5,
      select: { id: true, title: true, totalDays: true },
    }),
    prisma.test.findMany({
      where: { ...tenantOr, isActive: true, questionCount: { gt: 0 } },
      orderBy: { questionCount: 'desc' },
      take: 3,
      select: { id: true, title: true, questionCount: true },
    }),
  ]);

  // 난이도 분포 부족 시 fallback으로 보충 (중복 제거)
  type QPick = { id: string; bookCode: string; chapter: string; questionNum: number; type: string; content: string; diagramSpec: unknown };
  const used = new Set<string>();
  const dedup = (arr: QPick[], n: number): QPick[] => {
    const out: QPick[] = [];
    for (const q of arr) {
      if (out.length >= n) break;
      if (used.has(q.id)) continue;
      used.add(q.id);
      out.push(q);
    }
    return out;
  };

  /** Question 한 건을 헬퍼 입력으로 변환 */
  const qHeuristic = (q: QPick): ItemHeuristic => ({
    kind: 'QUESTION',
    questionType: q.type,
    contentLength: (q.content ?? '').length,
    hasDiagram: q.diagramSpec != null,
  });
  const sec3Q = [...basicQs, ...fallbackQs];
  const sec4Q = [...mediumQs, ...fallbackQs];
  const sec5Q = [...advancedQs, ...fallbackQs];
  const basicPick = dedup(sec3Q, 30);
  const mediumPick = dedup(sec4Q, 30);
  const advancedPick = dedup(sec5Q, 20);

  // OX 카테고리/레벨별 그룹화 (5개 이상인 그룹만)
  const oxGroups = new Map<string, string[]>();
  for (const s of oxAll) {
    const key = `${s.categoryId}::${s.level}`;
    if (!oxGroups.has(key)) oxGroups.set(key, []);
    oxGroups.get(key)!.push(s.id);
  }
  const oxEligible = [...oxGroups.entries()]
    .filter(([, ids]) => ids.length >= 5)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 3);

  console.log(`\n📦 컨텐츠 수집 결과:`);
  console.log(`   Concepts (>200자):     ${concepts.length}`);
  console.log(`   BASIC questions:       ${basicQs.length} (보강 후 ${basicPick.length})`);
  console.log(`   MEDIUM questions:      ${mediumQs.length} (보강 후 ${mediumPick.length})`);
  console.log(`   HIGH/HIGHEST:          ${advancedQs.length} (보강 후 ${advancedPick.length})`);
  console.log(`   OX bundles eligible:   ${oxEligible.length} (5+ 항목 그룹)`);
  console.log(`   ArithmeticHomeworkPlan: ${arithmeticPlans.length} (${arithmeticPlans.map((p) => p.totalDays).join('+')}일)`);
  console.log(`   QuestionHomeworkPlan:   ${qHomeworkPlans.length} (${qHomeworkPlans.map((p) => p.totalDays).join('+')}일)`);
  console.log(`   Tests:                  ${tests.length}`);

  // 4) 섹션 구성 ─────────────────────────────────
  const sections: SectionInput[] = [];

  // S1: 개념 정리 (원본) — 6개
  if (concepts.length >= 1) {
    const top6 = concepts.slice(0, 6);
    const hs: ItemHeuristic[] = top6.map(() => ({ kind: 'CONCEPT_DOC' as const }));
    sections.push({
      title: '1단원 · 개념 정리',
      description: '학습 전 기본 개념을 차근차근 읽어 보세요',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: top6.map((c) => ({
        kind: 'CONCEPT_DOC' as const,
        conceptId: c.id,
        answerSpace: 'NONE' as const,
        hideQuestionNum: true,
        inlineData: { blankLevel: 0 },
      })),
    });
  }

  // S2: 빈칸으로 외우기 — 4개 (쉬움 2 + 어려움 1 + 통문장 1)
  if (concepts.length >= 7) {
    const next4 = concepts.slice(6, 10);
    const blankLevels: Array<0 | 1 | 2 | 3> = [1, 1, 2, 3];
    const hs: ItemHeuristic[] = next4.map(() => ({ kind: 'CONCEPT_DOC' as const }));
    sections.push({
      title: '2단원 · 빈칸으로 외우기',
      description: '단계별 빈칸으로 핵심 용어를 암기',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: next4.map((c, i) => ({
        kind: 'CONCEPT_DOC' as const,
        conceptId: c.id,
        answerSpace: 'NONE' as const,
        hideQuestionNum: true,
        inlineData: { blankLevel: blankLevels[i] ?? 1 },
      })),
    });
  } else if (concepts.length >= 4) {
    // 개념이 부족하면 앞쪽 다시 사용 (다른 빈칸 단계로)
    const fallback = concepts.slice(0, 4);
    const hs: ItemHeuristic[] = fallback.map(() => ({ kind: 'CONCEPT_DOC' as const }));
    sections.push({
      title: '2단원 · 빈칸으로 외우기',
      description: '단계별 빈칸으로 핵심 용어를 암기',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: fallback.map((c, i) => ({
        kind: 'CONCEPT_DOC' as const,
        conceptId: c.id,
        answerSpace: 'NONE' as const,
        hideQuestionNum: true,
        inlineData: { blankLevel: ([1, 1, 2, 3][i] ?? 1) as 1 | 2 | 3 },
      })),
    });
  }

  // S3: 기본 문제 30선 (자동 풀이공간 + 자동 columns)
  if (basicPick.length > 0) {
    const hs = basicPick.map(qHeuristic);
    sections.push({
      title: '3단원 · 기본 문제 30선',
      description: '개념 적용 — BASIC 난이도',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: basicPick.map((q) => ({
        kind: 'QUESTION' as const,
        questionId: q.id,
        answerSpace: inferAnswerSpace(qHeuristic(q)),
        hideQuestionNum: false,
      })),
    });
  }

  // S4: 응용 문제 30선 (자동 풀이공간 + 자동 columns)
  if (mediumPick.length > 0) {
    const hs = mediumPick.map(qHeuristic);
    sections.push({
      title: '4단원 · 응용 문제 30선',
      description: '개념을 활용한 응용 — MEDIUM 난이도',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: mediumPick.map((q) => ({
        kind: 'QUESTION' as const,
        questionId: q.id,
        answerSpace: inferAnswerSpace(qHeuristic(q)),
        hideQuestionNum: false,
      })),
    });
  }

  // S5: 심화 문제 20선 (자동 풀이공간 — 서술형이면 LARGE)
  if (advancedPick.length > 0) {
    const hs = advancedPick.map(qHeuristic);
    sections.push({
      title: '5단원 · 심화 문제 20선',
      description: '한 단계 더 — HIGH/HIGHEST 난이도',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: advancedPick.map((q) => ({
        kind: 'QUESTION' as const,
        questionId: q.id,
        answerSpace: inferAnswerSpace(qHeuristic(q)),
        hideQuestionNum: false,
      })),
    });
  }

  // S6: O/X 진단 — 카테고리·레벨별 묶음 3개
  if (oxEligible.length > 0) {
    const hs: ItemHeuristic[] = oxEligible.map(() => ({ kind: 'OX_BUNDLE' as const }));
    sections.push({
      title: '6단원 · O/X 진단',
      description: '핵심 개념 빠른 점검',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: oxEligible.map(([key, ids]) => {
        const [cat, lv] = key.split('::');
        return {
          kind: 'OX_BUNDLE' as const,
          answerSpace: 'NONE' as const,
          hideQuestionNum: false,
          inlineData: {
            category: cat,
            level: lv,
            statementIds: ids.slice(0, 5),
            count: 5,
          },
        };
      }),
    });
  }

  // S7: 일일 연산 훈련 — 가장 큰 plan에서 10일치
  if (arithmeticPlans[0] && arithmeticPlans[0].totalDays >= 10) {
    const plan = arithmeticPlans[0];
    const hs: ItemHeuristic[] = Array.from({ length: 10 }, () => ({ kind: 'ARITHMETIC_DAY' as const }));
    sections.push({
      title: '7단원 · 일일 연산 훈련 (10일)',
      description: `${plan.title} — 1~10일차`,
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: Array.from({ length: 10 }, (_, dayIdx) => ({
        kind: 'ARITHMETIC_DAY' as const,
        arithmeticPlanId: plan.id,
        arithmeticDayIndex: dayIdx,
        answerSpace: inferAnswerSpace({ kind: 'ARITHMETIC_DAY' }),
        hideQuestionNum: false,
      })),
    });
  }

  // S8: 단원별 숙제 — HOMEWORK_DAY 5일 + ARITHMETIC_DAY 5일 (다른 plan들)
  const sec8: ItemInput[] = [];
  if (qHomeworkPlans[0]) {
    const plan = qHomeworkPlans[0];
    const days = Math.min(5, plan.totalDays);
    for (let d = 0; d < days; d++) {
      sec8.push({
        kind: 'HOMEWORK_DAY',
        homeworkPlanId: plan.id,
        homeworkDayIndex: d,
        answerSpace: inferAnswerSpace({ kind: 'HOMEWORK_DAY' }),
        hideQuestionNum: false,
      });
    }
  }
  // ARITHMETIC_DAY는 S7과 다른 plan(두 번째) 우선, 없으면 같은 plan 11~15일차
  const altArith = arithmeticPlans[1] ?? arithmeticPlans[0];
  if (altArith) {
    const startDay = altArith === arithmeticPlans[0] ? 10 : 0;
    const days = Math.min(5, altArith.totalDays - startDay);
    for (let d = 0; d < days; d++) {
      sec8.push({
        kind: 'ARITHMETIC_DAY',
        arithmeticPlanId: altArith.id,
        arithmeticDayIndex: startDay + d,
        answerSpace: inferAnswerSpace({ kind: 'ARITHMETIC_DAY' }),
        hideQuestionNum: false,
      });
    }
  }
  if (sec8.length > 0) {
    const hs: ItemHeuristic[] = sec8.map((it) => ({ kind: it.kind }));
    sections.push({
      title: '8단원 · 단원별 숙제',
      description: '문제 숙제 + 추가 연산',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: sec8,
    });
  }

  // S9: 종합 평가 — TEST_PAPER 묶음
  if (tests.length > 0) {
    const hs: ItemHeuristic[] = tests.map(() => ({ kind: 'TEST_PAPER' as const }));
    sections.push({
      title: '9단원 · 종합 평가',
      description: '시험지로 마무리 점검',
      startNewPage: true,
      columnsOverride: inferColumns(hs),
      items: tests.map((t) => ({
        kind: 'TEST_PAPER' as const,
        testId: t.id,
        answerSpace: 'MEDIUM' as const,
        customLabel: `[시험지: ${t.title}] (${t.questionCount}문항)`,
        hideQuestionNum: false,
      })),
    });
  }

  if (sections.length === 0) {
    throw new Error('섹션을 구성할 컨텐츠가 부족합니다.');
  }

  // 5) 워크북 생성 (transaction) ─────────────────────────────
  const workbook = await prisma.workbook.create({
    data: {
      title: '더미 워크북 — 100p급 종합 학습지',
      subtitle: '9단원 · 짜임새 큰 샘플 (시드 자동 생성)',
      studentLabel: '데모 학생',
      semesterLabel: '2026년 1학기',
      academyName: '인재원',
      ownerName: '홍길동 원장',
      printPreset: PRINT_PRESET,
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
          startNewPage: s.startNewPage ?? true,
          columnsOverride: s.columnsOverride ?? null,
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

  // 6) 결과 출력 ─────────────────────────────────────────
  const totalItems = workbook.sections.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`\n✅ 워크북 생성 완료!`);
  console.log(`   ID:       ${workbook.id}`);
  console.log(`   Seq:      #${workbook.seq}`);
  console.log(`   Title:    ${workbook.title}`);
  console.log(`   Sections: ${workbook.sections.length}개`);
  console.log(`   Items:    ${totalItems}개`);
  console.log(`\n📊 섹션별 항목:`);
  workbook.sections.forEach((s, i) => {
    console.log(`   S${i + 1}. ${s.title.padEnd(28)} ${s.items.length}개`);
  });
  console.log(`\n🌐 브라우저:`);
  console.log(`   상세:    http://localhost:3001/workbooks/${workbook.id}`);
  console.log(`   인쇄:    http://localhost:3001/workbooks/${workbook.id}/print`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌', e);
  prisma.$disconnect();
  process.exit(1);
});
