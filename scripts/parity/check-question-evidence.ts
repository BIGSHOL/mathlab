/**
 * 문항 근거 추출 회귀 검사.
 *
 * ## 왜 있는가
 * 학습 대책 탭의 조언은 전부 정적 카탈로그라 어느 시험에서나 같은 문장이 나왔다.
 * 같은 분석본 안에 문항별 `ai_comment` / `difficulty_reason` 이 있는데도 대책 탭에서는 버려졌다.
 * 이 검사는 그 근거를 추려내는 규칙을 고정한다.
 *
 * 검사 절반이 **"근거가 없을 때"** 를 본다 — 옛 분석본·저신뢰 문항·placeholder 는
 * 두 필드가 비어 있는 것이 정상이고, 그때 번호만 있는 빈 줄을 만들면 안 된다.
 *
 * 실행: npx tsx scripts/parity/check-question-evidence.ts
 */
import {
  collectQuestionEvidence,
  toQuestionEvidence,
} from '../../src/lib/exam-analysis/shared/question-evidence';
import type { AnalyzedQuestion } from '../../src/lib/exam-analysis/types';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

/** 검사에 필요한 필드만 채운 문항 (나머지는 실제 타입의 기본 모양) */
function q(p: Partial<AnalyzedQuestion>): AnalyzedQuestion {
  return {
    question_number: 1,
    question_format: null,
    difficulty: null,
    difficulty_reason: null,
    question_type: null,
    points: null,
    topic: null,
    ai_comment: null,
    confidence: 0.9,
    confidence_reason: null,
    is_correct: null,
    student_answer: null,
    earned_points: null,
    error_type: null,
    ...p,
  };
}

console.log('── ① 근거가 없으면 만들지 않는다 ──');
ok(toQuestionEvidence(q({ question_number: 3 })) === null, '두 필드 모두 null → null');
ok(toQuestionEvidence(q({ ai_comment: '   ' })) === null, '공백뿐인 소견 → null');
ok(toQuestionEvidence(q({ ai_comment: '', difficulty_reason: '' })) === null, '빈 문자열 → null');
ok(collectQuestionEvidence([q({}), q({}), q({})]).length === 0, '전부 비면 빈 배열');
ok(collectQuestionEvidence([]).length === 0, '빈 입력 → 빈 배열');

console.log('\n── ② 한쪽만 있어도 근거다 ──');
ok(toQuestionEvidence(q({ ai_comment: '이차함수 최댓값' })) !== null, '소견만 있어도 통과');
ok(toQuestionEvidence(q({ difficulty_reason: '보조선이 비자명' })) !== null, '난이도 근거만 있어도 통과');
{
  const ev = toQuestionEvidence(q({ ai_comment: '설명', difficulty_reason: null }));
  ok(ev?.reason === null, '없는 쪽은 null 로 남는다 (빈 문자열로 채우지 않음)');
}

console.log('\n── ③ placeholder 안내문은 근거가 아니다 ──');
{
  const ev = toQuestionEvidence(q({ ai_comment: '⚠️ 자동 분석에 실패한 문항입니다' }));
  ok(ev === null, '⚠️ 로 시작하는 소견만 있으면 제외');
  const ev2 = toQuestionEvidence(
    q({ ai_comment: '⚠️ 자동 분석 실패', difficulty_reason: '배점으로 추정' }),
  );
  ok(ev2 !== null && ev2.comment === null, '난이도 근거는 살리고 ⚠️ 소견만 버린다');
}

console.log('\n── ④ 문항 번호는 원본 문자열을 보존한다 ──');
{
  const ev = toQuestionEvidence(q({ question_number: '서답형2', ai_comment: 'x' }));
  ok(ev?.number === '서답형2', '"서답형2" 가 숫자로 뭉개지지 않는다');
  const ev2 = toQuestionEvidence(q({ question_number: 7, ai_comment: 'x' }));
  ok(ev2?.number === '7', '숫자 번호는 문자열로');
}

console.log('\n── ⑤ 배점 0 과 배점 모름을 구분한다 (§12-11) ──');
{
  const zero = toQuestionEvidence(q({ points: 0, ai_comment: 'x' }));
  ok(zero?.points === 0, '0점은 0으로 살아남는다');
  const unknown = toQuestionEvidence(q({ points: null, ai_comment: 'x' }));
  ok(unknown?.points === null, '모르는 배점은 null (0으로 채우지 않음)');
  const nan = toQuestionEvidence(q({ points: Number.NaN, ai_comment: 'x' }));
  ok(nan?.points === null, 'NaN 은 null 로');
}

console.log('\n── ⑥ 정렬: 배점 큰 순 → 난이도 높은 순 → 원래 순서 ──');
{
  const list = collectQuestionEvidence([
    q({ question_number: 1, points: 3, difficulty: '2', ai_comment: 'a' }),
    q({ question_number: 2, points: 9, difficulty: '3', ai_comment: 'b' }),
    q({ question_number: 3, points: 3, difficulty: '5', ai_comment: 'c' }),
  ]);
  ok(list.map((e) => e.number).join(',') === '2,3,1', '9점 → 3점Lv5 → 3점Lv2', list.map((e) => e.number).join(','));
}
{
  // 배점·난이도가 같으면 입력 순서를 지켜야 잘라도 결과가 흔들리지 않는다
  const list = collectQuestionEvidence([
    q({ question_number: 11, points: 4, difficulty: '3', ai_comment: 'a' }),
    q({ question_number: 12, points: 4, difficulty: '3', ai_comment: 'b' }),
  ]);
  ok(list.map((e) => e.number).join(',') === '11,12', '동점이면 원래 순서 유지 (안정 정렬)');
}

console.log('\n── ⑦ 상위 N개를 잘라도 가장 무거운 문항이 남는다 ──');
{
  const list = collectQuestionEvidence([
    q({ question_number: 1, points: 2, ai_comment: 'a' }),
    q({ question_number: 2, points: 2, ai_comment: 'b' }),
    q({ question_number: 3, points: 2, ai_comment: 'c' }),
    q({ question_number: 4, points: 2, ai_comment: 'd' }),
    q({ question_number: 5, points: 2, ai_comment: 'e' }),
    q({ question_number: '서술형1', points: 10, ai_comment: 'heavy' }),
  ]);
  ok(list.slice(0, 5).some((e) => e.number === '서술형1'), '10점 서술형이 상위 5개 안에');
}

console.log('\n── ⑧ 근거 없는 문항은 목록에서 빠진다 (입력보다 짧아진다) ──');
{
  const list = collectQuestionEvidence([
    q({ question_number: 1, ai_comment: 'a' }),
    q({ question_number: 2 }),
    q({ question_number: 3, difficulty_reason: 'r' }),
  ]);
  ok(list.length === 2, '3문항 중 근거 있는 2개만', String(list.length));
  ok(!list.some((e) => e.number === '2'), '근거 없는 2번은 빠짐');
}

console.log('\n── ⑨ 서술형 판정은 공유 술어를 따른다 ──');
{
  const ev = toQuestionEvidence(q({ question_number: '서답형1', ai_comment: 'x' }));
  ok(ev?.isEssay === true, '형식 null + "서답형1" → 서술형 (question-format 과 동일 판정)');
  const ev2 = toQuestionEvidence(q({ question_number: 5, question_format: 'objective', ai_comment: 'x' }));
  ok(ev2?.isEssay === false, '객관식은 서술형 아님');
}

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
