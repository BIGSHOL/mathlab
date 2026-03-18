import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDifficultyComment, getChapterComment } from '@/lib/utils/level-test-feedback';
import { generateReportAI } from '@/lib/services/report-ai';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';

/** GET: 레벨테스트 진단 보고서 데이터 (단일 학생) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id } = await params;
  const seq = Number(id);

  if (isNaN(seq)) {
    return badRequest('잘못된 시험 번호입니다');
  }

  const attemptId = request.nextUrl.searchParams.get('attemptId');
  if (!attemptId) {
    return badRequest('attemptId가 필요합니다');
  }

  // 시험 조회
  const test = await prisma.test.findUnique({
    where: { seq },
    select: {
      id: true, seq: true, title: true, grade: true,
      questionCount: true, timeLimitMin: true, createdAt: true,
      questionIds: true,
    },
  });
  if (!test) {
    return notFound('시험을 찾을 수 없습니다');
  }

  // 시도 조회
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { student: { select: { id: true, name: true, grade: true } } },
  });
  if (!attempt || attempt.testId !== test.id) {
    return notFound('시도를 찾을 수 없습니다');
  }

  // 진단 결과
  const diagnostic = await prisma.diagnosticResult.findUnique({
    where: { attemptId },
  });
  if (!diagnostic) {
    return notFound('진단 결과가 없습니다. 먼저 분석을 실행해주세요.');
  }

  // 문제 조회 (questionIds 순서 유지)
  const questionIds = (test.questionIds as string[]) ?? [];
  const questionsRaw = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, chapter: true, section: true, difficulty: true, domain: true, answer: true, questionNum: true },
  });
  const qMap = new Map(questionsRaw.map((q) => [q.id, q]));
  const questions = questionIds
    .map((qid, idx) => {
      const q = qMap.get(qid);
      if (!q) return null;
      return {
        id: q.id,
        chapter: q.chapter,
        section: q.section,
        difficulty: q.difficulty,
        domain: q.domain,
        answer: q.answer,
        questionNum: q.questionNum || idx + 1,
      };
    })
    .filter(Boolean);

  // 답안 조회 (statusClassification 포함)
  const answerLogs = await prisma.answerLog.findMany({
    where: { attemptId },
    select: {
      questionId: true,
      selectedAnswer: true,
      isCorrect: true,
      timeSpentSeconds: true,
      statusClassification: true,
    },
  });

  // domainScores에서 선수학습 데이터 추출
  const domainScoresRaw = (diagnostic.domainScores ?? {}) as Record<string, unknown>;
  const prerequisiteWeaknesses = (domainScoresRaw._prerequisiteWeaknesses ?? []) as Array<{
    conceptCode: string; conceptTitle: string; relatedChapter: string; accuracy: number;
  }>;
  const prerequisiteChains = (domainScoresRaw._prerequisiteChains ?? []) as Array<{
    wrongConcept: { code: string; title: string; chapter: string };
    prerequisites: { code: string; title: string; chapter: string; depth: number }[];
  }>;

  // 순수 domain scores (선수학습 키 제외)
  const cleanDomainScores: Record<string, { total: number; correct: number; accuracy: number }> = {};
  for (const [key, value] of Object.entries(domainScoresRaw)) {
    if (!key.startsWith('_') && typeof value === 'object' && value !== null && 'total' in value) {
      cleanDomainScores[key] = value as { total: number; correct: number; accuracy: number };
    }
  }

  // 답안 매핑
  const answerMap = new Map(answerLogs.map((a) => [a.questionId, a]));

  // 난이도별 통계 계산
  const diffMap = new Map<string, { total: number; correct: number }>();
  for (const q of questionsRaw) {
    const a = answerMap.get(q.id);
    const entry = diffMap.get(q.difficulty) ?? { total: 0, correct: 0 };
    entry.total++;
    if (a?.isCorrect) entry.correct++;
    diffMap.set(q.difficulty, entry);
  }
  const difficultyStats = [...diffMap.entries()].map(([difficulty, s]) => ({
    difficulty,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    total: s.total,
  }));

  // 단원별 통계 계산
  const chMap = new Map<string, { total: number; correct: number }>();
  for (const q of questionsRaw) {
    const a = answerMap.get(q.id);
    const entry = chMap.get(q.chapter) ?? { total: 0, correct: 0 };
    entry.total++;
    if (a?.isCorrect) entry.correct++;
    chMap.set(q.chapter, entry);
  }
  const chapterStats = [...chMap.entries()].map(([name, s]) => ({
    name,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    total: s.total,
  }));

  // AI 멘트 생성 (실패 시 정적 멘트로 fallback)
  const studentName = attempt.student.name;
  const weakAreas = diagnostic.weakAreas as Array<{ chapter: string; accuracy: number; total: number; correct: number }>;
  const strongAreas = diagnostic.strongAreas as Array<{ chapter: string; accuracy: number; total: number; correct: number }>;

  const aiContent = await generateReportAI({
    studentName,
    grade: attempt.student.grade,
    testTitle: test.title,
    overallAccuracy: diagnostic.overallAccuracy,
    recommendLevel: diagnostic.recommendLevel,
    domainScores: cleanDomainScores,
    weakAreas: weakAreas.map((a) => ({ chapter: a.chapter, accuracy: a.accuracy })),
    strongAreas: strongAreas.map((a) => ({ chapter: a.chapter, accuracy: a.accuracy })),
    difficultyStats,
    chapterStats,
    prerequisiteCount: prerequisiteChains.length,
  });

  return NextResponse.json({
    data: {
      test: {
        id: test.id,
        seq: test.seq,
        title: test.title,
        grade: test.grade,
        questionCount: test.questionCount,
        timeLimitMin: test.timeLimitMin,
        createdAt: test.createdAt.toISOString(),
      },
      student: {
        id: attempt.student.id,
        name: attempt.student.name,
        grade: attempt.student.grade,
      },
      attempt: {
        id: attempt.id,
        completedAt: attempt.completedAt?.toISOString() ?? null,
        score: attempt.score,
        maxScore: attempt.maxScore,
        correctCount: attempt.correctCount,
        totalCount: attempt.totalCount,
        entryMethod: attempt.entryMethod ?? 'online',
      },
      diagnostic: {
        recommendLevel: diagnostic.recommendLevel,
        overallAccuracy: diagnostic.overallAccuracy,
        domainScores: cleanDomainScores,
        weakAreas,
        strongAreas,
        prerequisiteWeaknesses,
        prerequisiteChains,
      },
      questions,
      answers: answerLogs.map((a) => ({
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer,
        isCorrect: a.isCorrect,
        timeSpentSeconds: a.timeSpentSeconds,
        statusClassification: a.statusClassification,
      })),
      academy: { name: 'MathLab' },
      comments: {
        difficultyComment: aiContent?.difficultyComment ?? getDifficultyComment(studentName, difficultyStats),
        chapterComment: aiContent?.chapterComment ?? getChapterComment(studentName, chapterStats),
      },
      aiContent: {
        totalReview: aiContent?.totalReview ?? null,
        analysisGuide: aiContent?.analysisGuide ?? null,
        overallFeedback: aiContent?.overallFeedback ?? null,
        domainFeedbacks: aiContent?.domainFeedbacks ?? null,
        prerequisiteFeedback: aiContent?.prerequisiteFeedback ?? null,
      },
    },
  });
}
