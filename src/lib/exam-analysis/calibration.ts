/**
 * 난이도 보정(calibration) — 자가진화 플라이휠의 핵심 통계 유틸.
 *
 * 선생님이 문항 난이도를 교정하면 questions[i] 에 ai_difficulty(원본)+difficulty(교정값)가 남는다.
 * 이 (AI값 → 정답값) 쌍을 플랫폼 전역(테넌트 무관, 전국 절대 기준)으로 집계하여:
 *   - 전역 편향(globalBias): 평균 Δ = mean(교정값 − AI값). 양수면 "AI가 너무 낮게 봄".
 *   - 버킷별 보정(bucket): (question_type × ai_level) 평균 Δ. 표본 충분 + 방향 일관 시만 채택.
 * 이 보정 맵을 새 분석에 자동 적용(ai-engine 후처리)하여 분석할수록 정확해진다.
 *
 * 순수 함수로 작성 — API 라우트(@/lib/db)와 스크립트(독립 PrismaClient) 양쪽에서 재사용.
 */

import { DIFFICULTY_LEGACY_MAP } from './constants';

/** 버킷 채택 최소 표본 수 */
export const CALIBRATION_MIN_SAMPLES = 5;
/** 버킷 방향 일관성 임계 (같은 부호 비율) */
export const CALIBRATION_CONSISTENCY = 0.7;

/** 난이도 키(신/구) → 1~5 정수. 인식 불가 시 0 */
export function toLevel(raw: unknown): number {
  if (raw == null) return 0;
  const key = String(raw);
  const norm = DIFFICULTY_LEGACY_MAP[key] || key;
  const n = parseInt(norm, 10);
  return n >= 1 && n <= 5 ? n : 0;
}

export interface CalibrationPair {
  aiLevel: number;        // 1~5
  teacherLevel: number;   // 1~5
  delta: number;          // teacher − ai
  questionType: string;   // number|algebra|function|geometry|statistics|unknown
  grade: string | null;
}

/** 분석본 1건의 최소 형태 (questions JSON + 맥락) */
export interface AnalysisLike {
  questions: unknown;
  grade?: string | null;
}

/**
 * 분석본 배열에서 (AI값 → 교정값) 쌍 추출.
 * 조건: manually_edited && ai_difficulty 존재 && ai_level ≠ teacher_level (둘 다 1~5 인식).
 */
export function extractPairs(analyses: readonly AnalysisLike[]): CalibrationPair[] {
  const pairs: CalibrationPair[] = [];
  for (const a of analyses) {
    const qs = Array.isArray(a.questions) ? a.questions : [];
    for (const raw of qs) {
      const q = raw as Record<string, unknown>;
      if (q.ai_difficulty == null) continue; // 교정 안 된 문항
      const aiLevel = toLevel(q.ai_difficulty);
      const teacherLevel = toLevel(q.difficulty);
      if (!aiLevel || !teacherLevel || aiLevel === teacherLevel) continue;
      pairs.push({
        aiLevel,
        teacherLevel,
        delta: teacherLevel - aiLevel,
        questionType: typeof q.question_type === 'string' ? q.question_type : 'unknown',
        grade: a.grade ?? null,
      });
    }
  }
  return pairs;
}

export interface BucketStat {
  key: string;            // `${questionType}:${aiLevel}`
  questionType: string;
  aiLevel: number;
  sampleCount: number;
  meanDelta: number;      // 평균 (teacher − ai)
  consistent: boolean;    // 방향 일관성 통과
  applied: boolean;       // 표본 + 일관성 게이트 통과 → 보정 적용 대상
}

