/**
 * 통합 메타데이터 보정 엔진 — 자가진화 플라이휠의 핵심.
 *
 * 선생님이 문항 메타데이터를 교정하면 questions[i] 에 ai_<field>(원본)+<field>(교정값)가 남는다.
 * 이 (AI값 → 정답값) 쌍을 플랫폼 전역(테넌트 무관, 전국 절대 기준)으로 집계:
 *   - 수치형(difficulty/points): 버킷별 평균 Δ → 새 분석에 가산 보정.
 *   - 범주형(topic/type/ability): 혼동맵 {AI값:{정답값:count}} → ① 프롬프트 경고 ② 초고신뢰 remap.
 *
 * 순수 함수 — API 라우트(@/lib/db)와 스크립트(독립 PrismaClient) 양쪽에서 재사용.
 * 난이도 공개 함수(extractPairs/computeStats/buildCalibrationMap/applyCalibration)는
 * 제네릭 코어 위에 재구성된 back-compat 래퍼 — 동작 보존.
 */

import { DIFFICULTY_LEGACY_MAP } from './constants';

/** 버킷 채택 최소 표본 수 */
export const CALIBRATION_MIN_SAMPLES = 5;
/** 버킷 방향 일관성 임계 (같은 부호 비율) */
export const CALIBRATION_CONSISTENCY = 0.7;
/** 범주형 remap 채택 임계 (지배 정답 비율) — 보수적 */
export const CONFUSION_REMAP_DOMINANCE = 0.8;
export const CONFUSION_REMAP_MIN_SAMPLES = 10;

/** 난이도 키(신/구) → 1~5 정수. 인식 불가 시 0 */
export function toLevel(raw: unknown): number {
  if (raw == null) return 0;
  const key = String(raw);
  const norm = DIFFICULTY_LEGACY_MAP[key] || key;
  const n = parseInt(norm, 10);
  return n >= 1 && n <= 5 ? n : 0;
}

/** 분석본 1건의 최소 형태 (questions JSON + 맥락) */
export interface AnalysisLike {
  questions: unknown;
  grade?: string | null;
}

type QRec = Record<string, unknown>;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}
function consistency(deltas: number[]): number {
  const nonZero = deltas.filter((d) => d !== 0);
  if (!nonZero.length) return 0;
  const pos = nonZero.filter((d) => d > 0).length;
  return Math.max(pos, nonZero.length - pos) / nonZero.length;
}
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

// ══════════════════════════════════════════════════════════════
// 필드 설정 (FIELD_CONFIG)
// ══════════════════════════════════════════════════════════════

export interface NumericFieldConfig {
  field: string;
  kind: 'numeric';
  aiKey: string;
  valueKey: string;
  toNum: (raw: unknown) => number;
  valid: (n: number) => boolean;
  bucketOfPair: (q: QRec) => string;        // 추출 시 버킷 (ai_* 기준)
  bucketOfFresh: (q: QRec, aiNum: number) => string; // 적용 시 버킷 (신규 AI값 기준)
  maxShift: number;
  minAbsDelta: number;
  clamp: [number, number];
  roundOut: (n: number) => number;
  format: (n: number) => string | number;   // 저장 포맷 (difficulty→string, points→number)
}

export interface CategoricalFieldConfig {
  field: string;
  kind: 'categorical';
  aiKey: string;
  valueKey: string;
  ko: string; // 표시 라벨
}

