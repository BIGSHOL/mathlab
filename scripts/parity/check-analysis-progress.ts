/**
 * 분석 진행 로그 회귀 검사.
 *
 * ## 고친 증상
 * 화면에 이런 로그가 반복됐다 — 시험지 파일이 **한 장**뿐인데도:
 *
 *     11:40:47  시험지 페이지를 확인하는 중
 *     11:41:00  시험지 파일을 읽는 중
 *     11:41:12  시험지 페이지를 확인하는 중
 *     11:41:28  시험지 파일을 읽는 중   ...
 *
 * 원인 3가지:
 *   ① 실행기 이벤트를 3개 문구로 뭉개면서 쪽 번호를 버림 → 서로 다른 이벤트가 같아 보임
 *   ② 중복 제거가 "직전 한 줄"만 봐서 A,B,A,B 는 한 번도 안 걸림
 *   ③ 초기화 이벤트의 **도구 목록**(Read/Write/…)이 문자열 매칭에 걸려,
 *      아무것도 안 읽었는데 "읽는 중"이 찍힘
 *
 * 실행: npx tsx scripts/parity/check-analysis-progress.ts
 */
import {
  PROGRESS_STAGE,
  cliProgressStage,
  getAnalysisProgress,
  progressFromCliNdjsonLine,
  pushAnalysisProgress,
  resetAnalysisProgress,
  stageForStep,
} from '../../src/lib/exam-analysis/analysis-progress';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

console.log('── ① 초기화 이벤트가 "읽는 중"으로 오검출되지 않는가 ──');
const initEvent = JSON.stringify({
  type: 'system',
  subtype: 'init',
  tools: ['Read', 'Write', 'Bash', 'Glob'],
});
ok(progressFromCliNdjsonLine(initEvent) === null, '도구 목록만 든 init 이벤트 → 무시');
ok(progressFromCliNdjsonLine('{"tools":["Read"]}') === null, 'tools 키가 있으면 무시');
ok(progressFromCliNdjsonLine('not json') === null, 'JSON 아니면 무시');
ok(progressFromCliNdjsonLine('{"type":"assistant","message":{}}') === null, '건질 정보 없으면 무시');

console.log('\n── ② 쪽 번호를 살리는가 (읽기 호출과 그 결과가 같은 문구로 합쳐지는가) ──');
const toolCall = JSON.stringify({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/tmp/ex/page-003.png' } }] },
});
const toolResult = JSON.stringify({
  type: 'user',
  message: { content: [{ type: 'tool_result', content: 'read /tmp/ex/page-003.png (1 image)' }] },
});
ok(progressFromCliNdjsonLine(toolCall) === '시험지 3쪽 읽는 중', '읽기 호출 → "3쪽 읽는 중"', String(progressFromCliNdjsonLine(toolCall)));
ok(
  progressFromCliNdjsonLine(toolResult) === progressFromCliNdjsonLine(toolCall),
  '호출과 결과가 **같은 문구** (번갈아 나오던 원인 제거)',
);
// 레거시 계약 — verify-english-taxonomy.ts 가 의존
ok(
  progressFromCliNdjsonLine('{"type":"tool_call","name":"read_file"}') === '시험지 파일을 읽는 중',
  '쪽 번호를 못 찾으면 기존 문구 유지',
);

console.log('\n── ③ 같은 일이 반복되면 줄이 아니라 횟수로 (한 쪽을 몇 번 읽었는지) ──');
const A = 'exam-A';
resetAnalysisProgress(A);
for (let i = 0; i < 4; i++) pushAnalysisProgress(A, '시험지 1쪽 읽는 중', PROGRESS_STAGE.READ);
let logs = getAnalysisProgress(A);
ok(logs.length === 1, '4번 반복 → 1줄', `${logs.length}줄`);
ok(logs[0].msg === '시험지 1쪽 읽는 중 (4회)', '횟수 표기', logs[0].msg);

