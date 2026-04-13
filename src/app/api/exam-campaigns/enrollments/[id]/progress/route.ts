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
import { markActivityCompleted, markActivitySkipped } from '@/lib/services/exam-campaign-scheduler';
import { recordCampaignWrongAnswers } from '@/lib/services/spaced-review';

const progressSchema = z.object({
  dayIndex: z.number().int().min(0),
  activityIndex: z.number().int().min(0),
  /** 이번 활동에서 틀린 문제 ID (있으면 SpacedReview에 기록) */
  wrongQuestionIds: z.array(z.string()).optional(),
  /** 이번 활동에서 틀린 개념 ID */
  wrongConceptIds: z.array(z.string()).optional(),
  /** 건너뛰기 여부 — 완료 처리하지 않고 건너뛴 표시만 */
  skip: z.boolean().optional(),
  /** 채점 결과: 정답 수 */
  correctCount: z.number().int().min(0).optional(),
  /** 채점 결과: 총 문제 수 */
  totalCount: z.number().int().min(0).optional(),
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
    // 1) 틀린 문제/개념이 있으면 SpacedReviewItem에 기록
    const wq = parsed.data.wrongQuestionIds ?? [];
    const wc = parsed.data.wrongConceptIds ?? [];
    if (wq.length > 0 || wc.length > 0) {
      await recordCampaignWrongAnswers({
        studentId: enrollment.studentId,
        campaignId: (await prisma.examCampaignEnrollment.findUnique({
          where: { id },
          select: { campaignId: true },
        }))!.campaignId,
        wrongQuestionIds: wq,
        wrongConceptIds: wc,
      });
    }

    // 2) 완료 또는 건너뛰기
    const result = parsed.data.skip
      ? await markActivitySkipped({
          enrollmentId: id,
          dayIndex: parsed.data.dayIndex,
          activityIndex: parsed.data.activityIndex,
        })
      : await markActivityCompleted({
          enrollmentId: id,
          dayIndex: parsed.data.dayIndex,
          activityIndex: parsed.data.activityIndex,
          correctCount: parsed.data.correctCount,
          totalCount: parsed.data.totalCount,
        });
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[exam-campaigns progress]', err);
    return serverError('진도 업데이트에 실패했습니다');
  }
}
