import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';

/** GET: 학생별 오답 문제 조회 */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const chapter = searchParams.get('chapter');
  const difficulty = searchParams.get('difficulty');

  if (!studentId) {
    return badRequest('studentId가 필요합니다');
  }

  // 해당 학생의 오답 AnswerLog 조회 (가장 최근 시도 기준, 중복 제거)
  const wrongAnswers = await prisma.answerLog.findMany({
    where: {
      attempt: { studentId },
      isCorrect: false,
    },
    select: {
      questionId: true,
      timeSpentSeconds: true,
      selectedAnswer: true,
      createdAt: true,
      attempt: {
        select: {
          test: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // questionId 기준 중복 제거 (가장 최근 오답만)
  const uniqueQuestionIds = [...new Set(wrongAnswers.map((w) => w.questionId))];

  // 문제 상세 조회
  const questions = await prisma.question.findMany({
    where: {
      id: { in: uniqueQuestionIds },
      ...(chapter ? { chapter } : {}),
      ...(difficulty ? { difficulty: difficulty as 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST' } : {}),
    },
    select: {
      id: true,
      content: true,
      choices: true,
      answer: true,
      explanation: true,
      difficulty: true,
      chapter: true,
      section: true,
      bookCode: true,
      questionNum: true,
    },
  });

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // 망각곡선 복습 스케줄 조회 (해당 학생의 오답 문제들)
  const reviewSchedules = await prisma.reviewSchedule.findMany({
    where: {
      studentId,
      questionId: { in: uniqueQuestionIds },
    },
    select: {
      questionId: true,
      interval: true,
      reviewAt: true,
      completedAt: true,
      streak: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // questionId별 최신 스케줄 매핑
  const reviewMap = new Map<string, typeof reviewSchedules[number]>();
  for (const r of reviewSchedules) {
    if (r.questionId && !reviewMap.has(r.questionId)) {
      reviewMap.set(r.questionId, r);
    }
  }

  // 완료된 복습 횟수 (questionId별)
  const completedCounts = new Map<string, number>();
  for (const r of reviewSchedules) {
    if (r.questionId && r.completedAt) {
      completedCounts.set(r.questionId, (completedCounts.get(r.questionId) || 0) + 1);
    }
  }

  // 오답 데이터와 문제 정보 결합
  const result = uniqueQuestionIds
    .map((qId) => {
      const q = questionMap.get(qId);
      if (!q) return null;
      const log = wrongAnswers.find((w) => w.questionId === qId)!;
      const review = reviewMap.get(qId);
      return {
        question: q,
        lastWrongAnswer: log.selectedAnswer,
        lastWrongAt: log.createdAt,
        timeSpent: log.timeSpentSeconds,
        testTitle: log.attempt.test.title,
        review: review ? {
          interval: review.interval,
          reviewAt: review.reviewAt,
          completedAt: review.completedAt,
          streak: review.streak,
          totalReviewed: completedCounts.get(qId) || 0,
        } : null,
      };
    })
    .filter(Boolean);

  // 단원별 오답 통계
  const chapterStats: Record<string, number> = {};
  for (const item of result) {
    if (!item) continue;
    const ch = item.question.chapter;
    chapterStats[ch] = (chapterStats[ch] || 0) + 1;
  }

  // 유사 문항 추천: 오답 문제와 같은 단원+난이도의 다른 문제
  const similarMap: Record<string, { id: string; questionNum: number; difficulty: string; section: string | null; bookCode: string }[]> = {};
  const chapterDiffGroups = new Map<string, Set<string>>();

  for (const item of result) {
    if (!item) continue;
    const key = `${item.question.chapter}__${item.question.difficulty}`;
    if (!chapterDiffGroups.has(key)) chapterDiffGroups.set(key, new Set());
    chapterDiffGroups.get(key)!.add(item.question.id);
  }

  const similarResults = await Promise.all(
    [...chapterDiffGroups.entries()].map(async ([key, excludeIds]) => {
      const [ch, diff] = key.split('__');
      const similar = await prisma.question.findMany({
        where: {
          chapter: ch,
          difficulty: diff as 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST',
          id: { notIn: [...excludeIds] },
        },
        select: { id: true, questionNum: true, difficulty: true, section: true, bookCode: true },
        take: 5,
      });
      return { excludeIds, similar };
    })
  );

  for (const { excludeIds, similar } of similarResults) {
    for (const excId of excludeIds) {
      similarMap[excId] = similar;
    }
  }

  return NextResponse.json({
    data: result,
    stats: {
      totalWrongQuestions: result.length,
      chapterStats,
    },
    similarQuestions: similarMap,
  });
}
