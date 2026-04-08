/**
 * Gemini 2.5 Flash: Thinking vs Non-Thinking 해설 품질 비교
 * 해설 없는 문제 5개를 선택하여 두 모드로 생성 후 비교
 */
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';

const db = new PrismaClient();
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// 다양한 유형 샘플 5개 선택
async function getSamples() {
  const mc = await db.question.findFirst({
    where: { bookCode: '1-1', type: 'MULTIPLE_CHOICE', OR: [{ explanation: null }, { explanation: '' }] },
    select: { id: true, content: true, choices: true, answer: true, type: true, chapter: true, questionNum: true },
  });
  const sa = await db.question.findFirst({
    where: { bookCode: '1-1', type: 'SHORT_ANSWER', OR: [{ explanation: null }, { explanation: '' }] },
    select: { id: true, content: true, choices: true, answer: true, type: true, chapter: true, questionNum: true },
  });
  const essay = await db.question.findFirst({
    where: { bookCode: '1-1', type: 'ESSAY', OR: [{ explanation: null }, { explanation: '' }] },
    select: { id: true, content: true, choices: true, answer: true, type: true, chapter: true, questionNum: true },
  });
  // 좀 더 어려운 문제
  const hard1 = await db.question.findFirst({
    where: { bookCode: '1-1', difficulty: 'HIGH', OR: [{ explanation: null }, { explanation: '' }] },
    select: { id: true, content: true, choices: true, answer: true, type: true, chapter: true, questionNum: true },
  });
  const hard2 = await db.question.findFirst({
    where: { bookCode: '1-1', difficulty: 'HIGHEST', OR: [{ explanation: null }, { explanation: '' }] },
    select: { id: true, content: true, choices: true, answer: true, type: true, chapter: true, questionNum: true },
  });

  return [mc, sa, essay, hard1, hard2].filter(Boolean);
}

function buildPrompt(q: { content: string; choices: unknown; answer: string; type: string; chapter: string | null }) {
  const choicesStr = Array.isArray(q.choices) && q.choices.length > 0
    ? `\n보기:\n${(q.choices as string[]).map((c, i) => `  ${i + 1}. ${c}`).join('\n')}`
    : '';

  return `당신은 중학교 수학 교사입니다. 다음 문제의 풀이 해설을 작성해주세요.

## 규칙
- 중학교 1학년 학생이 이해할 수 있는 수준으로 작성
- 풀이 과정을 단계별로 설명
- 수식은 LaTeX 형식 ($...$)으로 작성
- \\dfrac 대신 반드시 \\frac 사용
- 간결하되 핵심 개념을 포함
- "해설:" 같은 접두사 없이 바로 풀이 시작

## 문제
단원: ${q.chapter || '미분류'}
유형: ${q.type}

${q.content}${choicesStr}

정답: ${q.answer}

## 풀이 해설을 작성하세요.`;
}

async function generateExplanation(prompt: string, useThinking: boolean): Promise<{ text: string; time: number; inputTokens?: number; outputTokens?: number; thinkingTokens?: number }> {
  const start = Date.now();

  const config: Record<string, unknown> = {
    temperature: 0.3,
  };
  if (useThinking) {
    config.thinkingConfig = { thinkingBudget: 2048 };
  }

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config,
  });

  const time = Date.now() - start;
  const text = response.text || '(빈 응답)';
  const usage = response.usageMetadata;

  return {
    text,
    time,
    inputTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
    thinkingTokens: (usage as Record<string, number>)?.thoughtsTokenCount,
  };
}

async function main() {
  const samples = await getSamples();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  Gemini 2.5 Flash: Thinking vs Non-Thinking 해설 비교`);
  console.log(`  샘플 ${samples.length}개`);
  console.log(`${'='.repeat(80)}\n`);

  for (let i = 0; i < samples.length; i++) {
    const q = samples[i]!;
    const prompt = buildPrompt(q as Parameters<typeof buildPrompt>[0]);

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`[${i + 1}/${samples.length}] Q${q.questionNum} | ${q.type} | ${q.chapter}`);
    console.log(`문제: ${q.content?.substring(0, 120)}...`);
    console.log(`정답: ${q.answer}`);

    // Non-thinking
    console.log(`\n🔵 Non-Thinking 모드...`);
    const noThink = await generateExplanation(prompt, false);
    console.log(`  시간: ${noThink.time}ms | 입력: ${noThink.inputTokens} | 출력: ${noThink.outputTokens}`);
    console.log(`  해설:\n${noThink.text}`);

    // Thinking
    console.log(`\n🟠 Thinking 모드...`);
    const withThink = await generateExplanation(prompt, true);
    console.log(`  시간: ${withThink.time}ms | 입력: ${withThink.inputTokens} | 출력: ${withThink.outputTokens} | thinking: ${withThink.thinkingTokens}`);
    console.log(`  해설:\n${withThink.text}`);
  }

  await db.$disconnect();
}

main().catch(console.error);
