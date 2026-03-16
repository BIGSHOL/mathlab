import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, notFound, badRequest } from '@/lib/api';

/** POST: 퀴즈 참가 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;

  const { id } = await params;

  // Find by id or joinCode
  let session = await prisma.quizSession.findUnique({ where: { id } });
  if (!session) {
    session = await prisma.quizSession.findUnique({ where: { joinCode: id.toUpperCase() } });
  }
  if (!session) {
    return notFound('퀴즈를 찾을 수 없습니다');
  }

  if (session.status === 'COMPLETED') {
    return badRequest('이미 종료된 퀴즈입니다');
  }

  // Check if already joined
  const existing = await prisma.quizParticipant.findUnique({
    where: { sessionId_studentId: { sessionId: session.id, studentId: currentUser.id } },
  });

  if (existing) {
    return NextResponse.json({ data: { sessionId: session.id, joinCode: session.joinCode, participantId: existing.id } });
  }

  const participant = await prisma.quizParticipant.create({
    data: {
      sessionId: session.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
    },
  });

  return NextResponse.json({ data: { sessionId: session.id, joinCode: session.joinCode, participantId: participant.id } });
}
