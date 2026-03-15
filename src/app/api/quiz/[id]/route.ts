import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** GET: 퀴즈 세션 상세 (상태 + 참가자 + 현재 문제) */
export async function GET(
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

  // id could be a joinCode or session id
  let session = await prisma.quizSession.findUnique({
    where: { id },
    include: {
      participants: { orderBy: { score: 'desc' } },
    },
  });

  if (!session) {
    session = await prisma.quizSession.findUnique({
      where: { joinCode: id.toUpperCase() },
      include: {
        participants: { orderBy: { score: 'desc' } },
      },
    });
  }

  if (!session) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '퀴즈를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // Fetch current question content if active
  let currentQuestion = null;
  if (session.status === 'ACTIVE') {
    const questionIds = session.questionIds as string[];
    if (session.currentQ < questionIds.length) {
      const q = await prisma.question.findUnique({
        where: { id: questionIds[session.currentQ] },
        select: { id: true, content: true, choices: true, difficulty: true, chapter: true },
      });
      currentQuestion = q;
    }
  }

  return NextResponse.json({
    data: {
      ...session,
      currentQuestion,
      totalQuestions: (session.questionIds as string[]).length,
    },
  });
}

/** PATCH: 퀴즈 상태 변경 (교사: start, next, end) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { id: rawId } = await params;
  const body = await request.json();
  const { action } = body;

  // Resolve by id or joinCode
  let session = await prisma.quizSession.findUnique({ where: { id: rawId } });
  if (!session) {
    session = await prisma.quizSession.findUnique({ where: { joinCode: rawId.toUpperCase() } });
  }
  if (!session || session.hostId !== currentUser.id) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '퀴즈를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const sessionId = session.id;
  const questionIds = session.questionIds as string[];

  if (action === 'start') {
    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE', startedAt: new Date(), currentQ: 0, questionChangedAt: new Date() },
    });
  } else if (action === 'next') {
    const nextQ = session.currentQ + 1;
    if (nextQ >= questionIds.length) {
      // Quiz ended — calculate ranks + update session (atomic)
      const participants = await prisma.quizParticipant.findMany({
        where: { sessionId },
        orderBy: { score: 'desc' },
      });
      await prisma.$transaction([
        ...participants.map((p, i) =>
          prisma.quizParticipant.update({ where: { id: p.id }, data: { rank: i + 1 } })
        ),
        prisma.quizSession.update({
          where: { id: sessionId },
          data: { status: 'COMPLETED', endedAt: new Date(), currentQ: nextQ },
        }),
      ]);
    } else {
      await prisma.quizSession.update({
        where: { id: sessionId },
        data: { currentQ: nextQ, questionChangedAt: new Date() },
      });
    }
  } else if (action === 'end') {
    const participants = await prisma.quizParticipant.findMany({
      where: { sessionId },
      orderBy: { score: 'desc' },
    });
    await prisma.$transaction([
      ...participants.map((p, i) =>
        prisma.quizParticipant.update({ where: { id: p.id }, data: { rank: i + 1 } })
      ),
      prisma.quizSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', endedAt: new Date() },
      }),
    ]);
  }

  return NextResponse.json({ data: { success: true } });
}
