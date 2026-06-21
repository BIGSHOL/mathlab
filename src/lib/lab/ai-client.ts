// 🚧 Lab P5 — Lab 자체 AI 클라이언트 (서술형 채점용)
//   ⚠️ 격리(CLAUDE.md '형제 라인'): 기출분석/공유 services(gemini.ts 등)를 import하지 않고
//      Gemini 클라이언트를 Lab 안에 *복제*한다(복제 > 격리 침범). 기출분석 AI 에이전트 무import.
//   ⚠️ CLAUDE.md #0: 모델명은 사용자 UI에 절대 노출하지 않는다. 여긴 내부 채점이라 서버 로그만 모델명 사용.
import { GoogleGenAI } from '@google/genai';

// 내부 전용(서버 로그) — 사용자 UI엔 'AI'로만 표기.
const LAB_GRADER_MODEL = 'gemini-2.5-flash';

let _client: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정 (Lab 서술형 채점)');
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

export interface GeminiGradeResult {
  partialScore: number; // 0..1
  confidence: number; // 0..1
  errorType: string; // NONE|CALCULATION|CONCEPT|INCOMPLETE|MISREAD|OTHER
  rationale?: string;
}

/**
 * LLM JSON 복구 (CLAUDE.md #12-1) — AI가 LaTeX 백슬래시(\times,\frac)·문자열 내 실제 줄바꿈을
 * 내뱉어 순진한 JSON.parse가 깨지는 것 방지. 문자열 내부만 상태머신으로 이스케이프 보정.
 *   - 문자열 내 고립 백슬래시(\x) → \\x  (유효 escape \" \\ \/ \b \f \n \r \t \u 는 보존)
 *   - 문자열 내 실제 제어문자(\n \r \t) → \\n \\r \\t
 */
function repairJsonString(s: string): string {
  let out = '';
  let inStr = false;
  let depth = 0; // 중괄호 깊이(문자열 밖)
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (!inStr) {
      out += ch;
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      continue;
    }
    if (ch === '\\') {
      const next = s[i + 1];
      if (next !== undefined && '"\\/bfnrtu'.includes(next)) {
        out += ch + next; // 유효 escape — 둘 다 보존
        i++;
      } else {
        out += '\\\\'; // 고립 백슬래시(LaTeX) → 이스케이프
      }
    } else if (ch === '"') {
      inStr = false;
      out += ch;
    } else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else out += ch;
  }
  // 잘린 응답 salvage(maxOutputTokens 초과) — 미닫힌 문자열·중괄호 보정.
  if (inStr) out += '"';
  while (depth-- > 0) out += '}';
  return out;
}

/** 코드펜스 제거 후 JSON 파싱(복구 재시도 포함). */
function parseJson<T>(text: string | undefined): T {
  if (!text) throw new Error('Lab AI 빈 응답');
  let s = text.trim();
  if (s.startsWith('```')) s = s.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
  // 본문만 추출(앞뒤 잡텍스트 방어): 첫 { ~ 마지막 }. (없거나 잘리면 원본 유지)
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    return JSON.parse(repairJsonString(s)) as T; // 복구 후 재시도
  }
}

/**
 * 루브릭(모범답안/채점기준) 대비 학생 서술 답안을 채점 — 구조화 JSON.
 * 한글 응답 여유로 max_output_tokens는 짧게(채점 메타만). CLAUDE.md #6: 한글×5 토큰.
 */
export async function gradeWithGemini(input: {
  rubric: string;
  answer: string;
  conceptName?: string;
}): Promise<GeminiGradeResult> {
  const prompt = [
    '너는 한국 수학 학원의 서술형 답안 채점자다. 아래 채점 루브릭(모범답안·채점 기준)에 비추어 학생 답안을 채점하라.',
    input.conceptName ? `개념: ${input.conceptName}` : '',
    '',
    '[채점 루브릭]',
    input.rubric,
    '',
    '[학생 답안]',
    input.answer,
    '',
    '아래 JSON만 출력(다른 텍스트 금지):',
    '{ "partialScore": 0~1 부분점수, "confidence": 0~1 채점 신뢰도, "errorType": "NONE|CALCULATION|CONCEPT|INCOMPLETE|MISREAD|OTHER", "rationale": "간단한 근거(한국어 1문장)" }',
  ]
    .filter(Boolean)
    .join('\n');

  const res = await client().models.generateContent({
    model: LAB_GRADER_MODEL,
    contents: prompt,
    // 출력은 작은 채점 메타 JSON — maxOutputTokens로 잘림 방지(채점 근거 1문장 포함 여유).
    config: { responseMimeType: 'application/json', maxOutputTokens: 512 },
  });
  return parseJson<GeminiGradeResult>(res.text);
}

