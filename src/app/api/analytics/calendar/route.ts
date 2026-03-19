import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, forbidden, canAccessStudent } from '@/lib/api';

interface DaySummary {
  total: number;
  test: number;
  arithmetic: number;
  learning: number;
}

export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));

  if (!studentId) {
    return badRequest('학생 ID가 필요합니다');
  }

  // 접근 권한 검증
  if (!(await canAccessStudent(user, studentId))) {
    return forbidden();
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [testAttempts, arithmeticAttempts, learningProgress] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { studentId, startedAt: { gte: startDate, lt: endDate } },
      select: { startedAt: true, completedAt: true },
    }),
    prisma.arithmeticAttempt.findMany({
      where: { studentId, createdAt: { gte: startDate, lt: endDate } },
      select: { createdAt: true },
    }),
    prisma.learningProgress.findMany({
      where: { userId: studentId, startedAt: { gte: startDate, lt: endDate } },
      select: { startedAt: true },
    }),
  ]);

  const calendar: Record<string, DaySummary> = {};

  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const ensureDay = (key: string) => {
    if (!calendar[key]) calendar[key] = { total: 0, test: 0, arithmetic: 0, learning: 0 };
  };

  for (const ta of testAttempts) {
    const key = toDateKey(ta.completedAt ?? ta.startedAt);
    ensureDay(key);
    calendar[key].test++;
    calendar[key].total++;
  }
  for (const aa of arithmeticAttempts) {
    const key = toDateKey(aa.createdAt);
    ensureDay(key);
    calendar[key].arithmetic++;
    calendar[key].total++;
  }
  for (const lp of learningProgress) {
    const key = toDateKey(lp.startedAt);
    ensureDay(key);
    calendar[key].learning++;
    calendar[key].total++;
  }

  return NextResponse.json({ data: { calendar } });
}
