/**
 * 간격 반복(Spaced Repetition) 복습 서비스
 *
 * 에빙하우스 망각곡선 기반:
 * - 오답 발생 → 3일 후 첫 복습
 * - 복습 정답 → 다음 간격으로 이동 (3→7→14→30→60일)
 * - 복습 오답 → 3일로 리셋
 * - 60일 복습 정답 → 완전 습득 (더 이상 복습 안 함)
 *
 * 사용처:
 * 1. 학생 대시보드 — "오늘의 복습" 카드
 * 2. 숙제/코스 학습 시 — 복습 문제를 자동으로 끼워넣기 (말해보카 스타일)
 * 3. 빈칸 학습 시 — 이전 오답 개념 복습 슬롯
 */

import { prisma } from '@/lib/db';

/** 간격 단계 (일) — 1일(바로 다음날) → 3일 → 7일 → 14일 → 30일 → 60일 */
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60] as const;

/** 다음 간격 계산 */
function getNextInterval(currentInterval: number): number | null {
  const idx = REVIEW_INTERVALS.indexOf(currentInterval as (typeof REVIEW_INTERVALS)[number]);
  if (idx === -1) return REVIEW_INTERVALS[0];
  if (idx >= REVIEW_INTERVALS.length - 1) return null; // 60일 정답 → 완료
  return REVIEW_INTERVALS[idx + 1];
}

/** 간격 라벨 */
export function getIntervalLabel(interval: number): string {
  if (interval <= 1) return '다음날';
  if (interval <= 3) return '3일 후';
  if (interval <= 7) return '1주 후';
  if (interval <= 14) return '2주 후';
  if (interval <= 30) return '1달 후';
  return '2달 후';
}

// ──────────────────────────────────────
// 복습 스케줄 생성 (오답 시 호출)
// ──────────────────────────────────────

interface CreateReviewParams {
  studentId: string;
  questionId?: string;
  conceptId?: string;
  sourceType: 'test' | 'blank' | 'arithmetic';
  sourceId?: string;
}

/**
 * 오답 발생 시 복습 스케줄 생성
 * - 미완료 스케줄이 있으면 → 3일로 리셋 (다시 틀렸으므로 처음부터)
 * - 없으면 → 3일 후 첫 복습으로 생성
 */
export async function createReviewSchedule(params: CreateReviewParams) {
  const { studentId, questionId, conceptId, sourceType, sourceId } = params;
  if (!questionId && !conceptId) return null;

  // 기존 미완료 스케줄 확인
  const existing = await prisma.reviewSchedule.findFirst({
    where: {
      studentId,
      ...(questionId ? { questionId } : {}),
      ...(conceptId ? { conceptId } : {}),
      completedAt: null,
    },
  });

  const reviewAt = new Date();
  reviewAt.setDate(reviewAt.getDate() + REVIEW_INTERVALS[0]);

  // 이미 진행 중인 스케줄이 있으면 → 3일로 리셋 (다시 틀렸으므로)
  if (existing) {
    return prisma.reviewSchedule.update({
      where: { id: existing.id },
      data: {
        interval: REVIEW_INTERVALS[0],
        reviewAt,
        streak: 0,
        sourceType,
        sourceId: sourceId ?? existing.sourceId,
      },
    });
  }

  return prisma.reviewSchedule.create({
    data: {
      studentId,
      questionId: questionId ?? null,
      conceptId: conceptId ?? null,
      sourceType,
      sourceId: sourceId ?? null,
      interval: REVIEW_INTERVALS[0],
      reviewAt,
      streak: 0,
    },
  });
}

// ──────────────────────────────────────
// 복습 완료 처리
// ──────────────────────────────────────

/**
 * 복습 완료 처리
 * - 정답: 다음 간격으로 새 스케줄 생성 (60일 정답이면 완료)
 * - 오답: 3일 간격으로 리셋하여 새 스케줄 생성
 */
