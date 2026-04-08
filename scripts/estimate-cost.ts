import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const allNoExpl = await db.question.findMany({
    where: {
      bookCode: '1-1',
      OR: [{ explanation: null }, { explanation: '' }]
    },
    select: { content: true, choices: true, answer: true, type: true, difficulty: true }
  });

  // 난이도별 분포
  const byDiff: Record<string, number> = {};
  for (const q of allNoExpl) {
    byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1;
  }

  console.log(`=== 해설 없는 문제: ${allNoExpl.length}개 ===`);
  console.log(`난이도별:`, byDiff);

  // 프롬프트 토큰 추정 (새 프롬프트 기준)
  // 시스템 프롬프트 약 150자 + 문제/보기/정답
  const CHARS_TO_TOKENS = 3;
  const SYSTEM_PROMPT_CHARS = 200; // 새 간결한 프롬프트

  // 난이도별 예상 출력 길이
  const OUTPUT_CHARS: Record<string, number> = {
    BASIC: 40,    // 1~2줄
    MEDIUM: 80,   // 2~3줄
    HIGH: 150,    // 3~5줄
    HIGHEST: 250, // 5~8줄
  };

  let totalInputTokens = 0;
  let totalOutputTokens_noThink = 0;
  let totalOutputTokens_think = 0;
  let thinkingTokens = 0;
  let thinkCount = 0;
  let noThinkCount = 0;

  for (const q of allNoExpl) {
    const inputChars = SYSTEM_PROMPT_CHARS + (q.content || '').length + JSON.stringify(q.choices || []).length + (q.answer || '').length;
    const inputTok = inputChars * CHARS_TO_TOKENS;
    const outputChars = OUTPUT_CHARS[q.difficulty] || OUTPUT_CHARS.MEDIUM;
    const outputTok = outputChars * CHARS_TO_TOKENS;

    totalInputTokens += inputTok;

    // auto 모드: BASIC/MEDIUM → noThinking, HIGH/HIGHEST → thinking
    if (q.difficulty === 'HIGH' || q.difficulty === 'HIGHEST') {
      totalOutputTokens_think += outputTok;
      thinkingTokens += outputTok * 2; // thinking ≈ output × 2
      thinkCount++;
    } else {
      totalOutputTokens_noThink += outputTok;
      noThinkCount++;
    }
  }

  console.log(`\nauto 모드: Non-Thinking ${noThinkCount}개, Thinking ${thinkCount}개`);

  // Gemini 2.5 Flash 가격
  // Input: $0.15/1M, Output: $0.60/1M, Thinking: $3.50/1M
  const inputCost = (totalInputTokens / 1_000_000) * 0.15;
  const outputCost_noThink = (totalOutputTokens_noThink / 1_000_000) * 0.60;
  const outputCost_think = (totalOutputTokens_think / 1_000_000) * 0.60;
  const thinkCost = (thinkingTokens / 1_000_000) * 3.50;

  const totalCost = inputCost + outputCost_noThink + outputCost_think + thinkCost;

  console.log(`\n=== auto 모드 비용 (새 프롬프트) ===`);
  console.log(`입력 토큰: ${(totalInputTokens / 1000).toFixed(0)}K → $${inputCost.toFixed(4)}`);
  console.log(`Non-Thinking 출력: ${(totalOutputTokens_noThink / 1000).toFixed(0)}K → $${outputCost_noThink.toFixed(4)}`);
  console.log(`Thinking 출력: ${(totalOutputTokens_think / 1000).toFixed(0)}K → $${outputCost_think.toFixed(4)}`);
  console.log(`Thinking 사고: ${(thinkingTokens / 1000).toFixed(0)}K → $${thinkCost.toFixed(4)}`);
  console.log(`---`);
  console.log(`총 비용: $${totalCost.toFixed(4)} (≈ ${Math.round(totalCost * 1400)}원)`);

  // 비교: 전부 noThinking
  const allNoThinkOutput = allNoExpl.reduce((s, q) => s + (OUTPUT_CHARS[q.difficulty] || 80) * CHARS_TO_TOKENS, 0);
  const allNoThinkCost = inputCost + (allNoThinkOutput / 1_000_000) * 0.60;
  console.log(`\n비교) 전부 Non-Thinking: $${allNoThinkCost.toFixed(4)} (≈ ${Math.round(allNoThinkCost * 1400)}원)`);

  // 비교: 전부 thinking
  const allThinkOutputCost = (allNoThinkOutput / 1_000_000) * 0.60;
  const allThinkThinkCost = (allNoThinkOutput * 2 / 1_000_000) * 3.50;
  const allThinkTotal = inputCost + allThinkOutputCost + allThinkThinkCost;
  console.log(`비교) 전부 Thinking: $${allThinkTotal.toFixed(4)} (≈ ${Math.round(allThinkTotal * 1400)}원)`);

  await db.$disconnect();
}

main();