export const NUMERIC_FIELDS: NumericFieldConfig[] = [
  {
    field: 'difficulty',
    kind: 'numeric',
    aiKey: 'ai_difficulty',
    valueKey: 'difficulty',
    toNum: toLevel,
    valid: (n) => n >= 1 && n <= 5,
    bucketOfPair: (q) => `${typeof q.question_type === 'string' ? q.question_type : 'unknown'}:${toLevel(q.ai_difficulty)}`,
    bucketOfFresh: (q, ai) => `${typeof q.question_type === 'string' ? q.question_type : 'unknown'}:${ai}`,
    maxShift: 1.5,
    minAbsDelta: 0.5,
    clamp: [1, 5],
    roundOut: Math.round,
    format: (n) => String(n),
  },
  {
    field: 'points',
    kind: 'numeric',
    aiKey: 'ai_points',
    valueKey: 'points',
    toNum: (r) => Number(r),
    valid: (n) => Number.isFinite(n) && n > 0 && n <= 100,
    bucketOfPair: (q) => String(q.question_format || 'unknown'),
    bucketOfFresh: (q) => String(q.question_format || 'unknown'),
    maxShift: 5,
    minAbsDelta: 1,
    clamp: [0.5, 100],
    roundOut: (n) => Math.round(n * 2) / 2, // 0.5 단위
    format: (n) => n,
  },
];

export const CATEGORICAL_FIELDS: CategoricalFieldConfig[] = [
  { field: 'topic', kind: 'categorical', aiKey: 'ai_topic', valueKey: 'topic', ko: '단원' },
  { field: 'question_type', kind: 'categorical', aiKey: 'ai_question_type', valueKey: 'question_type', ko: '유형' },
  { field: 'ability_domain', kind: 'categorical', aiKey: 'ai_ability_domain', valueKey: 'ability_domain', ko: '능력' },
];

export function getNumericConfig(field: string): NumericFieldConfig | undefined {
  return NUMERIC_FIELDS.find((c) => c.field === field);
}

// ══════════════════════════════════════════════════════════════
// 수치형 (numeric) 코어
// ══════════════════════════════════════════════════════════════

export interface NumericPair { ai: number; teacher: number; delta: number; bucket: string }
export interface NumericBucket { bucket: string; sampleCount: number; meanDelta: number; consistent: boolean; applied: boolean }
export interface NumericStats {
  field: string;
  totalCorrections: number;
  totalAnalyzedQuestions: number;
  correctionRate: number;
  globalBias: number;
  buckets: NumericBucket[];
}
export interface NumericMap {
  field: string;
  kind: 'numeric';
  globalBias: number;
  bucketShifts: Record<string, number>;
  generatedAt: string;
  totalCorrections: number;
}

export function extractNumericPairs(analyses: readonly AnalysisLike[], cfg: NumericFieldConfig): NumericPair[] {
  const pairs: NumericPair[] = [];
  for (const a of analyses) {
    const qs = Array.isArray(a.questions) ? a.questions : [];
    for (const raw of qs) {
      const q = raw as QRec;
      if (q[cfg.aiKey] == null) continue;
      const ai = cfg.toNum(q[cfg.aiKey]);
      const teacher = cfg.toNum(q[cfg.valueKey]);
      if (!cfg.valid(ai) || !cfg.valid(teacher) || ai === teacher) continue;
      pairs.push({ ai, teacher, delta: teacher - ai, bucket: cfg.bucketOfPair(q) });
    }
  }
  return pairs;
}

export function computeNumericStats(pairs: readonly NumericPair[], cfg: NumericFieldConfig, totalAnalyzedQuestions = 0): NumericStats {
  const globalBias = mean(pairs.map((p) => p.delta));
  const byBucket = new Map<string, NumericPair[]>();
  for (const p of pairs) {
    const arr = byBucket.get(p.bucket) ?? byBucket.set(p.bucket, []).get(p.bucket)!;
    arr.push(p);
  }
  const buckets: NumericBucket[] = [];
  for (const [bucket, ps] of byBucket) {
    const ds = ps.map((p) => p.delta);
    const md = mean(ds);
    const cons = consistency(ds) >= CALIBRATION_CONSISTENCY;
    buckets.push({
      bucket,
      sampleCount: ps.length,
      meanDelta: md,
      consistent: cons,
      applied: ps.length >= CALIBRATION_MIN_SAMPLES && cons && Math.abs(md) >= cfg.minAbsDelta,
    });
  }
  buckets.sort((a, b) => b.sampleCount - a.sampleCount);
  return {
    field: cfg.field,
    totalCorrections: pairs.length,
    totalAnalyzedQuestions,
    correctionRate: totalAnalyzedQuestions ? pairs.length / totalAnalyzedQuestions : 0,
    globalBias,
    buckets,
  };
}

