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
import type { ScheduleDay } from '@/lib/services/exam-campaign-scheduler';

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

  const licenseCheck = await requireLicense(user, 'exam_prep');
  if (licenseCheck) return licenseCheck;

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

    const result: ExamPrepCampaign[] = enrollments
      .filter((e) => e.campaign.status !== 'ARCHIVED')
      .map((e) => {
        const schedule = (e.schedule as unknown as ScheduleDay[]) ?? [];
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