export async function completeReview(reviewId: string, isCorrect: boolean, score?: number) {
  const review = await prisma.reviewSchedule.findUnique({ where: { id: reviewId } });
  if (!review || review.completedAt) return null;

  // 현재 스케줄 완료 처리
  const newStreak = isCorrect ? review.streak + 1 : 0;
  await prisma.reviewSchedule.update({
    where: { id: reviewId },
    data: { completedAt: new Date(), score: score ?? (isCorrect ? 100 : 0), streak: newStreak },
  });

  // 다음 간격 계산
  if (isCorrect) {
    const nextInterval = getNextInterval(review.interval);
    if (!nextInterval) return null; // 60일 정답 → 완전 습득, 더 이상 스케줄 없음

    const reviewAt = new Date();
    reviewAt.setDate(reviewAt.getDate() + nextInterval);

    return prisma.reviewSchedule.create({
      data: {
        studentId: review.studentId,
        questionId: review.questionId,
        conceptId: review.conceptId,
        sourceType: review.sourceType,
        sourceId: review.sourceId,
        interval: nextInterval,
        reviewAt,
        streak: newStreak,
      },
    });
  } else {
    // 오답 → 3일 리셋
    const reviewAt = new Date();
    reviewAt.setDate(reviewAt.getDate() + REVIEW_INTERVALS[0]);

    return prisma.reviewSchedule.create({
      data: {
        studentId: review.studentId,
        questionId: review.questionId,
        conceptId: review.conceptId,
        sourceType: review.sourceType,
        sourceId: review.sourceId,
        interval: REVIEW_INTERVALS[0],
        reviewAt,
        streak: 0,
      },
    });
  }
}

// ──────────────────────────────────────
// 오늘 복습할 항목 조회
// ──────────────────────────────────────

/**
 * 오늘(또는 이전) 복습 예정인 미완료 항목 조회
 * - reviewAt <= 오늘 && completedAt IS NULL
 * - 문제/개념 정보 포함
 */
export async function getTodayReviews(studentId: string, limit = 20) {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  return prisma.reviewSchedule.findMany({
    where: {
      studentId,
      reviewAt: { lte: now },
      completedAt: null,
    },
    include: {
      question: {
        select: { id: true, chapter: true, section: true, difficulty: true, content: true, choices: true, answer: true, domain: true },
      },
      concept: {
        select: { id: true, title: true, chapter: true, section: true, conceptCode: true, grade: true },
      },
    },
    orderBy: { reviewAt: 'asc' },
    take: limit,
  });
}

/**
 * 학습 흐름에 끼워넣을 복습 항목 조회 (말해보카 스타일)
 * - 숙제/코스 학습 시 복습 문제를 N개 끼워넣기
 * - 문제 타입 또는 개념 타입으로 필터
 */
export async function getReviewsForInjection(
  studentId: string,
  type: 'question' | 'concept',
  limit = 2,
) {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  return prisma.reviewSchedule.findMany({
    where: {
      studentId,
      reviewAt: { lte: now },
      completedAt: null,
      ...(type === 'question' ? { questionId: { not: null } } : { conceptId: { not: null } }),
    },
    include: {
      question: type === 'question' ? {
        select: { id: true, chapter: true, difficulty: true, content: true, choices: true, answer: true },
      } : false,
      concept: type === 'concept' ? {
        select: { id: true, title: true, chapter: true, conceptCode: true },
      } : false,
    },
    orderBy: { reviewAt: 'asc' },
    take: limit,
  });
}

/**
 * 복습 통계 (대시보드용)
 */
export async function getReviewStats(studentId: string) {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const [pendingCount, completedToday, totalCompleted] = await Promise.all([
    prisma.reviewSchedule.count({
      where: { studentId, reviewAt: { lte: now }, completedAt: null },
    }),
    prisma.reviewSchedule.count({
      where: {
        studentId,
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: now,
        },
      },
    }),
    prisma.reviewSchedule.count({
      where: { studentId, completedAt: { not: null } },
    }),
  ]);

  return { pendingCount, completedToday, totalCompleted };
}
