import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, notFound, serverError } from '@/lib/api';
import { GoogleGenAI, Type } from '@google/genai';

const DIAGRAM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    diagramSpec: {
      type: Type.OBJECT,
      description: `Structured diagram specification. Types: triangle, circle, coordinatePlane, quadrilateral, solid, composite. Use mathematical coordinates.`,
      nullable: true,
      properties: {
        type: { type: Type.STRING },
      },
    },
    needsDiagram: {
      type: Type.BOOLEAN,
      description: 'Whether this question actually needs a diagram',
    },
  },
  required: ['needsDiagram'],
};

/** PATCH: 기존 문제에 도형 명세 추가/갱신 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    select: { id: true, content: true, chapter: true, choices: true },
  });

  if (!question) {
    return notFound('문제를 찾을 수 없습니다');
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다');
      return serverError('서버 설정 오류가 발생했습니다');
    }

    const ai = new GoogleGenAI({ apiKey });
    const choicesText = Array.isArray(question.choices)
      ? (question.choices as string[]).map((c, i) => `${i + 1}. ${c}`).join('\n')
      : '';

    const prompt = `You are a math diagram expert. Analyze this Korean math problem and determine if it needs a geometric diagram.

Problem: ${question.content}
${choicesText ? `Choices:\n${choicesText}` : ''}
Chapter: ${question.chapter}

If the problem involves geometry, functions/graphs, or statistics, create an appropriate diagramSpec.
Diagram types: triangle, circle, coordinatePlane, quadrilateral, solid (cube/cylinder/cone/sphere/prism/pyramid), composite.
Use mathematical coordinates. Provide accurate vertices, dimensions, and labels based on the problem's actual values.
If the problem does not need a diagram, set needsDiagram to false.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: DIAGRAM_SCHEMA,
      },
    });

    if (!response.text) {
      return serverError('도형 생성에 실패했습니다');
    }

    const result = JSON.parse(response.text.trim());

    if (!result.needsDiagram || !result.diagramSpec) {
      return NextResponse.json({
        data: { needsDiagram: false, message: '이 문제는 도형이 필요하지 않습니다' },
      });
    }

    // diagramSpec이 문자열인 경우 파싱
    let spec = result.diagramSpec;
    if (typeof spec === 'string') {
      spec = JSON.parse(spec);
    }

    await prisma.question.update({
      where: { id },
      data: { diagramSpec: spec },
    });

    return NextResponse.json({
      data: { needsDiagram: true, diagramSpec: spec },
    });
  } catch (error) {
    console.error('Diagram generation error:', error);
    return serverError('도형 생성에 실패했습니다');
  }
}
