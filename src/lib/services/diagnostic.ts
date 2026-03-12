import { prisma } from '@/lib/db';

interface DiagnosticInput {
  attemptId: string;
  studentId: string;
  diagnosticType: string;
}

interface AreaStat {
  chapter: string;
  accuracy: number;
  total: number;
  correct: number;
}

/**
 * 진단평가 결과 분석 및 저장
 * - 단원별 정답률 계산
 * - 취약/우수 영역 분류
 * - 추천 레벨 산출
 */
export async function analyzeDiagnostic(input: DiagnosticInput) {
  const { attemptId, studentId, diagnosticType } = input;

  // 시도의 답안 조회
  const answers = await prisma.answerLog.findMany({
    where: { attemptId },
    select: { questionId: true, isCorrect: true },
  });

  if (answers.length === 0) return null;

  // 문제 정보 매핑
  const questionIds = answers.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, chapter: true, difficulty: true },
  });
  const qMap = new Map(questions.map((q) => [q.id, q]));

  // 단원별 집계
  const chapterMap: Record<string, { total: number; correct: number }> = {};
  let totalCorrect = 0;

  for (const ans of answers) {
    const q = qMap.get(ans.questionId);
    if (!q) continue;
    if (!chapterMap[q.chapter]) chapterMap[q.chapter] = { total: 0, correct: 0 };
    chapterMap[q.chapter].total++;
    if (ans.isCorrect) {
      chapterMap[q.chapter].correct++;
      totalCorrect++;
    }
  }

  const overallAccuracy = Math.round((totalCorrect / answers.length) * 100);

  const areaStats: AreaStat[] = Object.entries(chapterMap).map(([chapter, stat]) => ({
    chapter,
    accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    total: stat.total,
    correct: stat.correct,
  }));

  const weakAreas = areaStats.filter((a) => a.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
  const strongAreas = areaStats.filter((a) => a.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy);

  // 추천 레벨 산출 (9등급 체계)
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

  // DiagnosticResult 저장
  const result = await prisma.diagnosticResult.create({
    data: {
      attemptId,
      studentId,
      diagnosticType,
      recommendLevel,
      weakAreas: JSON.parse(JSON.stringify(weakAreas)),
      strongAreas: JSON.parse(JSON.stringify(strongAreas)),
      overallAccuracy,
    },
  });

  return result;
}

/** 학생의 진단 결과 조회 */
export async function getStudentDiagnosticResults(studentId: string) {
  return prisma.diagnosticResult.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });
}
