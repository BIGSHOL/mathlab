import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Auth API Contract (RED - API Routes not yet implemented)', () => {
  describe('POST /api/auth/login', () => {
    it('returns user and token on valid credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'teacher01', password: 'pass1234' }),
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      expect(json.data.user).toMatchObject({
        id: expect.any(String),
        username: 'teacher01',
        name: '김선생',
        role: 'TEACHER',
      });
      expect(json.data.token).toEqual(expect.any(String));
    });

    it('returns 401 on invalid credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/session', () => {
    it('returns user data with valid token', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/session`, {
        headers: { Authorization: 'Bearer mock-token-student-1' },
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      expect(json.data.user).toMatchObject({
        id: 'student-1',
        role: 'STUDENT',
      });
    });

    it('returns null without token', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/session`);
      const json = await res.json();
      expect(json.data).toBeNull();
    });
  });

  describe('POST /api/users', () => {
    it('allows teacher to create student account', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token-teacher-1',
        },
        body: JSON.stringify({
          username: 'newstudent',
          password: 'pass1234',
          name: '새학생',
          grade: 4,
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data).toMatchObject({
        username: 'newstudent',
        name: '새학생',
        role: 'STUDENT',
        grade: 4,
      });
    });

    it('returns 403 when student tries to create account', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token-student-1',
        },
        body: JSON.stringify({
          username: 'hack',
          password: 'pass1234',
          name: '해커',
          grade: 5,
        }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users', () => {
    it('returns user list', async () => {
      const res = await fetch(`${BASE_URL}/api/users`);
      const json = await res.json();

      expect(json.data).toBeInstanceOf(Array);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.meta.total).toEqual(expect.any(Number));
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('updates user info', async () => {
      const res = await fetch(`${BASE_URL}/api/users/student-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '이수학(수정)' }),
      });

      expect(res.ok).toBe(true);
      const json = await res.json();
      expect(json.data.name).toBe('이수학(수정)');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await fetch(`${BASE_URL}/api/users/non-existent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      });

      expect(res.status).toBe(404);
    });
  });
});
