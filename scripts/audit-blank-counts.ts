/**
 * 개념 빈칸 단계별 평균 개수 분석 (read-only).
 *
 * 5단계 학습 중 빈칸 단계는 같은 BlankExercise의 per-blank `difficulty`로 필터링됨:
 *   - 1단계 BLANK_EASY: difficulty `easy` + `both`
 *   - 2단계 BLANK_HARD: difficulty `easy` + `hard` + `both`
 *   - 3단계 BLANK_FULL: 모든 difficulty (easy + hard + full + both)
 *
 * (BLANK_PAGE 백지복원은 빈칸 개수가 아니라 전체 본문이라 제외)
 *
 * 사용:
 *   npx dotenv-cli -e D:/mathlab/.env -- npx tsx scripts/audit-blank-counts.ts
 */
import { prisma } from '../src/lib/db';

interface Blank {
  position: number;
  answer: string;
  hint?: string;
  difficulty?: string;
}

type Bucket = 'elementary' | 'middle' | 'high' | 'unknown';

function bucketOf(grade: string | null | undefined): Bucket {
  if (!grade) return 'unknown';
  if (grade.startsWith('elementary')) return 'elementary';
  if (grade.startsWith('middle')) return 'middle';
  if (grade.startsWith('high')) return 'high';
  return 'unknown';
}

interface Stats {
  count: number;
  easy: number[];
  hard: number[];
  full: number[];
  both: number[];
  other: number[];
  stage1: number[]; // easy + both
  stage2: number[]; // easy + hard + both
  stage3: number[]; // 전부
}

const empty = (): Stats => ({
  count: 0,
  easy: [], hard: [], full: [], both: [], other: [],
  stage1: [], stage2: [], stage3: [],
});

const avg = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

const median = (arr: number[]) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
};

const minOf = (arr: number[]) => (arr.length === 0 ? 0 : Math.min(...arr));
const maxOf = (arr: number[]) => (arr.length === 0 ? 0 : Math.max(...arr));

function summarize(name: string, s: Stats): void {
  if (s.count === 0) {
    console.log(`\n[${name}] 데이터 없음`);
    return;
  }
  console.log(`\n[${name}]  BlankExercise ${s.count}개`);
  console.log('  ─ difficulty별 평균/중앙값/범위');
  console.log(`     easy : 평균 ${avg(s.easy).toFixed(2)}개  중앙값 ${median(s.easy)}  범위 ${minOf(s.easy)}~${maxOf(s.easy)}`);
  console.log(`     hard : 평균 ${avg(s.hard).toFixed(2)}개  중앙값 ${median(s.hard)}  범위 ${minOf(s.hard)}~${maxOf(s.hard)}`);
  console.log(`     full : 평균 ${avg(s.full).toFixed(2)}개  중앙값 ${median(s.full)}  범위 ${minOf(s.full)}~${maxOf(s.full)}`);
  const totalBoth = s.both.reduce((a, b) => a + b, 0);
  const totalOther = s.other.reduce((a, b) => a + b, 0);
  if (totalBoth > 0) {
    console.log(`     both : 평균 ${avg(s.both).toFixed(2)}개  중앙값 ${median(s.both)}  (총 ${totalBoth})`);
  }
  if (totalOther > 0) {
    console.log(`     기타 : 총 ${totalOther}  ⚠️  difficulty 값 비표준`);
  }
  console.log('  ─ 단계별 평균 (학생이 실제 푸는 빈칸 수)');
  console.log(`     1단계 BLANK_EASY (easy+both)        : 평균 ${avg(s.stage1).toFixed(2)}개  중앙값 ${median(s.stage1)}  범위 ${minOf(s.stage1)}~${maxOf(s.stage1)}`);
  console.log(`     2단계 BLANK_HARD (+hard)            : 평균 ${avg(s.stage2).toFixed(2)}개  중앙값 ${median(s.stage2)}  범위 ${minOf(s.stage2)}~${maxOf(s.stage2)}`);
  console.log(`     3단계 BLANK_FULL (+full, 통문장)    : 평균 ${avg(s.stage3).toFixed(2)}개  중앙값 ${median(s.stage3)}  범위 ${minOf(s.stage3)}~${maxOf(s.stage3)}`);
  const zero1 = s.stage1.filter((x) => x === 0).length;
  const zero3 = s.stage3.filter((x) => x === 0).length;
  if (zero1 > 0) {
    console.log(`     ⚠️  1단계 빈칸 0개 개념: ${zero1}개 (${((zero1 / s.count) * 100).toFixed(1)}%)`);
  }
  if (zero3 > 0) {
    console.log(`     ⚠️  통문장 빈칸 0개 개념: ${zero3}개 (${((zero3 / s.count) * 100).toFixed(1)}%)`);
  }
}

