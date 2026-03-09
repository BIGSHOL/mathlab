import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** POST: 퀴즈 답안 제출 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { id: sessionId } = await params;
  const body = await request.json();
  const { questionId, selectedAnswer } = body;

  const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: { code: 'INVALID_STATE', message: '퀴즈가 진행 중이 아닙니다' } },
      { status: 400 }
    );
  }

  // Get question and check answer
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { answer: true },
  });
  if (!question) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();
  const isCorrect = normalize(String(selectedAnswer)) === normalize(question.answer);

  // Update participant score
  const participant = await prisma.quizParticipant.findUnique({
    where: { sessionId_studentId: { sessionId, studentId: currentUser.id } },
  });

  if (!participant) {
    return NextResponse.json(
      { error: { code: 'NOT_JOINED', message: '퀴즈에 참가하지 않았습니다' } },
      { status: 400 }
    );
  }

  if (isCorrect) {
    await prisma.quizParticipant.update({
      where: { id: participant.id },
      data: {
        score: { increment: 10 },
        correctCount: { increment: 1 },
      },
    });
  }

  return NextResponse.json({
    data: {
      isCorrect,
      correctAnswer: question.answer,
      newScore: isCorrect ? participant.score + 10 : participant.score,
    },
  });
}
