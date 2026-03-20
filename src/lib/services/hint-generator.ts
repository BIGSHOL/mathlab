/**
 * AI 힌트 생성 서비스
 * 학생이 시험에서 틀렸을 때, 해설을 기반으로 정답을 직접 노출하지 않는 힌트를 생성
 * Gemini Flash 사용 (비용 최적화)
 */

import { getGeminiClient } from './gemini';

interface HintInput {
  content: string;        // 문제 내용
  explanation: string | null;  // 해설
  answer: string;         // 정답
  choices: string[] | null;    // 객관식 보기
  difficulty: string;     // 난이도
}

interface HintResult {
  hint: string;
  /** 객관식에서 제거할 오답 인덱스 (0-based) */
  eliminatedChoices: number[];
}

const FALLBACK_HINT = '문제를 다시 한번 천천히 읽어보세요. 조건을 정리하고 풀이 방법을 떠올려 보세요.';

/**
 * 객관식 오답 1~2개 제거
 * 정답 인덱스를 제외한 보기 중 랜덤 1~2개 선택
 */
function pickEliminatedChoices(choices: string[] | null, answer: string): number[] {
  if (!choices || choices.length < 3) return [];

  // 정답 인덱스 찾기 (answer가 "1", "2" 등 번호일 수도 있고, 보기 텍스트일 수도 있음)
  let correctIdx = -1;
  const ansNum = parseInt(answer, 10);
  if (!isNaN(ansNum) && ansNum >= 1 && ansNum <= choices.length) {
    correctIdx = ansNum - 1;
  } else {
    correctIdx = choices.findIndex((c) => c.trim() === answer.trim());
  }

  // 오답 인덱스 모음
  const wrongIndices = choices
    .map((_, i) => i)
    .filter((i) => i !== correctIdx);

  if (wrongIndices.length <= 1) return [];

  // 랜덤 셔플 후 1~2개 선택
  const shuffled = wrongIndices.sort(() => Math.random() - 0.5);
  const removeCount = choices.length >= 5 ? 2 : 1;
  return shuffled.slice(0, removeCount);
}

/** AI로 힌트 생성 (Gemini Flash) */
export async function generateHint(input: HintInput): Promise<HintResult> {
  const eliminatedChoices = pickEliminatedChoices(input.choices, input.answer);

  // 해설이 없으면 기본 힌트만
  if (!input.explanation) {
    return { hint: FALLBACK_HINT, eliminatedChoices };
  }

  try {
    const client = getGeminiClient();

    const prompt = `당신은 수학 튜터입니다. 학생이 아래 문제를 틀렸습니다.
해설을 참고하여 학생에게 **풀이 방향만 제시하는 힌트 1~2문장**을 생성하세요.

## 규칙
- 정답(${input.answer})이나 보기 번호를 **절대 포함하지 마세요**
- 구체적인 계산 결과를 알려주지 마세요
- "~를 생각해보세요", "~를 활용해보세요" 형태로 풀이 접근법만 안내
- 한국어로 작성
- 수식과 숫자는 반드시 양 옆에 $ 기호를 붙여주세요. (예: $\frac{1}{2}$ 또는 $3$)

## 문제
${input.content}

## 해설
${input.explanation}

## 힌트 (1~2문장만 출력):`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 150,
        temperature: 0.3,
      },
    });

    const text = response.text?.trim();
    if (text && text.length > 5) {
      return { hint: text, eliminatedChoices };
    }
  } catch (err) {
    console.error('[hint-generator] AI 힌트 생성 실패:', err);
  }

  return { hint: FALLBACK_HINT, eliminatedChoices };
}
