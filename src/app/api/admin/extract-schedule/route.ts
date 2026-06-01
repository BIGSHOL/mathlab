import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { z } from 'zod';

const createSchema = z.object({
  scheduledAt: z.string().datetime().optional(), // ISO string. 없으면 즉시
  examPaperIds: z.array(z.string()).min(1).optional(), // 없으면 승인된 전체
});

// GET /api/admin/extract-schedule — 최근 스케줄 목록
export async function GET() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const schedules = await prisma.examExtractSchedule.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: schedules });
}

// POST /api/admin/extract-schedule — 새 스케줄 등록
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0]?.message || '입력값 오류');

  const { scheduledAt, examPaperIds } = parsed.data;

  // examPaperIds 미지정 시 승인된 전체
  let targetIds = examPaperIds;
  if (!targetIds || targetIds.length === 0) {
    const approved = await prisma.examPaper.findMany({
      where: { status: 'COMPLETED', extractApproved: true, extractedToBankAt: null },
      select: { id: true },
      take: 100,
    });
    targetIds = approved.map((p) => p.id);
  }

  if (targetIds.length === 0) {
    return badRequest('처리할 시험지가 없습니다 (승인된 미추출 건 없음)');
  }

  const schedule = await prisma.examExtractSchedule.create({
    data: {
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      status: 'PENDING',
      examPaperIds: targetIds,
      createdBy: user.id,
    },
  });

  return NextResponse.json({ data: schedule }, { status: 201 });
}
