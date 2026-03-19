import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { GoogleGenAI, Type } from '@google/genai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey });
}

const SOLUTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    solutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.NUMBER, description: '문제 인덱스 (0-based)' },
          answer: { type: Type.STRING, description: '정답 (예: "③", "5", "2개")' },
          explanation: { type: Type.STRING, description: '풀이 과정 (마크다운+LaTeX, $...$)' },
        },
        required: ['index', 'answer', 'explanation'],
      },
    },
  },
  required: ['solutions'],
};

const SYSTEM_PROMPT = `당신은 한국 중등 수학 문제 풀이 전문가입니다.
주어진 수학 문제들의 정답과 풀이를 생성하세요.

[규칙]
1. 정답(answer)은 간결하게: 객관식은 "③" 형태, 주관식은 숫자/수식
2. 풀이(explanation)는 단계별로 작성, 수식은 $...$로 감싸기
3. 분수는 \\frac 사용 (\\dfrac 금지)
4. 각 단계를 줄바꿈으로 구분
5. 풀이는 학생이 이해할 수 있도록 중간 과정을 생략하지 마세요
6. 객관식은 왜 해당 보기가 정답인지 설명
7. 한국어로 작성`;

/** JSON 파싱 후 LaTeX 이스케이프 복원 */
function fixLatexEscaping(text: string): string {
  if (!text) return text;
  return text
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\x08/g, '\\b')
    .replace(/\r(?!\n)/g, '\\r');
}

interface ProblemInput {
  index: number;
  content: string;
  choices?: string[];
  type: string;
}

// POST /api/questions/generate-solutions — AI 풀이 생성
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { problems } = body as { problems: ProblemInput[] };

  if (!problems || !Array.isArray(problems) || problems.length === 0) {
    return badRequest('problems 배열이 필요합니다');
  }

  // 최대 30문제씩 처리
  if (problems.length > 30) {
    return badRequest('한 번에 최대 30문제까지 처리 가능합니다');
  }

  const ai = getClient();

  // 문제 텍스트 조합
  const problemTexts = problems.map((p) => {
    let text = `[문제 ${p.index}] (${p.type})\n${p.content}`;
    if (p.choices && p.choices.length > 0) {
      text += '\n' + p.choices.join('\n');
    }
    return text;
  }).join('\n\n---\n\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${SYSTEM_PROMPT}\n\n다음 ${problems.length}개 문제의 정답과 풀이를 생성하세요.\n\n${problemTexts}` },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: SOLUTION_SCHEMA,
      },
    });

    if (!response.text) {
      return NextResponse.json({ data: { solutions: [] } });
    }

    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const data = JSON.parse(jsonStr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solutions = (data.solutions || []).map((s: any) => ({
      index: s.index,
      answer: fixLatexEscaping(s.answer || ''),
      explanation: fixLatexEscaping(s.explanation || ''),
    }));

    return NextResponse.json({ data: { solutions } });
  } catch (err) {
    console.error('풀이 생성 실패:', err);
    return NextResponse.json(
      { error: { code: 'AI_ERROR', message: '풀이 생성 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
