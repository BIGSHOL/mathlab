import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { z } from 'zod';

const schema = z.object({
  examPaperIds: z.array(z.string()).min(1),
  approve: z.boolean(),
});

// POST /api/admin/extract-queue/approve — 일괄 승인/취소 토글
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0]?.message || '입력값 오류');

  const { examPaperIds, approve } = parsed.data;

  const result = await prisma.examPaper.updateMany({
    where: {
      id: { in: examPaperIds },
      status: 'COMPLETED',
      extractedToBankAt: null,
    },
    data: {
      extractApproved: approve,
      extractApprovedBy: approve ? user.id : null,
      extractApprovedAt: approve ? new Date() : null,
    },
  });

  return NextResponse.json({ data: { updated: result.count, approve } });
}
