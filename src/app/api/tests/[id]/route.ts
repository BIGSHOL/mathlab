import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireTeacher, isResponse, notFound } from '@/lib/api';
import { getTestQuestionIds } from '@/lib/utils/question-order';

/** Resolve test by seq (numeric) or id (cuid) */
async function resolveTestId(id: string): Promise<string | null> {
  const seq = Number(id);
  if (!isNaN(seq) && String(seq) === id) {
    const test = await prisma.test.findUnique({ where: { seq }, select: { id: true } });
    return test?.id ?? null;
  }
  return id;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;

  const { id: rawId } = await params;
  const testId = await resolveTestId(rawId);
  if (!testId) {
    return notFound('시험을 찾을 수 없습니다');
  }

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      creator: { select: { name: true } },
      _count: { select: { attempts: true } },
    },
  });

  if (!test) {
    return notFound('시험을 찾을 수 없습니다');
  }

  // 문제 상세 조회 (중간테이블 우선, Json 폴백)
  const questionIds = await getTestQuestionIds(testId);
  // 학생: 완료한 시도가 있으면 정답/해설 공개 (결과 확인용)
  let showAnswers = currentUser.role !== 'STUDENT';
  if (!showAnswers) {
    const completed = await prisma.testAttempt.count({
      where: { testId, studentId: currentUser.id, completedAt: { not: null } },
    });
    showAnswers = completed > 0;
  }
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      bookCode: true,
      chapter: true,
      questionNum: true,
      difficulty: true,
      type: true,
      content: true,
      choices: true,
      answer: showAnswers,
      explanation: showAnswers,
      domain: true,
      diagramSpec: true,
      diagramSVG: true,
    },
  });

  // questionIds 순서 유지
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = questionIds.map((id) => questionMap.get(id)).filter(Boolean);

  return NextResponse.json({
    data: { ...test, questions: orderedQuestions },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id: rawId } = await params;
  const testId = await resolveTestId(rawId);
  if (!testId) {
    return notFound('시험을 찾을 수 없습니다');
  }

  const body = await request.json();
  const { title, description, grade, testType, questionIds, timeLimitMin, shuffleOptions, isActive, maxAttempts, defaultDueDate, allowLateSubmission } = body;

  const test = await prisma.$transaction(async (tx) => {
    const updated = await tx.test.update({
      where: { id: testId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(grade !== undefined && { grade }),
        ...(testType !== undefined && { testType }),
        ...(questionIds !== undefined && { questionIds, questionCount: questionIds.length }),
        ...(timeLimitMin !== undefined && { timeLimitMin }),
        ...(shuffleOptions !== undefined && { shuffleOptions }),
        ...(isActive !== undefined && { isActive }),
        ...(maxAttempts !== undefined && { maxAttempts }),
        ...(defaultDueDate !== undefined && { defaultDueDate: defaultDueDate ? new Date(defaultDueDate) : null }),
        ...(allowLateSubmission !== undefined && { allowLateSubmission }),
      },
    });

    // Dual-Write: questionIds 변경 시 중간테이블도 갱신
    if (questionIds !== undefined) {
      await tx.testQuestion.deleteMany({ where: { testId } });
      await tx.testQuestion.createMany({
        data: (questionIds as string[]).map((qId: string, idx: number) => ({
          testId,
          questionId: qId,
          sortOrder: idx,
        })),
      });
    }

    return updated;
  });

  return NextResponse.json({ data: test });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id: rawId } = await params;
  const testId = await resolveTestId(rawId);
  if (!testId) {
    return notFound('시험을 찾을 수 없습니다');
  }

  await prisma.test.delete({ where: { id: testId } });

  return NextResponse.json({ data: { success: true } });
}
