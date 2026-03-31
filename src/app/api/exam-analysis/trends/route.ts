import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, requireOwner, isResponse, getTenantFilter } from '@/lib/api';
import { DIFFICULTY_LEGACY_MAP } from '@/lib/exam-analysis/constants';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

// ── 타입 ──

interface TopicStat {
  topic: string;
  count: number;
  pct: number;
  avgDifficulty: string;
  totalPoints: number;
}

interface DiffStat {
  difficulty: string;
  count: number;
  pct: number;
  avgPoints: number;
}

interface TypeStat {
  questionType: string;
  count: number;
  pct: number;
  avgDifficulty: string;
}

interface FormatStat {
  format: string;
  count: number;
  pct: number;
  avgPoints: number;
}

interface TextbookStat {
  textbook: string;
  count: number;
  pct: number;
  chapters: string[];
}

// ── 헬퍼 ──

/** 난이도를 5단계로 정규화 */
function normDiff(d: string): string {
  return DIFFICULTY_LEGACY_MAP[d] || d;
}

/** 배열에서 최빈값 */
function mode(arr: string[]): string {
  const c = new Map<string, number>();
  for (const v of arr) c.set(v, (c.get(v) || 0) + 1);
  let best = arr[0] || '3';
  let max = 0;
  for (const [k, v] of c) { if (v > max) { best = k; max = v; } }
  return best;
}

// ══════════════════════════════════════════
// GET /api/exam-analysis/trends
// mode=dashboard → 전체 집계 대시보드
// mode=school    → 기존 ExamSchoolTrend 레코드
// (default)      → 기존 동작
// ══════════════════════════════════════════

export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const modeParam = searchParams.get('mode');
  const subject = searchParams.get('subject') as 'MATH' | 'ENGLISH' | null;
  const grade = searchParams.get('grade');
  const schoolName = searchParams.get('schoolName');

  const tenantWhere = getTenantFilter(user);

  // ── mode=dashboard: 실시간 집계 ──
  if (modeParam === 'dashboard') {
    return handleDashboard(tenantWhere, subject, grade, schoolName);
  }

  // ── 기존: ExamSchoolTrend 레코드 조회 ──
  const where: Record<string, unknown> = {
    ...tenantWhere,
    ...(subject && { subject }),
    ...(grade && { grade }),
    ...(schoolName && { schoolName: { contains: schoolName } }),
  };

  const trends = await prisma.examSchoolTrend.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: trends });
}

