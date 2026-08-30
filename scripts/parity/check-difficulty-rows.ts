/**
 * 블로그 문항표 회귀 검사.
 *
 * ## 고친 증상
 * 블로그로 나가는 문항표(`v4_difficulty_rows`)를 AI 가 **처음부터 다시 타이핑**했다.
 * 그래서 두 가지가 조용히 깨졌다.
 *
 *   1. 선생님이 난이도·배점·단원을 교정해도 총평을 재생성하기 전까지 블로그 표는 옛 값을
 *      내보냈다 → 우리 화면과 우리 블로그가 같은 시험의 다른 배점을 말했다.
 *   2. AI 가 문항을 빠뜨리거나 난이도를 'Lv4' 처럼 쓰면 조용히 '3' 으로 강제됐다.
 *
 * 지금은 행 골격을 `questions[]` 에서 파생하고 AI 에게서는 문장만 조인한다.
 * 이 파일은 그 계약이 되돌아가지 않도록 고정한다.
 *
 * 실행: npx tsx scripts/parity/check-difficulty-rows.ts
 */
import {
  formatQuestionLine,
  formatQuestionDetails,
  leafTopic,
  normalizeLevel,
  reconcileDifficultyRows,
  type RowSourceQuestion,
} from '../../src/lib/exam-analysis/shared/difficulty-rows';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

// ── 공통 픽스처 ──
const QUESTIONS: RowSourceQuestion[] = [
  {
    question_number: 1,
    topic: '공통수학1 > 다항식 > 다항식의 연산',
    difficulty: '2',
    points: 3,
    question_format: 'objective',
    ai_comment: '전개 공식을 그대로 적용하는 기본 문항.',
    difficulty_reason: '단일 개념, 계산만 요구',
  },
  {
    question_number: 13,
    topic: '공통수학1 > 방정식과 부등식 > 복소수',
    difficulty: '5',
    points: 4.5,
    question_format: 'objective',
    ai_comment: '켤레복소수 성질과 이차방정식 판별식을 함께 써야 한다.',
    difficulty_reason: '두 개념 결합 + 비자명한 관찰 필요',
  },
  {
    question_number: '서답형7',
    topic: '공통수학1 > 방정식과 부등식 > 이차방정식',
    difficulty: '4',
    points: 10,
    question_format: 'essay',
    ai_comment: null,
    difficulty_reason: null,
  },
];

console.log('── ① 프롬프트 줄에 문항 근거가 실리는가 (예전엔 숫자 네 개뿐) ──');
const line1 = formatQuestionLine(QUESTIONS[0]);
ok(line1.includes('전개 공식'), 'ai_comment 가 실린다', line1);
ok(line1.includes('난이도 근거: 단일 개념'), 'difficulty_reason 이 실린다');
ok(line1.startsWith('1번: 공통수학1 > 다항식 > 다항식의 연산 / Lv2 / 3점'), '기존 골격 유지', line1.slice(0, 46));
const line3 = formatQuestionLine(QUESTIONS[2]);
ok(line3.includes('[서술형]'), '서술형 표기 유지', line3);
ok(!line3.includes('—') && !line3.includes('근거:'), '근거가 없으면 덧붙이지 않는다', line3);

console.log('\n── ② 판독 불가 난이도를 임의로 3으로 만들지 않는가 ──');
ok(
  formatQuestionLine({ question_number: 9, topic: 'x', difficulty: null }).includes('Lv?'),
  '난이도 null → Lv? (예전엔 Lv3 으로 둔갑)',
  formatQuestionLine({ question_number: 9, topic: 'x', difficulty: null }),
);
ok(normalizeLevel(null) === null, 'normalizeLevel(null) = null');
ok(normalizeLevel('Lv4') === null, '형식 벗어난 값 = null');
ok(normalizeLevel('concept') === '1', '레거시 키 concept → 1');
ok(normalizeLevel('creative') === '5', '레거시 키 creative → 5');

