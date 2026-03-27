import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, getTenantFilter } from '@/lib/api';

/** GET /api/exam-analysis/trends — 학교별 출제 경향 조회 (OWNER+) */
export async function GET(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject') as 'MATH' | 'ENGLISH' | null;
  const grade = searchParams.get('grade');
  const period = searchParams.get('period');

  const tenantWhere = getTenantFilter(user);

  const where: Record<string, unknown> = {
    ...tenantWhere,
    ...(subject && { subject }),
    ...(grade && { grade }),
    ...(period && { period }),
  };

  const trends = await prisma.examSchoolTrend.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: trends });
}

/** POST /api/exam-analysis/trends — 트렌드 데이터 집계 (OWNER+) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantWhere = getTenantFilter(user);
  const body = await request.json();
  const { subject, grade, period } = body;

  // 해당 기간/학년/과목의 완료된 분석 조회
  const examPapers = await prisma.examPaper.findMany({
    where: {
      ...tenantWhere,
      status: 'COMPLETED',
      ...(subject && { subject }),
      ...(grade && { grade }),
    },
    include: {
      analyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { summary: true, totalQuestions: true, totalPoints: true },
      },
    },
  });

  if (!examPapers.length) {
    return NextResponse.json({ data: null, message: '집계할 데이터가 없습니다' });
  }

  // 트렌드 데이터 집계
  const totalDifficulty = { concept: 0, pattern: 0, reasoning: 0, creative: 0 };
  const totalType = { calculation: 0, geometry: 0, application: 0, proof: 0, graph: 0, statistics: 0 };
  let totalQuestions = 0;
  let totalPoints = 0;
  let sampleCount = 0;

  for (const ep of examPapers) {
    const analysis = ep.analyses[0];
    if (!analysis?.summary) continue;

    const summary = analysis.summary as Record<string, unknown>;
    const diffDist = summary.difficulty_distribution as Record<string, number> | undefined;
    const typeDist = summary.type_distribution as Record<string, number> | undefined;

    if (diffDist) {
      for (const [k, v] of Object.entries(diffDist)) {
        if (k in totalDifficulty) totalDifficulty[k as keyof typeof totalDifficulty] += v;
      }
    }
    if (typeDist) {
      for (const [k, v] of Object.entries(typeDist)) {
        if (k in totalType) totalType[k as keyof typeof totalType] += v;
      }
    }

    totalQuestions += analysis.totalQuestions || 0;
    totalPoints += analysis.totalPoints || 0;
    sampleCount++;
  }

  const trendData = {
    difficulty_distribution: totalDifficulty,
    type_distribution: totalType,
    avg_questions: sampleCount > 0 ? Math.round(totalQuestions / sampleCount) : 0,
    avg_points: sampleCount > 0 ? Math.round(totalPoints / sampleCount) : 0,
  };

  // upsert 트렌드
  const periodStr = period || new Date().toISOString().slice(0, 7);
  const trend = await prisma.examSchoolTrend.upsert({
    where: {
      id: `trend-${user.tenantId}-${subject}-${grade}-${periodStr}`,
    },
    create: {
      id: `trend-${user.tenantId}-${subject}-${grade}-${periodStr}`,
      tenantId: user.tenantId || '',
      subject: subject || 'MATH',
      grade: grade || '',
      period: periodStr,
      trendData,
      sampleSize: sampleCount,
    },
    update: {
      trendData,
      sampleSize: sampleCount,
    },
  });

  return NextResponse.json({ data: trend });
}
