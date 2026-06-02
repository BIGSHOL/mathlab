/**
 * 보정 맵 재계산 — 전 필드(numeric+categorical)를 집계해 MetadataCalibration upsert.
 * ⚠️ 측정 전용(2026-06-02): 자동보정 비활성화로 이 맵은 더 이상 분석에 적용되지 않음.
 *    /admin/evolution 콘솔의 편향 측정 표시 + 모델 품질 벤치마크 용도.
 * calibration.ts 순수 함수 위에서 동작. db 클라이언트는 duck-typed 로 받아 API/스크립트 양쪽 재사용.
 * examPaper별 최신 분석본 1개만 집계(재업로드 중복 이중 집계 방지 — 측정 정확도).
 */

import {
  NUMERIC_FIELDS,
  CATEGORICAL_FIELDS,
  extractNumericPairs,
  computeNumericStats,
  buildNumericMap,
  extractConfusionPairs,
  computeCategoricalStats,
  buildConfusionMap,
  type AnalysisLike,
} from './calibration';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface RecomputeDb {
  examAnalysis: { findMany: (args?: any) => Promise<any[]> };
  metadataCalibration: { upsert: (args: any) => Promise<any> };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface RecomputeSummary {
  totalAnalyzedQuestions: number;
  numeric: Record<string, { globalBias: number; appliedBuckets: number; totalCorrections: number }>;
  categorical: Record<string, { groups: number; totalCorrections: number }>;
}

/** 전 필드 보정 재계산 후 MetadataCalibration 갱신. @param now ISO 타임스탬프(순수성 위해 주입) */
export async function recomputeCalibrations(db: RecomputeDb, now: string, subject = 'MATH'): Promise<RecomputeSummary> {
  const rows = await db.examAnalysis.findMany({
    select: { examPaperId: true, questions: true, examPaper: { select: { grade: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
  // examPaper별 최신 분석본 1개만 (재업로드 중복 이중 집계 방지 — 측정 정확도)
  const seen = new Set<string>();
  const analyses = rows.filter((a) => {
    const k = a.examPaperId as string | null;
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const likes: AnalysisLike[] = analyses.map((a) => ({ questions: a.questions, grade: a.examPaper?.grade ?? null }));
  let totalAnalyzedQuestions = 0;
  for (const a of likes) if (Array.isArray(a.questions)) totalAnalyzedQuestions += a.questions.length;

  const summary: RecomputeSummary = { totalAnalyzedQuestions, numeric: {}, categorical: {} };

  // 수치형
  for (const cfg of NUMERIC_FIELDS) {
    const pairs = extractNumericPairs(likes, cfg);
    const stats = computeNumericStats(pairs, cfg, totalAnalyzedQuestions);
    const map = buildNumericMap(stats, now);
    await db.metadataCalibration.upsert({
      where: { subject_field: { subject, field: cfg.field } },
      create: { subject, field: cfg.field, kind: 'numeric', globalBias: map.globalBias, bucketShifts: map.bucketShifts, totalCorrections: map.totalCorrections, stats: stats as unknown as object },
      update: { kind: 'numeric', globalBias: map.globalBias, bucketShifts: map.bucketShifts, totalCorrections: map.totalCorrections, stats: stats as unknown as object },
    });
    summary.numeric[cfg.field] = { globalBias: map.globalBias, appliedBuckets: Object.keys(map.bucketShifts).length, totalCorrections: map.totalCorrections };
  }

  // 범주형
  for (const cfg of CATEGORICAL_FIELDS) {
    const pairs = extractConfusionPairs(likes, cfg);
    const stats = computeCategoricalStats(pairs, cfg);
    const confusion = buildConfusionMap(pairs);
    await db.metadataCalibration.upsert({
      where: { subject_field: { subject, field: cfg.field } },
      create: { subject, field: cfg.field, kind: 'categorical', globalBias: 0, bucketShifts: confusion as unknown as object, totalCorrections: pairs.length, stats: stats as unknown as object },
      update: { kind: 'categorical', globalBias: 0, bucketShifts: confusion as unknown as object, totalCorrections: pairs.length, stats: stats as unknown as object },
    });
    summary.categorical[cfg.field] = { groups: stats.groups.length, totalCorrections: pairs.length };
  }

  return summary;
}