console.log('\n── ③ 선생님 교정이 블로그 표를 이기는가 (핵심 회귀) ──');
// AI 가 옛 값(교정 전)을 들고 있는 상황
const staleAiRows = [
  { question_number: 1, topic: '다항식의 연산', difficulty: '2' as const, points: 3, analysis_short: '기본 전개' },
  { question_number: 13, topic: '복소수', difficulty: '3' as const, points: 3, analysis_short: '켤레복소수 활용' },
  { question_number: '서술형7', topic: '이차방정식', difficulty: '3' as const, points: 8, analysis_short: '근과 계수의 관계' },
];
const rows = reconcileDifficultyRows(staleAiRows, QUESTIONS)!;
ok(rows.length === 3, '행 수 = 문항 수', String(rows.length));
const r13 = rows.find((r) => r.question_number === 13)!;
ok(r13.difficulty === '5', '난이도는 문항 값(5)이 이긴다 — AI 는 3이라 했다', r13.difficulty);
ok(r13.points === 4.5, '배점도 문항 값(4.5) — 소수 배점 보존', String(r13.points));
ok(r13.analysis_short === '켤레복소수 활용', 'AI 문장은 그대로 조인');
ok(r13.topic === '복소수', '단원은 표준 경로의 말단으로', r13.topic);

console.log('\n── ④ 서술형/서답형 표기가 어긋나도 해설이 살아남는가 ──');
const r7 = rows.find((r) => String(r.question_number) === '서답형7')!;
ok(r7.analysis_short === '근과 계수의 관계', 'AI "서술형7" ↔ 문항 "서답형7" 조인 성공', String(r7.analysis_short));
ok(r7.points === 10, '배점은 문항 값(10)', String(r7.points));
ok(r7.difficulty === '4', '난이도는 문항 값(4)', r7.difficulty);

console.log('\n── ⑤ AI 가 문항을 빠뜨려도 행이 사라지지 않는가 ──');
const partial = reconcileDifficultyRows([staleAiRows[0]], QUESTIONS)!;
ok(partial.length === 3, 'AI 가 1문항만 반환해도 3행 유지', String(partial.length));
ok(partial[1].analysis_short === undefined, '해설 없는 행은 문장만 비어 있다');
ok(partial[1].difficulty === '5' && partial[1].points === 4.5, '골격은 문항 데이터로 채워진다');

console.log('\n── ⑥ AI 가 없는 문항을 지어내면 버리는가 ──');
const ghost = reconcileDifficultyRows(
  [...staleAiRows, { question_number: 99, topic: '유령', difficulty: '5' as const, points: 7 }],
  QUESTIONS,
)!;
ok(ghost.length === 3 && !ghost.some((r) => r.question_number === 99), '문항에 없는 번호는 제외', String(ghost.length));

console.log('\n── ⑦ 배점 0점 문항이 AI 값으로 덮이지 않는가 ──');
const zero = reconcileDifficultyRows(
  [{ question_number: 1, topic: 't', difficulty: '2' as const, points: 9 }],
  [{ question_number: 1, topic: 'a > b', difficulty: '2', points: 0 }],
)!;
ok(zero[0].points === 0, '0점은 0점으로 (?? 로 이어야 함 — || 면 9로 덮인다)', String(zero[0].points));

console.log('\n── ⑧ 문항 정보 없이 호출되면 AI 행을 그대로 (구버전 호환) ──');
const noQ = reconcileDifficultyRows(staleAiRows, undefined)!;
ok(noQ.length === 3, '표가 통째로 사라지지 않는다', String(noQ.length));
ok(noQ[1].difficulty === '3', '이 경로에서만 AI 값을 신뢰', noQ[1].difficulty);
ok(reconcileDifficultyRows(undefined, undefined) === undefined, '양쪽 다 없으면 undefined');
ok(reconcileDifficultyRows([], QUESTIONS)!.length === 3, 'AI 응답이 비어도 골격은 나온다');

console.log('\n── ⑨ 단원 말단 추출 ──');
ok(leafTopic('공통수학1 > 다항식 > 다항식의 연산') === '다항식의 연산', '3단계 경로');
ok(leafTopic('다항식의 연산') === '다항식의 연산', '단일 세그먼트');
ok(leafTopic(null) === '', 'null → 빈 문자열(호출부가 폴백)');

console.log('\n── ⑩ V3·V4 가 같은 포맷을 쓰는가 (§12-13) ──');
// formatQuestionDetails 가 유일한 생성 경로 — 두 프롬프트가 각자 템플릿을 갖지 않는다.
const details = formatQuestionDetails(QUESTIONS);
ok(details.split('\n').length === 3, '문항당 한 줄', String(details.split('\n').length));
ok(details.split('\n')[0] === formatQuestionLine(QUESTIONS[0]), '목록과 단건이 같은 함수에서 파생');

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
