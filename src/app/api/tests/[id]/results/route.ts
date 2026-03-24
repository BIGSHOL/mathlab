import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, notFound, getStudentScope } from '@/lib/api';

/** GET: 시험 결과 조회 (교사용) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const { id: rawId } = await params;

  // Resolve by seq (numeric) or id (cuid)
  let testId = rawId;
  const seqNum = Number(rawId);
  if (!isNaN(seqNum) && String(seqNum) === rawId) {
    const test = await prisma.test.findUnique({ where: { seq: seqNum }, select: { id: true } });
    if (!test) {
      return notFound('시험을 찾을 수 없습니다');
    }
    testId = test.id;
  }

  // 역할별 학생 스코핑: TEACHER=교실, MANAGER=테넌트, OWNER+=전체
  const studentScope = await getStudentScope(currentUser);
  const studentFilter = studentScope ? { student: studentScope } : {};

  const attempts = await prisma.testAttempt.findMany({
    where: { testId, ...studentFilter },
    include: {
      student: { select: { name: true, grade: true } },
      answers: {
        select: {
          timeSpentSeconds: true,
          isCorrect: true,
          questionId: true,
          flagged: true,
          flagReason: true,
        },
      },
    },
    orderBy: { score: 'desc' },
  });

  return NextResponse.json({ data: attempts });
}
