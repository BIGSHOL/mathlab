/**
 * 영어 수준별 학습 전략 회귀 검사.
 *
 * ## 왜 있는가
 * `data/english/levelStrategies.ts` 는 완성된 데이터인데 **어느 화면에도 붙어 있지 않았다.**
 * 이제 붙이면서, 이 데이터가 **고등 전용 언어**("수능 필수 어휘 1000개", "5~6등급")라는 사실을
 * 검사로 고정한다. 중학 시험지에 붙으면 맞지 않는 조언이 된다.
 *
 * 실행: npx tsx scripts/parity/check-english-level-strategy.ts
 */
import {
  englishLevelStrategiesFor,
  isHighSchoolGrade,
} from '../../src/lib/exam-analysis/shared/english-level-strategy';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

console.log('── ① 학년 게이트 ──');
ok(isHighSchoolGrade('고1') && isHighSchoolGrade('고2') && isHighSchoolGrade('고3'), '고1~고3은 고등');
ok(isHighSchoolGrade(' 고1 '), '앞뒤 공백 허용');
ok(!isHighSchoolGrade('중1') && !isHighSchoolGrade('중3'), '중학은 고등이 아니다');
ok(!isHighSchoolGrade(null) && !isHighSchoolGrade(undefined) && !isHighSchoolGrade(''), '모르면 고등이 아니다');

console.log('\n── ② 중학 시험지에는 붙이지 않는다 ──');
for (const g of ['중1', '중2', '중3', null, undefined, '']) {
  ok(englishLevelStrategiesFor(g as string).length === 0, `${g ?? '(없음)'} → 빈 배열`);
}

console.log('\n── ③ 고등이면 3단계 ──');
{
  const s = englishLevelStrategiesFor('고1');
  ok(s.length === 3, '3개', String(s.length));
  ok(s.map((x) => x.level).join(',') === '하위권,중위권,상위권', '정의 순서 유지', s.map((x) => x.level).join(','));
}

console.log('\n── ④ 데이터 무결성 (빈 칸이 화면에 나가면 안 된다) ──');
{
  const s = englishLevelStrategiesFor('고2');
  for (const x of s) {
    ok(!!x.level && !!x.targetGrade && !!x.description, `${x.level}: 라벨·등급·설명 채워짐`);
    ok(x.coreStrategies.length > 0 && x.coreStrategies.every((c) => c.trim().length > 0), `${x.level}: 핵심 전략 비어 있지 않음 (${x.coreStrategies.length}개)`);
    ok(!!x.studyHours && !!x.keyPrinciple, `${x.level}: 학습량·핵심원칙 채워짐`);
    ok(Array.isArray(x.recommendedBooks), `${x.level}: 교재는 배열`);
  }
}

console.log('\n── ⑤ 고등 전용 데이터임을 고정 ──');
{
  // 이 문구들이 있는 한 중학에 붙이면 안 된다. 데이터가 중학까지 확장되면 이 검사가 먼저 깨져
  // 학년 게이트를 다시 판단하게 만든다.
  const all = JSON.stringify(englishLevelStrategiesFor('고1'));
  ok(/수능|등급/.test(all), '수능·등급 언어가 실제로 들어 있다 (게이트가 필요한 이유)');
}

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
