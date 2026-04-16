/**
 * AI 튜터 서비스 — 학생이 오답 후 "AI에게 물어보기"로 설명을 요청할 때 호출.
 * hint-generator와 동일한 Gemini Flash-Lite 사용 + 학생 오답 원인 분석 중심.
 */
import { getGeminiClient } from './gemini';

export interface TutorInput {
  /** 문제 내용 */
  content: string;
  /** 해설 (있으면 참조, 없으면 fallback) */
  explanation: string | null;
  /** 정답 */
  answer: string;
  /** 객관식 보기 (있으면) */
  choices: string[] | null;
  /** 학생이 선택/입력한 답 */
  studentAnswer: string;
  /** 학생의 추가 질문 (옵션) */
  studentQuestion?: string;
  /** 난이도 */
  difficulty?: string;
  /** 단원 */
  chapter?: string;
}

export interface TutorResult {
  answer: string;
}

const FALLBACK_ANSWER =
  '해설을 다시 한번 천천히 읽어보세요. 핵심 개념과 풀이 단계를 순서대로 정리하면서 자신의 풀이와 비교해 보세요.';

/** AI 튜터 응답 생성 */
export async function generateTutorAnswer(input: TutorInput): Promise<TutorResult> {
  try {
    const client = getGeminiClient();

    const choicesText = input.choices && input.choices.length > 0
      ? `\n## 보기\n${input.choices.map((c, i) => `${i + 1}) ${c}`).join('\n')}`
      : '';

    const questionLine = input.studentQuestion
      ? `\n## 학생 질문\n${input.studentQuestion}`
      : '';

    const prompt = `════════════════════════════════════════════════
🔒 하드 제약 (HARD CONSTRAINTS) — 위반 시 출력 무효
════════════════════════════════════════════════
H1. 해설 범위 내에서만 설명할 것. 해설에 없는 풀이법을 지어내지 말 것.
H2. 길이 강제: **200자 이내** (한글 기준). 3~5문장. 머리말/접두사("답변:", "해설:", "튜터:") 금지.
H3. 학생의 오답이 왜 틀렸는지 짚어주고, 올바른 접근 방향을 설명할 것.
H4. 수식 포맷: 숫자·변수는 \$...\$로 래핑 (예: \$x\$, \$\\frac{1}{2}\$, \$3\$). 한글은 \$...\$ 밖.
H5. 금지: \\dfrac → \\frac, \\text{한글} 금지, 인접 수식 \$A\$\$B\$ → \$A\$ \$B\$.
H6. 코드펜스(\`\`\`), 불릿, 번호 매기기 금지. 순수 한국어 텍스트 + 수식만.

════════════════════════════════════════════════
📤 출력 전 자기검증 (SELF-VERIFY)
════════════════════════════════════════════════
V1. 200자 이내인가?
V2. 해설 범위 내의 설명인가? 새로운 풀이법을 지어내지 않았는가?
V3. 모든 수치·변수가 \$...\$로 래핑되었는가? \\dfrac·\\text{한글}이 없는가?
════════════════════════════════════════════════

당신은 친절한 수학 튜터입니다. 학생이 아래 문제에서 틀렸고, 설명을 요청했습니다.
해설을 참고하여 학생의 오답 원인을 짚어주고 올바른 접근 방향을 3~5문장으로 설명하세요.

## 문제
${input.content}${choicesText}

## 정답
${input.answer}

## 학생이 쓴 답
${input.studentAnswer}

## 해설
${input.explanation ?? '(해설 없음 — 정답을 기준으로 일반적인 접근 방향을 설명하세요)'}${questionLine}

## 설명 (200자 이내):`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        maxOutputTokens: 400,
        temperature: 0.4,
      },
    });

    const text = response.text?.trim();
    if (text && text.length > 5) {
      return { answer: text };
    }
  } catch (err) {
    console.error('[ai-tutor] 응답 생성 실패:', err);
  }

  return { answer: FALLBACK_ANSWER };
}
