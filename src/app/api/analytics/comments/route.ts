import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, forbidden, canAccessStudent } from '@/lib/api';

/** GET: 선생님 코멘트 조회 */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const month = searchParams.get('month');

  if (!studentId || !month) {
    return badRequest('studentId와 month가 필요합니다');
  }

  // 접근 권한 검증
  if (!(await canAccessStudent(user, studentId))) {
    return forbidden();
  }

  const comment = await prisma.teacherComment.findUnique({
    where: {
      teacherId_studentId_month: {
        teacherId: user.id,
        studentId,
        month,
      },
    },
  });

  return NextResponse.json({ data: comment?.content ?? '' });
}

/** PUT: 선생님 코멘트 저장/업데이트 */
export async function PUT(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { studentId, month, content } = body;

  if (!studentId || !month || typeof content !== 'string') {
    return badRequest('studentId, month, content가 필요합니다');
  }

  // 접근 권한 검증
  if (!(await canAccessStudent(user, studentId))) {
    return forbidden();
  }

  await prisma.teacherComment.upsert({
    where: {
      teacherId_studentId_month: {
        teacherId: user.id,
        studentId,
        month,
      },
    },
    update: { content },
    create: {
      teacherId: user.id,
      studentId,
      month,
      content,
    },
  });

  return NextResponse.json({ data: { saved: true } });
}
