import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** POST: 퀴즈 참가 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Find by id or joinCode
  let session = await prisma.quizSession.findUnique({ where: { id } });
  if (!session) {
    session = await prisma.quizSession.findUnique({ where: { joinCode: id.toUpperCase() } });
  }
  if (!session) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '퀴즈를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  if (session.status === 'COMPLETED') {
    return NextResponse.json(
      { error: { code: 'QUIZ_ENDED', message: '이미 종료된 퀴즈입니다' } },
      { status: 400 }
    );
  }

  // Check if already joined
  const existing = await prisma.quizParticipant.findUnique({
    where: { sessionId_studentId: { sessionId: session.id, studentId: currentUser.id } },
  });

  if (existing) {
    return NextResponse.json({ data: { sessionId: session.id, participantId: existing.id } });
  }

  const participant = await prisma.quizParticipant.create({
    data: {
      sessionId: session.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
    },
  });

  return NextResponse.json({ data: { sessionId: session.id, participantId: participant.id } });
}
