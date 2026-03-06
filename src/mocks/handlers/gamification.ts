import { http, HttpResponse } from 'msw';
import { mockStudentProfiles, mockUsers } from '../data/users';
import { calculateLevel, xpToNextLevel } from '@/lib/utils/xp';

export const gamificationHandlers = [
  // GET /api/gamification/points
  http.get('/api/gamification/points', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    const userId = authHeader?.replace('Bearer mock-token-', '');
    const profile = mockStudentProfiles.find((p) => p.userId === userId);

    if (!profile) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: '프로필을 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    const nextLevel = xpToNextLevel(profile.totalXp);
    return HttpResponse.json({
      data: {
        totalXp: profile.totalXp,
        level: profile.level,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        xpToNextLevel: nextLevel.remaining,
      },
    });
  }),

  // GET /api/gamification/ranking
  http.get('/api/gamification/ranking', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    const currentUserId = authHeader?.replace('Bearer mock-token-', '');

    const ranked = mockStudentProfiles
      .map((p) => {
        const user = mockUsers.find((u) => u.id === p.userId)!;
        return {
          userId: p.userId,
          name: user.name,
          level: p.level,
          totalXp: p.totalXp,
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp)
      .map((entry, i) => ({
        ...entry,
        rank: i + 1,
        isMe: entry.userId === currentUserId,
      }));

    return HttpResponse.json({ data: ranked });
  }),

  // POST /api/gamification/award
  http.post('/api/gamification/award', async ({ request }) => {
    const body = (await request.json()) as { userId: string; amount: number; reason: string };
    const profile = mockStudentProfiles.find((p) => p.userId === body.userId);

    if (!profile) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: '학생 프로필을 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    const previousLevel = profile.level;
    const newTotalXp = profile.totalXp + body.amount;
    const newLevel = calculateLevel(newTotalXp);

    return HttpResponse.json({
      data: {
        totalXp: newTotalXp,
        level: newLevel,
        leveledUp: newLevel > previousLevel,
        previousLevel,
      },
    });
  }),
];
