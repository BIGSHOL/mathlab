import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';

// GET /api/admin/extract-queue — 분석 완료 + 미추출 시험지 목록 (SUPER_ADMIN)
export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'pending'; // pending | approved | extracted | all
  const search = url.searchParams.get('search')?.trim() || '';
  const tenantId = url.searchParams.get('tenantId') || undefined;

  const where: Record<string, unknown> = { status: 'COMPLETED' };

  if (filter === 'pending') {
    where.extractedToBankAt = null;
    where.extractApproved = false;
  } else if (filter === 'approved') {
    where.extractedToBankAt = null;
    where.extractApproved = true;
  } else if (filter === 'extracted') {
    where.extractedToBankAt = { not: null };
  }

  if (tenantId) where.tenantId = tenantId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { schoolName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const papers = await prisma.examPaper.findMany({
    where,
    select: {
      id: true,
      title: true,
      schoolName: true,
      grade: true,
      subject: true,
      tenantId: true,
      status: true,
      extractApproved: true,
      extractApprovedAt: true,
      extractedToBankAt: true,
      extractedQuestionCount: true,
      extractAttempts: true,
      lastExtractError: true,
      createdAt: true,
    },
    orderBy: [{ extractApproved: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  return NextResponse.json({ data: papers });
}
