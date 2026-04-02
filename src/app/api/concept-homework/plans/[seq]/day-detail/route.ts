import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ seq: string }> };

/**
 * GET /api/concept-homework/plans/[seq]/day-detail?dayIndex=N&studentId=S
 *
 * 특정 일차의 개념별 학생 학습 진행 상세
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  const dayIndex = Number(request.nextUrl.searchParams.get('dayIndex'));
  const studentId = request.nextUrl.searchParams.get('studentId');

  if (isNaN(dayIndex) || dayIndex < 0 || !studentId) {
    return badRequest('dayIndex와 studentId가 필요합니다');
  }

  const plan = await prisma.conceptHomeworkPlan.findUnique({
    where: { seq: Number(seq) },
    select: { id: true, dailyConcepts: true, totalDays: true, requiredStage: true },
  });
  if (!plan) return badRequest('플랜을 찾을 수 없습니다');
  if (dayIndex >= plan.totalDays) return badRequest('유효하지 않은 일차입니다');

  const allDailyConcepts = plan.dailyConcepts as string[][];
  const conceptIds = allDailyConcepts[dayIndex] ?? [];

  // 학생 정보
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true },
  });

  // 개념 정보
  const concepts = await prisma.concept.findMany({
    where: { id: { in: conceptIds } },
    select: { id: true, title: true, conceptCode: true },
  });
  // conceptIds 순서 유지
  const orderedConcepts = conceptIds.map(id => concepts.find(c => c.id === id)).filter(Boolean);

  // 학생의 학습 진행 (4단계)
  const progressRecords = await prisma.learningProgress.findMany({
    where: {
      userId: studentId,
      conceptId: { in: conceptIds },
    },
    select: {
      conceptId: true,
      stage: true,
      completed: true,
      attempts: true,
      score: true,
      completedAt: true,
      startedAt: true,
    },
  });

  // 개념별로 그룹핑
  const progressMap = new Map<string, typeof progressRecords>();
  for (const p of progressRecords) {
    const arr = progressMap.get(p.conceptId) ?? [];
    arr.push(p);
    progressMap.set(p.conceptId, arr);
  }

  const STAGES = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'] as const;
  const STAGE_LABELS: Record<string, string> = {
    READING: '읽기',
    BLANK_EASY: '쉬움',
    BLANK_HARD: '어려움',
    BLANK_FULL: '통문장',
  };

  const progressList = orderedConcepts.map(concept => {
    const records = progressMap.get(concept!.id) ?? [];
    const stages = STAGES.map(stage => {
      const rec = records.find(r => r.stage === stage);
      return {
        stage,
        label: STAGE_LABELS[stage],
        completed: rec?.completed ?? false,
        attempts: rec?.attempts ?? 0,
        score: rec?.score ?? null,
        completedAt: rec?.completedAt?.toISOString() ?? null,
        startedAt: rec?.startedAt?.toISOString() ?? null,
      };
    });
    const completedCount = stages.filter(s => s.completed).length;
    return {
      conceptId: concept!.id,
      title: concept!.title,
      conceptCode: concept!.conceptCode,
      completedStages: completedCount,
      totalStages: 4,
      stages,
    };
  });

  return NextResponse.json({
    data: {
      student,
      dayIndex,
      concepts: orderedConcepts,
      progressList,
    },
  });
}
