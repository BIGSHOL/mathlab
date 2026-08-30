/**
 * 영어 단원별 전략 매칭 회귀 검사.
 *
 * ## 고친 증상 (2026-08-30)
 * 옛 `isEnglishTopicMatch` 는 키워드와 검색어를 **양방향 부분문자열**로 비교했다.
 * 실제 시험지(고1 영진고) 8개 topic 으로 재 보니:
 *   - "가정법 과거, 과거완료" → **현재완료** 전략 (안에 든 "과거완료" 글자가 완료시제에 먼저 걸림)
 *   - 독해 4유형(주제·요지 / 글의 구조 / 함축적 의미 / 세부 정보 파악)이 **전부 같은 항목**으로 뭉침
 *
 * 틀린 특정 조언은 일반론보다 나쁘다 — 구체적이라 더 믿게 된다.
 * 이 검사는 그 오매칭이 되살아나지 못하게 고정한다.
 *
 * 실행: npx tsx scripts/parity/check-english-topic-strategy.ts
 */
import { matchEnglishStrategy } from '../../src/lib/exam-analysis/data/english/strategyMatchers';
import {
  buildEnglishTopicStrategies,
  matchedStrategyCount,
} from '../../src/lib/exam-analysis/shared/english-topic-strategy';
import type { AnalyzedQuestion } from '../../src/lib/exam-analysis/types';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

function q(p: Partial<AnalyzedQuestion>): AnalyzedQuestion {
  return {
    question_number: 1, question_format: null, difficulty: null, difficulty_reason: null,
    question_type: null, points: null, topic: null, ai_comment: null,
    confidence: 0.9, confidence_reason: null,
    is_correct: null, student_answer: null, earned_points: null, error_type: null,
    ...p,
  };
}

/** 실제 시험지의 topic 8종 (고1 영진고, 2026-08-30 실측) */
const REAL = [
  '고1 영어 > 문법 > 가정법 과거, 과거완료',
  '고1 영어 > 독해 > 주제·요지',
  '고1 영어 > 독해 > 글의 구조',
  '고1 영어 > 어휘 > 교육과정 기본 어휘 (공통영어)',
  '고1 영어 > 독해 > 함축적 의미',
  '고1 영어 > 독해 > 빈칸 추론 (단어·구)',
  '고1 영어 > 독해 > 세부 정보 파악',
  '고1 영어 > 문법 > 도치',
];

console.log('── ① 옛 오매칭이 되살아나지 않았는가 ──');
{
  const m = matchEnglishStrategy('고1 영어 > 문법 > 가정법 과거, 과거완료');
  ok(m !== null, '가정법 문항은 매칭된다');
  ok(m?.unit?.includes('가정법') ?? false, '가정법 단원으로 간다 (예전엔 현재완료였다)', m?.unit ?? '없음');
  ok(!JSON.stringify(m?.strategy.keywords ?? []).includes('현재완료'), '현재완료 항목이 아니다');
}
{
  // 독해 4유형이 서로 다른 결과여야 한다 — 같은 항목으로 뭉치면 실패
  const reading = ['주제·요지', '글의 구조', '함축적 의미', '세부 정보 파악'].map(
    (t) => matchEnglishStrategy(`고1 영어 > 독해 > ${t}`),
  );
  const matched = reading.filter(Boolean);
  const distinct = new Set(matched.map((m) => JSON.stringify(m!.strategy.keywords)));
  ok(
    matched.length === distinct.size,
    '매칭된 독해 유형끼리 서로 다른 전략 (뭉치지 않는다)',
    `${matched.length}개 매칭 / ${distinct.size}종`,
  );
}

console.log('\n── ② 정확히 맞는 것은 맞춘다 ──');
{
  const bl = matchEnglishStrategy('고1 영어 > 독해 > 빈칸 추론 (단어·구)');
  ok(bl?.score === 100, '"빈칸 추론" 은 괄호를 털고 정확일치', `score=${bl?.score}`);
  const inv = matchEnglishStrategy('고1 영어 > 문법 > 도치');
  ok(inv?.score === 100 && (inv?.unit?.length ?? 0) > 0, '"도치" 정확일치', `${inv?.unit} score=${inv?.score}`);
}

