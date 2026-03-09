import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** GET: 유사 문제 추천 (같은 단원+난이도, 본인 제외) */
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');
  const limit = Math.min(Number(searchParams.get('limit') ?? '5'), 20);

  if (!questionId) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'questionId가 필요합니다' } },
      { status: 400 }
    );
  }

  // 원본 문제 조회
  const source = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, chapter: true, section: true, difficulty: true, bookCode: true },
  });

  if (!source) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // 1순위: 같은 단원 + 같은 섹션 + 같은 난이도
  let similar = await prisma.question.findMany({
    where: {
      id: { not: questionId },
      chapter: source.chapter,
      section: source.section,
      difficulty: source.difficulty,
    },
    select: {
      id: true,
      content: true,
      choices: true,
      answer: true,
      difficulty: true,
      chapter: true,
      section: true,
      questionNum: true,
      bookCode: true,
    },
    take: limit,
  });

  // 2순위: 부족하면 같은 단원 + 같은 난이도 (섹션 무관)
  if (similar.length < limit) {
    const existingIds = [questionId, ...similar.map((q) => q.id)];
    const more = await prisma.question.findMany({
      where: {
        id: { notIn: existingIds },
        chapter: source.chapter,
        difficulty: source.difficulty,
      },
      select: {
        id: true,
        content: true,
        choices: true,
        answer: true,
        difficulty: true,
        chapter: true,
        section: true,
        questionNum: true,
        bookCode: true,
      },
      take: limit - similar.length,
    });
    similar = [...similar, ...more];
  }

  // 3순위: 여전히 부족하면 같은 단원 (난이도 ±1)
  if (similar.length < limit) {
    const diffOrder = ['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST'];
    const idx = diffOrder.indexOf(source.difficulty);
    const nearDiffs = diffOrder.filter((_, i) => Math.abs(i - idx) === 1);
    const existingIds = [questionId, ...similar.map((q) => q.id)];
    const more = await prisma.question.findMany({
      where: {
        id: { notIn: existingIds },
        chapter: source.chapter,
        difficulty: { in: nearDiffs as ('BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST')[] },
      },
      select: {
        id: true,
        content: true,
        choices: true,
        answer: true,
        difficulty: true,
        chapter: true,
        section: true,
        questionNum: true,
        bookCode: true,
      },
      take: limit - similar.length,
    });
    similar = [...similar, ...more];
  }

  return NextResponse.json({
    data: {
      source: { id: source.id, chapter: source.chapter, section: source.section, difficulty: source.difficulty },
      similar,
      count: similar.length,
    },
  });
}
