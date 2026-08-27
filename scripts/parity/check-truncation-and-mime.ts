/**
 * 잘린 응답·MIME 판별 검사 (적대적 리뷰 1.8 / 1.10).
 *
 * 1.8 — 뒤가 잘린 JSON 을 자동 복구해 살렸으면 "완결본"이 아니다.
 *       학습팩에는 총개수 같은 독립 기준이 없어 이 신호가 유일한 판별 수단이다.
 * 1.10 — 업로드는 png/jpg/webp 를 받는데 분석 라우트가 전부 image/jpeg 로 신고했다.
 *
 * 실행: npx tsx scripts/parity/check-truncation-and-mime.ts
 */
import { detectMimeFromBase64, parseJsonResponse } from '../../src/lib/exam-analysis/ai-engine';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

console.log('── 1.8 잘린 JSON 은 복구되더라도 신고되는가 ──');
const truncated = '{"vocab":[{"word":"however","count":2}],"structures":[';
let kinds: string[] = [];
const parsed = parseJsonResponse<{ vocab: unknown[] }>(truncated, (k) => kinds.push(k));
ok(Array.isArray(parsed.vocab) && parsed.vocab.length === 1, '앞부분은 살려낸다');
ok(kinds.includes('truncated'), '잘렸다는 신호를 준다', kinds.join(',') || '(신호 없음)');

kinds = [];
parseJsonResponse('{"a":1}', (k) => kinds.push(k));
ok(kinds.length === 0, '온전한 JSON 은 신호 없음');

console.log('\n── 1.10 파일 형식을 바이트로 판별하는가 ──');
const cases: Array<[string, string, string]> = [
  ['PNG', 'iVBORw0KGgoAAAANSUhEUg', 'image/png'],
  ['JPEG', '/9j/4AAQSkZJRgABAQAA', 'image/jpeg'],
  ['WEBP', 'UklGRiIAAABXRUJQVlA4', 'image/webp'],
  ['PDF', 'JVBERi0xLjQKJcOkw7z', 'application/pdf'],
];
for (const [label, b64, want] of cases) {
  const got = detectMimeFromBase64(b64);
  ok(got === want, `${label} → ${want}`, String(got));
}
ok(detectMimeFromBase64('data:image/webp;base64,UklGRiIAAABXRUJQVlA4') === 'image/webp', 'data URI 도 처리');
ok(detectMimeFromBase64('zzzz') === null, '모르면 null (호출부가 폴백)');

console.log('\n──────────────────────────────');
if (fail) {
  console.log(`❌ ${fail}건 실패`);
  process.exit(1);
}
console.log('✅ 전부 통과');
