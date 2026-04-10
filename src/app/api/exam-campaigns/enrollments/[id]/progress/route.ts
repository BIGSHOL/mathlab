/**
 * 캠페인 enrollment 진도 업데이트
 *
 * PATCH /api/exam-campaigns/enrollments/:id/progress
 *   body: { dayIndex: number, activityIndex: number }
 *
 * 학생 본인 또는 선생님(View-As 포함)이 활동 완료를 표시한다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  requireAuthViewAs,
  isResponse,
  badRequest,
  notFound,
  forbidden,
  serverError,
  hasRole,
} from '@/lib/api';
import { markActivityCompleted } from '@/lib/services/exam-campaign-scheduler';

const progressSchema = z.object({
  dayIndex: z.number().int().min(0),
  activityIndex: z.number().int().min(0),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('요청 본문을 읽을 수 없습니다');
  }
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) return badRequest('입력값을 확인하세요');

  // 권한: 본인 enrollment이거나 같은 테넌트 선생님
  const enrollment = await prisma.examCampaignEnrollment.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      campaign: { select: { tenantId: true } },
    },
  });
  if (!enrollment) return notFound('등록 정보를 찾을 수 없습니다');

  const isOwner = enrollment.studentId === user.id;
  const isTeacherInTenant =
    hasRole(user, 'TEACHER') && enrollment.campaign.tenantId === user.tenantId;
  if (!isOwner && !isTeacherInTenant) return forbidden();

  try {
    const result = await markActivityCompleted({
      enrollmentId: id,
      dayIndex: parsed.data.dayIndex,
      activityIndex: parsed.data.activityIndex,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[exam-campaigns progress]', err);
    return serverError('진도 업데이트에 실패했습니다');
  }
}