// ─────────────────────────────────────────────────────────────────────────
// 문제 생성 (콘텐츠 토대 2단계) — 개념·난이도·유형 → 구조화 문제 본문
//   ⚠️ 격리: 기출분석/mathgen import 금지. 본 Lab 클라이언트(복제)만 사용.
//   내부 전용(서버 로그). 사용자 UI엔 'AI'로만(모델명 비노출, CLAUDE.md #0).
const LAB_GEN_MODEL = 'gemini-2.5-flash';

export type LabGenType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'DESCRIPTIVE';

export interface GeminiGenInput {
  conceptName: string;
  majorUnit?: string; // 대단원 맥락
  domain?: string; // 영역
  bandLabel?: string; // 초등|중등|고등
  type: LabGenType;
  difficulty: number; // 1..5
}

/** AI 원시 생성 결과(유형별 필드 optional). 정규화는 problem-gen에서. */
export interface GeminiGenRaw {
  body: string;
  choices?: string[]; // 객관식 보기(5)
  answerIndex?: number; // 객관식 정답(1-based)
  answer?: string; // 단답 정답
  rubric?: string; // 서술형 채점 루브릭(모범답안+기준)
  explanation: string; // 풀이
}

const TYPE_KR: Record<LabGenType, string> = {
  MULTIPLE_CHOICE: '객관식(보기 5개)',
  SHORT_ANSWER: '단답형',
  DESCRIPTIVE: '서술형',
};
const DIFF_KR = ['', '기본', '표준', '응용', '심화', '최고난도'];

/** 개념·난이도·유형 → 구조화 문제 1개 생성. */
export async function generateWithGemini(input: GeminiGenInput): Promise<GeminiGenRaw> {
  const unit = input.majorUnit ? `${input.majorUnit} > ${input.conceptName}` : input.conceptName;
  const lvl = DIFF_KR[input.difficulty] ?? '표준';
  const shape =
    input.type === 'MULTIPLE_CHOICE'
      ? '{ "body": "문제 본문", "choices": ["보기1","보기2","보기3","보기4","보기5"], "answerIndex": 1~5(정답 보기 번호), "explanation": "풀이" }'
      : input.type === 'SHORT_ANSWER'
        ? '{ "body": "문제 본문", "answer": "정답(KaTeX)", "explanation": "풀이" }'
        : '{ "body": "문제 본문", "rubric": "모범답안 + 채점기준(부분점수 배분 포함)", "explanation": "풀이" }';

  const prompt = [
    `너는 한국 ${input.bandLabel ?? ''} 수학 출제 전문가다. 아래 조건의 수학 문제 1개를 한국어로 생성하라.`,
    '',
    '[조건]',
    `- 개념: ${unit}${input.domain ? ` (영역: ${input.domain})` : ''}`,
    `- 난이도: ${input.difficulty}단계(${lvl}) — 1기본·2표준·3응용·4심화·5최고난도`,
    `- 유형: ${TYPE_KR[input.type]}`,
    '',
    '[작성 규칙]',
    '- 모든 숫자·영문 변수는 KaTeX 인라인으로: $25$, $a$, $x+y$. (보기 번호 ①②③④⑤·한글 기호 ㄱㄴㄷ은 제외)',
    '- 분수는 반드시 \\frac (\\dfrac 금지). 수식은 $...$로 감싼다.',
    '- 영문 용어/약어(enum 등) 노출 금지 — 한국어로만 서술.',
    '- 본문·보기·해설은 핵심만 간결하게(불필요하게 긴 나열 금지). 해설은 풀이 요지 위주.',
    input.type === 'MULTIPLE_CHOICE' ? '- 보기는 정확히 5개, 정답 1개. 오답도 흔한 실수에 근거해 그럴듯하게. 보기 텍스트엔 번호(①②③④⑤)·기호 없이 내용만.' : '',
    input.difficulty >= 4 ? '- 심화/최고난도: 비자명한 통찰 또는 여러 개념의 결합을 요구하라(단순 대입 금지).' : '- 해당 난이도에 맞는 사고 깊이를 유지하라.',
    '',
    `[출력] 아래 JSON만 출력(코드펜스·다른 텍스트 금지):`,
    shape,
  ]
    .filter(Boolean)
    .join('\n');

  const res = await client().models.generateContent({
    model: LAB_GEN_MODEL,
    contents: prompt,
    // ⚠️ gemini-2.5-flash는 thinking 모델 — thinkingBudget 0으로 끄지 않으면 thinking 토큰이
    //    maxOutputTokens를 먹어 JSON이 잘림("Unexpected end of JSON input"). 생성은 비-thinking로.
    // 본문+보기+풀이(한글) → 잘림 방지 넉넉히(CLAUDE.md #12-1: 한글×~5토큰).
    config: { responseMimeType: 'application/json', maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
  });
  return parseJson<GeminiGenRaw>(res.text);
}