// 실제로 문제가 됐던 A,B,A,B 패턴
resetAnalysisProgress(A);
for (let i = 0; i < 4; i++) {
  pushAnalysisProgress(A, '시험지 1쪽 읽는 중', PROGRESS_STAGE.READ);
  pushAnalysisProgress(A, '시험지 파일을 읽는 중', PROGRESS_STAGE.READ);
}
logs = getAnalysisProgress(A);
ok(logs.length === 2, 'A,B,A,B 8번 → 2줄 (예전엔 8줄)', `${logs.length}줄`);

console.log('\n── ④ 도착 순서가 아니라 파이프라인 순서로 재배열되는가 ──');
const B = 'exam-B';
resetAnalysisProgress(B);
// 일부러 뒤섞어 넣는다 — 실제로는 일어난 일들이고, 배열만 사람이 읽기 좋게 바꾼다
pushAnalysisProgress(B, '분석 완료', PROGRESS_STAGE.DONE);
pushAnalysisProgress(B, '시험지 3쪽 읽는 중', PROGRESS_STAGE.READ);
pushAnalysisProgress(B, '시험지 파일 3개 로드 완료', PROGRESS_STAGE.LOAD_DONE);
pushAnalysisProgress(B, '시험지 1쪽 읽는 중', PROGRESS_STAGE.READ);
pushAnalysisProgress(B, '문항 21개 수신, 검증 중', PROGRESS_STAGE.RECEIVED);
pushAnalysisProgress(B, '시험지 파일을 불러오는 중', stageForStep(1));
pushAnalysisProgress(B, '시험지 2쪽 읽는 중', PROGRESS_STAGE.READ);
pushAnalysisProgress(B, '로컬 분석기 호출 (3개 파일)', cliProgressStage('로컬 분석기 호출 (3개 파일)'));

const order = getAnalysisProgress(B).map((l) => l.msg);
console.log(order.map((m, i) => `     ${i + 1}. ${m}`).join('\n'));
const expected = [
  '시험지 파일을 불러오는 중',
  '시험지 파일 3개 로드 완료',
  '로컬 분석기 호출 (3개 파일)',
  '시험지 1쪽 읽는 중',
  '시험지 2쪽 읽는 중',
  '시험지 3쪽 읽는 중',
  '문항 21개 수신, 검증 중',
  '분석 완료',
];
ok(JSON.stringify(order) === JSON.stringify(expected), '파이프라인 순서 + 쪽 번호 순');

console.log('\n── ⑤ 실행기 호출은 쪽 읽기보다 앞 ──');
ok(cliProgressStage('로컬 분석기 호출 (1개 파일)') < cliProgressStage('시험지 1쪽 읽는 중'), '호출 < 읽기');
ok(stageForStep(1) < PROGRESS_STAGE.LOAD_DONE, 'step1 진입 < 로드 완료');
ok(PROGRESS_STAGE.RECEIVED < stageForStep(4), '문항 수신 < step4 진입');

console.log('\n── ⑥ 재배열해도 시각이 거꾸로 가지 않는가 ──');
// 한 쪽을 다시 읽어도 그 줄은 위쪽에 남는다 → 시각을 갱신하면 목록의 시간이 역전된다
const C = 'exam-C';
resetAnalysisProgress(C);
pushAnalysisProgress(C, '시험지 1쪽 읽는 중', PROGRESS_STAGE.READ);
const t1 = getAnalysisProgress(C)[0].time;
pushAnalysisProgress(C, '시험지 2쪽 읽는 중', PROGRESS_STAGE.READ);
pushAnalysisProgress(C, '시험지 1쪽 읽는 중', PROGRESS_STAGE.READ); // 1쪽 재읽기
const after = getAnalysisProgress(C);
ok(after[0].time === t1, '재읽기해도 첫 발생 시각 유지', `${t1} → ${after[0].time}`);
ok(after[0].msg.includes('(2회)'), '대신 횟수로 표시', after[0].msg);
const times = after.map((l) => l.time);
ok([...times].sort().join() === times.join(), '목록 전체 시각이 오름차순', times.join(' → '));

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
