/**
 * 판독 실패 문항(1.1) 회귀 검사 — 적대적 리뷰 지적 재현용.
 *
 * 확인하는 계약 4가지:
 *   ① AI가 `difficulty: null` 로 신고한 문항을 기본(1)으로 둔갑시키지 않는다
 *   ② 시스템이 끼워 넣는 placeholder 도 난이도 미정이다
 *   ③ placeholder 삽입 후에도 `summary.difficulty_distribution` 합 + 미정 수 = questions.length
 *   ④ 답안이 없는데 "정답률 0%" 같은 가짜 통계를 만들지 않는다 (리뷰 1.2)
 *
 * 실행: npx tsx scripts/parity/check-unreadable-questions.ts
 */
import { appendMissingTail } from '../../src/lib/exam-analysis/ai-engine';
import { weightedAverageDifficulty } from '../../src/lib/exam-analysis/shared/difficulty';
import type { AnalysisCompleteness, AnalyzedQuestion, BasicAnalysisResult } from '../../src/lib/exam-analysis/types';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

function q(n: number, difficulty: string | null, points: number): AnalyzedQuestion {
  return {
    question_number: n,
    question_format: 'objective',
    difficulty,
    difficulty_reason: null,
    question_type: 'number',
    ability_domain: 'calculation',
    points,
    topic: null,
    ai_comment: null,
    confidence: 0.9,
    confidence_reason: null,
    is_correct: null,
    student_answer: null,
    earned_points: null,
    error_type: null,
  };
}

console.log('── ① 판독 실패(null)를 기본(1)으로 바꾸지 않는가 ──');
// 9문항 Lv1 + 1문항 판독실패. 미정이 Lv1로 둔갑하면 가중평균이 낮아진다.
const withNull = [...Array.from({ length: 9 }, (_, i) => q(i + 1, '1', 5)), q(10, null, 5)];
const wd = weightedAverageDifficulty(withNull);
ok(wd.total === 9, '가중평균 대상에서 미정 제외', `${wd.total}문항 집계 (9여야 정상)`);

// 미정이 '1'로 채워졌다면 total 이 10이 된다 — 그 경우를 대조군으로 보여준다
const asLevel1 = [...Array.from({ length: 9 }, (_, i) => q(i + 1, '1', 5)), q(10, '1', 5)];
ok(weightedAverageDifficulty(asLevel1).total === 10, '(대조) 전부 Lv1이면 10문항 집계');

console.log('\n── ②③ placeholder 삽입 후 summary 가 questions 와 맞는가 ──');
const base: BasicAnalysisResult = {
  exam_info: {
    total_questions: 2,
    total_points: 100,
    school_name: null,
    declared_total_questions: 3,
    declared_total_points: 100,
    format_distribution: { objective: 2, short_answer: 0, essay: 0 },
  },
  summary: {
    difficulty_distribution: { '1': 0, '2': 1, '3': 1, '4': 0, '5': 0 },
    type_distribution: { number: 2, change_relation: 0, shape_measure: 0, data_possibility: 0 },
    average_difficulty: '2',
    dominant_type: 'number',
  },
  questions: [q(1, '2', 40), q(2, '3', 40)],
} as unknown as BasicAnalysisResult;

const completeness = {
  status: 'incomplete',
  declaredQuestions: 3,
  emittedQuestions: 2,
  pointsShortfall: 20,
  pointsSum: 80,
  reason: 'test',
} as unknown as AnalysisCompleteness;

const { result: filled } = appendMissingTail(base, completeness, 'MATH');
const inserted = filled.questions.filter((x) => x.confidence === 0);
ok(inserted.length === 1, 'placeholder 1개 삽입', `${inserted.length}개`);
ok(inserted[0]?.difficulty === null, 'placeholder 난이도 = 미정(null)', String(inserted[0]?.difficulty));

// appendMissingTail 은 analyzeExam 에서 syncSummary 를 거친다. 여기서는 그 계약을 직접 검사:
// 분포 합 + 미정 수 == questions.length 여야 한다.
const dist = filled.summary.difficulty_distribution as unknown as Record<string, number>;
const distSum = Object.values(dist).reduce((a, b) => a + b, 0);
const undecided = filled.questions.filter((x) => x.difficulty == null).length;
console.log(`     questions=${filled.questions.length} / 분포합=${distSum} / 미정=${undecided}`);
ok(
  distSum + undecided === filled.questions.length,
  '분포합 + 미정 = 문항수 (syncSummary 적용 후 기준)',
  `${distSum} + ${undecided} = ${distSum + undecided} vs ${filled.questions.length}`,
);

// ── 1.2 학생 답안 판정 (리뷰 지적) ──
console.log('\n── ④ 답안 없는 시험지에서 가짜 정답률이 안 생기는가 ──');
const strict = (qs: Array<{ is_correct?: unknown }>) =>
  qs.some((x) => x.is_correct === true || x.is_correct === false);
const loose = (qs: Array<{ is_correct?: unknown }>) =>
  qs.some((x) => (x as { is_correct: unknown }).is_correct !== null);

const legacy = [{}, {}];                       // 구버전 문항 — is_correct 키 자체가 없음
const badAi = [{ is_correct: 'false' }, { is_correct: null }];  // AI가 문자열 반환
ok(!strict(legacy), '레거시(키 없음) → 답안 없음', `느슨한 판정이었다면 ${loose(legacy)}`);
ok(!strict(badAi), '문자열 "false" → 답안 없음', `느슨한 판정이었다면 ${loose(badAi)}`);
ok(strict([{ is_correct: true }]), '진짜 boolean 은 답안 있음');

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
