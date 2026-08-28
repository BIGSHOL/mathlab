/**
 * 총평·분석글 생성용 텍스트 LLM 게이트웨이.
 *
 * 순서는 **`PROVIDER_CHAIN` 한 줄**이 정한다 — 현재 `gemini` → `anthropic`.
 * 앞의 것이 하드 실패하면 다음으로 넘어간다. 모델을 바꾸는 일이 잦아 순서를
 * 데이터로 뺐다: 구현은 셋 다 살아 있고, 체인에서 빼도 코드는 그대로 남는다.
 *
 * 왜 한 곳으로 모으나: 모델 호출이 commentary-agent 3곳 + article-generator 2곳에
 * 흩어져 있었고, 각자 모델명·max_tokens·temperature 를 따로 들고 있었다. 모델을 바꾸려면
 * 5곳을 손대야 했고 한 곳만 빠뜨려도 조용히 옛 모델로 남는다.
 *
 * ⚠️ 사용자 UI 에는 모델명·벤더명을 절대 노출하지 않는다 (CLAUDE.md #0, #0-1).
 *    어느 쪽이 응답했는지는 **서버 로그로만** 남기고, 화면 문구는 항상 "AI".
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

/** 시도 순서 — 앞에서부터, 키가 있고 성공할 때까지 */
const PROVIDER_CHAIN = ['gemini', 'anthropic'] as const;
type Provider = (typeof PROVIDER_CHAIN)[number] | 'deepseek';

/** 1차 모델 — 시험지 분석과 같은 계열(gemini-3.7-flash) */
const GEMINI_MODEL = 'gemini-3.7-flash';

/** 1차 모델 — DeepSeek 추론 모델 (OpenAI 호환 엔드포인트) */
const DEEPSEEK_MODEL = 'deepseek-v4-pro';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

/**
 * 폴백 모델 — Claude Sonnet 5.
 *
 * ⚠️ Sonnet 5 는 `temperature`/`top_p`/`top_k` 를 **거부한다(400)**. 4.6 에서 쓰던
 *    temperature 는 여기서 버린다(호출부는 계속 넘겨도 되며 이 계층이 흡수한다).
 * ⚠️ Sonnet 5 는 `thinking` 을 생략하면 **adaptive 로 켜진다**(4.6 은 꺼진 채였다).
 *    사고 토큰이 max_tokens 를 잠식해 긴 JSON 이 잘리므로, 폴백 경로는 예측 가능성을
 *    위해 명시적으로 끈다 — 폴백은 "품질 실험"이 아니라 "확실히 받아내는" 자리다.
 */
const CLAUDE_MODEL = 'claude-sonnet-5';

/**
 * DeepSeek 추론 토큰 여유분.
 *
 * 실측: 작은 프롬프트에도 reasoning_tokens 가 1,600~2,000 나온다. max_tokens 는
 * **사고 + 본문 합계** 상한이라, 본문 기준으로만 잡으면 사고가 예산을 다 먹고
 * `finish_reason:'length'` 로 빈 응답이 온다(첫 실측이 정확히 그랬다).
 */
const REASONING_HEADROOM = 8000;

export interface LlmTextRequest {
  /** 시스템 프롬프트 (선택) */
  system?: string;
  /** 사용자 프롬프트 */
  user: string;
  /** **본문** 기준 상한. DeepSeek 경로는 여기에 추론 여유분을 더해 보낸다. */
  maxTokens: number;
  /** Claude(Sonnet 5)에서는 무시된다 — 400 방지를 위해 이 계층이 제거한다. */
  temperature?: number;
  /** JSON 객체만 받도록 강제 (DeepSeek 경로에만 적용) */
  json?: boolean;
  /** 서버 로그 식별용 라벨 */
  label: string;
}

export interface LlmTextResult {
  text: string;
  provider: Provider;
  model: string;
  /** 출력이 상한에 걸려 잘렸을 가능성 — 호출부가 부분 복구를 시도해야 한다 */
  truncated: boolean;
}

interface DeepSeekChoice {
  message?: { content?: string };
  finish_reason?: string;
}
interface DeepSeekResponse {
  choices?: DeepSeekChoice[];
  usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
  error?: { message?: string };
}

