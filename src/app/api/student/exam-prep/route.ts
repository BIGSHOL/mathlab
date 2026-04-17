/**
 * 학생 내신대비 데이터 조회
 *
 * GET /api/student/exam-prep
 *   학생의 모든 활성 캠페인 + 오늘의 학습 항목 + 단원 마스터리 진행률을 반환.
 *
 * View-As 지원: 선생님이 ?_as=studentId로 학생 시점 조회 가능.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireAuthViewAs,
  isResponse,
  serverError,
  requireLicense,
} from '@/lib/api';
import type { ScheduleDay, ScheduleActivity } from '@/lib/services/exam-campaign-scheduler';
import { getCampaignPendingReviews } from '@/lib/services/spaced-review';

interface ExamPrepCampaign {
  enrollmentId: string;
  campaignId: string;
  title: string;
  schoolName: string | null;
  examDate: string;
  examType: string;
  daysLeft: number;
  progressPct: number;
  predictedGrade: string | null;
  status: string;
  todayDay: ScheduleDay | null;
  upcomingDays: ScheduleDay[];
  scopeChapters: Array<{ chapter: string }>;
  patternSummary: {
    topChapters: Array<{ chapter: string; pct: number }>;
    averageDifficulty: number;
    totalSamples: number;
  } | null;
}

function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  // 내신대비 이용권이 없으면 조용히 빈 배열 반환 (대시보드 카드 숨김용)
  const licenseCheck = await requireLicense(user, 'exam_prep');
  if (licenseCheck) return NextResponse.json({ data: [] });

  try {
    const enrollments = await prisma.examCampaignEnrollment.findMany({
      where: {
        studentId: user.id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            schoolName: true,
            examDate: true,
            examType: true,
            scopeChapters: true,
            patternAnalysis: true,
            status: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = dateToISO(today);

    // 스케줄 내 concept refId → 제목 일괄 조회 (기존 enrollment 대응)
    const allConceptIds = new Set<string>();
    for (const e of enrollments) {
      const sch = (e.schedule as unknown as ScheduleDay[]) ?? [];
      for (const d of sch) {
        for (const a of d.activities) {
          if (a.type === 'concept' && a.refId) allConceptIds.add(a.refId);
        }
      }
    }
    const conceptList = allConceptIds.size > 0
      ? await prisma.concept.findMany({
          where: { id: { in: Array.from(allConceptIds) } },
          select: { id: true, title: true },
        })
      : [];
    const conceptTitleMap = new Map(conceptList.map((c) => [c.id, c.title]));
    const enrich = (day: ScheduleDay): ScheduleDay => ({
      ...day,
      activities: day.activities.map((a) =>
        a.type === 'concept' && a.refId && conceptTitleMap.has(a.refId)
          ? { ...a, title: conceptTitleMap.get(a.refId)! }
          : a,
      ),
    });

    // 각 enrollment에 대한 캠페인 오답 복습 대기열 프리로드
    const pendingByCampaign = new Map<string, { questionIds: string[]; conceptIds: string[] }>();
    for (const e of enrollments) {
      const pending = await getCampaignPendingReviews({
        studentId: user.id,
        campaignId: e.campaign.id,
        limit: 50,
      });
      pendingByCampaign.set(e.campaign.id, {
        questionIds: pending.filter((p) => p.questionId).map((p) => p.questionId!),
        conceptIds: pending.filter((p) => p.conceptId).map((p) => p.conceptId!),
      });
    }

    const applyReviewPriority = (campaignId: string) => (day: ScheduleDay): ScheduleDay => {
      const pending = pendingByCampaign.get(campaignId);
      if (!pending) return day;
      // Phase 5 review 활동에 실제 오답 문제/개념 주입
      if (day.phase === 5) {
        const next: ScheduleActivity[] = day.activities.map((a) => {
          if (a.type !== 'review') return a;
          const ids = [...pending.questionIds].slice(0, 20);
          if (ids.length === 0) return a;
          return {
            ...a,
            refIds: ids,
            title: `누적 오답 복습 ${ids.length}문제`,
          };
        });
        return { ...day, activities: next };
      }
      // Phase 3 약점 보강: 앞에 오답 최대 3개 우선 배치
      if (day.phase === 3) {
        const priority = pending.questionIds.slice(0, 3);
        if (priority.length === 0) return day;
        const next: ScheduleActivity[] = day.activities.map((a) => {
          if (a.type !== 'questions' || !a.refIds) return a;
          const merged = Array.from(new Set([...priority, ...a.refIds]));
          return { ...a, refIds: merged, title: `약점 보강 ${merged.length}문제 (오답 ${priority.length})` };
        });
        return { ...day, activities: next };
      }
      return day;
    };

    const result: ExamPrepCampaign[] = enrollments
      .filter((e) => e.campaign.status !== 'ARCHIVED')
      .map((e) => {
        const withTitles = ((e.schedule as unknown as ScheduleDay[]) ?? []).map(enrich);
        const schedule = withTitles.map(applyReviewPriority(e.campaign.id));
        const examDate = new Date(e.campaign.examDate);
        examDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.round(
          (examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        const todayDay = schedule.find((d) => d.date === todayISO) ?? null;
        const upcomingDays = schedule
          .filter((d) => d.date > todayISO)
          .slice(0, 7);

        const pattern = e.campaign.patternAnalysis as
          | {
              topChapters?: Array<{ chapter: string; pct: number }>;
              averageDifficulty?: number;
              totalSamplesAnalyzed?: number;
              mode?: 'exam_based' | 'scope_based' | 'ai_filled';
              aiFilledCount?: number;
            }
          | null;

        return {
          enrollmentId: e.id,
          campaignId: e.campaign.id,
          title: e.campaign.title,
          schoolName: e.campaign.schoolName,
          examDate: e.campaign.examDate.toISOString(),
          examType: e.campaign.examType,
          daysLeft,
          progressPct: e.progressPct,
          predictedGrade: e.predictedGrade,
          status: e.status,
          todayDay,
          upcomingDays,
          scopeChapters: (e.campaign.scopeChapters as unknown as Array<{ chapter: string }>) ?? [],
          patternSummary: pattern
            ? {
                topChapters: (pattern.topChapters ?? []).slice(0, 5),
                averageDifficulty: pattern.averageDifficulty ?? 0,
                totalSamples: pattern.totalSamplesAnalyzed ?? 0,
                mode: pattern.mode ?? 'exam_based',
                aiFilledCount: pattern.aiFilledCount ?? 0,
              }
            : null,
        };
      });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[student exam-prep GET]', err);
    return serverError('내신대비 정보를 불러오지 못했습니다');
  }
}
