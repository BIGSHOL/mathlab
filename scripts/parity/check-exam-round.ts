/**
 * 시험 회차 판정 회귀 검사.
 *
 * ## 고친 증상
 * 업로드 시 `examScope` 에 회차를 구조화 저장해 두고도 비교 데이터를 모으는 쪽은
 * **제목 정규식**으로 판정했고, 판정 로직이 여러 곳에 복제되면서 정규식마저 갈라졌다
 * (`/(20\d{2})년?/` vs `/(20\d{2})년/`). 화면 배지는 "비교 가능 N건"이라 말하는데
 * 총평에는 데이터가 안 들어가는 불일치가 가능한 상태였다.
 *
 * 그리고 `examScope` 는 Prisma `Json?` 이라 **신형 객체 / 레거시 `string[]` / null**
 * 세 형태가 혼재한다. 배열을 먼저 걸러내지 않으면 `raw.examYear` 가 `undefined` 로
 * 조용히 통과해 "판정 불가"가 "값 없음"으로 위장된다(§11).
 *
 * 실행: npx tsx scripts/parity/check-exam-round.ts
 */
import { readExamRound, isSameRound } from '../../src/lib/exam-analysis/shared/exam-round';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}
const show = (r: ReturnType<typeof readExamRound>) => `${r.year ?? '-'}/${r.semester ?? '-'}/${r.categoryKo ?? '-'}`;

console.log('── ① 구조화 메타(examScope)를 우선 읽는가 ──');
const structured = readExamRound({
  title: '엉뚱한 제목',
  examScope: { topics: ['다항식'], examYear: 2026, examSemester: 1, examCategory: 'MIDTERM' },
});
ok(structured.year === '2026' && structured.semester === '1' && structured.categoryKo === '중간',
  'examScope 가 제목을 이긴다', show(structured));
ok(readExamRound({ examScope: { examCategory: 'FINAL' } }).categoryKo === '기말', 'FINAL → 기말');
ok(readExamRound({ examScope: { examCategory: 'MOCK' } }).categoryKo === '모의', 'MOCK → 모의');
ok(readExamRound({ examScope: { examCategory: 'midterm' } }).categoryKo === '중간', '대소문자 무시');
ok(readExamRound({ examScope: { examCategory: 'OTHER' } }).categoryKo === null, '매핑 없는 값 → null');

console.log('\n── ② 레거시 string[] examScope 를 값으로 착각하지 않는가 (§11) ──');
const legacy = readExamRound({ title: '2025년 1학기 중간고사', examScope: ['다항식', '이차방정식'] });
ok(legacy.year === '2025' && legacy.semester === '1' && legacy.categoryKo === '중간',
  '배열은 무시하고 제목 폴백', show(legacy));
ok(readExamRound({ title: null, examScope: ['a'] }).year === null, '배열 + 제목 없음 → 전부 null');

console.log('\n── ③ 제목 폴백 (examScope 없이 생성되는 시험지가 아직 있다) ──');
ok(show(readExamRound({ title: '2025년 1학기 중간고사' })) === '2025/1/중간', '표준 제목', show(readExamRound({ title: '2025년 1학기 중간고사' })));
ok(readExamRound({ title: '2025 1학기 중간' }).year === '2025', '"년" 없는 연도도 잡는다 (관대한 쪽 채택)');
ok(readExamRound({ title: '2026년 2 학기 기말' }).semester === '2', '학기 앞뒤 공백 허용');
ok(readExamRound({ title: '2025년 1학기' }).semester === '1', '시험종류 없이 학기만');
ok(readExamRound({ title: '2025년 1학기' }).categoryKo === null, '없는 축은 null (기본값으로 채우지 않는다)');

console.log('\n── ④ 축별 독립 폴백 — 한 축이 비어도 나머지는 살린다 ──');
const partial = readExamRound({ title: '2025년 1학기 중간고사', examScope: { examYear: 2026 } });
ok(partial.year === '2026', '연도는 메타에서', partial.year ?? '-');
ok(partial.semester === '1' && partial.categoryKo === '중간', '학기·종류는 제목에서 보충', show(partial));

console.log('\n── ⑤ 판정 불가는 null ──');
ok(show(readExamRound({})) === '-/-/-', '아무 정보 없음');
ok(show(readExamRound({ title: '', examScope: null })) === '-/-/-', '빈 제목 + null scope');
ok(readExamRound({ examScope: { examYear: 'abc' } }).year === null, '숫자 아닌 연도 → null');
ok(readExamRound({ examScope: { examYear: '2025' } }).year === '2025', '문자열 숫자도 수용');

console.log('\n── ⑥ 비교 축을 호출부가 고른다 (연도 비교 vs 동시기 비교는 정반대) ──');
const base = readExamRound({ examScope: { examYear: 2026, examSemester: 1, examCategory: 'MIDTERM' } });
const lastYear = readExamRound({ examScope: { examYear: 2025, examSemester: 1, examCategory: 'MIDTERM' } });
const sameYearFinal = readExamRound({ examScope: { examYear: 2026, examSemester: 1, examCategory: 'FINAL' } });
ok(isSameRound(base, lastYear, { semester: true, category: true }), '작년 같은 회차 — 연도 축 빼면 통과');
ok(!isSameRound(base, lastYear, { year: true, semester: true, category: true }), '연도 축을 켜면 탈락');
ok(!isSameRound(base, sameYearFinal, { year: true, semester: true, category: true }), '같은 연도라도 기말은 탈락');

console.log('\n── ⑦ 기준에 없는 축은 후보를 떨어뜨리지 않는다 ──');
const vague = readExamRound({ title: '2026년' });        // 학기·종류 모름
const anything = readExamRound({ title: '2026년 2학기 기말' });
ok(isSameRound(vague, anything, { year: true, semester: true, category: true }),
  '기준이 모르는 축은 검사하지 않는다 — 모른다고 떨어뜨리면 비교가 통째로 사라진다');
ok(!isSameRound(vague, readExamRound({ title: '2025년 2학기 기말' }), { year: true }), '아는 축(연도)은 그대로 검사');

console.log('\n── ⑧ 제목이 없어도 메타만으로 판정된다 (예전엔 !title 로 무조건 탈락) ──');
const noTitle = readExamRound({ title: null, examScope: { examYear: 2026, examSemester: 1, examCategory: 'MIDTERM' } });
ok(show(noTitle) === '2026/1/중간', '제목 없음 + 메타 완비', show(noTitle));
ok(isSameRound(base, noTitle, { year: true, semester: true, category: true }), '비교 대상으로 통과');

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
