import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse, badRequest, requireLicense } from '@/lib/api';
import { prisma } from '@/lib/db';
import { awardXp } from '@/lib/utils/xp';
import { checkAndAwardBadges } from '@/lib/services/badge-checker';

interface AnswerItem {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  correctAnswer?: string;
  timeSpentSeconds?: number;
}

/** POST /api/learning/revenge-complete — 복수전 완료 처리 */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;
  const licenseCheck = await requireLicense(user, 'revenge');
  if (licenseCheck) return licenseCheck;

  const body = await request.json();
  const { answers, chapter, difficulty, totalTimeSeconds } = body;
  // answers: [{questionId, selectedAnswer, isCorrect, correctAnswer?, timeSpentSeconds?}]

  if (!Array.isArray(answers) || answers.length === 0) {
    return badRequest('답안이 필요합니다');
  }

  const answerItems = answers as AnswerItem[];
  const correctCount = answerItems.filter((a) => a.isCorrect).length;
  const totalCount = answerItems.length;
  const accuracy = Math.round((correctCount / totalCount) * 100);
  const isVictory = accuracy >= 60;

  // XP: 정답 1개당 3XP (복수전 보너스)
  const xp = correctCount * 3;
  let leveledUp = false;

  // RevengeAttempt + RevengeAnswer 저장 + XP 지급 (트랜잭션)
  await prisma.$transaction(async (tx) => {
    const attempt = await tx.revengeAttempt.create({
      data: {
        studentId: user.id,
        chapter: chapter ?? '알 수 없음',
        difficulty: difficulty ?? 'MEDIUM',
        correctCount,
        totalCount,
        accuracy,
        xpEarned: xp,
        isVictory,
        totalTimeSeconds: totalTimeSeconds ?? 0,
      },
    });

    // 개별 답안 저장
    await tx.revengeAnswer.createMany({
      data: answerItems.map((a, idx) => ({
        attemptId: attempt.id,
        questionId: a.questionId,
        problemIndex: idx,
        selectedAnswer: a.selectedAnswer,
        correctAnswer: a.correctAnswer ?? '',
        isCorrect: a.isCorrect,
        timeSpentSeconds: a.timeSpentSeconds ?? 0,
      })),
    });

    // XP 지급
    if (xp > 0) {
      await awardXp(tx, user.id, xp, 'REVENGE', chapter);
    }
  });

  // 레벨업 확인
  if (xp > 0) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { level: true, totalXp: true },
    });
    if (profile) {
      const thresholds = [0, 100, 250, 500, 800];
      const prevLevel = thresholds.filter((t) => t <= (profile.totalXp - xp)).length;
      const newLevel = thresholds.filter((t) => t <= profile.totalXp).length;
      if (newLevel > prevLevel) leveledUp = true;
    }
  }

  // 뱃지 체크 (복수전 관련 뱃지 트리거)
  checkAndAwardBadges(user.id).catch((e) => console.error('[badge-check-revenge]', e));

  return NextResponse.json({
    data: {
      correctCount,
      totalCount,
      accuracy,
      isVictory,
      xpEarned: xp,
      leveledUp,
    },
  });
}
