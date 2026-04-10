/**
 * 모의 등급 예측
 *
 * GET /api/exam-campaigns/enrollments/:id/grade-prediction
 *   학생 본인 또는 동일 테넌트 선생님 호출 가능.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireAuthViewAs,
  isResponse,
  notFound,
  forbidden,
  serverError,
  hasRole,
} from '@/lib/api';
import { predictGrade } from '@/lib/services/exam-campaign-predictor';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const { id } = await params;

  const enrollment = await prisma.examCampaignEnrollment.findUnique({
    where: { id },
    select: {
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
    const prediction = await predictGrade(id);
    if (!prediction) return notFound('예측 데이터가 없습니다');
    return NextResponse.json({ data: prediction });
  } catch (err) {
    console.error('[grade-prediction GET]', err);
    return serverError('등급 예측에 실패했습니다');
  }
}
