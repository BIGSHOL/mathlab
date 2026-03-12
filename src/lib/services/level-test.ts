import { prisma } from '@/lib/db';

interface AreaStat {
  chapter: string;
  accuracy: number;
  total: number;
  correct: number;
}

interface PrerequisiteWeakness {
  conceptCode: string;
  conceptTitle: string;
  relatedChapter: string;
  accuracy: number;
}

/**
 * 레벨테스트 완료 후 4대 영역 + 계통도 분석 및 DiagnosticResult 저장
 * 1. LevelTestConfig에서 문제-영역 매핑 로드 (없으면 question.domain 활용)
 * 2. AnswerLog + Question + Concept 조회
 * 3. 영역별(4 domain) 정답률 계산
 * 4. 단원별(chapter) 정답률 → 취약/강점 분류
 * 5. 계통도 분석: 취약 문제 → 연결 개념 → 선수학습 추적
 * 6. 전체 정답률 → 추천 레벨 산출
 * 7. DiagnosticResult 저장 (domainScores + prerequisiteWeaknesses 포함)
 */
export async function analyzeLevelTest(attemptId: string, studentId: string) {
  // 1. Load attempt with test config
  const attempt = await prisma.testAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { test: { include: { levelTestConfig: true } } },
  });

  const configDomains = (attempt.test.levelTestConfig?.questionDomains ?? {}) as Record<string, string>;

  // 2. Load answers
  const answers = await prisma.answerLog.findMany({
    where: { attemptId },
    select: { questionId: true, isCorrect: true },
  });

  if (answers.length === 0) return null;

  // 3. Load question details (including domain and conceptId)
  const questionIds = answers.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, chapter: true, section: true, difficulty: true, domain: true, conceptId: true },
  });
  const qMap = new Map(questions.map((q) => [q.id, q]));

  // 4. Compute domain stats
  const domainStats: Record<string, { total: number; correct: number }> = {
    CALCULATION: { total: 0, correct: 0 },
    UNDERSTANDING: { total: 0, correct: 0 },
    PROBLEM_SOLVING: { total: 0, correct: 0 },
    REASONING: { total: 0, correct: 0 },
  };

  // 5. Compute chapter stats + collect wrong conceptIds
  const chapterMap: Record<string, { total: number; correct: number }> = {};
  const wrongConceptIds: string[] = [];
  let totalCorrect = 0;

  for (const ans of answers) {
    const q = qMap.get(ans.questionId);
    if (!q) continue;

    // Domain: LevelTestConfig 우선, 없으면 question.domain fallback
    const domain = configDomains[ans.questionId] || q.domain;
    if (domain && domainStats[domain]) {
      domainStats[domain].total++;
      if (ans.isCorrect) domainStats[domain].correct++;
    }

    // Chapter aggregation
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

  // Domain scores with accuracy
  const domainScores: Record<string, { total: number; correct: number; accuracy: number }> = {};
  for (const [domain, stat] of Object.entries(domainStats)) {
    domainScores[domain] = {
      total: stat.total,
      correct: stat.correct,
      accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    };
  }

  // Area stats
  const areaStats: AreaStat[] = Object.entries(chapterMap).map(([chapter, stat]) => ({
    chapter,
    accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    total: stat.total,
    correct: stat.correct,
  }));

  const weakAreas = areaStats.filter((a) => a.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
  const strongAreas = areaStats.filter((a) => a.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy);

  // 6. 계통도 분석: 틀린 문제 → 개념 → 선수학습 체인 (2단계까지 추적)
  interface PrereqChain {
    wrongConcept: { code: string; title: string; chapter: string };
    prerequisites: { code: string; title: string; chapter: string; depth: number }[];
  }
  let prerequisiteWeaknesses: PrerequisiteWeakness[] = [];
  let prerequisiteChains: PrereqChain[] = [];

  if (wrongConceptIds.length > 0) {
    const uniqueConceptIds = [...new Set(wrongConceptIds)];

    // 틀린 개념 정보 조회
    const wrongConcepts = await prisma.concept.findMany({
      where: { id: { in: uniqueConceptIds } },
      select: { id: true, conceptCode: true, title: true, chapter: true },
    });
    const wrongConceptMap = new Map(wrongConcepts.map(c => [c.id, c]));

    // 1단계 선수학습 조회
    const depth1 = await prisma.conceptPrerequisite.findMany({
      where: { conceptId: { in: uniqueConceptIds } },
      include: {
        prerequisite: {
          select: { id: true, conceptCode: true, title: true, chapter: true },
        },
      },
    });

    // 2단계 선수학습 조회 (1단계의 선수학습)
    const depth1Ids = [...new Set(depth1.map(d => d.prerequisite.id))];
    const depth2 = depth1Ids.length > 0
      ? await prisma.conceptPrerequisite.findMany({
          where: { conceptId: { in: depth1Ids } },
          include: {
            prerequisite: {
              select: { id: true, conceptCode: true, title: true, chapter: true },
            },
          },
        })
      : [];

    // depth1 역매핑: prerequisiteId → 상위 conceptIds
    const depth2Map = new Map<string, typeof depth2>();
    for (const d of depth2) {
      const arr = depth2Map.get(d.conceptId) ?? [];
      arr.push(d);
      depth2Map.set(d.conceptId, arr);
    }

    // 체인 구성: 틀린 개념별로 선수학습 트리
    const chainMap = new Map<string, PrereqChain>();
    for (const d1 of depth1) {
      const wrongConcept = wrongConceptMap.get(d1.conceptId);
      if (!wrongConcept) continue;

      if (!chainMap.has(d1.conceptId)) {
        chainMap.set(d1.conceptId, {
          wrongConcept: {
            code: wrongConcept.conceptCode ?? wrongConcept.id,
            title: wrongConcept.title,
            chapter: wrongConcept.chapter ?? '',
          },
          prerequisites: [],
        });
      }

      const chain = chainMap.get(d1.conceptId)!;
      const p = d1.prerequisite;
      // 1단계 선수학습 추가 (중복 방지)
      if (!chain.prerequisites.some(pr => pr.code === (p.conceptCode ?? p.id))) {
        chain.prerequisites.push({
          code: p.conceptCode ?? p.id,
          title: p.title,
          chapter: p.chapter ?? '',
          depth: 1,
        });
      }

      // 2단계 선수학습 추가
      const d2Items = depth2Map.get(p.id) ?? [];
      for (const d2 of d2Items) {
        const p2 = d2.prerequisite;
        if (!chain.prerequisites.some(pr => pr.code === (p2.conceptCode ?? p2.id))) {
          chain.prerequisites.push({
            code: p2.conceptCode ?? p2.id,
            title: p2.title,
            chapter: p2.chapter ?? '',
            depth: 2,
          });
        }
      }
    }

    prerequisiteChains = [...chainMap.values()];

    // 하위호환: 기존 flat 리스트도 유지
    const prereqSet = new Map<string, PrerequisiteWeakness>();
    for (const chain of prerequisiteChains) {
      for (const pr of chain.prerequisites) {
        if (!prereqSet.has(pr.code)) {
          prereqSet.set(pr.code, {
            conceptCode: pr.code,
            conceptTitle: pr.title,
            relatedChapter: pr.chapter,
            accuracy: 0,
          });
        }
      }
    }
    prerequisiteWeaknesses = [...prereqSet.values()];
  }

  // 7. Level determination (9등급 체계)
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

  // 8. Save DiagnosticResult (upsert to handle re-analysis)
  const result = await prisma.diagnosticResult.upsert({
    where: { attemptId },
    update: {
      recommendLevel,
      weakAreas: JSON.parse(JSON.stringify(weakAreas)),
      strongAreas: JSON.parse(JSON.stringify(strongAreas)),
      overallAccuracy,
      domainScores: JSON.parse(JSON.stringify({
        ...domainScores,
        _prerequisiteWeaknesses: prerequisiteWeaknesses,
        _prerequisiteChains: prerequisiteChains,
      })),
    },
    create: {
      attemptId,
      studentId,
      diagnosticType: 'LEVEL',
      recommendLevel,
      weakAreas: JSON.parse(JSON.stringify(weakAreas)),
      strongAreas: JSON.parse(JSON.stringify(strongAreas)),
      overallAccuracy,
      domainScores: JSON.parse(JSON.stringify({
        ...domainScores,
        _prerequisiteWeaknesses: prerequisiteWeaknesses,
        _prerequisiteChains: prerequisiteChains,
      })),
    },
  });

  return result;
}
