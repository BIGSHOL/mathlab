import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { uploadTenantLogo } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/** POST /api/admin/tenants/[id]/logo — 로고 이미지 업로드 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id } = await params;

  // slug 또는 id로 tenant 조회
  const isCuid = id.length >= 20;
  const tenant = await prisma.tenant.findUnique({
    where: isCuid ? { id } : { slug: id },
    select: { id: true, slug: true },
  });
  if (!tenant) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '지점을 찾을 수 없습니다' } },
      { status: 404 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;
    if (!file) return badRequest('로고 파일을 선택하세요');
    if (!ALLOWED.includes(file.type)) return badRequest('PNG, JPG, WebP, SVG만 지원합니다');
    if (file.size > MAX_SIZE) return badRequest('파일 크기가 2MB를 초과합니다');

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadTenantLogo(buffer, tenant.slug, file.type);

    // DB에 로고 URL 저장
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { logo: publicUrl },
    });

    return NextResponse.json({ data: { logo: publicUrl } });
  } catch (error) {
    console.error('[tenant-logo POST] 로고 업로드 에러:', error);
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message: '로고 업로드 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
