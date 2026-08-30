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
import { readFileSync } from 'fs';
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

console.log('\n── ④ 학습 대책 탭 UI 문구 (2026-08-30 추가) ──');
// 이 검사는 여태 **프롬프트만** 봤다. 그런데 같은 종류의 단정이 화면 문구에 그대로 있었다:
//   - 영어 탭 "자주 틀리는 단어·구문"   → 고침(EnglishStudyStrategyTab 의 trapTitle)
//   - 수학 탭 "자주 하는 실수 유형" / "총 N개 유형의 실수가 예상됩니다" → 남아 있었음
// 같은 실수가 두 번 났으므로 화면 문구도 고정한다.
{
  const UI_FILES = [
    'src/components/exam-analysis/StudyStrategyTab.tsx',
    'src/components/exam-analysis/EnglishStudyStrategyTab.tsx',
    ...['CommonMistakesSection', 'LearningStrategiesSection', 'KillerPatternsSection',
        'LevelStrategiesSection', 'TimeAllocationSection', 'TimelineSection',
        'TopicAnalysisSection', 'GradeConnectionsSection', 'EssayPreparationSection']
      .map((n) => `src/components/exam-analysis/study-strategy/${n}.tsx`),
  ];
  // PersonalizedStrategySection 은 제외 — 채점된 답안이 있을 때만 렌더되므로
  // 오답·정답률을 말할 근거가 실제로 있다.

  /** 주석은 제외하고 본다 — 왜 이 문구를 금지하는지 주석으로 설명할 수 있어야 한다. */
  const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const BANNED: Array<{ re: RegExp; why: string }> = [
    { re: /실수가\s*예상/, why: '예측한 적 없는 실수 개수' },
    { re: /자주\s*(하는|틀리는)\s*(실수|단어|구문|유형)/, why: '오답 빈도를 아는 것처럼 말함' },
    { re: /예상\s*(정답률|등급|점수)/, why: '학생 데이터 없이 성적 추정' },
    { re: /학생[^\n]{0,8}(실력|수준)[을이가]/, why: '개인 실력 단정' },
  ];

  // 검사 유효성 — 실제로 화면에 있었던 문구를 잡는지 고정한다.
  // 이게 없으면 정규식이 아무것도 안 잡아도 "전부 통과" 가 나온다.
  const HISTORICAL_BAD = [
    '{topicSummaries.length}개 단원에서 총 {totalMistakes}개 유형의 실수가 예상됩니다.',
    '<span className="text-sm font-semibold text-slate-800">자주 하는 실수 유형</span>',
    "title: '자주 틀리는 단어·구문',",
  ];
  for (const bad of HISTORICAL_BAD) {
    ok(BANNED.some((b) => b.re.test(bad)), `옛 문구를 잡는다: ${bad.slice(0, 34)}…`);
  }
  // 반대 방향 — 지금 쓰는 정상 문구는 통과해야 한다(과잉 차단 방지)
  for (const good of [
    '알려진 주의점 {totalMistakes}개입니다.',
    '<span className="text-sm font-semibold text-slate-800">실수하기 쉬운 지점</span>',
    "'고난도 문항에 나온 단어·구문'",
    '고난도 문항 {highEvidence.length}개',
  ]) {
    ok(!BANNED.some((b) => b.re.test(good)), `정상 문구는 통과: ${good.slice(0, 30)}…`);
  }

  for (const f of UI_FILES) {
    let src: string;
    try {
      src = stripComments(readFileSync(f, 'utf8'));
    } catch {
      ok(false, `${f.split('/').pop()} 읽기`, '파일 없음 — 경로가 바뀌었으면 목록을 고칠 것');
      continue;
    }
    const hits = BANNED.filter((b) => b.re.test(src));
    ok(hits.length === 0, `${f.split('/').pop()} 근거 없는 단정 없음`,
      hits.length ? hits.map((h) => h.why).join(' / ') : '');
  }

  // 근거를 밝히는 문구가 실제로 남아 있는가 (지우고 넘어가지 못하게)
  const mistakes = readFileSync('src/components/exam-analysis/study-strategy/CommonMistakesSection.tsx', 'utf8');
  ok(mistakes.includes('실제 오답 기록이 아닙니다'), '실수 섹션이 근거의 한계를 명시');
}

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