export function buildNumericMap(stats: NumericStats, generatedAt: string): NumericMap {
  const bucketShifts: Record<string, number> = {};
  for (const b of stats.buckets) if (b.applied) bucketShifts[b.bucket] = round1(b.meanDelta);
  const globalBias = stats.totalCorrections >= CALIBRATION_MIN_SAMPLES ? round1(stats.globalBias) : 0;
  return { field: stats.field, kind: 'numeric', globalBias, bucketShifts, generatedAt, totalCorrections: stats.totalCorrections };
}

/** 단일 문항에 수치 보정 적용 → 변경 시 새 값(포맷), 미변경 시 null */
export function applyNumericField(q: QRec, cfg: NumericFieldConfig, map: NumericMap | null): string | number | null {
  if (!map) return null;
  const ai = cfg.toNum(q[cfg.valueKey]);
  if (!cfg.valid(ai)) return null;
  const bucket = cfg.bucketOfFresh(q, ai);
  const shift = map.bucketShifts[bucket] ?? map.globalBias ?? 0;
  if (!shift) return null;
  const capped = Math.max(-cfg.maxShift, Math.min(cfg.maxShift, shift));
  let out = cfg.roundOut(ai + capped);
  out = Math.max(cfg.clamp[0], Math.min(cfg.clamp[1], out));
  const formatted = cfg.format(out);
  return String(formatted) === String(cfg.format(ai)) ? null : formatted;
}

// ══════════════════════════════════════════════════════════════
// 범주형 (categorical) 코어
// ══════════════════════════════════════════════════════════════

export interface ConfusionPair { ai: string; teacher: string }
/** 혼동맵: { AI값: { 정답값: count } } */
export type ConfusionMap = Record<string, Record<string, number>>;
export interface CategoricalStats {
  field: string;
  totalCorrections: number;
  groups: Array<{ ai: string; total: number; dominant: string; dominantFrac: number; corrections: Record<string, number> }>;
}
export interface CategoricalMapResult {
  field: string;
  kind: 'categorical';
  confusion: ConfusionMap;
  generatedAt: string;
  totalCorrections: number;
}

export function extractConfusionPairs(analyses: readonly AnalysisLike[], cfg: CategoricalFieldConfig): ConfusionPair[] {
  const pairs: ConfusionPair[] = [];
  for (const a of analyses) {
    const qs = Array.isArray(a.questions) ? a.questions : [];
    for (const raw of qs) {
      const q = raw as QRec;
      if (q[cfg.aiKey] == null) continue;
      const ai = String(q[cfg.aiKey] ?? '').trim();
      const teacher = String(q[cfg.valueKey] ?? '').trim();
      if (!ai || !teacher || ai === teacher) continue;
      pairs.push({ ai, teacher });
    }
  }
  return pairs;
}

export function buildConfusionMap(pairs: readonly ConfusionPair[]): ConfusionMap {
  const map: ConfusionMap = {};
  for (const p of pairs) {
    (map[p.ai] ??= {});
    map[p.ai][p.teacher] = (map[p.ai][p.teacher] ?? 0) + 1;
  }
  return map;
}

export function computeCategoricalStats(pairs: readonly ConfusionPair[], cfg: CategoricalFieldConfig): CategoricalStats {
  const map = buildConfusionMap(pairs);
  const groups = Object.entries(map).map(([ai, corrections]) => {
    const total = Object.values(corrections).reduce((s, n) => s + n, 0);
    const [dominant, domCount] = Object.entries(corrections).sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
    return { ai, total, dominant, dominantFrac: total ? domCount / total : 0, corrections };
  });
  groups.sort((a, b) => b.total - a.total);
  return { field: cfg.field, totalCorrections: pairs.length, groups };
}

