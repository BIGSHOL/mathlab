import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { createHomeworkPlan } from '@/lib/services/homework';
import type { ProgressionMode, CountMode } from '@/lib/services/homework';

/** POST: 숙제 플랜 생성 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { title, startDate, studentIds } = body;

  const mode = (['sequential', 'round_robin', 'weekday'].includes(body.progressionMode)
    ? body.progressionMode
    : 'sequential') as ProgressionMode;
  const countMode = (body.countMode === 'per_category' ? 'per_category' : 'total') as CountMode;

  if (!title?.trim()) {
    return badRequest('제목을 입력하세요');
  }

  try {
    const plan = await createHomeworkPlan({
      title: title.trim(),
      createdBy: user.id,
      progressionMode: mode,
      countMode,
      dailyCount: Math.min(Math.max(1, body.dailyCount || 20), 100),
      perCatCounts: countMode === 'per_category' && body.perCatCounts ? body.perCatCounts : undefined,
      startDate,
      studentIds: studentIds || [],
      passingScore: Math.min(Math.max(0, body.passingScore ?? 80), 100),
      retryOnFail: !!body.retryOnFail,
      retryMode: ['wrong_same', 'wrong_new', 'all_same', 'all_new'].includes(body.retryMode) ? body.retryMode : 'wrong_same',
      maxRetries: Math.min(Math.max(0, body.maxRetries ?? 3), 10),
      slots: mode === 'sequential' ? body.slots : undefined,
      categories: mode === 'round_robin' ? body.categories : undefined,
      daysPerCategory: mode === 'round_robin' ? Math.min(Math.max(1, body.daysPerCategory || 5), 30) : undefined,
      weekdayMap: mode === 'weekday' ? body.weekdayMap : undefined,
      weeks: mode === 'weekday' ? Math.min(Math.max(1, body.weeks || 4), 52) : undefined,
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (err) {
    return badRequest((err as Error).message);
  }
}

/** GET: 숙제 플랜 목록 */
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const where: Record<string, unknown> = {};
  // ADMIN sees all, TEACHER sees own
  if (user.role === 'TEACHER') {
    where.createdBy = user.id;
  }

  const plans = await prisma.arithmeticHomeworkPlan.findMany({
    where,
    select: {
      id: true, seq: true, title: true, totalDays: true, dailyCount: true,
      categories: true, level: true, isActive: true, createdAt: true,
      startDate: true, progressionMode: true, passingScore: true,
      retryOnFail: true, retryMode: true, maxRetries: true,
      _count: { select: { enrollments: true, attempts: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: plans });
}
