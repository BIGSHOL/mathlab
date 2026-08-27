/**
 * 사용자 노출 에러 문구(2.2) 회귀 검사 — CLAUDE.md #0-1.
 *
 * 실제 유출 사례를 그대로 케이스로 박아 둔다. 새 실행기/SDK를 붙일 때 이 검사가
 * 깨지면, 그 메시지가 사용자 화면에 그대로 뜬다는 뜻이다.
 *
 * 실행: npx tsx scripts/parity/check-error-message.ts
 */
import { toUserFacingError } from '../../src/lib/exam-analysis/shared/error-message';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

/** 금지: 벤더명·환경변수·CLI 플래그·스택·경로·영문 예외가 결과에 남으면 안 된다 */
const FORBIDDEN = /gemini|claude|anthropic|openai|grok|supabase|vercel|prisma|API_KEY|환경\s*변수|--[a-z-]{2,}|\bError\b|\bat\s+\w+\(|ENOENT|ETIMEDOUT/i;

console.log('── ① 유출된 적 있는 실제 메시지가 가려지는가 ──');
const leaked: Array<[string, string]> = [
  ['GEMINI_API_KEY 환경변수가 설정되지 않았습니다', '환경변수 + 벤더 키 이름'],
  ['AI 실행기가 종료되었습니다 (code 1) Error: When using --print, --output-format=stream-json requires --verbose', '실제 토스트 유출 사례'],
  ['Not logged in · run `claude login`', 'CLI 인증'],
  ['Error: connect ECONNREFUSED 127.0.0.1:5432', '인프라 접속'],
  ['[GoogleGenerativeAI Error]: 429 Too Many Requests', '벤더 + 상태코드'],
  ['TypeError: Cannot read properties of undefined (reading \'questions\')\n    at analyzeExam (/src/lib/exam-analysis/ai-engine.ts:412:9)', '스택트레이스'],
  ['PrismaClientKnownRequestError: Invalid `prisma.examPaper.update()` invocation', 'ORM 내부'],
  ['fetch failed', '영문 일반 예외'],
];
for (const [raw, label] of leaked) {
  const out = toUserFacingError(raw);
  ok(!FORBIDDEN.test(out) && /[가-힣]/.test(out), label, JSON.stringify(out));
}

console.log('\n── ② 우리가 한국어로 쓴 안내 문구는 원문 그대로 통과하는가 ──');
const safe = [
  '시험지 파일이 없습니다',
  '분석된 문항이 없습니다',
  '기본 분석을 먼저 실행하세요',
  '이 시험지는 예전 버전으로 분석되어 문항에 단어·구문 정보가 없습니다. 시험지를 다시 분석하면 채워집니다.',
  '분석이 시간 제한을 넘겨 중단되었습니다. 다시 실행해 주세요.',
  '영어 시험지만 단어·구문을 정리합니다',
];
for (const msg of safe) ok(toUserFacingError(msg) === msg, msg.slice(0, 30));

console.log('\n── ③ 원인별로 할 일을 알려주는가 (전부 같은 문구로 뭉개지지 않는가) ──');
const categorized = [
  ['GEMINI_API_KEY 환경변수가 설정되지 않았습니다', '연결'],
  ['429 rate limit exceeded', '몰려'],
  ['Request timed out after 120000ms', '초과'],
  ['ENOENT: no such file or directory', '파일'],
  ['Unexpected token < in JSON at position 0', '읽지'],
];
for (const [raw, expect] of categorized) {
  const out = toUserFacingError(raw);
  ok(out.includes(expect), `${raw.slice(0, 34)} → "${expect}"`, out);
}
const distinct = new Set(categorized.map(([r]) => toUserFacingError(r)));
ok(distinct.size === categorized.length, '5개 범주가 서로 다른 문구', `${distinct.size}종`);

console.log('\n── ④ 빈 값·비문자열 ──');
ok(/[가-힣]/.test(toUserFacingError(null)), 'null → 기본 문구');
ok(/[가-힣]/.test(toUserFacingError(undefined)), 'undefined → 기본 문구');
ok(/[가-힣]/.test(toUserFacingError('   ')), '공백 → 기본 문구');
ok(toUserFacingError(new Error('시험지 파일이 없습니다')) === '시험지 파일이 없습니다', 'Error 객체도 처리');
ok(toUserFacingError('boom', '전용 문구입니다') === '전용 문구입니다', '기능별 기본 문구 지정');

console.log('\n──────────────────────────────');
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log('✅ 전부 통과');
