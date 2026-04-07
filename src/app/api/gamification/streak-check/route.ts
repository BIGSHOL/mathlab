import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs } from '@/lib/api/auth';
import { isResponse } from '@/lib/api/helpers';
import { checkStreakMilestone } from '@/lib/services/streak-rewards';

/** POST /api/gamification/streak-check — 출석 마일스톤 확인 */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const result = await checkStreakMilestone(user.id);

  return NextResponse.json({
    data: {
      milestone: result.milestone
        ? {
            days: result.milestone.days,
            label: result.milestone.label,
            bonusXp: result.bonusXpAwarded,
            celebrationTitle: result.milestone.celebrationTitle,
            celebrationSubtitle: result.milestone.celebrationSubtitle,
          }
        : null,
    },
  });
}
