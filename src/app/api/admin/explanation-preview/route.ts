/**
 * POST /api/admin/explanation-preview
 * 문제 ID 목록을 받아 Gemini로 해설 생성 (Thinking / Non-Thinking 비교)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api/auth';
import { isResponse } from '@/lib/api/helpers';
import { prisma } from '@/lib/db';
import { getGeminiClient } from '@/lib/services/gemini';

const DIFFICULTY_GUIDE: Record<string, string> = {
  BASIC: '1~2줄. 계산 과정만 보여주면 됨. 설명 불필요.',
  MEDIUM: '2~3줄. 핵심 풀이 과정만 간결하게.',
  HIGH: '3~5줄. 풀이 전략을 간단히 언급한 뒤 풀이.',
  HIGHEST: '5~8줄. 전략 → 풀이 → 핵심 포인트. 단, 장황하지 않게.',
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
- 해설은 "해설:" 접두사 없이 바로 풀이 시작. 개념 설명·서론 금지.
- 소문항이 여러 개면 (1), (2) 등으로 구분하여 각각 짧게.

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
      const parsed = JSON.parse(jsonMatch[0]);
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

  const results: Record<
    string,
    {
      question: (typeof questions)[0];
      noThinking?: GenResult;
      thinking?: GenResult;
    }
  > = {};

  // auto 모드: BASIC/MEDIUM → noThinking, HIGH/HIGHEST → thinking
  function resolveMode(difficulty: string): 'thinking' | 'noThinking' | 'both' {
    if (mode !== 'auto') return mode;
    return difficulty === 'HIGH' || difficulty === 'HIGHEST' ? 'thinking' : 'noThinking';
  }

  for (const q of questions) {
    const prompt = buildPrompt(q);
    const effectiveMode = resolveMode(q.difficulty);
    results[q.id] = { question: q };

    // Non-Thinking
    if (effectiveMode === 'noThinking' || effectiveMode === 'both') {
      const start = Date.now();
      try {
        const res = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.3 },
        });
        const usage = res.usageMetadata;
        const parsed = parseGenResponse(res.text || '');
        results[q.id].noThinking = {
          ...parsed,
          time: Date.now() - start,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
        };
      } catch (e) {
        results[q.id].noThinking = {
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
          config: { temperature: 0.3, thinkingConfig: { thinkingBudget: 2048 } },
        });
        const usage = res.usageMetadata;
        const parsed = parseGenResponse(res.text || '');
        results[q.id].thinking = {
          ...parsed,
          time: Date.now() - start,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
          thinkingTokens: (usage as Record<string, number>)?.thoughtsTokenCount,
        };
      } catch (e) {
        results[q.id].thinking = {
          text: `오류: ${e instanceof Error ? e.message : String(e)}`,
          time: Date.now() - start,
        };
      }
    }
  }

  return NextResponse.json({ data: results });
}
