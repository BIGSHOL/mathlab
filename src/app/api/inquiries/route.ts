import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  academyName: z.string().min(1, '학원명을 입력하세요').max(100),
  contactName: z.string().min(1, '담당자명을 입력하세요').max(50),
  phone: z.string().min(1, '연락처를 입력하세요').max(20),
  email: z.string().email('올바른 이메일을 입력하세요').optional().or(z.literal('')),
  region: z.string().max(50).optional(),
  message: z.string().max(1000).optional(),
});

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
