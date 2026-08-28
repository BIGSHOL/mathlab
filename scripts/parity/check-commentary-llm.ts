/**
 * 총평 LLM 게이트웨이 배선 검사 — 모델 전환이 조용히 절반만 되는 것을 막는다.
 *
 * 배경: 모델 호출이 5곳에 흩어져 각자 모델명·max_tokens·temperature 를 들고 있었다.
 * 한 곳만 빠뜨리면 그 경로만 옛 모델로 남고, 실행하기 전까지 아무도 모른다.
 *
 * 실행: npx tsx scripts/parity/check-commentary-llm.ts
 */
import { readFileSync } from 'node:fs';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

const GATEWAY = 'src/lib/exam-analysis/shared/commentary-llm.ts';
const AGENT = 'src/lib/exam-analysis/agents/commentary-agent.ts';
const ARTICLE = 'src/lib/exam-analysis/article-generator.ts';
const read = (p: string) => readFileSync(p, 'utf8');

console.log('\n── ① 모델 문자열이 게이트웨이 한 곳에만 있는가 ──');
const gw = read(GATEWAY);
ok(/const DEEPSEEK_MODEL = 'deepseek-v4-pro'/.test(gw), '1차 모델은 deepseek-v4-pro');
ok(/const CLAUDE_MODEL = 'claude-sonnet-5'/.test(gw), '폴백 모델은 claude-sonnet-5');

// 호출부에 모델 문자열이 흩어져 있으면 게이트웨이를 우회한 것이다.
// 예외: article-generator 의 스트리밍 경로는 delta 가 필요해 직결을 유지한다(주석으로 명시됨).
const agent = read(AGENT);
ok(!/claude-|deepseek-/.test(agent), 'commentary-agent 에 모델 문자열이 없다',
   (agent.match(/(claude|deepseek)-[a-z0-9-]+/g) || []).join(', '));

console.log('\n── ② 폐기된 모델·파라미터가 남아 있지 않은가 ──');
for (const [p, label] of [[AGENT, 'commentary-agent'], [ARTICLE, 'article-generator'], [GATEWAY, 'gateway']] as const) {
  const src = read(p);
  ok(!src.includes('claude-sonnet-4-6'), `${label}: 구모델 claude-sonnet-4-6 없음`);
}
// Sonnet 5 는 temperature/top_p/top_k 를 400 으로 거부한다.
// 게이트웨이는 인자로 받되 Claude 요청에는 싣지 않는다 — 그 사실을 구조로 고정한다.
const claudeCall = gw.slice(gw.indexOf('async function callClaude'));
ok(!/temperature:/.test(claudeCall), 'Claude 요청에 temperature 를 싣지 않는다 (Sonnet 5 는 400)');
ok(/thinking: \{ type: 'disabled' \}/.test(claudeCall),
   'Claude 요청이 thinking 을 명시적으로 끈다 (생략 시 adaptive 로 켜져 max_tokens 잠식)');
const articleSrc = read(ARTICLE);
const streamCall = articleSrc.slice(articleSrc.indexOf('client.messages.stream'));
ok(!/temperature:/.test(streamCall.slice(0, 400)), 'article 스트리밍도 temperature 를 싣지 않는다');

console.log('\n── ③ 폴백이 조용하지 않은가 (§12-10) ──');
ok(/console\.warn\([^)]*폴백/.test(gw), '폴백 시 경고 로그를 남긴다');
ok(/DEEPSEEK_API_KEY 없음/.test(gw), '1차 키 부재도 로그로 남긴다');

console.log('\n── ④ 추론 토큰 여유분 ──');
// DeepSeek 은 추론 모델이라 max_tokens 가 사고+본문 합계 상한이다.
// 여유분이 없으면 사고가 예산을 다 먹고 finish_reason:'length' 로 빈 응답이 온다(실측).
ok(/REASONING_HEADROOM = \d{4,}/.test(gw), '추론 여유분 상수가 있다');
const headroom = Number((gw.match(/REASONING_HEADROOM = (\d+)/) || [])[1] || 0);
ok(headroom >= 4000, `여유분이 충분하다 (${headroom} 토큰)`);
ok(/max_tokens: req\.maxTokens \+ REASONING_HEADROOM/.test(gw), 'DeepSeek 요청이 여유분을 더해 보낸다');

console.log('\n── ⑤ 사용자 UI 에 모델·벤더명이 새지 않는가 (#0, #0-1) ──');
for (const [p, label] of [[AGENT, 'commentary-agent'], [GATEWAY, 'gateway']] as const) {
  const src = read(p);
  // 주석·로그는 허용, throw 되는 사용자 메시지만 본다
  const thrown = [...src.matchAll(/new Error\('([^']*)'\)/g)].map((m) => m[1]);
  const leaky = thrown.filter((t) => /claude|anthropic|deepseek|gemini|sonnet|api[_ ]?key/i.test(t));
  ok(leaky.length === 0, `${label}: 사용자 노출 에러에 벤더·키 이름 없음`, leaky.join(' | '));
}

console.log(`\n${fail === 0 ? '통과' : `실패 ${fail}건`}\n`);
process.exit(fail === 0 ? 0 : 1);
