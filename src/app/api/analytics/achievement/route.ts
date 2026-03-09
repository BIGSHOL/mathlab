import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** GET: 학생별 유형(단원/섹션)별 성취도 분석 */
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'studentId가 필요합니다' } },
      { status: 400 }
    );
  }

  // 해당 학생의 모든 AnswerLog 조회
  const answerLogs = await prisma.answerLog.findMany({
    where: {
      attempt: { studentId },
    },
    select: {
      questionId: true,
      isCorrect: true,
      timeSpentSeconds: true,
    },
  });

  if (answerLogs.length === 0) {
    return NextResponse.json({
      data: { chapters: [], overall: { total: 0, correct: 0, accuracy: 0 } },
    });
  }

  // 문제 정보 조회
  const questionIds = [...new Set(answerLogs.map((a) => a.questionId))];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, chapter: true, section: true, difficulty: true },
  });

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // 단원별 집계
  const chapterMap: Record<string, {
    total: number;
    correct: number;
    totalTime: number;
    byDifficulty: Record<string, { total: number; correct: number }>;
    bySections: Record<string, { total: number; correct: number }>;
  }> = {};

  let overallTotal = 0;
  let overallCorrect = 0;

  for (const log of answerLogs) {
    const q = questionMap.get(log.questionId);
    if (!q) continue;

    overallTotal++;
    if (log.isCorrect) overallCorrect++;

    if (!chapterMap[q.chapter]) {
      chapterMap[q.chapter] = {
        total: 0,
        correct: 0,
        totalTime: 0,
        byDifficulty: {},
        bySections: {},
      };
    }

    const ch = chapterMap[q.chapter];
    ch.total++;
    if (log.isCorrect) ch.correct++;
    ch.totalTime += log.timeSpentSeconds;

    // 난이도별
    const diff = q.difficulty;
    if (!ch.byDifficulty[diff]) ch.byDifficulty[diff] = { total: 0, correct: 0 };
    ch.byDifficulty[diff].total++;
    if (log.isCorrect) ch.byDifficulty[diff].correct++;

    // 섹션별
    const section = q.section ?? '기타';
    if (!ch.bySections[section]) ch.bySections[section] = { total: 0, correct: 0 };
    ch.bySections[section].total++;
    if (log.isCorrect) ch.bySections[section].correct++;
  }

  const chapters = Object.entries(chapterMap)
    .map(([chapter, stat]) => ({
      chapter,
      total: stat.total,
      correct: stat.correct,
      accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
      avgTime: stat.total > 0 ? Math.round(stat.totalTime / stat.total) : 0,
      byDifficulty: Object.entries(stat.byDifficulty).map(([diff, s]) => ({
        difficulty: diff,
        total: s.total,
        correct: s.correct,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      })),
      sections: Object.entries(stat.bySections)
        .map(([section, s]) => ({
          section,
          total: s.total,
          correct: s.correct,
          accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    data: {
      chapters,
      overall: {
        total: overallTotal,
        correct: overallCorrect,
        accuracy: overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : 0,
      },
    },
  });
}
