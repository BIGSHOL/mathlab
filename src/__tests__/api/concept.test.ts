import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Concept API Contract (RED - API Routes not yet implemented)', () => {
  describe('GET /api/concepts', () => {
    it('returns concept list', async () => {
      const res = await fetch(`${BASE_URL}/api/concepts`);
      const json = await res.json();

      expect(json.data).toBeInstanceOf(Array);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0]).toMatchObject({
        id: expect.any(String),
        subjectId: expect.any(String),
        title: expect.any(String),
        sortOrder: expect.any(Number),
        subject: {
          title: expect.any(String),
          gradeLevel: expect.any(Number),
        },
      });
    });

    it('filters by subjectId', async () => {
      const res = await fetch(`${BASE_URL}/api/concepts?subjectId=subject-1`);
      const json = await res.json();

      expect(json.data.length).toBeGreaterThan(0);
      json.data.forEach((c: { subjectId: string }) => {
        expect(c.subjectId).toBe('subject-1');
      });
    });
  });

  describe('GET /api/concepts/:id', () => {
    it('returns concept detail with fullContent', async () => {
      const res = await fetch(`${BASE_URL}/api/concepts/concept-1`);
      const json = await res.json();

      expect(json.data).toMatchObject({
        id: 'concept-1',
        title: expect.any(String),
        fullContent: expect.any(String),
        subject: { title: expect.any(String), gradeLevel: expect.any(Number) },
      });
    });

    it('returns 404 for non-existent concept', async () => {
      const res = await fetch(`${BASE_URL}/api/concepts/non-existent`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/concepts/:id/blanks', () => {
    it('returns blank exercise for level 1', async () => {
      const res = await fetch(`${BASE_URL}/api/concepts/concept-1/blanks?level=1`);
      const json = await res.json();

      expect(json.data).toMatchObject({
        id: expect.any(String),
        conceptId: 'concept-1',
        level: 1,
        templateText: expect.any(String),
      });
      expect(json.data.blanks).toBeInstanceOf(Array);
      expect(json.data.blanks[0]).toMatchObject({
        position: expect.any(Number),
        answer: expect.any(String),
        hint: expect.any(String),
      });
    });

    it('returns blank exercise for level 2 (harder)', async () => {
      const res = await fetch(`${BASE_URL}/api/concepts/concept-1/blanks?level=2`);
      const json = await res.json();

      expect(json.data.level).toBe(2);
      expect(json.data.blanks.length).toBeGreaterThan(3); // level 2 has more blanks
    });

    it('returns 404 for non-existent blanks', async () => {
      const res = await fetch(`${BASE_URL}/api/concepts/non-existent/blanks?level=1`);
      expect(res.status).toBe(404);
    });
  });
});
