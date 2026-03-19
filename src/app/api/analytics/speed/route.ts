import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, forbidden, hasRole, canAccessStudent } from '@/lib/api';

/** GET: 풀이 속도 분석 */
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') || user.id;

  // 학생은 자기 데이터만
  if (user.role === 'STUDENT' && studentId !== user.id) {
    return forbidden();
  }

  // 선생님이 다른 학생 조회 시 접근 권한 검증
  if (hasRole(user, 'TEACHER') && studentId !== user.id) {
    if (!(await canAccessStudent(user, studentId))) {
      return forbidden();
    }
  }

  // 해당 학생의 모든 완료된 시험 답안 조회
  const answers = await prisma.answerLog.findMany({
    where: {
      attempt: {
        studentId,
        completedAt: { not: null },
      },
    },
    select: {
      questionId: true,
      isCorrect: true,
      timeSpentSeconds: true,
      attemptId: true,
    },
  });

  if (answers.length === 0) {
    return NextResponse.json({
      data: {
        overall: { avgSeconds: 0, totalQuestions: 0, totalTimeSeconds: 0 },
        byChapter: [],
        byDifficulty: [],
        trend: [],
      },
    });
  }

  // 문제 정보 조회 (단원, 난이도)
  const questionIds = [...new Set(answers.map((a) => a.questionId))];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, chapter: true, difficulty: true },
  });
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // 전체 평균
  const totalTime = answers.reduce((s, a) => s + a.timeSpentSeconds, 0);
  const overall = {
    avgSeconds: Math.round(totalTime / answers.length),
    totalQuestions: answers.length,
    totalTimeSeconds: totalTime,
  };

  // 단원별 평균
  const chapterStats = new Map<string, { total: number; count: number; correct: number }>();
  for (const a of answers) {
    const q = questionMap.get(a.questionId);
    if (!q) continue;
    const ch = q.chapter;
    const stat = chapterStats.get(ch) || { total: 0, count: 0, correct: 0 };
    stat.total += a.timeSpentSeconds;
    stat.count += 1;
    if (a.isCorrect) stat.correct += 1;
    chapterStats.set(ch, stat);
  }
  const byChapter = [...chapterStats.entries()]
    .map(([chapter, s]) => ({
      chapter,
      avgSeconds: Math.round(s.total / s.count),
      count: s.count,
      accuracy: Math.round((s.correct / s.count) * 100),
    }))
    .sort((a, b) => b.avgSeconds - a.avgSeconds);

  // 난이도별 평균
  const diffStats = new Map<string, { total: number; count: number }>();
  for (const a of answers) {
    const q = questionMap.get(a.questionId);
    if (!q) continue;
    const d = q.difficulty;
    const stat = diffStats.get(d) || { total: 0, count: 0 };
    stat.total += a.timeSpentSeconds;
    stat.count += 1;
    diffStats.set(d, stat);
  }
  const byDifficulty = ['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST']
    .filter((d) => diffStats.has(d))
    .map((difficulty) => {
      const s = diffStats.get(difficulty)!;
      return { difficulty, avgSeconds: Math.round(s.total / s.count), count: s.count };
    });

  // 시험별 추세 (최근 10회)
  const attemptIds = [...new Set(answers.map((a) => a.attemptId))];
  const attempts = await prisma.testAttempt.findMany({
    where: { id: { in: attemptIds }, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    take: 10,
    select: { id: true, completedAt: true, test: { select: { title: true } } },
  });

  const trend = attempts.reverse().map((att) => {
    const attAnswers = answers.filter((a) => a.attemptId === att.id);
    const attTime = attAnswers.reduce((s, a) => s + a.timeSpentSeconds, 0);
    return {
      testTitle: att.test.title,
      completedAt: att.completedAt,
      avgSeconds: attAnswers.length > 0 ? Math.round(attTime / attAnswers.length) : 0,
      questionCount: attAnswers.length,
    };
  });

  return NextResponse.json({
    data: { overall, byChapter, byDifficulty, trend },
  });
}
