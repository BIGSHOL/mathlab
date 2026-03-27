import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, requireOwner, isResponse, badRequest } from '@/lib/api';

/** GET /api/exam-analysis/categories — 문제 카테고리 트리 조회 (TEACHER+) */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject') as 'MATH' | 'ENGLISH' | null;

  const where: Record<string, unknown> = {
    parentId: null,
    isActive: true,
    ...(subject && { subject }),
  };

  const categories = await prisma.examProblemCategory.findMany({
    where,
    include: {
      children: {
        where: { isActive: true },
        include: {
          problemTypes: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          children: {
            where: { isActive: true },
            include: {
              problemTypes: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      problemTypes: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ data: categories });
}

/** POST /api/exam-analysis/categories — 문제 카테고리 생성 (OWNER+) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { subject, name, nameEn, description, parentId, sortOrder } = body;

  if (!subject || !name) {
    return badRequest('필수 항목을 입력하세요 (subject, name)');
  }

  if (!['MATH', 'ENGLISH'].includes(subject)) {
    return badRequest('subject는 MATH 또는 ENGLISH만 허용됩니다');
  }

  // parentId 유효성 검증
  if (parentId) {
    const parent = await prisma.examProblemCategory.findUnique({
      where: { id: parentId },
    });
    if (!parent) return badRequest('존재하지 않는 상위 카테고리입니다');
    if (parent.subject !== subject) {
      return badRequest('상위 카테고리와 과목이 일치하지 않습니다');
    }
  }

  const category = await prisma.examProblemCategory.create({
    data: {
      subject,
      name,
      nameEn: nameEn ?? null,
      description: description ?? null,
      parentId: parentId ?? null,
      sortOrder: sortOrder ?? 0,
    },
    include: {
      parent: { select: { id: true, name: true } },
      children: true,
      problemTypes: true,
    },
  });

  return NextResponse.json({ data: category }, { status: 201 });
}
