/**
 * 캠페인 결과 보고서 생성 (Claude Sonnet 4.5)
 *
 * POST /api/exam-campaigns/enrollments/:id/report
 *   학생 본인 또는 동일 테넌트 선생님 호출 가능.
 *   캠페인 학습 진도/패턴/Phase 통계를 종합한 학습 보고서를 생성한다.
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
import { generateCampaignReport } from '@/lib/services/exam-campaign-predictor';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const report = await generateCampaignReport(id);
    if (!report) {
      return NextResponse.json(
        { error: { code: 'REPORT_FAILED', message: '보고서 생성에 실패했습니다 (API 키 미설정 또는 외부 호출 실패)' } },
        { status: 500 },
      );
    }
    return NextResponse.json({ data: report });
  } catch (err) {
    console.error('[campaign report POST]', err);
    return serverError('보고서 생성에 실패했습니다');
  }
}
