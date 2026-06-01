/**
 * 레벨별 명시 가중치(importance weight) vs 지수 k — 종합 난이도 비교.
 * 목표: 분포 3/6/7/4/1 (능인고, 산술평균 2.71)이 ~3.5로 읽히게 하는 가중표 탐색.
 *
 * 제안 공식(명시 가중): agg = Σ(imp[L]·points·L) / Σ(imp[L]·points)
 *   - imp[L]: 레벨별 '영향력' 배수. 고난도일수록 크게 → 킬러가 종합을 끌어올림.
 *   - 배점(points)과 곱해 기존 배점가중도 보존. 1~5 스케일 유지(최대=5).
 *
 * 실행: node --env-file=.env.local scripts/measure-difficulty-weighting.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const LEVEL_MAP = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, concept: 1, pattern: 2, reasoning: 4, creative: 5 };
const LABELS = ['기본', '표준', '응용', '심화', '최고'];

// ── 명시 가중표 후보 (레벨별 영향력 배수) ──
const WEIGHT_TABLES = {
  'C 강함 1/1/2/5/10':    { 1: 1, 2: 1, 3: 2, 4: 5, 5: 10 },
  'E 1/1/2/6/12':        { 1: 1, 2: 1, 3: 2, 4: 6, 5: 12 },
  'F 1/1/2/7/14':        { 1: 1, 2: 1, 3: 2, 4: 7, 5: 14 },
  'G 1/1.5/3/7/14':      { 1: 1, 2: 1.5, 3: 3, 4: 7, 5: 14 },
  'H 1/2/4/9/18':        { 1: 1, 2: 2, 3: 4, 4: 9, 5: 18 },
};

function powerMean(qs, k) {
  let sLP = 0, sP = 0, sL = 0, n = 0;
  for (const q of qs) {
    const L = LEVEL_MAP[String(q.difficulty)] ?? 0; if (!L) continue;
    const p = Number(q.points) || 0;
    sLP += Math.pow(L, k) * p; sP += p; sL += Math.pow(L, k); n++;
  }
  if (!n) return null;
  return sP > 0 ? Math.pow(sLP / sP, 1 / k) : Math.pow(sL / n, 1 / k);
}
function impMean(qs, imp) {
  let num = 0, den = 0, numNoP = 0, denNoP = 0, n = 0;
  for (const q of qs) {
    const L = LEVEL_MAP[String(q.difficulty)] ?? 0; if (!L) continue;
    const p = Number(q.points) || 0; const w = imp[L] ?? 1;
    num += w * p * L; den += w * p; numNoP += w * L; denNoP += w; n++;
  }
  if (!n) return null;
  return den > 0 ? num / den : numNoP / denNoP;
}

const analyses = await prisma.examAnalysis.findMany({
  select: { questions: true, examPaper: { select: { schoolName: true, grade: true } } },
  orderBy: { createdAt: 'desc' },
});

const exams = analyses
  .map(a => ({ name: `${a.examPaper?.schoolName ?? '?'} ${a.examPaper?.grade ?? ''}`, qs: Array.isArray(a.questions) ? a.questions : [] }))
  .filter(e => e.qs.length);

const fmt = (v) => v == null ? '  -  ' : `${v.toFixed(2)} ${LABELS[Math.max(0, Math.min(4, Math.round(v) - 1))]}`;

console.log('\n══════════ 시험별 종합 난이도 — 방식 비교 ══════════\n');
for (const e of exams) {
  // 분포
  const hist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const q of e.qs) { const L = LEVEL_MAP[String(q.difficulty)] ?? 0; if (L) hist[L]++; }
  const distStr = [1, 2, 3, 4, 5].map(l => hist[l]).join('/');
  console.log(`▶ ${e.name}  (${e.qs.length}문항, 분포 ${distStr})`);
  const arith = powerMean(e.qs, 1);
  console.log(`   산술평균(k1)=${fmt(arith)}   현재 k4=${fmt(powerMean(e.qs, 4))}   k6=${fmt(powerMean(e.qs, 6))}`);
  for (const [name, imp] of Object.entries(WEIGHT_TABLES)) {
    console.log(`   명시가중 [${name}] = ${fmt(impMean(e.qs, imp))}`);
  }
  console.log('');
}

console.log('목표: 분포 3/6/7/4/1 시험이 ~3.5.  쉬운 시험은 낮게 유지(분별력) 확인.\n');
await prisma.$disconnect();
