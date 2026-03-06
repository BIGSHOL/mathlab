import { http, HttpResponse } from 'msw';
import { mockProgress, mockBlankExercises } from '../data/concepts';
import { XP_REWARDS } from '@/lib/utils/xp';

export const learningHandlers = [
  // GET /api/learning/progress?conceptId=xxx
  http.get('/api/learning/progress', ({ request }) => {
    const url = new URL(request.url);
    const conceptId = url.searchParams.get('conceptId');

    let progress = mockProgress;
    if (conceptId) {
      progress = progress.filter((p) => p.conceptId === conceptId);
    }

    return HttpResponse.json({ data: progress });
  }),

  // POST /api/learning/progress
  http.post('/api/learning/progress', async ({ request }) => {
    const body = (await request.json()) as { conceptId: string; stage: string };

    const xpMap: Record<string, number> = {
      READING: XP_REWARDS.READING_COMPLETE,
      BLANK_EASY: XP_REWARDS.BLANK_EASY,
      BLANK_HARD: XP_REWARDS.BLANK_HARD,
      BLANK_PAGE: XP_REWARDS.BLANK_PAGE,
    };

    return HttpResponse.json({
      data: {
        id: `progress-${Date.now()}`,
        stage: body.stage,
        completed: true,
        xpAwarded: xpMap[body.stage] ?? 0,
      },
    });
  }),

  // POST /api/learning/blank-submit
  http.post('/api/learning/blank-submit', async ({ request }) => {
    const body = (await request.json()) as {
      exerciseId: string;
      answers: Array<{ position: number; value: string }>;
    };

    const exercise = mockBlankExercises.find((e) => e.id === body.exerciseId);
    if (!exercise) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    const results = body.answers.map((a) => {
      const blank = exercise.blanks.find((b) => b.position === a.position);
      return {
        position: a.position,
        correct: blank?.answer === a.value,
        expected: blank?.answer ?? '',
        submitted: a.value,
      };
    });

    const allCorrect = results.every((r) => r.correct);
    const xpAwarded = allCorrect
      ? exercise.level === 1
        ? XP_REWARDS.BLANK_EASY
        : XP_REWARDS.BLANK_HARD
      : 0;

    return HttpResponse.json({
      data: { correct: allCorrect, results, allCorrect, xpAwarded },
    });
  }),

  // POST /api/learning/blank-page-submit
  http.post('/api/learning/blank-page-submit', async ({ request }) => {
    const body = (await request.json()) as { conceptId: string; content: string };

    const score = body.content.length >= 50 ? 85 : 55;
    const passed = score >= 70;

    return HttpResponse.json({
      data: {
        score,
        passed,
        feedback: passed
          ? '훌륭합니다! 핵심 개념을 잘 이해하고 있습니다.'
          : '일부 핵심 내용이 빠져있습니다. 다시 복습해보세요.',
        xpAwarded: passed ? XP_REWARDS.BLANK_PAGE : 0,
      },
    });
  }),
];
