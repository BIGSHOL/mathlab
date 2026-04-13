/**
 * 내신대비 캠페인 활동의 문제 목록 조회
 *
 * GET /api/exam-campaigns/enrollments/:id/activity-questions?day=N&act=M
 *   해당 활동(questions | mock_test | review)의 refIds 문제들을 반환.
 *   본인 또는 같은 테넌트 선생님(View-As)만 접근 가능.
 */

import { NextRequest, NextResponse } from 'next/server';
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
import type { ScheduleDay } from '@/lib/services/exam-campaign-scheduler';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const { id } = await params;
  const url = new URL(request.url);
  const day = Number(url.searchParams.get('day'));
  const act = Number(url.searchParams.get('act'));
  if (!Number.isFinite(day) || !Number.isFinite(act)) return badRequest('day, act 파라미터 필요');

  const enrollment = await prisma.examCampaignEnrollment.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      schedule: true,
      campaign: { select: { id: true, tenantId: true, title: true } },
    },
  });
  if (!enrollment) return notFound('등록 정보를 찾을 수 없습니다');

  const isOwner = enrollment.studentId === user.id;
  const isTeacherInTenant =
    hasRole(user, 'TEACHER') && enrollment.campaign.tenantId === user.tenantId;
  if (!isOwner && !isTeacherInTenant) return forbidden();

  try {
    const schedule = (enrollment.schedule as unknown as ScheduleDay[]) ?? [];
    const dayEntry = schedule.find((d) => d.dayIndex === day);
    if (!dayEntry) return notFound('해당 일자를 찾을 수 없습니다');
    const activity = dayEntry.activities[act];
    if (!activity) return notFound('해당 활동을 찾을 수 없습니다');

    let refIds = activity.refIds ?? [];

    // review 활동: 캠페인 오답 미완료 ReviewSchedule에서 가져오기
    if (activity.type === 'review' && refIds.length === 0) {
      const pending = await prisma.reviewSchedule.findMany({
        where: {
          studentId: enrollment.studentId,
          sourceType: 'exam_campaign',
          sourceId: enrollment.campaign.id,
          completedAt: null,
          questionId: { not: null },
        },
        select: { questionId: true },
        orderBy: { reviewAt: 'asc' },
        take: 20,
      });
      refIds = pending.map((p) => p.questionId!).filter(Boolean);
    }

    if (refIds.length === 0) {
      return NextResponse.json({
        data: {
          campaignTitle: enrollment.campaign.title,
          activityTitle: activity.title,
          activityType: activity.type,
          phase: dayEntry.phase,
          questions: [],
        },
      });
    }

    const questions = await prisma.question.findMany({
      where: { id: { in: refIds } },
      select: {
        id: true,
        content: true,
        type: true,
        choices: true,
        answer: true,
        explanation: true,
        difficulty: true,
        chapter: true,
        section: true,
        diagramSpec: true,
        diagramSVG: true,
      },
    });
    // refIds 순서 유지
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = refIds.map((rid) => byId.get(rid)).filter(Boolean);

    return NextResponse.json({
      data: {
        campaignTitle: enrollment.campaign.title,
        activityTitle: activity.title,
        activityType: activity.type,
        phase: dayEntry.phase,
        completed: activity.completed,
        skipped: activity.skipped,
        questions: ordered,
      },
    });
  } catch (err) {
    console.error('[activity-questions]', err);
    return serverError('활동 문제를 불러오지 못했습니다');
  }
}
