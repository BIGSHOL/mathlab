/**
 * 학교 공지 실측 지표 회귀 검사.
 *
 * ## 이 검사가 지키는 것
 * 이 데이터는 **대부분의 시험에서 영원히 없다.** 성적표는 시험 2~4주 뒤에 나오고,
 * 학교가 공지하지 않으면 알 방법이 없다. 그래서 "없을 때 무슨 일이 일어나는가"가
 * 기능의 본체다.
 *
 *   - 없으면 화면에 아무것도 렌더하지 않는다 (빈 슬롯·"—" 도 만들지 않는다)
 *   - 없으면 AI 프롬프트에 블록 자체를 붙이지 않는다 (빈 헤딩은 AI 가 채우려 든다, §12-14)
 *   - 아는 축만 알아도 저장·표시된다 (부분 입력이 정상)
 *   - 모르는 축을 0 이나 기본값으로 채우지 않는다 (§12-11)
 *
 * 실행: npx tsx scripts/parity/check-exam-stats.ts
 */
import {
  achievementSum,
  examStatsAttribution,
  examStatsPromptBlock,
  hasAchievement,
  hasAnyExamStats,
  readExamStats,
  toStoredExamStats,
} from '../../src/lib/exam-analysis/shared/exam-stats';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

console.log('── ① 없는 경우가 기본 — 어떤 입력이 와도 던지지 않는다 ──');
for (const [label, raw] of [
  ['null', null],
  ['undefined', undefined],
  ['빈 객체', {}],
  ['레거시 배열', ['a', 'b']],
  ['문자열', 'whatever'],
  ['숫자', 42],
] as const) {
  const s = readExamStats(raw);
  ok(!hasAnyExamStats(s) && s.subjectAverage === null && s.achievement === null, `${label} → 전부 null`);
}

console.log('\n── ② 없으면 AI 프롬프트에 블록을 붙이지 않는다 (핵심) ──');
ok(examStatsPromptBlock(readExamStats(null)) === null, '값 없음 → 블록 null (빈 헤딩을 만들지 않는다)');
ok(examStatsPromptBlock(readExamStats({ source: '학교 공지', enteredBy: '김선생' })) === null,
  '출처·입력자만 있고 수치가 없으면 여전히 블록 없음');

console.log('\n── ③ 없으면 화면에도 아무것도 없다 ──');
ok(examStatsAttribution(readExamStats(null)) === null, '출처 문구도 null');
ok(toStoredExamStats(readExamStats({})) === null, '저장 시 빈 객체가 아니라 null — 컬럼을 비운다');

console.log('\n── ④ 부분 입력이 정상이다 (아는 축만 알아도 된다) ──');
const onlyAvg = readExamStats({ subjectAverage: 73.4 });
ok(hasAnyExamStats(onlyAvg), '평균만 있어도 "값 있음"');
ok(onlyAvg.examinees === null && onlyAvg.achievement === null, '나머지는 null 유지 (0 으로 채우지 않는다)');
ok(examStatsPromptBlock(onlyAvg)!.includes('과목평균: 73.4점'), '평균만 프롬프트에');
ok(!examStatsPromptBlock(onlyAvg)!.includes('응시자'), '모르는 축은 프롬프트에 안 나온다');

const partialAch = readExamStats({ achievement: { A: 23.9, B: 23.4 } });
ok(hasAchievement(partialAch), '성취도 일부만 있어도 있음');
ok(partialAch.achievement!.C === null, '없는 등급은 null', String(partialAch.achievement!.C));
ok(achievementSum(partialAch) === 47.3, '합계는 아는 것만 더한다', String(achievementSum(partialAch)));

console.log('\n── ⑤ 성취도가 한 등급도 없으면 분포 자체가 없는 것 ──');
const emptyAch = readExamStats({ achievement: { A: 'x', B: null } });
ok(emptyAch.achievement === null, '빈 껍데기를 만들지 않는다');
ok(!hasAchievement(emptyAch), 'hasAchievement=false');
ok(achievementSum(emptyAch) === null, '합계도 null (0 이 아니다)');

console.log('\n── ⑥ 값 정규화 ──');
ok(readExamStats({ subjectAverage: '73.4' }).subjectAverage === 73.4, '문자열 숫자 수용');
ok(readExamStats({ subjectAverage: 73.456 }).subjectAverage === 73.46, '소수 둘째 자리 반올림');
ok(readExamStats({ subjectAverage: 0 }).subjectAverage === 0, '0 은 유효한 값이다 (null 이 아니다)');
ok(readExamStats({ subjectAverage: -5 }).subjectAverage === null, '범위 밖 → null');
ok(readExamStats({ subjectAverage: 150 }).subjectAverage === null, '100 초과 → null');
ok(readExamStats({ examinees: 188 }).examinees === 188, '응시자수');
ok(readExamStats({ subjectAverage: 'abc' }).subjectAverage === null, '숫자 아님 → null');

console.log('\n── ⑦ 값이 있으면 프롬프트 블록에 "추정 금지"가 함께 간다 ──');
const full = readExamStats({
  subjectAverage: 73.4,
  examinees: 188,
  achievement: { A: 23.9, B: 23.4, C: 22.9, D: 27.1, E: 2.7 },
  source: '학교 공지',
  enteredBy: '김선생',
  enteredAt: '2026-06-15T00:00:00.000Z',
});
const block = examStatsPromptBlock(full)!;
ok(block.includes('과목평균: 73.4점') && block.includes('응시자 수: 188명'), '수치가 실린다');
ok(block.includes('A 23.9% · B 23.4%'), '성취도 분포가 실린다');
ok(block.includes('추정하지 말고'), '여기 없는 지표는 추정 금지 지시가 붙는다');
ok(achievementSum(full) === 100, '분포 합 100', String(achievementSum(full)));

console.log('\n── ⑧ 출처 표기 — 검증 안 된 값임을 화면이 밝힌다 (§12-5) ──');
const attr = examStatsAttribution(full)!;
ok(attr.includes('학교 공지'), '출처', attr);
ok(attr.includes('김선생 입력'), '입력자');
ok(/\d{4}\.\d{2}\.\d{2}/.test(attr), '입력 날짜');
ok(examStatsAttribution(readExamStats({ subjectAverage: 70 })) === null, '출처 정보 없으면 문구 없음');

console.log('\n── ⑨ 합이 100 이 아니어도 저장을 막지 않는다 (학교 공지가 반올림된다) ──');
const rounded = readExamStats({ achievement: { A: 24, B: 23, C: 23, D: 27, E: 3 } });
ok(achievementSum(rounded) === 100, '합 100');
const off = readExamStats({ achievement: { A: 20, B: 20, C: 20, D: 20, E: 19 } });
ok(hasAchievement(off) && achievementSum(off) === 99, '합 99 도 그대로 통과 — 참고용이지 검증이 아니다');

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
