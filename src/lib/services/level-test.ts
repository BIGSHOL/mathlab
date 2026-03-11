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

  // 6. 계통도 분석: 틀린 문제의 개념 → 선수학습 추적
  let prerequisiteWeaknesses: PrerequisiteWeakness[] = [];
  if (wrongConceptIds.length > 0) {
    const uniqueConceptIds = [...new Set(wrongConceptIds)];

    // 틀린 문제와 연결된 개념의 선수학습 조회
    const prereqs = await prisma.conceptPrerequisite.findMany({
      where: { conceptId: { in: uniqueConceptIds } },
      include: {
        prerequisite: {
          select: { id: true, conceptCode: true, title: true, chapter: true },
        },
      },
    });

    // 선수학습 개념별 취약도 집계
    const prereqMap = new Map<string, PrerequisiteWeakness>();
    for (const pr of prereqs) {
      const p = pr.prerequisite;
      if (!prereqMap.has(p.id)) {
        prereqMap.set(p.id, {
          conceptCode: p.conceptCode ?? p.id,
          conceptTitle: p.title,
          relatedChapter: p.chapter ?? '',
          accuracy: 0,
        });
      }
    }

    // 선수학습 개념에 연결된 문제의 정답률 계산
    if (prereqMap.size > 0) {
      const prereqConceptIds = [...prereqMap.keys()];
      const prereqQuestions = await prisma.question.findMany({
        where: { conceptId: { in: prereqConceptIds }, id: { in: questionIds } },
        select: { id: true, conceptId: true },
      });

      for (const pq of prereqQuestions) {
        if (!pq.conceptId) continue;
        const ans = answers.find((a) => a.questionId === pq.id);
        const pw = prereqMap.get(pq.conceptId);
        if (pw && ans) {
          pw.accuracy = ans.isCorrect ? 100 : 0;
        }
      }

      prerequisiteWeaknesses = [...prereqMap.values()].filter((pw) => pw.accuracy < 60);
    }
  }

  // 7. Level determination
  let recommendLevel: string;
  if (overallAccuracy >= 90) recommendLevel = '심화';
  else if (overallAccuracy >= 75) recommendLevel = '상';
  else if (overallAccuracy >= 60) recommendLevel = '중';
  else if (overallAccuracy >= 40) recommendLevel = '기초';
  else recommendLevel = '기초보충';

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
      })),
    },
  });

  return result;
}