/** 대시보드 모드: 완료된 분석에서 실시간 집계 */
async function handleDashboard(
  tenantWhere: Record<string, unknown>,
  subject: string | null,
  grade: string | null,
  schoolName: string | null,
) {
  // 완료된 시험지 + 최신 분석 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paperWhere: any = {
    ...tenantWhere,
    status: 'COMPLETED',
    ...(subject && { subject }),
    ...(grade && { grade }),
    ...(schoolName && { schoolName: { contains: schoolName } }),
  };

  const papers = await prisma.examPaper.findMany({
    where: paperWhere,
    include: {
      analyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { questions: true, summary: true, totalQuestions: true, totalPoints: true },
      },
    },
  });

  if (!papers.length) {
    return NextResponse.json({
      data: {
        stats: { totalExams: 0, totalQuestions: 0, avgQuestionsPerExam: 0, avgConfidence: 0 },
        distributions: { difficulty: [], questionType: [], questionFormat: [] },
        topicFrequency: [],
        textbookTrends: [],
        featureCards: [],
      },
    });
  }

  // 모든 문항 수집
  const allQuestions: AnalyzedQuestion[] = [];
  let sumConfidence = 0;
  let confCount = 0;

  for (const p of papers) {
    const analysis = p.analyses[0];
    if (!analysis?.questions) continue;
    const qs = analysis.questions as unknown as AnalyzedQuestion[];
    allQuestions.push(...qs);
    for (const q of qs) {
      if (typeof q.confidence === 'number') {
        sumConfidence += q.confidence;
        confCount++;
      }
    }
  }

  const totalExams = papers.filter(p => p.analyses.length > 0).length;
  const totalQuestions = allQuestions.length;
  const avgQuestionsPerExam = totalExams > 0 ? Math.round(totalQuestions / totalExams * 10) / 10 : 0;
  const avgConfidence = confCount > 0 ? Math.round(sumConfidence / confCount * 1000) / 10 : 0;

  // ── 난이도 분포 (5단계) ──
  const diffMap: Record<string, { count: number; pts: number }> = {};
  for (const q of allQuestions) {
    const d = normDiff(String(q.difficulty || '3'));
    if (!diffMap[d]) diffMap[d] = { count: 0, pts: 0 };
    diffMap[d].count++;
    diffMap[d].pts += q.points || 0;
  }
  const difficulty: DiffStat[] = Object.entries(diffMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({
      difficulty: k,
      count: v.count,
      pct: totalQuestions > 0 ? Math.round(v.count / totalQuestions * 1000) / 10 : 0,
      avgPoints: v.count > 0 ? Math.round(v.pts / v.count * 10) / 10 : 0,
    }));

  // ── 유형 분포 (6종) ──
  const typeMap: Record<string, { count: number; diffs: string[] }> = {};
  for (const q of allQuestions) {
    const t = q.question_type || 'calculation';
    if (!typeMap[t]) typeMap[t] = { count: 0, diffs: [] };
    typeMap[t].count++;
    typeMap[t].diffs.push(normDiff(String(q.difficulty || '3')));
  }
  const questionType: TypeStat[] = Object.entries(typeMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([k, v]) => ({
      questionType: k,
      count: v.count,
      pct: totalQuestions > 0 ? Math.round(v.count / totalQuestions * 1000) / 10 : 0,
      avgDifficulty: mode(v.diffs),
    }));

  // ── 형식 분포 ──
  const fmtMap: Record<string, { count: number; pts: number }> = {};
  for (const q of allQuestions) {
    const f = q.question_format || 'objective';
    if (!fmtMap[f]) fmtMap[f] = { count: 0, pts: 0 };
    fmtMap[f].count++;
    fmtMap[f].pts += q.points || 0;
  }
  const questionFormat: FormatStat[] = Object.entries(fmtMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([k, v]) => ({
      format: k,
      count: v.count,
      pct: totalQuestions > 0 ? Math.round(v.count / totalQuestions * 1000) / 10 : 0,
      avgPoints: v.count > 0 ? Math.round(v.pts / v.count * 10) / 10 : 0,
    }));

  // ── 단원별 출제 빈도 TOP 10 ──
  const topicMap: Record<string, { count: number; diffs: string[]; pts: number }> = {};
  for (const q of allQuestions) {
    const t = q.topic || '미분류';
    if (!topicMap[t]) topicMap[t] = { count: 0, diffs: [], pts: 0 };
    topicMap[t].count++;
    topicMap[t].diffs.push(normDiff(String(q.difficulty || '3')));
    topicMap[t].pts += q.points || 0;
  }
  const topicFrequency: TopicStat[] = Object.entries(topicMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([k, v]) => ({
      topic: k,
      count: v.count,
      pct: totalQuestions > 0 ? Math.round(v.count / totalQuestions * 1000) / 10 : 0,
      avgDifficulty: mode(v.diffs),
      totalPoints: Math.round(v.pts * 10) / 10,
    }));

  // ── 교과서별 출제 경향 ──
  const tbMap: Record<string, { count: number; chapters: Set<string> }> = {};
  for (const q of allQuestions) {
    if (!q.topic) continue;
    const parts = q.topic.split(' > ');
    const tb = parts[0] || '기타';
    const ch = parts.length >= 2 ? parts[1] : '';
    if (!tbMap[tb]) tbMap[tb] = { count: 0, chapters: new Set() };
    tbMap[tb].count++;
    if (ch) tbMap[tb].chapters.add(ch);
  }
  const textbookTrends: TextbookStat[] = Object.entries(tbMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([k, v]) => ({
      textbook: k,
      count: v.count,
      pct: totalQuestions > 0 ? Math.round(v.count / totalQuestions * 1000) / 10 : 0,
      chapters: Array.from(v.chapters),
    }));

  // ── 출제 특징 4카드 ──
  const essayFmt = fmtMap['essay'];
  const essayPct = essayFmt ? Math.round(essayFmt.count / totalQuestions * 100) : 0;
  const dominantType = questionType[0];

  // 난이도 균형도 (엔트로피 기반)
  const diffCounts = difficulty.map(d => d.count);
  const diffTotal = diffCounts.reduce((s, c) => s + c, 0);
  let entropy = 0;
  if (diffTotal > 0) {
    for (const c of diffCounts) {
      if (c > 0) {
        const p = c / diffTotal;
        entropy -= p * Math.log2(p);
      }
    }
  }
  const maxEntropy = Math.log2(Math.max(diffCounts.filter(c => c > 0).length, 1));
  const balancePct = maxEntropy > 0 ? Math.round(entropy / maxEntropy * 100) : 0;

  const featureCards = [
    {
      key: 'textbook',
      label: '교과서 연계성',
      value: `${textbookTrends.length}종`,
      description: textbookTrends.slice(0, 2).map(t => t.textbook).join(', ') || '분석중',
    },
    {
      key: 'balance',
      label: '난이도 균형도',
      value: `${balancePct}%`,
      description: balancePct >= 80 ? '매우 균형잡힌 출제' : balancePct >= 60 ? '양호한 분포' : '특정 난이도 편중',
    },
    {
      key: 'dominantType',
      label: '주요 문항 유형',
      value: dominantType?.questionType || '-',
      description: dominantType ? `전체의 ${dominantType.pct}% 차지` : '',
    },
    {
      key: 'essay',
      label: '서술형 비중',
      value: `${essayPct}%`,
      description: essayPct >= 30 ? '고변별력 구성' : essayPct >= 15 ? '적정 비율' : '객관식 중심',
    },
  ];

  return NextResponse.json({
    data: {
      stats: { totalExams, totalQuestions, avgQuestionsPerExam, avgConfidence },
      distributions: { difficulty, questionType, questionFormat },
      topicFrequency,
      textbookTrends,
      featureCards,
    },
  });
}

