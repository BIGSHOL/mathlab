import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireTeacher, isResponse, badRequest } from '@/lib/api';

/** GET: 레벨테스트 목록 */
export async function GET(request: NextRequest) {
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;

  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { isActive: true, testType: 'level_test' };
  if (grade) where.grade = parseInt(grade);

  const tests = await prisma.test.findMany({
    where,
    include: {
      creator: { select: { name: true } },
      levelTestConfig: true,
      _count: { select: { attempts: true, assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: tests });
}

/** POST: 레벨테스트 생성 */
export async function POST(request: NextRequest) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const body = await request.json();
  const { title, grade, questionIds, questionDomains, timeLimitMin, questionsPerPage, spacing } = body;

  if (!title || !grade || !questionIds?.length || !questionDomains) {
    return badRequest('필수 항목이 누락되었습니다');
  }

  // 모든 문제에 영역이 지정되었는지 확인
  const untagged = (questionIds as string[]).filter((id: string) => !questionDomains[id]);
  if (untagged.length > 0) {
    return badRequest(`영역이 지정되지 않은 문제가 ${untagged.length}개 있습니다`);
  }

  const test = await prisma.$transaction(async (tx) => {
    const created = await tx.test.create({
      data: {
        title,
        grade,
        testType: 'level_test',
        questionIds,
        questionCount: questionIds.length,
        timeLimitMin: timeLimitMin || null,
        shuffleOptions: false,
        maxAttempts: 1,
        createdBy: currentUser.id,
      },
    });

    await tx.levelTestConfig.create({
      data: {
        testId: created.id,
        questionDomains,
        questionsPerPage: questionsPerPage || null,
        spacing: spacing || 'normal',
      },
    });

    return created;
  });

  return NextResponse.json({ data: test }, { status: 201 });
}