async function callGemini(req: LlmTextRequest, apiKey: string): Promise<LlmTextResult> {
  const client = new GoogleGenAI({ apiKey });
  const started = Date.now();

  const res = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: req.user }] }],
    config: {
      ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
      maxOutputTokens: req.maxTokens,
      ...(req.temperature != null ? { temperature: req.temperature } : {}),
      ...(req.json ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const text = res.text ?? '';
  const finish = res.candidates?.[0]?.finishReason;
  if (!text.trim()) {
    // ⚠️ throw 문구에 벤더명을 넣지 않는다 (#0-1) — 진단은 로그로만 (§12-12)
    console.error(`[commentary-llm] ${req.label} 1차 모델 실패: 빈 응답 (finish=${finish})`);
    throw new Error('AI 응답을 받지 못했습니다');
  }

  console.log(
    `[commentary-llm] ${req.label} gemini ${Date.now() - started}ms ` +
      `(출력 ${res.usageMetadata?.candidatesTokenCount ?? '?'} 토큰, finish=${finish})`,
  );

  return { text, provider: 'gemini', model: GEMINI_MODEL, truncated: finish === 'MAX_TOKENS' };
}

async function callDeepSeek(req: LlmTextRequest, apiKey: string): Promise<LlmTextResult> {
  const messages: Array<{ role: string; content: string }> = [];
  if (req.system) messages.push({ role: 'system', content: req.system });
  messages.push({ role: 'user', content: req.user });

  const started = Date.now();
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      max_tokens: req.maxTokens + REASONING_HEADROOM,
      ...(req.temperature != null ? { temperature: req.temperature } : {}),
      ...(req.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  // ⚠️ throw 되는 문구에는 벤더명·상태코드를 넣지 않는다 (#0-1).
  //    이 에러가 폴백 없이 위로 올라가면 그대로 사용자 화면에 뜰 수 있다.
  //    진단 정보는 console 로만 — "정제 = 정보 삭제"가 아니다(§12-12).
  const fail = (detail: string): Error => {
    console.error(`[commentary-llm] ${req.label} 1차 모델 실패: ${detail}`);
    return new Error('AI 응답을 받지 못했습니다');
  };

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw fail(`HTTP ${res.status} ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as DeepSeekResponse;
  if (data.error) throw fail(data.error.message ?? '알 수 없는 오류');

  const choice = data.choices?.[0];
  const text = choice?.message?.content ?? '';
  if (!text.trim()) throw fail(`빈 응답 (finish=${choice?.finish_reason})`);

  const reasoning = data.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
  console.log(
    `[commentary-llm] ${req.label} deepseek ${Date.now() - started}ms ` +
      `(추론 ${reasoning} / 총 ${data.usage?.completion_tokens ?? '?'} 토큰, finish=${choice?.finish_reason})`,
  );

  return {
    text,
    provider: 'deepseek',
    model: DEEPSEEK_MODEL,
    truncated: choice?.finish_reason === 'length',
  };
}

async function callClaude(req: LlmTextRequest, apiKey: string): Promise<LlmTextResult> {
  const client = new Anthropic({ apiKey });
  const started = Date.now();

  // max_tokens 가 크면 SDK 가 non-streaming 호출을 거부한다
  // ("Streaming is required for operations that may take longer than 10 minutes").
  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: req.maxTokens,
    // temperature 는 의도적으로 넘기지 않는다 — Sonnet 5 에서 400.
    // thinking 도 명시적으로 끈다 — 생략하면 adaptive 로 켜져 max_tokens 를 잠식한다.
    thinking: { type: 'disabled' },
    ...(req.system ? { system: req.system } : {}),
    messages: [{ role: 'user', content: req.user }],
  });
  const response = await stream.finalMessage();

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  console.log(`[commentary-llm] ${req.label} anthropic ${Date.now() - started}ms (stop=${response.stop_reason})`);

  return {
    text,
    provider: 'anthropic',
    model: CLAUDE_MODEL,
    truncated: response.stop_reason === 'max_tokens',
  };
}

/**
 * 텍스트 생성 — `PROVIDER_CHAIN` 순서대로 시도.
 *
 * 폴백 조건은 **하드 실패만**(키 없음·네트워크·비-2xx·빈 응답). 잘림(`truncated`)은
 * 폴백 사유가 아니다 — 호출부가 정규식 부분 복구를 이미 갖고 있고(§12-1), 잘린 응답
 * 하나 때문에 다음 모델까지 돌리면 비용과 지연이 두 배가 된다.
 *
 * 조용한 폴백 금지(§12-10) — 어느 단계가 왜 실패했는지 반드시 로그에 남긴다.
 */
export async function generateText(req: LlmTextRequest): Promise<LlmTextResult> {
  const providers: Record<Provider, { key?: string; call: (r: LlmTextRequest, k: string) => Promise<LlmTextResult> }> = {
    gemini: { key: process.env.GEMINI_API_KEY?.trim(), call: callGemini },
    anthropic: { key: process.env.ANTHROPIC_API_KEY?.trim(), call: callClaude },
    deepseek: { key: process.env.DEEPSEEK_API_KEY?.trim(), call: callDeepSeek },
  };

  let lastError: unknown = null;
  let attempted = 0;

  for (const name of PROVIDER_CHAIN) {
    const { key, call } = providers[name];
    if (!key) {
      console.warn(`[commentary-llm] ${req.label} ${name} 키 없음 — 건너뜀`);
      continue;
    }
    attempted += 1;
    try {
      return await call(req, key);
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[commentary-llm] ${req.label} ${name} 실패 → 다음 단계로: ${msg}`);
    }
  }

  if (attempted === 0) {
    // 키가 하나도 없다 — 설정 문제. 벤더·환경변수명은 사용자에게 노출하지 않는다(#0-1).
    console.error(`[commentary-llm] ${req.label} 사용 가능한 모델 키가 없습니다 (chain=${PROVIDER_CHAIN.join(',')})`);
    throw new Error('총평 생성에 필요한 설정이 없습니다');
  }
  throw lastError instanceof Error ? lastError : new Error('AI 응답을 받지 못했습니다');
}