// ══════════════════════════════════════════
// POST /api/exam-analysis/trends — 트렌드 집계
// ══════════════════════════════════════════

export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantWhere = getTenantFilter(user);
  const body = await request.json();
  const { subject, grade, period, groupBy } = body;

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
        select: { questions: true, summary: true, totalQuestions: true, totalPoints: true },
      },
    },
  });

  if (!examPapers.length) {
    return NextResponse.json({ data: null, message: '집계할 데이터가 없습니다' });
  }

  // 학교별 그룹핑
  if (groupBy === 'school') {
    return handleSchoolGrouping(examPapers, user.tenantId || '', subject || 'MATH');
  }

  // 전체 집계 (5단계 난이도)
  const totalDiff: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const totalType: Record<string, number> = { calculation: 0, geometry: 0, application: 0, proof: 0, graph: 0, statistics: 0 };
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
        const norm = normDiff(k);
        if (norm in totalDiff) totalDiff[norm] += v;
      }
    }
    if (typeDist) {
      for (const [k, v] of Object.entries(typeDist)) {
        if (k in totalType) totalType[k] += v;
      }
    }

    totalQuestions += analysis.totalQuestions || 0;
    totalPoints += analysis.totalPoints || 0;
    sampleCount++;
  }

  const trendData = {
    difficulty_distribution: totalDiff,
    type_distribution: totalType,
    avg_questions: sampleCount > 0 ? Math.round(totalQuestions / sampleCount) : 0,
    avg_points: sampleCount > 0 ? Math.round(totalPoints / sampleCount) : 0,
  };

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

/** 학교별 그룹 집계 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSchoolGrouping(examPapers: any[], tenantId: string, subject: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups = new Map<string, any[]>();

  for (const ep of examPapers) {
    const key = `${ep.schoolName || '미지정'}|${ep.grade}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ep);
  }

  let created = 0;
  let updated = 0;

  for (const [key, papers] of groups) {
    const [schoolNameVal, gradeVal] = key.split('|');
    const allQuestions: AnalyzedQuestion[] = [];

    for (const p of papers) {
      const analysis = p.analyses[0];
      if (!analysis?.questions) continue;
      allQuestions.push(...(analysis.questions as unknown as AnalyzedQuestion[]));
    }

    if (!allQuestions.length) continue;

    // 난이도 분포
    const diffDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const typeDist: Record<string, number> = {};
    const chapterDist: Record<string, number> = {};

    for (const q of allQuestions) {
      const d = normDiff(String(q.difficulty || '3'));
      if (d in diffDist) diffDist[d]++;
      const t = q.question_type || 'calculation';
      typeDist[t] = (typeDist[t] || 0) + 1;
      if (q.topic) {
        const parts = q.topic.split(' > ');
        const ch = parts.length >= 2 ? parts.slice(0, 2).join(' > ') : parts[0];
        chapterDist[ch] = (chapterDist[ch] || 0) + 1;
      }
    }

    // 난이도 레벨 판정
    const total = allQuestions.length;
    const highRatio = ((diffDist['4'] || 0) + (diffDist['5'] || 0)) / Math.max(total, 1);
    const diffLevel = highRatio > 0.4 ? '상' : highRatio > 0.25 ? '중상' : highRatio > 0.1 ? '중' : '하';

    const focusAreas = Object.entries(chapterDist)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => k);

    const trendData = {
      difficulty_distribution: diffDist,
      type_distribution: typeDist,
      chapter_distribution: chapterDist,
      avg_questions: Math.round(total / papers.length),
      avg_points: 0,
    };

    const trendSummary = {
      difficultyLevel: diffLevel,
      characteristics: [
        highRatio > 0.3 ? '고난도 문항 비중 높음' : '기본 문항 중심',
      ],
      focusAreas,
    };

    const periodStr = new Date().toISOString().slice(0, 7);
    const id = `school-${tenantId}-${schoolNameVal}-${gradeVal}-${periodStr}`;

    const existing = await prisma.examSchoolTrend.findUnique({ where: { id } });

    await prisma.examSchoolTrend.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        subject: subject as 'MATH' | 'ENGLISH',
        grade: gradeVal,
        period: periodStr,
        schoolName: schoolNameVal === '미지정' ? null : schoolNameVal,
        trendData,
        trendSummary,
        sampleSize: papers.length,
      },
      update: {
        trendData,
        trendSummary,
        sampleSize: papers.length,
      },
    });

    if (existing) updated++;
    else created++;
  }

  return NextResponse.json({
    data: { created, updated, totalSchools: groups.size },
  });
}
