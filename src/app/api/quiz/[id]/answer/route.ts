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

  const { id: rawId } = await params;
  const body = await request.json();
  const { questionId, selectedAnswer } = body;

  // Resolve by id or joinCode
  let session = await prisma.quizSession.findUnique({ where: { id: rawId } });
  if (!session) {
    session = await prisma.quizSession.findUnique({ where: { joinCode: rawId.toUpperCase() } });
  }
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
    where: { sessionId_studentId: { sessionId: session.id, studentId: currentUser.id } },
  });

  if (!participant) {
    return NextResponse.json(
      { error: { code: 'NOT_JOINED', message: '퀴즈에 참가하지 않았습니다' } },
      { status: 400 }
    );
  }

  const pointsEarned = isCorrect ? 10 : 0;

  // 퀴즈 답변 상세 + 점수 업데이트 (트랜잭션)
  await prisma.$transaction(async (tx) => {
    // 답변 상세 로그 저장
    await tx.quizAnswerLog.upsert({
      where: { participantId_questionId: { participantId: participant.id, questionId } },
      update: {
        selectedAnswer: String(selectedAnswer),
        isCorrect,
        pointsEarned,
        timeSpentSeconds: body.timeSpentSeconds || 0,
      },
      create: {
        participantId: participant.id,
        questionId,
        questionIndex: session.currentQ,
        selectedAnswer: String(selectedAnswer),
        correctAnswer: question.answer,
        isCorrect,
        pointsEarned,
        timeSpentSeconds: body.timeSpentSeconds || 0,
      },
    });

    if (isCorrect) {
      await tx.quizParticipant.update({
        where: { id: participant.id },
        data: {
          score: { increment: 10 },
          correctCount: { increment: 1 },
        },
      });
    }
  });

  return NextResponse.json({
    data: {
      isCorrect,
      correctAnswer: question.answer,
      newScore: isCorrect ? participant.score + 10 : participant.score,
    },
  });
}
