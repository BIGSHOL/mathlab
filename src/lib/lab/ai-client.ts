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

/** 코드펜스 제거 후 JSON 파싱. */
function parseJson<T>(text: string | undefined): T {
  if (!text) throw new Error('Lab 채점 AI 빈 응답');
  let s = text.trim();
  if (s.startsWith('```')) s = s.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(s) as T;
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
