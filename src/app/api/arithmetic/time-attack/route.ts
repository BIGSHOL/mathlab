import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { generateProblems, IMPLEMENTED_CATEGORIES } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory, ArithmeticLevel } from '@/lib/services/arithmetic-generator';
import { awardXp } from '@/lib/utils/xp';

const VALID_LEVELS: ArithmeticLevel[] = ['easy', 'medium', 'hard'];
const TIME_LIMIT = 30; // 초

interface AnswerItem {
  problemIndex: number;
  content: string;
  choices: string[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  comboCount: number;
}

/** POST /api/arithmetic/time-attack — 타임어택 시작 (30문제 생성) */
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { category, level, action } = body;

  if (!IMPLEMENTED_CATEGORIES.has(category as ArithmeticCategory)) {
    return badRequest('유효하지 않은 연산 유형입니다');
  }
  if (!VALID_LEVELS.includes(level)) {
    return badRequest('유효하지 않은 난이도입니다');
  }

  // action: 'start' = 문제 생성, 'complete' = 결과 저장
  if (action === 'complete') {
    const { correctCount, answers } = body;
    if (typeof correctCount !== 'number' || correctCount < 0) {
      return badRequest('correctCount가 필요합니다');
    }

    // 이전 최고기록 조회
    const previousBest = await prisma.timeAttackRecord.findFirst({
      where: { studentId: user.id, category, level },
      orderBy: { correctCount: 'desc' },
      select: { correctCount: true },
    });

    // 기록 + 개별 답안 저장 (트랜잭션)
    const answerItems = Array.isArray(answers) ? answers as AnswerItem[] : [];

    await prisma.$transaction(async (tx) => {
      const record = await tx.timeAttackRecord.create({
        data: {
          studentId: user.id,
          category,
          level,
          correctCount,
          totalTime: TIME_LIMIT,
        },
      });

      // 개별 답안 저장
      if (answerItems.length > 0) {
        await tx.timeAttackAnswer.createMany({
          data: answerItems.map((a) => ({
            recordId: record.id,
            problemIndex: a.problemIndex,
            content: a.content,
            choices: a.choices,
            selectedAnswer: a.selectedAnswer,
            correctAnswer: a.correctAnswer,
            isCorrect: a.isCorrect,
            timeSpentMs: a.timeSpentMs ?? 0,
            comboCount: a.comboCount ?? 0,
          })),
        });
      }
    });

    // XP: 정답 1개당 2XP
    const xp = correctCount * 2;
    let leveledUp = false;
    if (xp > 0) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: { level: true },
      });
      await prisma.$transaction(async (tx) => {
        await awardXp(tx, user.id, xp, 'TIME_ATTACK');
      });
      if (profile) {
        const updated = await prisma.studentProfile.findUnique({
          where: { userId: user.id },
          select: { level: true },
        });
        if (updated && updated.level > profile.level) leveledUp = true;
      }
    }

    const isNewRecord = !previousBest || correctCount > previousBest.correctCount;

    return NextResponse.json({
      data: {
        correctCount,
        isNewRecord,
        previousRecord: previousBest?.correctCount ?? 0,
        xpEarned: xp,
        leveledUp,
      },
    });
  }

  // 기본: start — 30문제 한번에 생성
  const problems = generateProblems(category as ArithmeticCategory, level as ArithmeticLevel, 30);

  // 개인 최고기록
  const bestRecord = await prisma.timeAttackRecord.findFirst({
    where: { studentId: user.id, category, level },
    orderBy: { correctCount: 'desc' },
    select: { correctCount: true },
  });

  return NextResponse.json({
    data: {
      problems,
      timeLimit: TIME_LIMIT,
      bestRecord: bestRecord?.correctCount ?? 0,
    },
  });
}

/** GET /api/arithmetic/time-attack — 기록 조회 */
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const level = searchParams.get('level');

  // 개인 최고기록
  const myBest = category && level
    ? await prisma.timeAttackRecord.findFirst({
        where: { studentId: user.id, category, level },
        orderBy: { correctCount: 'desc' },
        select: { correctCount: true, createdAt: true },
      })
    : null;

  // 전체 Top 10 (해당 카테고리+레벨)
  const top10 = category && level
    ? await prisma.$queryRaw<Array<{ studentId: string; name: string; correctCount: number }>>`
        SELECT t."studentId", u."name", t."correctCount"
        FROM "TimeAttackRecord" t
        JOIN "User" u ON u.id = t."studentId"
        WHERE t.category = ${category} AND t.level = ${level}
        ORDER BY t."correctCount" DESC
        LIMIT 10
      `
    : [];

  return NextResponse.json({
    data: {
      myBest: myBest ? { correctCount: myBest.correctCount, date: myBest.createdAt } : null,
      top10,
    },
  });
}
