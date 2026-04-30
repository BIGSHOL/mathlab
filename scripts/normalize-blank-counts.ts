/**
 * 기존 BlankExercise를 difficulty별 max 10 표준으로 정규화.
 *
 * 알고리즘:
 *   1. blanks를 difficulty별로 분리 (easy/hard/full/both/기타)
 *   2. 각 difficulty 내에서 position 오름차순으로 앞 10개만 유지
 *      (같은 answer가 여러 번 나오는 경우도 그대로 유지 — 학습 반복 효과 보전)
 *   3. 잘린 빈칸의 {{N}} 마커는 templateText에서 해당 answer로 치환
 *   4. blanks 배열에서 잘린 항목 제거 (position 재할당 없음 — GET 라우트와 호환)
 *
 * 사용:
 *   # dry-run (변경 통계만 출력)
 *   npx --yes dotenv-cli -e D:/mathlab/.env -- npx tsx scripts/normalize-blank-counts.ts
 *
 *   # 실제 DB 적용
 *   npx --yes dotenv-cli -e D:/mathlab/.env -- npx tsx scripts/normalize-blank-counts.ts --apply
 */
import { prisma } from '../src/lib/db';

const MAX_PER_DIFFICULTY = 10;
const APPLY = process.argv.includes('--apply');

interface Blank {
  position: number;
  answer: string;
  hint?: string;
  difficulty?: string;
}

interface NormalizeResult {
  exerciseId: string;
  conceptTitle: string;
  before: { easy: number; hard: number; full: number; both: number; other: number };
  after: { easy: number; hard: number; full: number; both: number; other: number };
  removedCount: number;
  changed: boolean;
}

/** difficulty key 정규화 */
function diffKey(d: string | undefined): 'easy' | 'hard' | 'full' | 'both' | 'other' {
  const s = (d ?? 'easy').toLowerCase();
  if (s === 'easy' || s === 'hard' || s === 'full' || s === 'both') return s;
  return 'other';
}

/** 한 BlankExercise를 정규화 */
function normalize(blanks: Blank[], templateText: string) {
  const buckets: Record<string, Blank[]> = { easy: [], hard: [], full: [], both: [], other: [] };
  for (const b of blanks) buckets[diffKey(b.difficulty)].push(b);

  const kept: Blank[] = [];
  for (const key of ['easy', 'hard', 'full', 'both', 'other'] as const) {
    const list = buckets[key];
    if (list.length === 0) continue;

    // position 오름차순 정렬 후 앞 max개만 유지 (본문 앞쪽 빈칸 우선)
    // dedupe 안 함 — 같은 단어가 여러 번 나오는 학습 반복 효과 보전
    const sorted = [...list].sort((a, b) => a.position - b.position);
    kept.push(...sorted.slice(0, MAX_PER_DIFFICULTY));
  }

  // 잘린 position 식별
  const keptPositions = new Set(kept.map((b) => b.position));
  const removed = blanks.filter((b) => !keptPositions.has(b.position));

  // templateText 갱신: 잘린 {{N}} → answer
  let newTemplate = templateText;
  if (removed.length > 0) {
    const lookup = new Map(removed.map((b) => [b.position, b.answer] as const));
    newTemplate = templateText.replace(/\{\{(\d+)\}\}/g, (m, n) => {
      const pos = parseInt(n, 10);
      if (lookup.has(pos)) return lookup.get(pos)!;
      return m;
    });
  }

  // 출력은 다시 position 오름차순으로 정렬 (UI 일관성)
  kept.sort((a, b) => a.position - b.position);

  return { kept, removed, newTemplate };
}

function countByDiff(blanks: Blank[]) {
  const counts = { easy: 0, hard: 0, full: 0, both: 0, other: 0 };
  for (const b of blanks) counts[diffKey(b.difficulty)]++;
  return counts;
}

const avg = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);

async function main() {
  console.log(`=== BlankExercise 정규화  ${APPLY ? '【APPLY 모드】' : '【DRY-RUN】'} ===`);
  console.log(`difficulty별 max ${MAX_PER_DIFFICULTY}개, 같은 answer dedupe`);

  const exercises = await prisma.blankExercise.findMany({
    select: {
      id: true,
      conceptId: true,
      blanks: true,
      templateText: true,
      concept: { select: { title: true, grade: true } },
    },
  });

  console.log(`\n총 BlankExercise: ${exercises.length}개\n`);

  const results: NormalizeResult[] = [];
  let totalRemoved = 0;
  let changedCount = 0;

  for (const ex of exercises) {
    const blanks = ex.blanks as unknown as Blank[];
    if (!Array.isArray(blanks) || blanks.length === 0) continue;

    const before = countByDiff(blanks);
    const { kept, removed, newTemplate } = normalize(blanks, ex.templateText);
    const after = countByDiff(kept);
    const changed = removed.length > 0;

    results.push({
      exerciseId: ex.id,
      conceptTitle: ex.concept?.title ?? '(제목 없음)',
      before,
      after,
      removedCount: removed.length,
      changed,
    });

    totalRemoved += removed.length;
    if (changed) changedCount++;

    if (APPLY && changed) {
      await prisma.blankExercise.update({
        where: { id: ex.id },
        data: {
          blanks: kept as unknown as object,
          templateText: newTemplate,
        },
      });
    }
  }

  // 요약
  console.log(`변경 대상 exercise: ${changedCount}개 / ${results.length}개`);
  console.log(`총 제거 빈칸: ${totalRemoved}개`);

  // 단계별 평균 (정규화 후)
  const stage1After: number[] = [];
  const stage2After: number[] = [];
  const stage3After: number[] = [];
  for (const r of results) {
    const e = r.after.easy + r.after.both;
    const h = r.after.hard;
    const f = r.after.full;
    stage1After.push(e);
    stage2After.push(e + h);
    stage3After.push(e + h + f);
  }

  const stdev = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const m = avg(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
  };

  console.log('\n정규화 후 단계별 평균/표준편차 (목표 8/16/24, max 10/20/30):');
  console.log(`  1단계 BLANK_EASY : 평균 ${avg(stage1After).toFixed(2)}  σ ${stdev(stage1After).toFixed(2)}  max ${Math.max(...stage1After)}`);
  console.log(`  2단계 BLANK_HARD : 평균 ${avg(stage2After).toFixed(2)}  σ ${stdev(stage2After).toFixed(2)}  max ${Math.max(...stage2After)}`);
  console.log(`  3단계 BLANK_FULL : 평균 ${avg(stage3After).toFixed(2)}  σ ${stdev(stage3After).toFixed(2)}  max ${Math.max(...stage3After)}`);

  // 가장 많이 잘린 상위 10개 표본
  const topChanged = [...results]
    .filter((r) => r.changed)
    .sort((a, b) => b.removedCount - a.removedCount)
    .slice(0, 10);

  if (topChanged.length > 0) {
    console.log('\n가장 많이 잘린 상위 10개:');
    for (const r of topChanged) {
      const b = r.before;
      const a = r.after;
      console.log(`  -${String(r.removedCount).padStart(3)}  ${r.conceptTitle}`);
      console.log(`         easy ${b.easy}→${a.easy}  hard ${b.hard}→${a.hard}  full ${b.full}→${a.full}` + (b.both > 0 ? `  both ${b.both}→${a.both}` : ''));
    }
  }

  if (!APPLY) {
    console.log('\n💡 실제 적용하려면 --apply 플래그를 추가하여 재실행하세요.');
  } else {
    console.log('\n✅ DB 적용 완료.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
