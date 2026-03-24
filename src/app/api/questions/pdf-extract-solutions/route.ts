import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { GoogleGenAI, Type } from '@google/genai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey });
}

const SOLUTION_EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    solutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNum: { type: Type.NUMBER, description: '문제 번호' },
          answer: { type: Type.STRING, description: '정답 (예: "⑤", "2개", "5")' },
          explanation: { type: Type.STRING, description: '풀이 과정 (마크다운+LaTeX)' },
        },
        required: ['questionNum', 'answer'],
      },
    },
  },
  required: ['solutions'],
};

const SOLUTION_PROMPT = `당신은 한국 수학 교재 해설 분석 전문가입니다.
주어진 해설 페이지 이미지에서 각 문제의 정답과 풀이를 추출하세요.

[규칙]
1. 문제번호(questionNum)를 정확히 식별
2. 정답(answer)은 원문 그대로 (예: "⑤", "2개", "1")
3. 풀이(explanation)는 마크다운으로 작성, 수식은 $...$로 감싸기
4. 풀이가 여러 단계이면 줄바꿈으로 구분
5. 채점 기준이 있으면 풀이 끝에 포함`;

/** JSON 파싱 후 LaTeX 이스케이프 복원 */
function fixLatexEscaping(text: string): string {
  if (!text) return text;
  return text
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\x08/g, '\\b')
    .replace(/\r(?!\n)/g, '\\r');
}

interface PageInput {
  pageNum: number;
  imageBase64: string;
  textLayer?: string;
}

// POST /api/questions/pdf-extract-solutions — 해설 PDF에서 정답/풀이 추출
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { pages } = body as { pages: PageInput[] };

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return badRequest('pages 배열이 필요합니다');
  }

  const ai = getClient();
  const allSolutions: { questionNum: number; answer: string; explanation: string }[] = [];

  for (const page of pages) {
    try {
      const base64Data = page.imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/png', data: base64Data } },
              { text: page.textLayer
                  ? `${SOLUTION_PROMPT}\n\n[OCR Text Content for Reference]\n${page.textLayer}\n\n위의 텍스트 레이어 정보를 참고하여 이미지 속의 정답과 해설을 오타 없이 완벽하게 추출하세요.`
                  : SOLUTION_PROMPT
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: SOLUTION_EXTRACT_SCHEMA,
        },
      });

      if (!response.text) continue;

      let jsonStr = response.text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const data = JSON.parse(jsonStr);
      if (data.solutions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fixed = data.solutions.map((s: any) => ({
          ...s,
          answer: fixLatexEscaping(s.answer),
          explanation: fixLatexEscaping(s.explanation),
        }));
        allSolutions.push(...fixed);
      }
    } catch (err) {
      console.error(`해설 페이지 ${page.pageNum} 추출 실패:`, err);
    }
  }

  return NextResponse.json({ data: { solutions: allSolutions } });
}
