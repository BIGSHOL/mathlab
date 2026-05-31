import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/** GET /api/admin/exam-uploads — 전체 시험지 업로드 목록 (SUPER_ADMIN) */
export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') || 20)));
  const tenantId = searchParams.get('tenantId') || undefined;
  const search = searchParams.get('search') || undefined;

  const where: Record<string, unknown> = {
    ...(tenantId && { tenantId }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { schoolName: { contains: search, mode: 'insensitive' } },
        { teacher: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [items, total, tenants] = await Promise.all([
    prisma.examPaper.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        school: { select: { id: true, name: true } },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, totalQuestions: true, analyzedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.examPaper.count({ where }),
    // 지점 목록 (필터용)
    prisma.tenant.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Supabase Storage 사용량 조회
  let storageUsage = { totalSize: 0, fileCount: 0 };
  try {
    const { data: files } = await supabase.storage
      .from('uploads')
      .list('exam-analysis', { limit: 1000 });
    if (files) {
      storageUsage = {
        totalSize: files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0),
        fileCount: files.length,
      };
    }
  } catch {
    // Storage 조회 실패해도 목록은 표시
  }

  // tenantId → name 매핑
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]));
  const itemsWithTenant = items.map(item => ({
    ...item,
    tenantName: tenantMap[item.tenantId] || item.tenantId,
  }));

  return NextResponse.json({
    data: itemsWithTenant,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    tenants,
    storage: storageUsage,
  });
}

/** DELETE /api/admin/exam-uploads — 시험지 삭제 (SUPER_ADMIN) */
export async function DELETE(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { ids } = await request.json() as { ids: string[] };
  if (!ids?.length) return badRequest('삭제할 항목을 선택하세요');

  // 파일 URL 조회 → Supabase Storage에서도 삭제
  const papers = await prisma.examPaper.findMany({
    where: { id: { in: ids } },
    select: { id: true, fileUrls: true },
  });

  // Storage 파일 삭제
  const storagePaths: string[] = [];
  for (const paper of papers) {
    if (paper.fileUrls) {
      for (const url of paper.fileUrls.split(',')) {
        // Supabase URL에서 경로 추출: .../uploads/exam-analysis/xxx.jpg → exam-analysis/xxx.jpg
        const match = url.match(/uploads\/(.+)$/);
        if (match) storagePaths.push(match[1]);
      }
    }
  }

  if (storagePaths.length > 0) {
    await supabase.storage.from('uploads').remove(storagePaths);
  }

  // DB 삭제 (관련 분석도 cascade)
  await prisma.examPaper.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ data: { deleted: ids.length } });
}
