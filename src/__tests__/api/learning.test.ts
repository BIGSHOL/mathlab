import { describe, it, expect } from 'vitest';
import { XP_REWARDS } from '@/lib/utils/xp';

const BASE_URL = 'http://localhost:3000';

describe('Learning API Contract (RED - API Routes not yet implemented)', () => {
  describe('GET /api/learning/progress', () => {
    it('returns progress for a concept', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/progress?conceptId=concept-1`);
      const json = await res.json();

      expect(json.data).toBeInstanceOf(Array);
      expect(json.data[0]).toMatchObject({
        id: expect.any(String),
        conceptId: 'concept-1',
        stage: expect.any(String),
        completed: expect.any(Boolean),
        attempts: expect.any(Number),
      });
    });
  });

  describe('POST /api/learning/progress', () => {
    it('completes READING stage and awards XP', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId: 'concept-1', stage: 'READING' }),
      });

      const json = await res.json();
      expect(json.data).toMatchObject({
        stage: 'READING',
        completed: true,
        xpAwarded: XP_REWARDS.READING_COMPLETE,
      });
    });

    it('awards correct XP for BLANK_EASY stage', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId: 'concept-1', stage: 'BLANK_EASY' }),
      });

      const json = await res.json();
      expect(json.data.xpAwarded).toBe(XP_REWARDS.BLANK_EASY);
    });

    it('awards correct XP for BLANK_PAGE stage', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId: 'concept-1', stage: 'BLANK_PAGE' }),
      });

      const json = await res.json();
      expect(json.data.xpAwarded).toBe(XP_REWARDS.BLANK_PAGE);
    });
  });

  describe('POST /api/learning/blank-submit', () => {
    it('returns correct results for all-correct answers', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/blank-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: 'blank-1',
          answers: [
            { position: 1, value: '일부' },
            { position: 2, value: '분자' },
            { position: 3, value: '분모' },
          ],
        }),
      });

      const json = await res.json();
      expect(json.data.allCorrect).toBe(true);
      expect(json.data.xpAwarded).toBe(XP_REWARDS.BLANK_EASY);
      expect(json.data.results).toHaveLength(3);
      json.data.results.forEach((r: { correct: boolean }) => {
        expect(r.correct).toBe(true);
      });
    });

    it('returns incorrect results for wrong answers', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/blank-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: 'blank-1',
          answers: [
            { position: 1, value: '전체' },
            { position: 2, value: '분자' },
            { position: 3, value: '분자' },
          ],
        }),
      });

      const json = await res.json();
      expect(json.data.allCorrect).toBe(false);
      expect(json.data.xpAwarded).toBe(0);
      expect(json.data.results[0].correct).toBe(false);
      expect(json.data.results[0].expected).toBe('일부');
    });

    it('returns 404 for non-existent exercise', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/blank-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: 'non-existent',
          answers: [{ position: 1, value: 'test' }],
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/learning/blank-page-submit', () => {
    it('returns passing score for sufficient content', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/blank-page-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: 'concept-1',
          content:
            '분수는 전체를 똑같이 나눈 것 중 일부를 나타내는 수입니다. 위에 있는 수를 분자라 하고 아래에 있는 수를 분모라 합니다.',
        }),
      });

      const json = await res.json();
      expect(json.data.score).toBeGreaterThanOrEqual(70);
      expect(json.data.passed).toBe(true);
      expect(json.data.xpAwarded).toBe(XP_REWARDS.BLANK_PAGE);
      expect(json.data.feedback).toEqual(expect.any(String));
    });

    it('returns failing score for insufficient content', async () => {
      const res = await fetch(`${BASE_URL}/api/learning/blank-page-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: 'concept-1',
          content: '분수는 수이다.',
        }),
      });

      const json = await res.json();
      expect(json.data.score).toBeLessThan(70);
      expect(json.data.passed).toBe(false);
      expect(json.data.xpAwarded).toBe(0);
    });
  });
});