export interface CalibrationStats {
  totalCorrections: number;
  totalAnalyzedQuestions: number;
  correctionRate: number;            // 교정 비율 = corrections / analyzed
  globalBias: number;                // 전역 평균 Δ
  perAiLevel: Record<number, { count: number; meanDelta: number }>;
  byQuestionType: Record<string, { count: number; meanDelta: number }>;
  buckets: BucketStat[];
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

/** 같은 부호 비율 (0 제외) */
function consistency(deltas: number[]): number {
  const nonZero = deltas.filter((d) => d !== 0);
  if (!nonZero.length) return 0;
  const pos = nonZero.filter((d) => d > 0).length;
  const neg = nonZero.length - pos;
  return Math.max(pos, neg) / nonZero.length;
}

/**
 * 쌍 배열 → 보정 통계.
 * @param totalAnalyzedQuestions 전체 분석 문항 수(교정 비율 분모). 없으면 0.
 */
export function computeStats(
  pairs: readonly CalibrationPair[],
  totalAnalyzedQuestions = 0,
): CalibrationStats {
  const deltas = pairs.map((p) => p.delta);
  const globalBias = mean(deltas);

  // per ai-level
  const perAiLevel: Record<number, { count: number; meanDelta: number }> = {};
  for (let lv = 1; lv <= 5; lv++) {
    const sub = pairs.filter((p) => p.aiLevel === lv).map((p) => p.delta);
    if (sub.length) perAiLevel[lv] = { count: sub.length, meanDelta: mean(sub) };
  }

  // by question type
  const byQuestionType: Record<string, { count: number; meanDelta: number }> = {};
  for (const p of pairs) {
    (byQuestionType[p.questionType] ??= { count: 0, meanDelta: 0 });
  }
  for (const type of Object.keys(byQuestionType)) {
    const sub = pairs.filter((p) => p.questionType === type).map((p) => p.delta);
    byQuestionType[type] = { count: sub.length, meanDelta: mean(sub) };
  }

  // buckets: question_type × ai_level
  const bucketMap = new Map<string, CalibrationPair[]>();
  for (const p of pairs) {
    const key = `${p.questionType}:${p.aiLevel}`;
    (bucketMap.get(key) ?? bucketMap.set(key, []).get(key)!).push(p);
  }
  const buckets: BucketStat[] = [];
  for (const [key, ps] of bucketMap) {
    const ds = ps.map((p) => p.delta);
    const md = mean(ds);
    const cons = consistency(ds) >= CALIBRATION_CONSISTENCY;
    const applied = ps.length >= CALIBRATION_MIN_SAMPLES && cons && Math.abs(md) >= 0.5;
    buckets.push({
      key,
      questionType: ps[0].questionType,
      aiLevel: ps[0].aiLevel,
      sampleCount: ps.length,
      meanDelta: md,
      consistent: cons,
      applied,
    });
  }
  buckets.sort((a, b) => b.sampleCount - a.sampleCount);

  return {
    totalCorrections: pairs.length,
    totalAnalyzedQuestions,
    correctionRate: totalAnalyzedQuestions ? pairs.length / totalAnalyzedQuestions : 0,
    globalBias,
    perAiLevel,
    byQuestionType,
    buckets,
  };
}

/** 적용용 보정 맵 — 새 분석 후처리(ai-engine)에서 사용 */
export interface CalibrationMap {
  globalBias: number;                 // 게이트 통과한 전역 편향 (표본 부족 버킷 폴백)
  bucketShifts: Record<string, number>; // `${type}:${aiLevel}` → 적용 Δ
  generatedAt: string;
  totalCorrections: number;
}

/**
 * 통계 → 적용 맵. 게이트 통과한 버킷만 bucketShifts 에 담고,
 * 전역 편향은 표본이 충분(>= MIN_SAMPLES)할 때만 폴백으로 채택.
 * @param generatedAt 호출부에서 주입(스크립트/순수성 위해)
 */
export function buildCalibrationMap(stats: CalibrationStats, generatedAt: string): CalibrationMap {
  const bucketShifts: Record<string, number> = {};
  for (const b of stats.buckets) {
    if (b.applied) bucketShifts[b.key] = round1(b.meanDelta);
  }
  const globalBias = stats.totalCorrections >= CALIBRATION_MIN_SAMPLES ? round1(stats.globalBias) : 0;
  return { globalBias, bucketShifts, generatedAt, totalCorrections: stats.totalCorrections };
}

/**
 * 보정 맵을 단일 문항 AI 난이도에 적용 → 보정된 정수 레벨(1~5) 문자열.
 * 버킷 보정 우선, 없으면 전역 편향 폴백. 과보정 방지를 위해 ±maxShift 로 캡.
 */
export function applyCalibration(
  aiDifficulty: string,
  questionType: string,
  map: CalibrationMap | null,
  maxShift = 1.5,
): string {
  const aiLevel = toLevel(aiDifficulty);
  if (!aiLevel || !map) return aiDifficulty;
  const bucketKey = `${questionType}:${aiLevel}`;
  const shift = map.bucketShifts[bucketKey] ?? map.globalBias ?? 0;
  if (!shift) return aiDifficulty;
  const capped = Math.max(-maxShift, Math.min(maxShift, shift));
  const calibrated = Math.max(1, Math.min(5, Math.round(aiLevel + capped)));
  return String(calibrated);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** 보정 행 1건 raw 형태 */
interface CalibrationRow {
  globalBias: number;
  bucketShifts: unknown;
  totalCorrections: number;
  updatedAt: Date | string;
}

/** DifficultyCalibration.findUnique 만 요구하는 최소 클라이언트 (prisma 직접 import 회피 → 스크립트 재사용) */
interface CalibrationDb {
  difficultyCalibration: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: (args: any) => PromiseLike<unknown>;
  };
}

/** 저장된 적용용 보정 맵 로드 (없으면 null → 보정 미적용) */
export async function loadCalibrationMap(
  db: CalibrationDb,
  subject = 'MATH',
): Promise<CalibrationMap | null> {
  const row = (await db.difficultyCalibration.findUnique({ where: { subject } })) as CalibrationRow | null;
  if (!row) return null;
  const bucketShifts =
    row.bucketShifts && typeof row.bucketShifts === 'object'
      ? (row.bucketShifts as Record<string, number>)
      : {};
  return {
    globalBias: row.globalBias ?? 0,
    bucketShifts,
    generatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? ''),
    totalCorrections: row.totalCorrections ?? 0,
  };
}
