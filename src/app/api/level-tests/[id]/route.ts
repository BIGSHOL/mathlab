import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';

/** GET: 레벨테스트 상세 (문제 포함) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;

  const { id } = await params;
  const seq = Number(id);

  if (isNaN(seq)) {
    return badRequest('잘못된 시험 번호입니다');
  }

  const test = await prisma.test.findUnique({
    where: { seq },
    include: {
      creator: { select: { name: true } },
      levelTestConfig: true,
      _count: { select: { attempts: true, assignments: true } },
    },
  });

  if (!test || test.testType !== 'level_test') {
    return notFound('레벨테스트를 찾을 수 없습니다');
  }

  // 문제 상세 조회
  const questionIds = test.questionIds as string[];
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
      ...(currentUser.role !== 'STUDENT' ? { answer: true, explanation: true } : {}),
    },
  });

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = questionIds.map((qid) => questionMap.get(qid)).filter(Boolean);

  return NextResponse.json({
    data: { ...test, questions: orderedQuestions },
  });
}

/** PATCH: 레벨테스트 문항 교체 */
export async function PATCH(
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

  const test = await prisma.test.findUnique({
    where: { seq },
    include: { levelTestConfig: true },
  });

  if (!test || test.testType !== 'level_test') {
    return notFound('레벨테스트를 찾을 수 없습니다');
  }

  const body = await request.json();
  const { questionIds, questionDomains } = body;

  if (!questionIds?.length || !questionDomains) {
    return badRequest('필수 항목이 누락되었습니다');
  }

  // 모든 문제에 영역이 지정되었는지 확인
  const untagged = (questionIds as string[]).filter((qid: string) => !questionDomains[qid]);
  if (untagged.length > 0) {
    return badRequest(`영역이 지정되지 않은 문제가 ${untagged.length}개 있습니다`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.test.update({
      where: { seq },
      data: {
        questionIds,
        questionCount: questionIds.length,
      },
    });

    if (test.levelTestConfig) {
      await tx.levelTestConfig.update({
        where: { id: test.levelTestConfig.id },
        data: { questionDomains },
      });
    }
  });

  return NextResponse.json({ data: { success: true } });
}

/** DELETE: 레벨테스트 삭제 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id } = await params;
  const seq = Number(id);
  if (isNaN(seq)) {
    return badRequest('잘못된 시험 번호입니다');
  }

  await prisma.test.delete({ where: { seq } });

  return NextResponse.json({ data: { success: true } });
}