/** 프롬프트용 few-shot 경고 문장 (표본 충분한 혼동만) */
export function buildCategoricalWarnings(stats: CategoricalStats, label: string): string[] {
  const out: string[] = [];
  for (const g of stats.groups) {
    if (g.total < CALIBRATION_MIN_SAMPLES) continue;
    const pct = Math.round(g.dominantFrac * 100);
    out.push(`AI가 ${label} "${g.ai}"로 분류한 문항 중 ${pct}%가 실제로 "${g.dominant}"로 교정됨 → 재검토 권장`);
  }
  return out;
}

/** 초고신뢰 remap (보수적): 지배 정답이 임계 이상이면 교정값 반환, 아니면 null */
export function applyCategoricalRemap(aiValue: string, confusion: ConfusionMap | null): string | null {
  if (!confusion || !aiValue) return null;
  const corrections = confusion[aiValue];
  if (!corrections) return null;
  const total = Object.values(corrections).reduce((s, n) => s + n, 0);
  if (total < CONFUSION_REMAP_MIN_SAMPLES) return null;
  const [dominant, domCount] = Object.entries(corrections).sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  if (!dominant || domCount / total < CONFUSION_REMAP_DOMINANCE) return null;
  return dominant;
}

// ══════════════════════════════════════════════════════════════
// 적용 맵 일괄 로드 (전 필드)
// ══════════════════════════════════════════════════════════════

export interface CalibrationSet {
  numeric: Record<string, NumericMap>;          // field → map
  categorical: Record<string, ConfusionMap>;    // field → confusion
}

interface CalibrationDb {
  metadataCalibration: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: (args?: any) => PromiseLike<any[]>;
  };
}

/** MetadataCalibration 전 행 → CalibrationSet */
export async function loadCalibrationSet(db: CalibrationDb, subject = 'MATH'): Promise<CalibrationSet> {
  const rows = (await db.metadataCalibration.findMany({ where: { subject } })) as Array<{
    field: string; kind: string; globalBias: number; bucketShifts: unknown; totalCorrections: number; updatedAt: Date | string;
  }>;
  const set: CalibrationSet = { numeric: {}, categorical: {} };
  for (const r of rows) {
    const bs = r.bucketShifts && typeof r.bucketShifts === 'object' ? r.bucketShifts : {};
    const at = r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt ?? '');
    if (r.kind === 'numeric') {
      set.numeric[r.field] = {
        field: r.field, kind: 'numeric',
        globalBias: r.globalBias ?? 0,
        bucketShifts: bs as Record<string, number>,
        generatedAt: at, totalCorrections: r.totalCorrections ?? 0,
      };
    } else {
      set.categorical[r.field] = bs as ConfusionMap;
    }
  }
  return set;
}

// ══════════════════════════════════════════════════════════════
// 난이도 back-compat (기존 소비자 — stats route / admin tab / evolution / analyze)
// 제네릭 numeric 코어 위에 재구성. 동작 보존(회귀 검증 대상).
// ══════════════════════════════════════════════════════════════

const DIFF_CFG = NUMERIC_FIELDS[0];

export interface CalibrationPair { aiLevel: number; teacherLevel: number; delta: number; questionType: string; grade: string | null }
export interface BucketStat { key: string; questionType: string; aiLevel: number; sampleCount: number; meanDelta: number; consistent: boolean; applied: boolean }
export interface CalibrationStats {
  totalCorrections: number; totalAnalyzedQuestions: number; correctionRate: number; globalBias: number;
  perAiLevel: Record<number, { count: number; meanDelta: number }>;
  byQuestionType: Record<string, { count: number; meanDelta: number }>;
  buckets: BucketStat[];
}
export interface CalibrationMap { globalBias: number; bucketShifts: Record<string, number>; generatedAt: string; totalCorrections: number }

