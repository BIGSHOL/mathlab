import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, isResponse, badRequest, serverError } from '@/lib/api';
import { GoogleGenAI, Type } from '@google/genai';

const METADATA_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: '개념 제목 (없으면 빈 문자열)' },
    gradeLevel: { type: Type.STRING, description: '학교급: elementary, middle, high' },
    gradeNum: { type: Type.STRING, description: '학년 번호(초등3-6, 중등1-3) 또는 고등 과목코드(1,2,algebra,calculus1,prob,calculus2,geo)' },
    semester: { type: Type.NUMBER, description: '학기 (1 또는 2). 고등은 0' },
    chapter: { type: Type.STRING, description: '대단원명 (교육과정 기준)' },
    section: { type: Type.STRING, description: '중단원명 (없으면 빈 문자열)' },
    part: { type: Type.STRING, description: '영역: calc(수와연산), algebra(대수), func(함수), geo(도형), data(자료와확률)' },
    keywords: { type: Type.STRING, description: '핵심 키워드 3-5개, 쉼표 구분' },
    correctedContent: { type: Type.STRING, description: '맞춤법/띄어쓰기 교정된 전체 내용. 수정 없으면 빈 문자열' },
    corrections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING, description: '원문 표현' },
          corrected: { type: Type.STRING, description: '교정된 표현' },
          reason: { type: Type.STRING, description: '교정 사유 (짧게)' },
        },
        required: ['original', 'corrected', 'reason'],
      },
      description: '맞춤법/띄어쓰기 교정 목록. 수정 없으면 빈 배열',
    },
  },
  required: ['title', 'gradeLevel', 'gradeNum', 'semester', 'chapter', 'part', 'keywords', 'correctedContent', 'corrections'],
};

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey });
}

// POST /api/concepts/extract-metadata — AI 메타데이터 + 맞춤법 추출
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { title, fullContent, currentKeywords } = body as { title?: string; fullContent: string; currentKeywords?: string };

  if (!fullContent || fullContent.trim().length < 10) {
    return badRequest('개념 내용이 너무 짧습니다');
  }

  const ai = getClient();

  try {
    // 프롬프트 지시문과 사용자 내용을 명확히 분리
    const prompt = `당신은 한국 수학 교육과정 분류 전문가입니다.

[지시사항]
아래 <content> 태그 안의 수학 개념 텍스트를 분석하여 메타데이터를 추출하고, 맞춤법 오류만 교정하세요.

[분류 기준]
학교급/학년:
- elementary (초등): 3~6학년
- middle (중등): 1~3학년
- high (고등): 1(공통수학1), 2(공통수학2), algebra(대수), calculus1(미적분I), prob(확률과통계), calculus2(미적분II), geo(기하)

영역 (part):
- calc: 수와 연산 (사칙연산, 분수, 소수, 정수 등)
- algebra: 대수 (방정식, 부등식, 다항식, 인수분해 등)
- func: 함수 (일차함수, 이차함수, 좌표 등)
- geo: 도형 (삼각형, 원, 넓이, 부피, 합동, 닮음 등)
- data: 자료와 확률 (통계, 확률, 그래프 등)

대단원 (chapter): 한국 수학 교육과정의 대단원명을 정확히 작성. 예: "소인수분해", "정수와 유리수", "일차방정식"
중단원 (section): 대단원 하위의 중단원명. 확실하지 않으면 빈 문자열.

[맞춤법 교정 규칙]
- 명백한 맞춤법 오류만 교정 (예: "소숫점"→"소수점", "갯수"→"개수")
- 스타일 차이(콜론 앞뒤 공백, 쉼표 뒤 공백 등)는 교정하지 말 것
- 수식($...$)이나 LaTeX 표기는 절대 수정하지 말 것
- 원문의 줄바꿈과 구조를 그대로 유지
- 오류가 없으면 correctedContent를 빈 문자열, corrections를 빈 배열로
- correctedContent에는 <content> 안의 내용만 포함. 지시사항/분류기준을 절대 포함하지 말 것

[키워드 규칙]
${currentKeywords ? `- 현재 키워드: "${currentKeywords}". 기존 키워드가 적절하면 그대로 유지하고, 명백히 틀리거나 부족한 경우만 수정` : '- 핵심 용어 3-5개를 쉼표로 구분'}

<content>
${title ? `제목: ${title}\n` : ''}${fullContent.substring(0, 2000)}
</content>`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: METADATA_SCHEMA,
      },
    });

    if (!response.text) {
      return serverError('AI 응답이 비어있습니다');
    }

    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const data = JSON.parse(jsonStr);

    // Build grade code from level + num
    let gradeCode = '';
    const level = data.gradeLevel || 'middle';
    const num = data.gradeNum || '1';
    if (level === 'elementary') {
      gradeCode = `elementary_${num}`;
    } else if (level === 'middle') {
      gradeCode = `middle_${num}`;
    } else if (level === 'high') {
      gradeCode = `high_${num}`;
    }

    return NextResponse.json({
      data: {
        title: data.title || '',
        grade: gradeCode,
        semester: data.semester || 0,
        chapter: data.chapter || '',
        section: data.section || '',
        part: data.part || 'calc',
        keywords: data.keywords || '',
        correctedContent: data.correctedContent || '',
        corrections: data.corrections || [],
      },
    });
  } catch {
    return serverError('AI 메타데이터 추출에 실패했습니다');
  }
}
