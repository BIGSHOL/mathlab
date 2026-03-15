import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeOne(attemptId: string, studentId: string) {
  const attempt = await prisma.testAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { test: { include: { levelTestConfig: true } } },
  });
  const configDomains = (attempt.test.levelTestConfig?.questionDomains ?? {}) as Record<string, string>;
  const answers = await prisma.answerLog.findMany({
    where: { attemptId },
    select: { questionId: true, isCorrect: true },
  });
  if (answers.length === 0) return null;

  const questionIds = answers.map(a => a.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, chapter: true, section: true, difficulty: true, domain: true, conceptId: true },
  });
  const qMap = new Map(questions.map(q => [q.id, q]));

  const domainStats: Record<string, { total: number; correct: number }> = {
    CALCULATION: { total: 0, correct: 0 },
    UNDERSTANDING: { total: 0, correct: 0 },
    PROBLEM_SOLVING: { total: 0, correct: 0 },
    REASONING: { total: 0, correct: 0 },
  };
  const chapterMap: Record<string, { total: number; correct: number }> = {};
  const wrongConceptIds: string[] = [];
  let totalCorrect = 0;

  for (const ans of answers) {
    const q = qMap.get(ans.questionId);
    if (!q) continue;
    const domain = configDomains[ans.questionId] || q.domain;
    if (domain && domainStats[domain]) {
      domainStats[domain].total++;
      if (ans.isCorrect) domainStats[domain].correct++;
    }
    if (!chapterMap[q.chapter]) chapterMap[q.chapter] = { total: 0, correct: 0 };
    chapterMap[q.chapter].total++;
    if (ans.isCorrect) {
      chapterMap[q.chapter].correct++;
      totalCorrect++;
    } else if (q.conceptId) {
      wrongConceptIds.push(q.conceptId);
    }
  }

  const overallAccuracy = Math.round((totalCorrect / answers.length) * 100);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const domainScores: Record<string, any> = {};
  for (const [domain, stat] of Object.entries(domainStats)) {
    domainScores[domain] = {
      total: stat.total, correct: stat.correct,
      accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    };
  }

  const areaStats = Object.entries(chapterMap).map(([chapter, stat]) => ({
    chapter, accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    total: stat.total, correct: stat.correct,
  }));
  const weakAreas = areaStats.filter(a => a.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
  const strongAreas = areaStats.filter(a => a.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy);

  // Prerequisite chain analysis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prerequisiteWeaknesses: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prerequisiteChains: any[] = [];

  if (wrongConceptIds.length > 0) {
    const uniqueConceptIds = [...new Set(wrongConceptIds)];
    const wrongConcepts = await prisma.concept.findMany({
      where: { id: { in: uniqueConceptIds } },
      select: { id: true, conceptCode: true, title: true, chapter: true },
    });
    const wrongConceptMap = new Map(wrongConcepts.map(c => [c.id, c]));

    const depth1 = await prisma.conceptPrerequisite.findMany({
      where: { conceptId: { in: uniqueConceptIds } },
      include: { prerequisite: { select: { id: true, conceptCode: true, title: true, chapter: true } } },
    });

    const depth1Ids = [...new Set(depth1.map(d => d.prerequisite.id))];
    const depth2 = depth1Ids.length > 0
      ? await prisma.conceptPrerequisite.findMany({
          where: { conceptId: { in: depth1Ids } },
          include: { prerequisite: { select: { id: true, conceptCode: true, title: true, chapter: true } } },
        })
      : [];

    const depth2Map = new Map<string, typeof depth2>();
    for (const d of depth2) {
      const arr = depth2Map.get(d.conceptId) ?? [];
      arr.push(d);
      depth2Map.set(d.conceptId, arr);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chainMap = new Map<string, any>();
    for (const d1 of depth1) {
      const wrongConcept = wrongConceptMap.get(d1.conceptId);
      if (!wrongConcept) continue;
      if (!chainMap.has(d1.conceptId)) {
        chainMap.set(d1.conceptId, {
          wrongConcept: { code: wrongConcept.conceptCode ?? wrongConcept.id, title: wrongConcept.title, chapter: wrongConcept.chapter ?? '' },
          prerequisites: [],
        });
      }
      const chain = chainMap.get(d1.conceptId)!;
      const p = d1.prerequisite;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!chain.prerequisites.some((pr: any) => pr.code === (p.conceptCode ?? p.id))) {
        chain.prerequisites.push({ code: p.conceptCode ?? p.id, title: p.title, chapter: p.chapter ?? '', depth: 1 });
      }
      const d2Items = depth2Map.get(p.id) ?? [];
      for (const d2 of d2Items) {
        const p2 = d2.prerequisite;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!chain.prerequisites.some((pr: any) => pr.code === (p2.conceptCode ?? p2.id))) {
          chain.prerequisites.push({ code: p2.conceptCode ?? p2.id, title: p2.title, chapter: p2.chapter ?? '', depth: 2 });
        }
      }
    }
    prerequisiteChains = [...chainMap.values()];

    const prereqSet = new Map();
    for (const chain of prerequisiteChains) {
      for (const pr of chain.prerequisites) {
        if (!prereqSet.has(pr.code)) {
          prereqSet.set(pr.code, { conceptCode: pr.code, conceptTitle: pr.title, relatedChapter: pr.chapter, accuracy: 0 });
        }
      }
    }
    prerequisiteWeaknesses = [...prereqSet.values()];
  }

  let recommendLevel: string;
  if (overallAccuracy >= 96) recommendLevel = '1등급';
  else if (overallAccuracy >= 89) recommendLevel = '2등급';
  else if (overallAccuracy >= 77) recommendLevel = '3등급';
  else if (overallAccuracy >= 60) recommendLevel = '4등급';
  else if (overallAccuracy >= 40) recommendLevel = '5등급';
  else if (overallAccuracy >= 23) recommendLevel = '6등급';
  else if (overallAccuracy >= 11) recommendLevel = '7등급';
  else if (overallAccuracy >= 4) recommendLevel = '8등급';
  else recommendLevel = '9등급';

  await prisma.diagnosticResult.upsert({
    where: { attemptId },
    update: {
      recommendLevel, weakAreas: JSON.parse(JSON.stringify(weakAreas)),
      strongAreas: JSON.parse(JSON.stringify(strongAreas)), overallAccuracy,
      domainScores: JSON.parse(JSON.stringify({ ...domainScores, _prerequisiteWeaknesses: prerequisiteWeaknesses, _prerequisiteChains: prerequisiteChains })),
    },
    create: {
      attemptId, studentId, diagnosticType: 'LEVEL', recommendLevel,
      weakAreas: JSON.parse(JSON.stringify(weakAreas)),
      strongAreas: JSON.parse(JSON.stringify(strongAreas)), overallAccuracy,
      domainScores: JSON.parse(JSON.stringify({ ...domainScores, _prerequisiteWeaknesses: prerequisiteWeaknesses, _prerequisiteChains: prerequisiteChains })),
    },
  });

  return { recommendLevel, chains: prerequisiteChains.length, weaknesses: prerequisiteWeaknesses.length };
}

async function main() {
  const attempts = await prisma.testAttempt.findMany({
    where: { test: { testType: 'level_test' }, completedAt: { not: null } },
    select: { id: true, studentId: true },
  });
  console.log('Re-analyzing', attempts.length, 'attempts...');

  let ok = 0, fail = 0;
  for (const a of attempts) {
    try {
      const result = await analyzeOne(a.id, a.studentId);
      if (result) {
        console.log(' ', a.id.substring(0, 8), '-', result.recommendLevel, 'chains:', result.chains);
        ok++;
      }
    } catch (e: unknown) {
      fail++;
      console.warn('  FAIL:', a.id.substring(0, 8), (e as Error).message);
    }
  }
  console.log('\nDone! Success:', ok, 'Failed:', fail);
  await prisma.$disconnect();
}

main();
