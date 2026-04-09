import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, notFound, serverError } from '@/lib/api';
import { GoogleGenAI, Type } from '@google/genai';
import { DIAGRAM_PARAMS_SCHEMA } from '@/lib/constants/diagram-schema';
import { normalizeDiagramParams } from '@/lib/utils/diagram-param-collect';

const DIAGRAM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    diagramParams: {
      ...DIAGRAM_PARAMS_SCHEMA,
      description: '구조화된 다이어그램 파라미터 (26개 타입). 서버가 SVG로 렌더링.',
      nullable: true,
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
  const user = await requireSuperAdmin();
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

If the problem involves geometry, functions/graphs, or statistics, create an appropriate diagramParams array.
Use the 26-type structured format:
- triangle: vertices [{x,y,label}], sideLabels [{from,to,label}], angleLabels [{vertex,value}]
- quadrilateral: vertices [{x,y,label}], quadType (rectangle|square|parallelogram|trapezoid|rhombus)
- circle: cx, cy, radius, arcs [{startAngle,endAngle,label}]
- function_graph: functions [{expression,label}], xRange, yRange, points [{x,y,label}]
- coordinate_plane: xRange, yRange, points [{x,y,label}]
- solid_figure: shape (cube|cylinder|cone|sphere|triangular_prism|pyramid), dimensions
- venn_diagram: sets [{label,elements}], intersectionElements
Provide accurate coordinates, dimensions, and labels based on the problem's actual values.
If the problem does not need a diagram, set needsDiagram to false.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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

    if (!result.needsDiagram || !result.diagramParams || !Array.isArray(result.diagramParams) || result.diagramParams.length === 0) {
      return NextResponse.json({
        data: { needsDiagram: false, message: '이 문제는 도형이 필요하지 않습니다' },
      });
    }

    // Gemini 플랫 응답 → 정규화된 DiagramParam[] 배열
    const normalized = normalizeDiagramParams(result.diagramParams);

    await prisma.question.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { diagramSpec: normalized as any },
    });

    return NextResponse.json({
      data: { needsDiagram: true, diagramSpec: normalized },
    });
  } catch (error) {
    console.error('Diagram generation error:', error);
    return serverError('도형 생성에 실패했습니다');
  }
}