/** 난이도 교정 쌍 추출 (back-compat) */
export function extractPairs(analyses: readonly AnalysisLike[]): CalibrationPair[] {
  const pairs: CalibrationPair[] = [];
  for (const a of analyses) {
    const qs = Array.isArray(a.questions) ? a.questions : [];
    for (const raw of qs) {
      const q = raw as QRec;
      if (q.ai_difficulty == null) continue;
      const aiLevel = toLevel(q.ai_difficulty);
      const teacherLevel = toLevel(q.difficulty);
      if (!aiLevel || !teacherLevel || aiLevel === teacherLevel) continue;
      pairs.push({
        aiLevel, teacherLevel, delta: teacherLevel - aiLevel,
        questionType: typeof q.question_type === 'string' ? q.question_type : 'unknown',
        grade: a.grade ?? null,
      });
    }
  }
  return pairs;
}

/** 난이도 통계 (back-compat, perAiLevel/byQuestionType 표시 extras 포함) */
export function computeStats(pairs: readonly CalibrationPair[], totalAnalyzedQuestions = 0): CalibrationStats {
  const globalBias = mean(pairs.map((p) => p.delta));
  const perAiLevel: Record<number, { count: number; meanDelta: number }> = {};
  for (let lv = 1; lv <= 5; lv++) {
    const sub = pairs.filter((p) => p.aiLevel === lv).map((p) => p.delta);
    if (sub.length) perAiLevel[lv] = { count: sub.length, meanDelta: mean(sub) };
  }
  const byQuestionType: Record<string, { count: number; meanDelta: number }> = {};
  for (const p of pairs) (byQuestionType[p.questionType] ??= { count: 0, meanDelta: 0 });
  for (const type of Object.keys(byQuestionType)) {
    const sub = pairs.filter((p) => p.questionType === type).map((p) => p.delta);
    byQuestionType[type] = { count: sub.length, meanDelta: mean(sub) };
  }
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
    buckets.push({
      key, questionType: ps[0].questionType, aiLevel: ps[0].aiLevel,
      sampleCount: ps.length, meanDelta: md, consistent: cons,
      applied: ps.length >= CALIBRATION_MIN_SAMPLES && cons && Math.abs(md) >= 0.5,
    });
  }
  buckets.sort((a, b) => b.sampleCount - a.sampleCount);
  return {
    totalCorrections: pairs.length, totalAnalyzedQuestions,
    correctionRate: totalAnalyzedQuestions ? pairs.length / totalAnalyzedQuestions : 0,
    globalBias, perAiLevel, byQuestionType, buckets,
  };
}

export function buildCalibrationMap(stats: CalibrationStats, generatedAt: string): CalibrationMap {
  const bucketShifts: Record<string, number> = {};
  for (const b of stats.buckets) if (b.applied) bucketShifts[b.key] = round1(b.meanDelta);
  const globalBias = stats.totalCorrections >= CALIBRATION_MIN_SAMPLES ? round1(stats.globalBias) : 0;
  return { globalBias, bucketShifts, generatedAt, totalCorrections: stats.totalCorrections };
}

/** 난이도 보정 적용 (back-compat) — 제네릭 applyNumericField 위임 */
export function applyCalibration(aiDifficulty: string, questionType: string, map: CalibrationMap | null, maxShift = 1.5): string {
  const aiLevel = toLevel(aiDifficulty);
  if (!aiLevel || !map) return aiDifficulty;
  const bucketKey = `${questionType}:${aiLevel}`;
  const shift = map.bucketShifts[bucketKey] ?? map.globalBias ?? 0;
  if (!shift) return aiDifficulty;
  const capped = Math.max(-maxShift, Math.min(maxShift, shift));
  return String(Math.max(1, Math.min(5, Math.round(aiLevel + capped))));
}

/** 난이도 보정 맵 로드 (back-compat) — MetadataCalibration(field='difficulty') */
export async function loadCalibrationMap(db: CalibrationDb, subject = 'MATH'): Promise<CalibrationMap | null> {
  const set = await loadCalibrationSet(db, subject);
  const m = set.numeric[DIFF_CFG.field];
  if (!m) return null;
  return { globalBias: m.globalBias, bucketShifts: m.bucketShifts, generatedAt: m.generatedAt, totalCorrections: m.totalCorrections };
}
