import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireSuperAdmin, isResponse } from '@/lib/api';

const schema = z.object({
  academyName: z.string().min(1, '학원명을 입력하세요').max(100),
  contactName: z.string().min(1, '담당자명을 입력하세요').max(50),
  phone: z.string().min(1, '연락처를 입력하세요').max(20),
  email: z.string().email('올바른 이메일을 입력하세요').optional().or(z.literal('')),
  region: z.string().max(50).optional(),
  message: z.string().max(1000).optional(),
});

// ⚠️ 메일 알림은 서버가 아니라 클라이언트(InquiryModal)에서 Web3Forms로 직접 발송 —
// Web3Forms는 Cloudflare가 서버 간 호출을 403 챌린지로 차단한다(브라우저만 통과).
// para-x 랜딩 폼과 동일 동작/동일 키(공개 키 설계)라 노출 우려 없음.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
        { status: 400 }
      );
    }

    const { email, region, message, ...rest } = parsed.data;
    const inquiry = await prisma.inquiry.create({
      data: {
        ...rest,
        email: email || null,
        region: region || null,
        message: message || null,
      },
    });

    return NextResponse.json({ data: { id: inquiry.id } }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}

/** GET /api/inquiries — 도입 문의 목록 (SUPER_ADMIN 전용, /admin/inquiries 관리 화면용) */
export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // PENDING | ANSWERED | (빈 값 = 전체)

  try {
    const where = status === 'PENDING' || status === 'ANSWERED' ? { status: status as 'PENDING' | 'ANSWERED' } : {};
    const [items, pendingCount] = await Promise.all([
      prisma.inquiry.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.inquiry.count({ where: { status: 'PENDING' } }),
    ]);
    return NextResponse.json({ data: items, meta: { pendingCount } });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '문의 목록을 불러오지 못했습니다' } },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'ANSWERED']),
});

/** PATCH /api/inquiries — 문의 상태 변경 (SUPER_ADMIN 전용) */
export async function PATCH(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
        { status: 400 }
      );
    }
    const updated = await prisma.inquiry.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: '문의 상태 변경에 실패했습니다' } },
      { status: 500 }
    );
  }
}