console.log('\n── ③ 확신 없으면 아무것도 주지 않는다 ──');
ok(matchEnglishStrategy('고1 영어 > 독해 > 존재하지 않는 유형명') === null, '없는 유형 → null');
ok(matchEnglishStrategy('') === null, '빈 문자열 → null');
ok(matchEnglishStrategy('고1 영어 > 독해 > 가') === null, '한 글자 → null (아무거나 걸리지 않는다)');

console.log('\n── ④ 단원 묶기 ──');
{
  const qs = [
    q({ question_number: 1, topic: REAL[0], points: 6, ai_comment: '가정법' }),
    q({ question_number: 2, topic: REAL[0], points: 4 }),
    q({ question_number: 3, topic: REAL[7], points: 12, ai_comment: '도치' }),
  ];
  const g = buildEnglishTopicStrategies(qs);
  ok(g.length === 2, '단원 2개로 묶임', String(g.length));
  ok(g[0].leaf === '도치', '배점 큰 순 (12점 도치가 10점 가정법보다 먼저)', g.map((x) => `${x.leaf}:${x.points}`).join(' '));
  ok(g[0].percent + g[1].percent === 100, '퍼센트 합 100');
  ok(g[1].questionCount === 2 && g[1].evidence.length === 1, '가정법 단원: 문항 2개 중 소견 있는 1개만 근거로', `${g[1].leaf} ${g[1].questionCount}문항 근거${g[1].evidence.length}`);
  ok(g.every((x) => x.strategies.length > 0), '두 단원 모두 전략이 붙는다');

  // 동점이면 문항 수가 많은 쪽이 먼저 — 잘라 보여줄 때 결과가 흔들리지 않게
  const tie = buildEnglishTopicStrategies([
    q({ question_number: 1, topic: REAL[7], points: 10, ai_comment: 'x' }),
    q({ question_number: 2, topic: REAL[0], points: 6, ai_comment: 'y' }),
    q({ question_number: 3, topic: REAL[0], points: 4 }),
  ]);
  ok(tie[0].leaf.startsWith('가정법'), '동점이면 문항 수 많은 단원이 먼저', tie.map((x) => `${x.leaf}:${x.questionCount}문항`).join(' '));
}

console.log('\n── ⑤ 못 맞춘 단원은 전략을 만들어 내지 않는다 ──');
{
  const g = buildEnglishTopicStrategies([
    q({ question_number: 1, topic: '고1 영어 > 독해 > 세부 정보 파악', points: 5, ai_comment: 'x' }),
  ]);
  ok(g.length === 1, '단원은 남는다 (문항 근거는 보여야 하므로)');
  ok(g[0].strategies.length === 0 && g[0].unit === null, '전략은 빈 배열 · 단원은 null');
  ok(g[0].evidence.length === 1, '근거는 그대로');
}

console.log('\n── ⑥ 없을 때 ──');
ok(buildEnglishTopicStrategies([]).length === 0, '빈 입력 → 빈 배열');
ok(buildEnglishTopicStrategies([q({ topic: null })]).length === 0, 'topic 없는 문항만 → 빈 배열 (미분류 묶음을 만들지 않는다)');
ok(matchedStrategyCount([]) === 0, '전략 개수 0');

console.log('\n── ⑦ 실제 시험지 8단원 적중률 (회귀 고정) ──');
{
  const hits = REAL.map((t) => matchEnglishStrategy(t)).filter(Boolean).length;
  console.log(`     8개 중 ${hits}개 매칭`);
  ok(hits >= 3, '최소 3개는 맞춘다 (매처가 더 나빠지면 실패)', `${hits}/8`);
  ok(hits <= 6, '전부 맞는다고 주장하지 않는다 (느슨해지면 실패)', `${hits}/8`);
}

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
