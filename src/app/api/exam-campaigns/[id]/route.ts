/**
 * 내신대비 캠페인 단일 리소스 API
 *
 * GET    /api/exam-campaigns/:id  — 상세 조회
 * PATCH  /api/exam-campaigns/:id  — 부분 수정 (제목/시험일/범위/상태)
 * DELETE /api/exam-campaigns/:id  — 삭제 (enrollments cascade)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  badRequest,
  notFound,
  serverError,
  getTenantFilter,
} from '@/lib/api';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  examDate: z.string().optional(),
  scopeChapters: z
    .array(
      z.object({
        chapter: z.string().min(1).max(100),
        sections: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  status: z.enum(['PREPARING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  classroomId: z.string().nullable().optional(),
  isDateTentative: z.boolean().optional(),
  isScopeTentative: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const tenantWhere = getTenantFilter(user);

  try {
    const campaign = await prisma.examCampaign.findFirst({
      where: { id, ...tenantWhere },
      include: {
        classroom: { select: { id: true, name: true } },
        school: { select: { id: true, name: true, district: true, regionName: true } },
        createdBy: { select: { id: true, name: true } },
        enrollments: {
          select: {
            id: true,
            studentId: true,
            status: true,
            progressPct: true,
            predictedGrade: true,
            startedAt: true,
            completedAt: true,
            student: { select: { id: true, name: true, grade: true } },
          },
        },
      },
    });
    if (!campaign) return notFound('캠페인을 찾을 수 없습니다');
    return NextResponse.json({ data: campaign });
  } catch (err) {
    console.error('[exam-campaigns GET id]', err);
    return serverError('캠페인을 불러오지 못했습니다');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const tenantWhere = getTenantFilter(user);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('요청 본문을 읽을 수 없습니다');
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest('입력값을 확인하세요');

  const existing = await prisma.examCampaign.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true },
  });
  if (!existing) return notFound('캠페인을 찾을 수 없습니다');

  try {
    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
    if (parsed.data.examDate !== undefined) {
      const d = new Date(parsed.data.examDate);
      if (Number.isNaN(d.getTime())) return badRequest('시험일 형식이 올바르지 않습니다');
      data.examDate = d;
    }
    if (parsed.data.scopeChapters !== undefined) data.scopeChapters = parsed.data.scopeChapters;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.classroomId !== undefined) data.classroomId = parsed.data.classroomId;
    if (parsed.data.isDateTentative !== undefined) data.isDateTentative = parsed.data.isDateTentative;
    if (parsed.data.isScopeTentative !== undefined) data.isScopeTentative = parsed.data.isScopeTentative;

    const updated = await prisma.examCampaign.update({
      where: { id },
      data,
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[exam-campaigns PATCH]', err);
    return serverError('캠페인 수정에 실패했습니다');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const tenantWhere = getTenantFilter(user);

  const existing = await prisma.examCampaign.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true },
  });
  if (!existing) return notFound('캠페인을 찾을 수 없습니다');

  try {
    await prisma.examCampaign.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (err) {
    console.error('[exam-campaigns DELETE]', err);
    return serverError('캠페인 삭제에 실패했습니다');
  }
}
