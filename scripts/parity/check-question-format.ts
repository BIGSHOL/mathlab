/**
 * 문항 형식 판정 회귀 검사.
 *
 * ## 고친 증상
 * "서술형"이라는 말이 코드베이스에서 두 뜻으로 쓰이면서 술어가 9종으로 갈렸고,
 * **[분석] 탭과 [학습 대책] 탭이 같은 시험의 다른 문항수·배점**을 표시했다.
 * 학습 대책 쪽이 단답형까지 "서술형"으로 세면서도 문구는 "풀이 과정을 논리적으로
 * 작성"이라고 말했다.
 *
 * 그리고 `=== 'essay'` 원시 비교는 두 종류의 데이터를 조용히 흘렸다.
 *   - 형식 필드가 없던 시절 문항 — 번호는 `"서답형3"` 인데 형식은 `null`
 *   - AI 가 준 변형 표기 — `'Essay'`, `'주관식'`
 * 3분할 집계에서 이들은 어느 칸에도 안 들어가 **합계가 문항 수보다 작아졌다.**
 *
 * 실행: npx tsx scripts/parity/check-question-format.ts
 */
import {
  FORMAT_LABELS,
  formatDistribution,
  groupByFormat,
  isEssay,
  isWrittenResponse,
  resolveQuestionFormat,
} from '../../src/lib/exam-analysis/shared/question-format';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

console.log('── ① 표준 값은 그대로 ──');
ok(resolveQuestionFormat({ question_format: 'objective' }) === 'objective', 'objective');
ok(resolveQuestionFormat({ question_format: 'short_answer' }) === 'short_answer', 'short_answer');
ok(resolveQuestionFormat({ question_format: 'essay' }) === 'essay', 'essay');

console.log('\n── ② 형식이 없던 시절 데이터를 번호로 복구 ──');
ok(resolveQuestionFormat({ question_number: '서답형3' }) === 'essay', 'null 형식 + "서답형3" → essay');
ok(resolveQuestionFormat({ question_format: null, question_number: '서술형 2' }) === 'essay', 'null 형식 + "서술형 2" → essay');
ok(resolveQuestionFormat({ question_number: 7 }) === 'objective', '숫자 번호 → objective');

console.log('\n── ③ 형식이 있으면 번호가 뒤집지 못한다 ──');
ok(
  resolveQuestionFormat({ question_format: 'objective', question_number: '서답형3' }) === 'objective',
  '형식 objective 가 번호 추론을 이긴다',
);

console.log('\n── ④ AI 변형 표기 흡수 (예전엔 어느 칸에도 안 들어갔다) ──');
ok(resolveQuestionFormat({ question_format: 'Essay' }) === 'essay', "'Essay' → essay");
ok(resolveQuestionFormat({ question_format: '서술형' }) === 'essay', "'서술형' → essay");
ok(resolveQuestionFormat({ question_format: '주관식' }) === 'short_answer', "'주관식' → short_answer");
ok(resolveQuestionFormat({ question_format: 'multiple choice' }) === 'objective', "'multiple choice' → objective");
ok(resolveQuestionFormat({ question_format: '알수없음' }) === 'objective', '모르는 값 → objective(누락 없음)');

console.log('\n── ⑤ 두 술어는 서로 다른 뜻이다 (하나로 통일하면 안 된다) ──');
const shortQ = { question_format: 'short_answer' };
ok(isEssay(shortQ) === false, '단답형은 풀이 채점 대상이 아니다 — isEssay=false');
ok(isWrittenResponse(shortQ) === true, '단답형도 직접 기입이다 — isWrittenResponse=true');
ok(isEssay({ question_format: 'essay' }) && isWrittenResponse({ question_format: 'essay' }), '서술형은 둘 다 true');
ok(!isEssay({ question_format: 'objective' }) && !isWrittenResponse({ question_format: 'objective' }), '객관식은 둘 다 false');

console.log('\n── ⑥ 집계 합계가 문항 수와 반드시 같다 (핵심 회귀) ──');
const MIXED = [
  { question_format: 'objective', question_number: 1 },
  { question_format: 'short_answer', question_number: 2 },
  { question_format: 'essay', question_number: 3 },
  { question_format: null, question_number: '서답형1' },   // 레거시
  { question_format: 'Essay', question_number: 5 },        // 변형 표기
  { question_format: undefined, question_number: 6 },      // 형식 없음
];
const dist = formatDistribution(MIXED);
const sum = dist.objective + dist.short_answer + dist.essay;
ok(sum === MIXED.length, `합계 ${sum} = 문항 수 ${MIXED.length}`, JSON.stringify(dist));
ok(dist.essay === 3, '서술형 3 (표준 1 + 레거시 번호 1 + 변형 표기 1)', String(dist.essay));
ok(dist.short_answer === 1, '단답형 1', String(dist.short_answer));
ok(dist.objective === 2, '객관식 2', String(dist.objective));

console.log('\n── ⑦ 그룹핑도 전수 분배 (표에서 문항이 사라지지 않는다) ──');
const g = groupByFormat(MIXED);
ok(g.objective.length + g.short_answer.length + g.essay.length === MIXED.length, '세 그룹 합 = 전체');
ok(g.essay.some((q) => q.question_number === '서답형1'), '레거시 번호 문항이 서술형 그룹에');
ok(
  JSON.stringify(formatDistribution(MIXED)) ===
    JSON.stringify({
      objective: g.objective.length,
      short_answer: g.short_answer.length,
      essay: g.essay.length,
    }),
  '집계와 그룹핑이 같은 결과 (§12-13)',
);

console.log('\n── ⑧ 빈 입력 ──');
ok(JSON.stringify(formatDistribution([])) === JSON.stringify({ objective: 0, short_answer: 0, essay: 0 }), '빈 배열 → 0,0,0');

console.log('\n── ⑨ 라벨 ──');
ok(FORMAT_LABELS.essay === '서술형' && FORMAT_LABELS.short_answer === '단답형' && FORMAT_LABELS.objective === '객관식', '한글 라벨 3종');

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
