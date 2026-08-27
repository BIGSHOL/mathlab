/**
 * 유형 라벨 주입 회귀 검사 (적대적 리뷰 1.4).
 *
 * 영어 시험지의 총평·블로그 프롬프트에 수학 4대 영역 라벨이 0문항으로 들어가던 문제.
 * 같은 프롬프트가 다른 곳에서는 "영어 라벨만 쓰라"고 지시해 입력 자체가 모순이었다.
 *
 * 실행: npx tsx scripts/parity/check-type-labels.ts
 */
import { buildFactsAndDataBlock } from '../../src/lib/exam-analysis/article-prompt-builders';

const commentary = {
  overall_comment: '', nearby_comparison: '', score_strategies: [],
  strength_areas: [], improvement_areas: [], notable_questions: [],
  teaching_recommendations: [],
} as never;

const base = {
  schoolName: 'X중', grade: '중2', scopeLabel: '전범위', totalQ: 20, totalPts: 100,
  formats: { objective: 15, short_answer: 2, essay: 3 }, overallLevel: 3,
  diffCounts: [2, 6, 7, 4, 1] as [number, number, number, number, number],
  diffPoints: [10, 30, 35, 20, 5],
  topicStats: [], commentary,
  discrim: { overallLabel: '적정', poorRatioLabel: '낮음' },
  overpricedLabel: '없음', underpricedLabel: '없음',
  essayInsight: { essayCount: 3, essayPts: 20, weightPct: 20, avgLevel: 3, topics: [] },
};

const en = buildFactsAndDataBlock({
  ...base,
  typeDistribution: { grammar: 5, vocabulary: 2, reading: 10, listening: 0, writing: 3, communication: 0 },
  subject: 'ENGLISH',
} as never);
const ma = buildFactsAndDataBlock({
  ...base,
  typeDistribution: { number: 5, change_relation: 7, shape_measure: 6, data_possibility: 2 },
  subject: 'MATH',
} as never);

let fail = 0;
function ok(cond: boolean, label: string) {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}`);
}

console.log('── 영어 글 프롬프트 ──');
ok(!en.includes('수와 연산'), '수학 라벨 미유입');
ok(!en.includes('변화와 관계'), '수학 레거시 별칭 미유입');
ok(en.includes('독해: 10문항'), '영어 유형(독해) 포함');
ok(en.includes('어법: 5문항'), '영어 유형(어법) 포함');
ok(!en.includes('듣기'), '듣기 0건이면 미노출 (내신 지필 규약)');

console.log('── 수학 글 프롬프트 ──');
ok(ma.includes('수와 연산: 5문항'), '수학 유형 유지');
ok(!ma.includes('어법'), '영어 라벨 미유입');

console.log('\n──────────────────────────────');
if (fail) {
  console.log(`❌ ${fail}건 실패`);
  process.exit(1);
}
console.log('✅ 전부 통과 — 과목별 유형 라벨만 들어간다');
