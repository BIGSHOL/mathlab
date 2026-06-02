/**
 * GET /api/admin/evolution
 *
 * 교정 벤치마크 콘솔 데이터 — 플랫폼 전역 교정 신호 측정 종합. (⚠️ 자동 적용 아님 — 측정 전용)
 * 3계층으로 구분:
 *  ① 측정     — 난이도/배점/단원·유형·능력 교정 편향 (교정 → 집계 → 측정 표시)
 *  ② 수집     — 수동 교정/피드백/패턴/레퍼런스 (DB 누적, 자동 반영 안 함)
 *  ③ 참고     — 총평/블로그 재생성·복사 신호 (품질 대용 지표)
 *
 * 권한: SUPER_ADMIN
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';
import {
  NUMERIC_FIELDS, CATEGORICAL_FIELDS,
  extractNumericPairs, computeNumericStats,
  extractConfusionPairs, computeCategoricalStats,
  type AnalysisLike,
} from '@/lib/exam-analysis/calibration';

function countMap(rows: { _count: { _all: number } }[], key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows as unknown as Array<Record<string, unknown> & { _count: { _all: number } }>) {
    out[String(r[key])] = r._count._all;
  }
  return out;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  // ── 분석본 스캔 (questions JSON 에서 수동 교정 신호 추출) ──
  const analyses = await prisma.examAnalysis.findMany({
    select: { questions: true, createdAt: true, examPaper: { select: { grade: true, schoolName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 3000,
  });

  const ALL_FIELDS = ['difficulty', 'points', 'topic', 'question_type', 'ability_domain'] as const;
  let totalQuestions = 0;
  let manualEditedCount = 0;
  const perFieldCorrected: Record<string, number> = {};
  const likes: AnalysisLike[] = [];
  const recentCorrections: Array<{ field: string; ai: string; teacher: string; at: string | null; school: string | null }> = [];

  for (const a of analyses) {
    const qs = Array.isArray(a.questions) ? a.questions : [];
    likes.push({ questions: a.questions, grade: a.examPaper?.grade ?? null });
    totalQuestions += qs.length;
    for (const raw of qs) {
      const q = raw as Record<string, unknown>;
      if (q.manually_edited) manualEditedCount++;
      for (const f of ALL_FIELDS) {
        if (q[`ai_${f}`] != null) {
          perFieldCorrected[f] = (perFieldCorrected[f] ?? 0) + 1;
          if (recentCorrections.length < 25) {
            recentCorrections.push({
              field: f,
              ai: String(q[`ai_${f}`]),
              teacher: String(q[f]),
              at: typeof q.manually_edited_at === 'string' ? q.manually_edited_at : null,
              school: a.examPaper?.schoolName ?? null,
            });
          }
        }
      }
    }
  }

  // ── ① 적용 중인 보정 맵 로드 (MetadataCalibration 전 필드) ──
  // 방어적: 모델 미존재(구버전 Prisma 클라이언트 등) 시에도 라이브 통계는 표시되도록 폴백.
  let calRows: Array<{ field: string; globalBias: number; bucketShifts: unknown; totalCorrections: number; updatedAt: Date }> = [];
  try {
    calRows = await prisma.metadataCalibration.findMany({ where: { subject: 'MATH' } });
  } catch {
    calRows = [];
  }
  const calByField = new Map(calRows.map((r) => [r.field, r]));

  // 수치형 필드 (난이도·배점)
  const numericFields = NUMERIC_FIELDS.map((cfg) => {
    const live = computeNumericStats(extractNumericPairs(likes, cfg), cfg, totalQuestions);
    const row = calByField.get(cfg.field);
    const appliedBuckets = row?.bucketShifts && typeof row.bucketShifts === 'object'
      ? Object.keys(row.bucketShifts as Record<string, number>).length : 0;
    return {
      field: cfg.field,
      applied: {
        globalBias: row?.globalBias ?? 0,
        appliedBuckets,
        totalCorrections: row?.totalCorrections ?? 0,
        updatedAt: row?.updatedAt ?? null,
      },
      live: {
        globalBias: live.globalBias,
        totalCorrections: live.totalCorrections,
        buckets: live.buckets.slice(0, 20),
      },
      pendingDelta: live.totalCorrections - (row?.totalCorrections ?? 0),
    };
  });

  // 범주형 필드 (단원·유형·능력)
  const categoricalFields = CATEGORICAL_FIELDS.map((cfg) => {
    const live = computeCategoricalStats(extractConfusionPairs(likes, cfg), cfg);
    const row = calByField.get(cfg.field);
    return {
      field: cfg.field,
      ko: cfg.ko,
      totalCorrections: live.totalCorrections,
      appliedGroups: row?.bucketShifts && typeof row.bucketShifts === 'object'
        ? Object.keys(row.bucketShifts as Record<string, unknown>).length : 0,
      topConfusions: live.groups.slice(0, 8).map((g) => ({
        ai: g.ai, dominant: g.dominant, total: g.total, dominantFrac: g.dominantFrac,
      })),
    };
  });

  // ── ② 피드백 / 패턴 / 레퍼런스 ──
  const [
    feedbackTotal,
    feedbackByType,
    feedbackByStatus,
    feedbackWithCorrection,
    patterns,
    refByStatus,
    refTotal,
  ] = await Promise.all([
    prisma.examFeedback.count(),
    prisma.examFeedback.groupBy({ by: ['feedbackType'], _count: { _all: true } }),
    prisma.examFeedback.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.examFeedback.count({ where: { correction: { not: Prisma.AnyNull } } }),
    prisma.learnedPattern.findMany({
      orderBy: [{ isActive: 'desc' }, { confidence: 'desc' }],
      take: 50,
      select: { patternType: true, description: true, confidence: true, sourceCount: true, isAutoApplied: true, isActive: true, rule: true, updatedAt: true },
    }),
    prisma.examQuestionReference.groupBy({ by: ['reviewStatus'], _count: { _all: true } }),
    prisma.examQuestionReference.count(),
  ]);

  // 패턴 rule 에 구체 보정값이 있는지 (현재는 {feedbackType, sampleCount} 뿐 → 빈 껍데기 진단)
  const patternsOut = patterns.map((p) => {
    const rule = (p.rule && typeof p.rule === 'object' ? p.rule : {}) as Record<string, unknown>;
    const hasConcreteRule = Object.keys(rule).some((k) => !['feedbackType', 'sampleCount'].includes(k));
    return {
      patternType: p.patternType,
      description: p.description,
      confidence: p.confidence,
      sourceCount: p.sourceCount,
      isAutoApplied: p.isAutoApplied,
      isActive: p.isActive,
      hasConcreteRule,
      updatedAt: p.updatedAt,
    };
  });

  // ── ③ 생성물 신호 (총평/블로그/복사) ──
  const [commentaryRuns, articleRuns, copyEvents, examPapers, schools, analysisCount] = await Promise.all([
    prisma.examAnalysisExtension.count({ where: { agentType: 'commentary' } }),
    prisma.examAnalysisExtension.count({ where: { agentType: 'blog-article' } }),
    prisma.articleCopyEvent.count(),
    prisma.examPaper.count(),
    prisma.school.count(),
    prisma.examAnalysis.count(),
  ]);

  // ── 교정 이벤트 로그 집계 (append-only MetadataCorrectionLog — 빈도·반복·추이) ──
  // 최신상태 스캔(위 collected)과 달리 "모든 교정 이벤트"라 빈도/반복/시계열을 정확히 봄.
  // 방어적: 모델/데이터 없을 때도 콘솔 안 깨지도록 폴백.
  let correctionLog: {
    total: number;
    perField: Record<string, number>;
    patternRanking: { field: string; ai: string | null; to: string | null; topic: string | null; count: number }[];
    repeatQuestions: { examPaperId: string; questionNumber: string; field: string; count: number; school: string | null }[];
    recentEvents: { field: string; ai: string | null; from: string | null; to: string | null; topic: string | null; aiDifficulty: string | null; questionNumber: string; school: string | null; at: string }[];
  } = { total: 0, perField: {}, patternRanking: [], repeatQuestions: [], recentEvents: [] };
  try {
    const [logTotal, perFieldRows, patternRows, repeatRows, recentRows] = await Promise.all([
      prisma.metadataCorrectionLog.count(),
      prisma.metadataCorrectionLog.groupBy({ by: ['field'], _count: { id: true } }),
      prisma.metadataCorrectionLog.groupBy({
        by: ['field', 'aiValue', 'toValue', 'topic'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 15,
      }),
      prisma.metadataCorrectionLog.groupBy({
        by: ['examPaperId', 'questionNumber', 'field'],
        _count: { id: true },
        having: { id: { _count: { gt: 1 } } },
        orderBy: { _count: { id: 'desc' } },
        take: 15,
      }),
      prisma.metadataCorrectionLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { field: true, aiValue: true, fromValue: true, toValue: true, topic: true, aiDifficulty: true, questionNumber: true, examPaperId: true, createdAt: true },
      }),
    ]);
    const paperIds = Array.from(new Set([...recentRows.map((r) => r.examPaperId), ...repeatRows.map((r) => r.examPaperId)]));
    const papers = paperIds.length > 0
      ? await prisma.examPaper.findMany({ where: { id: { in: paperIds } }, select: { id: true, schoolName: true } })
      : [];
    const schoolMap = new Map(papers.map((p) => [p.id, p.schoolName]));
    correctionLog = {
      total: logTotal,
      perField: Object.fromEntries(perFieldRows.map((r) => [r.field, r._count.id])),
      patternRanking: patternRows.map((r) => ({ field: r.field, ai: r.aiValue, to: r.toValue, topic: r.topic, count: r._count.id })),
      repeatQuestions: repeatRows.map((r) => ({ examPaperId: r.examPaperId, questionNumber: r.questionNumber, field: r.field, count: r._count.id, school: schoolMap.get(r.examPaperId) ?? null })),
      recentEvents: recentRows.map((r) => ({ field: r.field, ai: r.aiValue, from: r.fromValue, to: r.toValue, topic: r.topic, aiDifficulty: r.aiDifficulty, questionNumber: r.questionNumber, school: schoolMap.get(r.examPaperId) ?? null, at: r.createdAt.toISOString() })),
    };
  } catch (e) {
    console.error('[evolution] correctionLog 집계 실패(무시):', e);
  }

  return NextResponse.json({
    data: {
      generatedAt: new Date().toISOString(),
      scale: { analyses: analysisCount, totalQuestions, examPapers, schools },

      // ① 작동 중 — 통합 보정 (전 필드)
      numericFields,
      categoricalFields,
      recentCorrections,

      // ② 수집 중 — 수동 교정/피드백/패턴/레퍼런스
      collected: {
        manualEdits: {
          totalEditedQuestions: manualEditedCount,
          perField: perFieldCorrected,
        },
        feedback: {
          total: feedbackTotal,
          byType: countMap(feedbackByType, 'feedbackType'),
          byStatus: countMap(feedbackByStatus, 'status'),
          withCorrectionValue: feedbackWithCorrection, // correction JSON 채워진 건수 (현재 UI 미전송 → 0 예상)
        },
        patterns: {
          total: patternsOut.length,
          autoApplied: patternsOut.filter((p) => p.isAutoApplied && p.isActive).length,
          concreteRuleCount: patternsOut.filter((p) => p.hasConcreteRule).length,
          list: patternsOut,
        },
        references: {
          total: refTotal,
          byStatus: countMap(refByStatus, 'reviewStatus'),
        },
      },

      // ③ 버려지는 — 생성물 신호
      generative: {
        commentaryRuns,
        articleRuns,
        copyEvents, // 복사 = 품질 통과 신호이나 학습 미연동
      },

      // ④ 교정 이벤트 로그 (append-only 수집 — 자주 보정되는 패턴/반복/최근)
      correctionLog,
    },
  });
}
