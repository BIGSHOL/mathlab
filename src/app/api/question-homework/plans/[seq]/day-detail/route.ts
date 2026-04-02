import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ seq: string }> };

/**
 * GET /api/question-homework/plans/[seq]/day-detail?dayIndex=N&studentId=S
 *
 * 특정 일차의 문제별 학생 답안 상세
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  const dayIndex = Number(request.nextUrl.searchParams.get('dayIndex'));
  const studentId = request.nextUrl.searchParams.get('studentId');

  if (isNaN(dayIndex) || dayIndex < 0 || !studentId) {
    return badRequest('dayIndex와 studentId가 필요합니다');
  }

  const plan = await prisma.questionHomeworkPlan.findUnique({
    where: { seq: Number(seq) },
    select: { id: true, totalDays: true, passingScore: true, dailyQuestions: true },
  });
  if (!plan) return badRequest('플랜을 찾을 수 없습니다');
  if (dayIndex >= plan.totalDays) return badRequest('유효하지 않은 일차입니다');

  // 학생 정보
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true },
  });

  // 해당 일차의 문제: 중간테이블 우선, 없으면 dailyQuestions Json 폴백
  const hwQuestions = await prisma.homeworkQuestion.findMany({
    where: { planId: plan.id, dayIndex },
    orderBy: { sortOrder: 'asc' },
    include: {
      question: {
        select: {
          id: true,
          content: true,
          choices: true,
          answer: true,
          explanation: true,
          chapter: true,
          difficulty: true,
        },
      },
    },
  });

  let questions: { id: string; content: string; choices: string[]; answer: string; explanation: string | null; chapter: string | null; difficulty: string }[];

  if (hwQuestions.length > 0) {
    questions = hwQuestions.map(hq => ({
      id: hq.question.id,
      content: hq.question.content,
      choices: (hq.question.choices as string[]) ?? [],
      answer: hq.question.answer,
      explanation: hq.question.explanation,
      chapter: hq.question.chapter,
      difficulty: hq.question.difficulty,
    }));
  } else {
    // Json 폴백: dailyQuestions[dayIndex]에서 문제 ID 추출
    const allDaily = plan.dailyQuestions as string[][] | null;
    const dayQIds = allDaily?.[dayIndex] ?? [];
    if (dayQIds.length > 0) {
      const qRecords = await prisma.question.findMany({
        where: { id: { in: dayQIds } },
        select: { id: true, content: true, choices: true, answer: true, explanation: true, chapter: true, difficulty: true },
      });
      // dayQIds 순서 유지
      questions = dayQIds.map(id => qRecords.find(q => q.id === id)).filter(Boolean).map(q => ({
        id: q!.id,
        content: q!.content,
        choices: (q!.choices as string[]) ?? [],
        answer: q!.answer,
        explanation: q!.explanation,
        chapter: q!.chapter,
        difficulty: q!.difficulty,
      }));
    } else {
      questions = [];
    }
  }

  // 학생 답안 조회
  const attempt = await prisma.questionHomeworkAttempt.findFirst({
    where: { planId: plan.id, studentId, dayIndex },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      correctCount: true,
      totalCount: true,
      score: true,
      completedAt: true,
      createdAt: true,
      answers: true,
    },
  });

  const answers = (attempt?.answers as Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
  }>) ?? [];

  return NextResponse.json({
    data: {
      student,
      dayIndex,
      questions,
      attempt: attempt ? {
        id: attempt.id,
        correctCount: attempt.correctCount,
        totalCount: attempt.totalCount,
        score: attempt.score,
        completedAt: attempt.completedAt?.toISOString() ?? null,
        answers: questions.map((q, idx) => {
          const ans = answers.find(a => a.questionId === q.id) ?? answers[idx];
          return {
            questionIndex: idx,
            questionId: q.id,
            content: q.content,
            choices: q.choices,
            selectedAnswer: ans?.selectedAnswer ?? null,
            correctAnswer: q.answer,
            isCorrect: ans?.isCorrect ?? false,
          };
        }),
      } : null,
    },
  });
}
