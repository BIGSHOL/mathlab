/**
 * POST /api/admin/explanation-preview
 * 문제 ID 목록을 받아 Gemini로 해설 생성 (Thinking / Non-Thinking 비교)
 */
import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { requireSuperAdmin } from '@/lib/api/auth';
import { isResponse } from '@/lib/api/helpers';
import { prisma } from '@/lib/db';
import { getGeminiClient } from '@/lib/services/gemini';

const DIFFICULTY_GUIDE: Record<string, string> = {
  BASIC: '1~2줄 (150자 이내). 계산 과정만. 설명·개념 언급 금지.',
  MEDIUM: '2~3줄 (200자 이내). 핵심 풀이만 간결하게.',
  HIGH: '3~4줄 (300자 이내). **전략** 한 줄 + **풀이**.',
  HIGHEST: '최대 300자. **전략** 1줄 → **풀이** 핵심 계산만 → **핵심 포인트** 1줄. 절대 300자 초과 금지.',
};

function buildPrompt(q: {
  content: string;
  choices: unknown;
  answer: string;
  type: string;
  difficulty: string;
  chapter: string | null;
}) {
  const choicesStr =
    Array.isArray(q.choices) && q.choices.length > 0
      ? `\n보기:\n${(q.choices as string[]).map((c: string, i: number) => `  ${i + 1}. ${c}`).join('\n')}`
      : '';

  const diffGuide = DIFFICULTY_GUIDE[q.difficulty] || DIFFICULTY_GUIDE.MEDIUM;

  return `중학교 수학 문제를 풀고, 정답과 해설을 JSON으로 반환하라.

난이도: ${q.difficulty} → ${diffGuide}

규칙:
- 직접 문제를 풀어서 정답을 구하라. 아래 "참고 정답"은 OCR 추출값이라 틀릴 수 있음.
- 수식은 LaTeX ($...$). \\frac만 사용 (\\dfrac 금지).
- 해설은 "해설:" 접두사 없이 바로 풀이 시작. 개념 설명·서론·배경지식 금지.
- 소문항이 여러 개면 (1), (2) 등으로 구분하되, 각 소문항 앞에 반드시 줄바꿈(\\n)을 넣어라.
- 풀이 단계가 여러 개면 각 단계 앞에 줄바꿈(\\n)을 넣어라.
- 해설 구조 포맷 (HIGHEST/HIGH만 해당), 아래 예시의 줄바꿈을 정확히 따라라:
  "**전략** 설명 한 줄\\n\\n**풀이**\\n1단계 풀이\\n2단계 풀이\\n\\n**핵심 포인트** 요약 한 줄"
  빈 줄(\\n\\n) 위치: **전략** 뒤, **핵심 포인트** 앞. 이 두 곳에 반드시 빈 줄을 넣어라.
- **글자 수 제한을 반드시 지켜라.** 위 난이도별 글자 수를 초과하면 안 됨.
- 중학교 교과서 해설 수준. 수능 해설처럼 길고 상세하게 쓰지 마라.
- 객관식: 정답 보기만 풀이하라. 오답 보기를 하나하나 검증하지 마라.
- 객관식 풀이에서 보기를 언급할 때 반드시 번호를 붙여라 (예: "①번: ...", "③번: ...").
- 어떤 난이도든 절대 300자를 넘기지 마라. 중간 과정을 생략하고 핵심 단계만 써라.
- 서술형이라도 풀이를 장황하게 쓰지 마라. 핵심 식 전개 → 답 도출만.

반환 형식 (순수 JSON, 코드펜스 없이):
{"answer": "정답 문자열", "explanation": "해설 문자열", "answerChanged": true/false}
- answerChanged: 참고 정답과 다르면 true

문제 (${q.chapter || '미분류'}, ${q.type}):
${q.content}${choicesStr}

참고 정답 (검증 필요): ${q.answer}`;
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await req.json();
  const { questionIds, mode } = body as {
    questionIds: string[];
    mode: 'thinking' | 'noThinking' | 'both' | 'auto';
  };

  if (!questionIds?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'questionIds가 필요합니다' } },
      { status: 400 }
    );
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      questionNum: true,
      content: true,
      choices: true,
      answer: true,
      type: true,
      chapter: true,
      section: true,
      difficulty: true,
      source: true,
    },
  });

  const client = getGeminiClient();

  interface GenResult {
    text: string;
    answer?: string;
    explanation?: string;
    answerChanged?: boolean;
    time: number;
    inputTokens?: number;
    outputTokens?: number;
    thinkingTokens?: number;
  }

  function parseGenResponse(raw: string): { answer?: string; explanation?: string; answerChanged?: boolean; text: string } {
    try {
      // 코드펜스 제거 + JSON 부분만 추출
      let s = raw.trim();
      if (s.startsWith('```')) s = s.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
      // JSON 객체 부분만 추출 (앞뒤 텍스트 제거)
      const jsonMatch = s.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { text: raw };

      // LaTeX 백슬래시(\circ, \angle 등)가 JSON 이스케이프와 충돌 → 파싱 전 보호
      let jsonStr = jsonMatch[0];
      try {
        JSON.parse(jsonStr);
      } catch {
        // 유효하지 않은 JSON 이스케이프(\c, \a 등)를 이중 백슬래시로 변환
        jsonStr = jsonStr.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
      }

      const parsed = JSON.parse(jsonStr);
      return {
        answer: parsed.answer ?? undefined,
        explanation: parsed.explanation ?? undefined,
        answerChanged: !!parsed.answerChanged,
        text: parsed.explanation || raw,
      };
    } catch {
      // JSON 파싱 실패 시 원본 텍스트를 해설로 사용
      return { text: raw };
    }
  }

  // 구조화 출력 스키마
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      answer: { type: Type.STRING, description: '정답 문자열' },
      explanation: { type: Type.STRING, description: '풀이 해설 (마크다운 + LaTeX)' },
      answerChanged: { type: Type.BOOLEAN, description: '참고 정답과 다르면 true' },
    },
    required: ['answer', 'explanation', 'answerChanged'],
  };

  // auto 모드: BASIC/MEDIUM → noThinking, HIGH/HIGHEST → thinking
  function resolveMode(difficulty: string): 'thinking' | 'noThinking' | 'both' {
    if (mode !== 'auto') return mode;
    return difficulty === 'HIGH' || difficulty === 'HIGHEST' ? 'thinking' : 'noThinking';
  }

  // NDJSON 스트리밍: 문제별로 실시간 전송
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let idx = 0;
      for (const q of questions) {
        idx++;
        const prompt = buildPrompt(q);
        const effectiveMode = resolveMode(q.difficulty);
        const result: { question: typeof q; noThinking?: GenResult; thinking?: GenResult } = { question: q };

        // Non-Thinking
        if (effectiveMode === 'noThinking' || effectiveMode === 'both') {
          const start = Date.now();
          try {
            const res = await client.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                temperature: 0.3,
                responseMimeType: 'application/json',
                responseSchema,
              },
            });
            const usage = res.usageMetadata;
            const parsed = parseGenResponse(res.text || '');
            result.noThinking = {
              ...parsed,
              time: Date.now() - start,
              inputTokens: usage?.promptTokenCount,
              outputTokens: usage?.candidatesTokenCount,
            };
          } catch (e) {
            result.noThinking = {
              text: `오류: ${e instanceof Error ? e.message : String(e)}`,
              time: Date.now() - start,
            };
          }
        }

        // Thinking
        if (effectiveMode === 'thinking' || effectiveMode === 'both') {
          const start = Date.now();
          try {
            const res = await client.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                temperature: 0.3,
                responseMimeType: 'application/json',
                responseSchema,
                thinkingConfig: { thinkingBudget: 512 },
              },
            });
            const usage = res.usageMetadata;
            const parsed = parseGenResponse(res.text || '');
            result.thinking = {
              ...parsed,
              time: Date.now() - start,
              inputTokens: usage?.promptTokenCount,
              outputTokens: usage?.candidatesTokenCount,
              thinkingTokens: (usage as Record<string, number>)?.thoughtsTokenCount,
            };
          } catch (e) {
            result.thinking = {
              text: `오류: ${e instanceof Error ? e.message : String(e)}`,
              time: Date.now() - start,
            };
          }
        }

        // 문제별로 NDJSON 전송
        const line = JSON.stringify({ id: q.id, idx, total: questions.length, result }) + '\n';
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  });
}
