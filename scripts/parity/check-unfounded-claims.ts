/**
 * 근거 없는 단정(2.4 / 5.5) 회귀 검사.
 *
 * ## 이 제품의 고정 전제
 * **학생 답안지를 업로드하지 않는다.** 정답률·개인별 실력·등급 컷을 산출할 데이터가
 * 애초에 존재하지 않는다. 그런데 프롬프트가 그것을 쓰라고 지시하고 있었다:
 *
 *   - 총평 역할 지시: "학생 현재 수준" / "아이가 어떤 상태이며" (수학·영어 공통)
 *   - V4 블로그: `expected_grade_cut` 예시가 "(학교 평균 추정 기반)" 인데
 *     같은 프롬프트 R8 은 "AI 추정/창작 금지" — 정면 충돌
 *   - V4 `v4_previous_comparison.body`: "데이터 없으면 학년 표준 진도 기반 추정"
 *     ↔ 상위 규칙 "비교 데이터 있을 때만, 지어내지 말 것"
 *
 * AI는 모순된 지시를 받으면 **더 구체적인 쪽**(= 채우라는 쪽)을 따르는 경향이 있다.
 * 그 결과가 학부모에게 그대로 나가는 블로그 글이므로, 문구로만 막지 말고 검사로 고정한다.
 *
 * 실행: npx tsx scripts/parity/check-unfounded-claims.ts
 */
import { CommentaryAgent, buildSystemPromptV4 } from '../../src/lib/exam-analysis/agents/commentary-agent';
import { MATH_QUESTIONS, MATH_SUMMARY } from './fixtures';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

const agent = new CommentaryAgent();
const basic = (qs: typeof MATH_QUESTIONS) => ({
  exam_info: { total_questions: qs.length, total_points: 100, format_distribution: { objective: 4, short_answer: 1, essay: 1 } },
  summary: MATH_SUMMARY,
  questions: qs,
}) as never;

console.log('── ① 답안 없는 시험지(정상 운영 상태)의 총평 프롬프트 ──');
const noAnswers = agent.buildPrompt({ basicAnalysis: basic(MATH_QUESTIONS), subject: 'MATH' });
ok(!noAnswers.includes('학생 현재 수준'), '"학생 현재 수준" 요구 없음');
ok(!noAnswers.includes('아이가 어떤 상태'), '"아이가 어떤 상태" 요구 없음');
ok(noAnswers.includes('학생 답안·성적 데이터가 없다'), '데이터 부재를 명시');
ok(noAnswers.includes('이 학생은 ~가 부족합니다'), '금지 예시를 구체적으로 제시');
ok(!noAnswers.includes('## 학생 답안 통계'), '없는 정답률 통계 블록이 붙지 않음');

console.log('\n── ② 답안이 실제로 있으면 기존 지도용 문구 유지 ──');
// is_correct 가 진짜 boolean 이어야 학생 데이터로 인정된다 (리뷰 1.2)
const withAnswers = MATH_QUESTIONS.map((q, i) => ({ ...q, is_correct: i % 2 === 0, earned_points: i % 2 === 0 ? 5 : 0 }));
const graded = agent.buildPrompt({ basicAnalysis: basic(withAnswers as typeof MATH_QUESTIONS), subject: 'MATH' });
ok(graded.includes('학생 현재 수준'), '지도 방향 문구 복원');
ok(graded.includes('## 학생 답안 통계'), '정답률 통계 블록 포함');
ok(!graded.includes('학생 답안·성적 데이터가 없다'), '부재 경고는 붙지 않음');

console.log('\n── ③ V4 블로그 프롬프트 — 추정으로 채우라는 지시가 없는가 ──');
const v4 = buildSystemPromptV4('수학');
ok(!v4.includes('학교 평균 추정 기반'), 'expected_grade_cut 예시에 "추정 기반" 없음');
ok(!v4.includes('학년 표준 진도 기반 추정'), '이전 시험 비교에 "표준 진도 추정" 없음');
ok(/expected_grade_cut[^\n]*null/.test(v4), 'expected_grade_cut 은 없으면 null 로 지시');
ok(v4.includes('AI 추정/창작 금지'), 'R8 추정 금지 규칙 유지');

// 모순 감지 — "추정 금지"와 "추정해서 채워라"가 한 프롬프트에 공존하면 실패
const tellsToEstimate = /데이터.{0,12}없으면.{0,20}추정(?!\s*금지)/.test(v4);
ok(!tellsToEstimate, '"데이터 없으면 추정" 지시가 남아있지 않음');

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
