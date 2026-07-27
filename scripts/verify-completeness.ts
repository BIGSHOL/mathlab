/**
 * 문항 누락 감지 체인 회귀 검증
 *   assessCompleteness → appendMissingTail → checkAnalysisReadiness
 *
 * 실행: npx tsx scripts/verify-completeness.ts   (실패 시 exit 1)
 *
 * 배경: 정상 시험지인데도 AI가 마지막 문항을 통째로 누락하고, 그 상태로 총평까지 자동 생성된 사고
 * (2026-07-25 경명여중1 — 동일 PDF 재분석에서 22문항/100점 → 21문항/90점).
 * 누락은 번호 갭이 아니라 "꼬리 잘림"이라 번호 시퀀스로는 감지되지 않았고,
 * readiness 가드는 `저장된 합계 vs 문항 합계`라는 항등식이라 발동한 적이 없었다.
 * → 이 스크립트는 그 두 구멍이 다시 열리지 않았는지 검사한다.
 */
import { assessCompleteness, appendMissingTail } from '../src/lib/exam-analysis/ai-engine';
import { checkAnalysisReadiness } from '../src/lib/exam-analysis/readiness';
import type { AnalyzedQuestion, BasicAnalysisResult } from '../src/lib/exam-analysis/types';

/** 경명여중1 실제 배점 (객관식 17 + 단답 1 + 서술 3), 합계 90 — 원래는 서술형 1개(10점)가 더 있었다 */
const PTS_MISSING_TAIL = [3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 5, 5, 8, 8, 9];
const PTS_COMPLETE = [...PTS_MISSING_TAIL, 10];

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (기대: ${JSON.stringify(expected)})`}`);
}

function mkResult(points: number[], declaredQ: number | null, declaredP: number | null): BasicAnalysisResult {
  const questions = points.map((p, i) => ({
    question_number: i + 1,
    question_format: 'objective',
    difficulty: '3',
    difficulty_reason: null,
    question_type: 'change_relation',
    ability_domain: 'calculation',
    points: p,
    topic: '중1 수학 > 일차방정식 > 등식',
    ai_comment: '검증용',
    confidence: 0.95,
    confidence_reason: null,
    is_correct: null,
    student_answer: null,
    earned_points: null,
    error_type: null,
  })) as AnalyzedQuestion[];

  return {
    exam_info: {
      total_questions: points.length,
      total_points: declaredP ?? 100,
      school_name: null,
      declared_total_questions: declaredQ,
      declared_total_points: declaredP,
      format_distribution: { objective: points.length, short_answer: 0, essay: 0 },
    },
    summary: {
      difficulty_distribution: { '1': 0, '2': 0, '3': points.length, '4': 0, '5': 0 },
      type_distribution: { number: 0, change_relation: points.length, shape_measure: 0, data_possibility: 0 },
      average_difficulty: '3',
      dominant_type: 'change_relation',
    },
    questions,
  } as BasicAnalysisResult;
}

/** 엔진 파이프라인(analyzeExam 의 누락 처리 구간) + 저장(route.ts) + readiness 를 그대로 재현 */
function pipeline(points: number[], declaredQ: number | null, declaredP: number | null) {
  const raw = mkResult(points, declaredQ, declaredP);
  const completeness = assessCompleteness(raw);
  const { result, filled } = appendMissingTail(raw, completeness);
  const summary = { ...result.summary, completeness: { ...completeness, filledQuestions: filled } };
  // route.ts 는 totalPoints 를 "문항 배점 합계"로 저장한다 — 이 값만으로는 절대 검증할 수 없음을 함께 확인
  const storedTotalPoints = result.questions.reduce((s, q) => s + (q.points ?? 0), 0);
  const readiness = checkAnalysisReadiness({ questions: result.questions, totalPoints: storedTotalPoints, summary });
  return { completeness, filled, result, readiness, storedTotalPoints };
}

console.log('\n① 실패 재현 — AI 만점 100 신고, 21문항 90점만 산출 (문항수는 자기 출력대로 21 신고)');
{
  const { completeness, filled, result, readiness } = pipeline(PTS_MISSING_TAIL, 21, 100);
  check('누락 감지', completeness.status, 'incomplete');
  check('부족 배점', completeness.pointsShortfall, 10);
  check('placeholder 삽입', filled, 1);
  check('보정 후 문항 수', result.questions.length, 22);
  check('placeholder 배점', result.questions[21].points, 10);
  check('placeholder 신뢰도 0', result.questions[21].confidence, 0);
  check('총평 차단', readiness.ready, false);
  check('누락 사유 노출', readiness.completenessReason !== null, true);
}

console.log('\n② AI가 문항 수까지 정확히 신고 (22문항 중 21문항만 산출)');
{
  const { completeness, filled, readiness } = pipeline(PTS_MISSING_TAIL, 22, 100);
  check('누락 감지', completeness.status, 'incomplete');
  check('placeholder 삽입', filled, 1);
  check('총평 차단', readiness.ready, false);
}

console.log('\n③ 정상 — 22문항 100점');
{
  const { completeness, filled, readiness } = pipeline(PTS_COMPLETE, 22, 100);
  check('정상 판정', completeness.status, 'ok');
  check('보정 없음', filled, 0);
  check('총평 허용', readiness.ready, true);
}

console.log('\n④ AI 미신고 — 기준이 없으면 판정하지 않는다 (오탐 금지)');
{
  const { completeness, filled, readiness } = pipeline(PTS_MISSING_TAIL, null, null);
  check('판정 불가', completeness.status, 'unverifiable');
  check('보정 없음', filled, 0);
  check('총평 허용', readiness.ready, true);
}

console.log('\n⑤ 배점 초과 (중복 판독) — 보정하지 않고 경고만');
{
  const { completeness, filled, readiness } = pipeline(PTS_MISSING_TAIL, 21, 80);
  check('불일치 감지', completeness.status, 'incomplete');
  check('placeholder 없음', filled, 0);
  check('총평 차단', readiness.ready, false);
  check('"누락"이 아닌 "불일치" 문구', readiness.completenessReason?.startsWith('배점 불일치 감지'), true);
}

console.log('\n⑥ 구버전 분석본 (completeness 필드 없음) — 기존 동작 유지, 소급 차단 금지');
{
  const legacy = mkResult(PTS_MISSING_TAIL, null, null);
  const readiness = checkAnalysisReadiness({ questions: legacy.questions, totalPoints: 90, summary: { average_difficulty: '3' } });
  check('총평 허용', readiness.ready, true);
  check('completeness 없음', readiness.completeness, null);
}

console.log('\n⑦ 배점 미인식이 섞이면 누락 원인을 특정하지 않는다 (이중 경고 방지)');
{
  const raw = mkResult(PTS_MISSING_TAIL, 21, 100);
  raw.questions[3].points = null;
  const completeness = assessCompleteness(raw);
  check('판정 불가', completeness.status, 'unverifiable');
  const { filled } = appendMissingTail(raw, completeness);
  check('보정 없음', filled, 0);
  const readiness = checkAnalysisReadiness({
    questions: raw.questions,
    totalPoints: 87,
    summary: { completeness: { ...completeness, filledQuestions: 0 } },
  });
  check('배점 미인식으로 차단', readiness.ready, false);
}

console.log(failures === 0 ? '\n✅ 전체 통과\n' : `\n❌ ${failures}건 실패\n`);
process.exit(failures === 0 ? 0 : 1);
