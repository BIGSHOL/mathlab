import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** GET: 선생님 코멘트 조회 */
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
  const month = searchParams.get('month');

  if (!studentId || !month) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'studentId와 month가 필요합니다' } },
      { status: 400 }
    );
  }

  const comment = await prisma.teacherComment.findUnique({
    where: {
      teacherId_studentId_month: {
        teacherId: currentUser.id,
        studentId,
        month,
      },
    },
  });

  return NextResponse.json({ data: comment?.content ?? '' });
}

/** PUT: 선생님 코멘트 저장/업데이트 */
export async function PUT(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { studentId, month, content } = body;

  if (!studentId || !month || typeof content !== 'string') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'studentId, month, content가 필요합니다' } },
      { status: 400 }
    );
  }

  await prisma.teacherComment.upsert({
    where: {
      teacherId_studentId_month: {
        teacherId: currentUser.id,
        studentId,
        month,
      },
    },
    update: { content },
    create: {
      teacherId: currentUser.id,
      studentId,
      month,
      content,
    },
  });

  return NextResponse.json({ data: { saved: true } });
}
