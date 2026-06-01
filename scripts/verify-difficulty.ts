/**
 * 종합 난이도 검증 — 실제 production 함수(weightedAverageDifficulty)를 DB 데이터에 직접 호출.
 * 실행: node --env-file=.env.local --import tsx scripts/verify-difficulty.ts
 */
import { PrismaClient } from '@prisma/client';
import { weightedAverageDifficulty } from '../src/lib/exam-analysis/difficulty';
import type { AnalyzedQuestion } from '../src/lib/exam-analysis/types';

const LABELS = ['기본', '표준', '응용', '심화', '최고난도'];
const LEVEL_MAP: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, concept: 1, pattern: 2, reasoning: 4, creative: 5 };

async function main() {
  const prisma = new PrismaClient();
  const analyses = await prisma.examAnalysis.findMany({
    select: { questions: true, examPaper: { select: { schoolName: true, grade: true } } },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n── 실제 함수(weightedAverageDifficulty) 호출 결과 ──');
  for (const a of analyses) {
    const qs = Array.isArray(a.questions) ? (a.questions as unknown as AnalyzedQuestion[]) : [];
    if (!qs.length) continue;
    const hist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const q of qs) { const L = LEVEL_MAP[String(q.difficulty)] ?? 0; if (L) hist[L]++; }
    const dist = [1, 2, 3, 4, 5].map((l) => hist[l]).join('/');
    const w = weightedAverageDifficulty(qs);
    const label = LABELS[Math.max(0, Math.min(4, Math.round(w.avg) - 1))];
    console.log(`  ${(a.examPaper?.schoolName ?? '?').padEnd(14)} ${(a.examPaper?.grade ?? '?').padEnd(4)} 분포 ${dist}  →  종합 ${w.avg.toFixed(3)}  ${label}(${Math.round(w.avg)})  [배점가중 ${w.usedPoints}]`);
  }
  console.log('  (기대: 능인고 3/6/7/4/1 → 3.46, 중3 0/9/8/4/0 → 3.39, 중2 2/7/9/4/0 → 3.28)\n');
  await prisma.$disconnect();
}

main();
