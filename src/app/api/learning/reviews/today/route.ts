import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuthViewAs, isResponse } from '@/lib/api';
import { getTodayReviews, getReviewStats } from '@/lib/services/spaced-review';

/** GET: 오늘 복습할 항목 + 통계 */
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const [reviews, stats] = await Promise.all([
    getTodayReviews(user.id),
    getReviewStats(user.id),
  ]);

  return NextResponse.json({
    data: {
      reviews: reviews.map((r) => ({
        id: r.id,
        interval: r.interval,
        reviewAt: r.reviewAt.toISOString(),
        streak: r.streak,
        sourceType: r.sourceType,
        question: r.question ? {
          id: r.question.id,
          chapter: r.question.chapter,
          difficulty: r.question.difficulty,
          content: r.question.content,
          choices: r.question.choices,
          answer: r.question.answer,
          domain: r.question.domain,
        } : null,
        concept: r.concept ? {
          id: r.concept.id,
          title: r.concept.title,
          chapter: r.concept.chapter,
          conceptCode: r.concept.conceptCode,
          grade: r.concept.grade,
        } : null,
      })),
      stats,
    },
  });
}
