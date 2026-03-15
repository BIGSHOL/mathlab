import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey });
}

const SVG_PROMPT = `수학 교재 도형을 간결한 SVG로 변환하는 전문가입니다.

반드시 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H">...</svg> 형태로 출력.
SVG 코드만 출력. 텍스트/설명/마크다운/주석(<!-- -->) 없이 순수 SVG만.
viewBox: 200~400 범위. 선: #555 stroke-width="1.5". 텍스트: font-size="13" font-family="sans-serif".
채우기: #3B82F6(파랑), #10B981(초록), #F97316(주황), #EF4444(빨강), fill-opacity="0.3".
분수원: 원 N등분, 파이조각 path. 분수사각형: 격자+셀 색칠. 수직선: 가로선+눈금+숫자.
코드를 최대한 짧게 유지. 불필요한 속성/주석 생략. 반드시 </svg>로 끝내세요.`;

// POST /api/questions/generate-svg — 도형 이미지를 SVG로 변환
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '관리자만 사용 가능합니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { imageBase64, description } = body as {
    imageBase64: string;
    description?: string;
  };

  if (!imageBase64) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'imageBase64가 필요합니다' } },
      { status: 400 }
    );
  }

  const ai = getClient();
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  try {
    const userMessage = description
      ? `이 도형을 SVG로 변환하세요. 도형 설명: ${description}`
      : '이 도형을 SVG로 변환하세요.';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Data } },
            { text: userMessage },
          ],
        },
      ],
      config: {
        systemInstruction: SVG_PROMPT,
        temperature: 0.1,
        maxOutputTokens: 16384,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    let svgText = (response.text || '').trim();
    console.log('[generate-svg] Gemini 응답 길이:', svgText.length, '처음 200자:', svgText.substring(0, 200));

    // 마크다운 코드블록 제거 (```svg, ```xml, ```html, ``` 등)
    svgText = svgText.replace(/^```(?:svg|xml|html)?\s*\n?/gm, '').replace(/\n?\s*```$/gm, '');

    // SVG 태그 추출
    let svgMatch = svgText.match(/<svg[\s\S]*?<\/svg>/);

    // 잘린 SVG 복구: <svg>로 시작하지만 </svg>가 없는 경우
    if (!svgMatch && svgText.includes('<svg')) {
      console.warn('[generate-svg] SVG 잘림 감지, 복구 시도');
      // 열린 태그들을 닫아서 복구
      let repaired = svgText.substring(svgText.indexOf('<svg'));
      // 잘린 속성/태그 정리: 마지막 완전한 '>' 이후 잘린 부분 제거
      const lastClose = repaired.lastIndexOf('>');
      if (lastClose > 0) {
        repaired = repaired.substring(0, lastClose + 1);
      }
      repaired += '</svg>';
      svgMatch = repaired.match(/<svg[\s\S]*<\/svg>/);
    }

    if (!svgMatch) {
      console.error('[generate-svg] SVG 태그 없음. 전체 응답:', svgText.substring(0, 500));
      return NextResponse.json(
        { error: { code: 'GENERATION_FAILED', message: 'SVG 생성 실패' } },
        { status: 422 }
      );
    }

    return NextResponse.json({ data: { svg: svgMatch[0] } });
  } catch (err) {
    console.error('[generate-svg] 에러:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'SVG 생성 중 오류' } },
      { status: 500 }
    );
  }
}
