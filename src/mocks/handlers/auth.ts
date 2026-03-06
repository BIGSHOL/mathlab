import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/users';

export const authHandlers = [
  // POST /api/auth/login
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    const user = mockUsers.find(
      (u) => u.username === body.username && u.password === body.password
    );

    if (!user) {
      return HttpResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: '아이디 또는 비밀번호가 올바르지 않습니다' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      data: {
        user: { id: user.id, username: user.username, name: user.name, role: user.role, grade: user.grade },
        token: `mock-token-${user.id}`,
      },
    });
  }),

  // GET /api/auth/session
  http.get('/api/auth/session', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer mock-token-')) {
      return HttpResponse.json({ data: null });
    }

    const userId = authHeader.replace('Bearer mock-token-', '');
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) {
      return HttpResponse.json({ data: null });
    }

    return HttpResponse.json({
      data: { user: { id: user.id, username: user.username, name: user.name, role: user.role, grade: user.grade } },
    });
  }),

  // POST /api/users (Teacher creates student)
  http.post('/api/users', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    const userId = authHeader?.replace('Bearer mock-token-', '');
    const caller = mockUsers.find((u) => u.id === userId);

    if (!caller || caller.role !== 'TEACHER') {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: '선생님 권한이 필요합니다' } },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { username: string; name: string; grade: number };
    return HttpResponse.json({
      data: {
        id: `student-new-${Date.now()}`,
        username: body.username,
        name: body.name,
        role: 'STUDENT',
        grade: body.grade,
      },
    }, { status: 201 });
  }),

  // GET /api/users
  http.get('/api/users', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const users = mockUsers.map(({ password, ...u }) => u);
    return HttpResponse.json({ data: users, meta: { total: users.length } });
  }),

  // PATCH /api/users/:id
  http.patch('/api/users/:id', async ({ params, request }) => {
    const { id } = params;
    const user = mockUsers.find((u) => u.id === id);
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      data: { id: user.id, username: user.username, name: (body.name as string) ?? user.name, role: user.role, grade: (body.grade as number) ?? user.grade },
    });
  }),
];
