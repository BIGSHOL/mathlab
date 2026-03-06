import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Gamification API Contract (RED - API Routes not yet implemented)', () => {
  describe('GET /api/gamification/points', () => {
    it('returns student XP and level info', async () => {
      const res = await fetch(`${BASE_URL}/api/gamification/points`, {
        headers: { Authorization: 'Bearer mock-token-student-1' },
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      expect(json.data).toMatchObject({
        totalXp: expect.any(Number),
        level: expect.any(Number),
        currentStreak: expect.any(Number),
        longestStreak: expect.any(Number),
        xpToNextLevel: expect.any(Number),
      });
    });

    it('returns 404 for unknown user', async () => {
      const res = await fetch(`${BASE_URL}/api/gamification/points`, {
        headers: { Authorization: 'Bearer mock-token-unknown-user' },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/gamification/ranking', () => {
    it('returns ranked list sorted by XP descending', async () => {
      const res = await fetch(`${BASE_URL}/api/gamification/ranking`, {
        headers: { Authorization: 'Bearer mock-token-student-1' },
      });

      const json = await res.json();
      expect(json.data).toBeInstanceOf(Array);
      expect(json.data.length).toBeGreaterThan(0);

      // Check sorted descending
      for (let i = 1; i < json.data.length; i++) {
        expect(json.data[i - 1].totalXp).toBeGreaterThanOrEqual(json.data[i].totalXp);
      }

      // Check structure
      expect(json.data[0]).toMatchObject({
        rank: 1,
        userId: expect.any(String),
        name: expect.any(String),
        level: expect.any(Number),
        totalXp: expect.any(Number),
        isMe: expect.any(Boolean),
      });

      // Current user should have isMe = true
      const me = json.data.find((r: { isMe: boolean }) => r.isMe);
      expect(me).toBeDefined();
      expect(me.userId).toBe('student-1');
    });
  });

  describe('POST /api/gamification/award', () => {
    it('awards points and returns updated profile', async () => {
      const res = await fetch(`${BASE_URL}/api/gamification/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'student-1',
          amount: 10,
          reason: 'BLANK_EASY',
        }),
      });

      const json = await res.json();
      expect(json.data).toMatchObject({
        totalXp: expect.any(Number),
        level: expect.any(Number),
        leveledUp: expect.any(Boolean),
        previousLevel: expect.any(Number),
      });
      expect(json.data.totalXp).toBeGreaterThan(0);
    });

    it('detects level up when crossing threshold', async () => {
      const res = await fetch(`${BASE_URL}/api/gamification/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'student-2',
          amount: 200,
          reason: 'BONUS',
        }),
      });

      const json = await res.json();
      // student-2 has 150 XP (level 2), + 200 = 350 (level 3 at 250)
      expect(json.data.leveledUp).toBe(true);
      expect(json.data.previousLevel).toBe(2);
      expect(json.data.level).toBe(3);
    });

    it('returns 404 for non-existent student', async () => {
      const res = await fetch(`${BASE_URL}/api/gamification/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'non-existent',
          amount: 10,
          reason: 'BONUS',
        }),
      });

      expect(res.status).toBe(404);
    });
  });
});