async function main(): Promise<void> {
  const exercises = await prisma.blankExercise.findMany({
    select: {
      id: true,
      conceptId: true,
      blanks: true,
      concept: { select: { grade: true, title: true } },
    },
  });

  const conceptCount = await prisma.concept.count();
  const uniqueConceptInExercises = new Set(exercises.map((e) => e.conceptId)).size;

  console.log('=== 개념 빈칸 단계별 평균 개수 ===');
  console.log(`Concept 전체            : ${conceptCount}개`);
  console.log(`BlankExercise 보유 개념 : ${uniqueConceptInExercises}개  (커버리지 ${((uniqueConceptInExercises / conceptCount) * 100).toFixed(1)}%)`);
  console.log(`BlankExercise 전체      : ${exercises.length}개`);

  const overall = empty();
  const buckets: Record<Bucket, Stats> = {
    elementary: empty(),
    middle: empty(),
    high: empty(),
    unknown: empty(),
  };

  for (const ex of exercises) {
    const blanks = ex.blanks as unknown as Blank[];
    if (!Array.isArray(blanks)) continue;

    let e = 0, h = 0, f = 0, b = 0, other = 0;
    for (const blk of blanks) {
      const d = (blk.difficulty ?? 'easy').toLowerCase();
      if (d === 'easy') e++;
      else if (d === 'hard') h++;
      else if (d === 'full') f++;
      else if (d === 'both') b++;
      else other++;
    }

    const stage1 = e + b;
    const stage2 = e + h + b;
    const stage3 = e + h + f + b;

    const push = (s: Stats): void => {
      s.count++;
      s.easy.push(e);
      s.hard.push(h);
      s.full.push(f);
      s.both.push(b);
      s.other.push(other);
      s.stage1.push(stage1);
      s.stage2.push(stage2);
      s.stage3.push(stage3);
    };

    push(overall);
    push(buckets[bucketOf(ex.concept?.grade)]);
  }

  summarize('전체', overall);
  summarize('초등', buckets.elementary);
  summarize('중등', buckets.middle);
  summarize('고등', buckets.high);
  if (buckets.unknown.count > 0) {
    summarize('학년 미지정', buckets.unknown);
  }

  // ─── 표준화 시뮬레이션 ─────────────────────────────────────────────────
  // 목표: difficulty별 평균 8, 최대 10 (단계 누적 8/16/24, 최대 10/20/30)
  console.log('\n=== 표준화 시뮬레이션 (max 10 강제 시) ===');
  const TARGET = { avg: 8, max: 10 };

  const tally = (arr: number[], max: number) => {
    const overMax = arr.filter((x) => x > max).length;
    const underAvg = arr.filter((x) => x < 4).length; // 절반 미만은 부족
    const trimmed = arr.map((x) => Math.min(x, max));
    const newAvg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    const totalRemoved = arr.reduce((s, x, i) => s + (x - trimmed[i]), 0);
    return { overMax, underAvg, newAvg, totalRemoved };
  };

  const easyT = tally(overall.easy, TARGET.max);
  const hardT = tally(overall.hard, TARGET.max);
  const fullT = tally(overall.full, TARGET.max);

  console.log(`\n  easy : 현재 평균 ${avg(overall.easy).toFixed(2)} → 자르기 후 ${easyT.newAvg.toFixed(2)}  (목표 ${TARGET.avg})`);
  console.log(`         max 초과 개념: ${easyT.overMax}개 (${((easyT.overMax / overall.count) * 100).toFixed(1)}%) — 빈칸 ${easyT.totalRemoved}개 삭제`);
  console.log(`         4개 미만 부족 개념: ${easyT.underAvg}개`);

  console.log(`\n  hard : 현재 평균 ${avg(overall.hard).toFixed(2)} → 자르기 후 ${hardT.newAvg.toFixed(2)}  (목표 ${TARGET.avg})`);
  console.log(`         max 초과 개념: ${hardT.overMax}개 (${((hardT.overMax / overall.count) * 100).toFixed(1)}%) — 빈칸 ${hardT.totalRemoved}개 삭제`);
  console.log(`         4개 미만 부족 개념: ${hardT.underAvg}개  ⚠️  자르기로는 평균 끌어올리기 불가`);

  console.log(`\n  full : 현재 평균 ${avg(overall.full).toFixed(2)} → 자르기 후 ${fullT.newAvg.toFixed(2)}  (목표 ${TARGET.avg})`);
  console.log(`         max 초과 개념: ${fullT.overMax}개 (${((fullT.overMax / overall.count) * 100).toFixed(1)}%) — 빈칸 ${fullT.totalRemoved}개 삭제`);
  console.log(`         4개 미만 부족 개념: ${fullT.underAvg}개`);

  // 단계별 누적 시뮬레이션
  const stage1New = overall.stage1.map((x) => Math.min(x, 10));
  const stage2New = overall.stage1.map((_, i) =>
    Math.min(overall.easy[i], 10) + Math.min(overall.hard[i], 10) + overall.both[i]
  );
  const stage3New = overall.stage1.map((_, i) =>
    Math.min(overall.easy[i], 10) +
    Math.min(overall.hard[i], 10) +
    Math.min(overall.full[i], 10) +
    overall.both[i]
  );

  console.log('\n  단계별 누적 (자르기 후):');
  console.log(`     1단계: 평균 ${avg(stage1New).toFixed(2)}개  중앙값 ${median(stage1New)}  범위 ${minOf(stage1New)}~${maxOf(stage1New)}  (목표 평균 8, max 10)`);
  console.log(`     2단계: 평균 ${avg(stage2New).toFixed(2)}개  중앙값 ${median(stage2New)}  범위 ${minOf(stage2New)}~${maxOf(stage2New)}  (목표 평균 16, max 20)`);
  console.log(`     3단계: 평균 ${avg(stage3New).toFixed(2)}개  중앙값 ${median(stage3New)}  범위 ${minOf(stage3New)}~${maxOf(stage3New)}  (목표 평균 24, max 30)`);

  // 표준편차
  const stdev = (arr: number[]) => {
    const m = avg(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
  };
  console.log('\n  편차 (표준편차):');
  console.log(`     1단계: 현재 ${stdev(overall.stage1).toFixed(2)} → 자르기 후 ${stdev(stage1New).toFixed(2)}`);
  console.log(`     2단계: 현재 ${stdev(overall.stage2).toFixed(2)} → 자르기 후 ${stdev(stage2New).toFixed(2)}`);
  console.log(`     3단계: 현재 ${stdev(overall.stage3).toFixed(2)} → 자르기 후 ${stdev(stage3New).toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
