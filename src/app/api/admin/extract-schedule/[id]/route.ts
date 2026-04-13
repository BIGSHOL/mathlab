import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/admin/extract-schedule/[id] — 스케줄 취소 (PENDING만)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id } = await params;
  const schedule = await prisma.examExtractSchedule.findUnique({ where: { id } });
  if (!schedule) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '스케줄을 찾을 수 없습니다' } }, { status: 404 });
  }
  if (schedule.status !== 'PENDING') {
    return NextResponse.json({ error: { code: 'INVALID_STATE', message: '이미 실행 중이거나 완료된 스케줄입니다' } }, { status: 400 });
  }

  await prisma.examExtractSchedule.update({
    where: { id },
    data: { status: 'CANCELLED', finishedAt: new Date() },
  });

  return NextResponse.json({ data: { ok: true } });
}
