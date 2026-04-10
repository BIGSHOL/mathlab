/**
 * 캠페인 학생 등록 API
 *
 * POST   /api/exam-campaigns/:id/enroll  — 학생 또는 반 단위 등록
 *   body: { studentIds?: string[], classroomId?: string }
 *
 * 등록과 동시에 D-day 자동 일정이 enrollment.schedule에 저장된다.
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
  filterAccessibleStudentIds,
} from '@/lib/api';
import {
  enrollStudentInCampaign,
  enrollClassroomInCampaign,
} from '@/lib/services/exam-campaign-scheduler';

const enrollSchema = z.object({
  studentIds: z.array(z.string()).optional(),
  classroomId: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const tenantWhere = getTenantFilter(user);

  const campaign = await prisma.examCampaign.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true, status: true, examDate: true },
  });
  if (!campaign) return notFound('캠페인을 찾을 수 없습니다');
  if (campaign.status === 'PREPARING') {
    return badRequest('큐레이션이 완료되지 않은 캠페인입니다');
  }
  if (new Date(campaign.examDate).getTime() <= Date.now()) {
    return badRequest('이미 시험일이 지난 캠페인입니다');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('요청 본문을 읽을 수 없습니다');
  }
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) return badRequest('입력값을 확인하세요');

  if (!parsed.data.studentIds?.length && !parsed.data.classroomId) {
    return badRequest('studentIds 또는 classroomId 중 하나는 필수입니다');
  }

  try {
    if (parsed.data.classroomId) {
      // 반 권한 검증
      const tenantId = user.viewingTenantId ?? user.tenantId;
      const classroom = await prisma.classroom.findFirst({
        where: { id: parsed.data.classroomId, tenantId },
        select: { id: true },
      });
      if (!classroom) return badRequest('해당 반을 찾을 수 없습니다');

      const result = await enrollClassroomInCampaign({
        campaignId: id,
        classroomId: parsed.data.classroomId,
      });
      return NextResponse.json({ data: result });
    }

    // 개별 학생 등록
    const accessibleIds = await filterAccessibleStudentIds(user, parsed.data.studentIds ?? []);
    if (accessibleIds.length === 0) return badRequest('등록 가능한 학생이 없습니다');

    let enrolled = 0;
    let skipped = 0;
    for (const studentId of accessibleIds) {
      try {
        await enrollStudentInCampaign({ campaignId: id, studentId });
        enrolled += 1;
      } catch {
        skipped += 1;
      }
    }

    return NextResponse.json({ data: { enrolled, skipped } });
  } catch (err) {
    console.error('[exam-campaigns enroll]', err);
    return serverError('학생 등록에 실패했습니다');
  }
}

/**
 * DELETE /api/exam-campaigns/:id/enroll?studentId=xxx — 등록 취소
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const tenantWhere = getTenantFilter(user);

  const studentId = new URL(request.url).searchParams.get('studentId');
  if (!studentId) return badRequest('studentId가 필요합니다');

  const campaign = await prisma.examCampaign.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true },
  });
  if (!campaign) return notFound('캠페인을 찾을 수 없습니다');

  try {
    await prisma.examCampaignEnrollment.delete({
      where: { campaignId_studentId: { campaignId: id, studentId } },
    });
    return NextResponse.json({ data: { id, studentId } });
  } catch (err) {
    console.error('[exam-campaigns unenroll]', err);
    return serverError('등록 취소에 실패했습니다');
  }
}
