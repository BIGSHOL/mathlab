/**
 * 학생 답안 판정(정답률) 회귀 검사 — "정답률 0%" 가짜 수치 재발 방지.
 *
 * 배경: 이 제품은 학생 답안지를 받지 않는다. 그런데 `is_correct !== null` 로 판정하면
 * `undefined !== null` 이 참이라 **키가 아예 없는 레거시 문항**이 전부 "답안 있음"으로 잡히고,
 * 이어지는 `=== true` 집계는 0이라 "정답률 0%" 가 만들어진다. 그 문장은 KPI 블록 →
 * 블로그 이미지 캡션으로 **학부모에게 발행된다**. `questions` 는 Prisma `Json` 이라
 * 타입 선언은 런타임 근거가 되지 못한다(CLAUDE.md #11).
 *
 * 실행: npx tsx scripts/parity/check-student-answers.ts
 */
import { execSync } from 'node:child_process';
import { gradedQuestions, hasStudentAnswers, correctRatePct } from '../../src/lib/exam-analysis/shared/student-answers';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

console.log('── ① 헬퍼가 열화 입력을 엄격히 판정하는가 ──');
// 레거시 행: is_correct 키 자체가 없다 (하드닝 이전에 저장된 분석본)
const legacy = [{ question_number: 1 }, { question_number: 2 }] as Array<{ is_correct?: unknown }>;
ok(!hasStudentAnswers(legacy), '키 없는 레거시 문항 → 답안 없음');
ok(correctRatePct(legacy) === null, '레거시 정답률 = null (0% 아님)', String(correctRatePct(legacy)));

// AI 가 문자열을 준 경우
const stringy = [{ is_correct: 'false' }, { is_correct: 'true' }] as Array<{ is_correct?: unknown }>;
ok(!hasStudentAnswers(stringy), '문자열 "true"/"false" → 답안 없음');
ok(correctRatePct(stringy) === null, '문자열 정답률 = null');

// 명시 null (하드닝 이후 정상 경로)
const nulled = [{ is_correct: null }, { is_correct: null }];
ok(!hasStudentAnswers(nulled), '명시 null → 답안 없음');
ok(correctRatePct(nulled) === null, 'null 정답률 = null');

// 실제 채점 데이터
const graded = [{ is_correct: true }, { is_correct: false }, { is_correct: true }];
ok(hasStudentAnswers(graded), '실제 boolean → 답안 있음');
ok(correctRatePct(graded) === 67, '정답률 2/3 → 67%', String(correctRatePct(graded)));
ok(gradedQuestions([...graded, ...legacy]).length === 3, '혼재 시 채점된 것만 집계');

// 부분 채점 — 일부만 boolean 이면 그 일부만 모수가 된다
const partial = [{ is_correct: true }, { is_correct: null }, {}] as Array<{ is_correct?: unknown }>;
ok(correctRatePct(partial) === 100, '부분 채점: 모수는 boolean 인 것만', String(correctRatePct(partial)));

console.log('\n── ② 금지 패턴이 코드에 되살아나지 않았는가 ──');
// `is_correct !== null` / `!== undefined` 는 위 함정을 그대로 재현한다.
// 허용: 이 검사, 헬퍼 자신의 경고 주석, cross-validator(값을 지우는 정규화 경로라 무해).
const ALLOW = /shared[\/]student-answers\.ts|parity[\/]check-student-answers\.ts|cross-validator\.ts|recommendedBooks\.ts/;
let hits: string[] = [];
try {
  hits = execSync('git grep -n "is_correct !== null" -- src', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    // 주석 줄(설명·경고)은 제외 — 실제 판정 코드만 본다
    .filter((l) => !/:\s*(\/\/|\*|\/\*)/.test(l.replace(/^[^:]+:\d+:/, ':')))
    .filter((l) => !ALLOW.test(l));
} catch {
  /* git grep 은 매치 0건이면 exit 1 */
}
ok(hits.length === 0, '판정 코드에 `is_correct !== null` 없음', hits.join(' | '));

console.log(`\n${fail === 0 ? '통과' : `실패 ${fail}건`}\n`);
process.exit(fail === 0 ? 0 : 1);
