import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { GoogleGenAI, Type } from '@google/genai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey });
}

const PDF_EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    problems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNum: { type: Type.NUMBER, description: '문제 번호 (예: 131, 132)' },
          sectionHeader: { type: Type.STRING, description: '유형/단원 제목 (예: "유형 01 서로소")' },
          difficultyTag: { type: Type.STRING, description: '난이도: 하, 중하, 중, 중상, 상 (없으면 빈 문자열)' },
          problemType: { type: Type.STRING, description: '문제 유형: 객관식, 주관식, 서술형' },
          content: { type: Type.STRING, description: '문제 본문 (마크다운+LaTeX). 수식은 $...$로 감싼다' },
          choices: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '객관식 보기 배열 (예: ["$2,\\; 14$", "$3,\\; 9$"]). 주관식이면 빈 배열',
          },
          boxItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '<보기> 항목 (예: ["ㄱ. $6$", "ㄴ. $10$"]). 없으면 빈 배열',
          },
          answer: { type: Type.STRING, description: '정답 (보이면 입력, 아니면 빈 문자열)' },
          sourceTag: { type: Type.STRING, description: '태그: 대표문제, 서술형 등 (없으면 빈 문자열)' },
        },
        required: ['questionNum', 'content', 'problemType'],
      },
    },
    concepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionHeader: { type: Type.STRING, description: '유형/단원 제목 (예: "유형 01 소수와 합성수")' },
          title: { type: Type.STRING, description: '개념 제목 (예: "소수와 합성수")' },
          content: { type: Type.STRING, description: '개념 설명 전문 (마크다운+LaTeX). 모든 수식은 $...$로 감싼다' },
        },
        required: ['sectionHeader', 'title', 'content'],
      },
      description: '유형 설명 박스/개념 요약 (있는 경우만)',
    },
  },
  required: ['problems'],
};

const SYSTEM_PROMPT = `당신은 한국 수학 교재 분석 전문가입니다.
주어진 수학 교재 페이지 이미지를 분석하여 모든 문제를 추출하세요.

[규칙]
1. 각 문제의 번호, 유형(객관식/주관식/서술형), 난이도 태그를 식별
2. 문제 본문은 마크다운으로 작성. 모든 수식은 $...$로 감싸기 (예: $2^3 \\\\times 3^2$)
3. 객관식 보기는 각각 별도 문자열로 choices 배열에 포함 (번호 ①②③④⑤ 포함)
4. <보기> 항목(ㄱ,ㄴ,ㄷ)은 boxItems에 별도 저장
5. 난이도 태그가 문제번호 옆에 있으면 difficultyTag에 저장
6. 페이지 상단의 유형/단원 헤더를 sectionHeader에 저장
7. "대표문제" 같은 특수 태그는 sourceTag에 저장. "서술형"은 problemType으로만 분류 (sourceTag에 넣지 않음)
8. 이미지/도형이 포함된 부분은 [그림] 표시
9. 정답이 같은 페이지에 보이면 answer에 포함, 아니면 빈 문자열
10. 유형 설명 박스(개념 요약)가 있으면 concepts 배열에 추출하세요. title은 개념 제목, content는 전체 설명 (번호 포함). 문제 번호가 없는 설명/정의 박스가 대상입니다.
11. **중요** 문제 안에 테두리/네모박스/사각형 박스가 있으면 그 안의 내용을 content에 반드시 포함하세요.
    - "보기" 라벨이 없는 단순 숫자/수식 박스 → content 본문 뒤에 줄바꿈 2번 후 마크다운 인용블록(>)으로 포함
    - 예시: "다음 중 소수는 몇 개인지 구하시오.\\n\\n> 1, 7, 21, 33, 47, 91, 113, 169"
    - 이 박스 내용이 누락되면 문제를 풀 수 없으므로 절대 생략하지 마세요
12. 수식에서 곱셈은 반드시 \\\\times 사용 (예: $2^{3} \\\\times 3^{2}$). 거듭제곱은 ^{} 사용 (예: $a^{2}$)
13. **중요** 문제 본문과 보기의 모든 숫자와 수학 변수(a, b, x, y, n 등)는 반드시 $...$로 감싸세요.
    - 예: "25 미만의 자연수" → "$25$ 미만의 자연수"
    - 예: "a와 b의 합" → "$a$와 $b$의 합"
    - 예: "> 1, 7, 21" → "> $1$, $7$, $21$"
    - 보기 번호(①②③④⑤)와 ㄱㄴㄷ은 감싸지 않음`;

/**
 * JSON 파싱 후 LaTeX 이스케이프 복원
 * JSON의 \t, \f, \b가 LaTeX 명령어(\times, \frac, \begin)와 충돌하는 문제 수정
 * 예: \times → JSON \t → tab문자 + "imes" → 복원하여 \times
 */
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

// POST /api/questions/pdf-extract — PDF 페이지에서 문제 추출
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '관리자만 사용 가능합니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { pages, bookCode } = body as { pages: PageInput[]; bookCode: string; chapter?: string };

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'pages 배열이 필요합니다' } },
      { status: 400 }
    );
  }

  if (!bookCode) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'bookCode가 필요합니다' } },
      { status: 400 }
    );
  }

  // 페이지당 이미지 크기 제한 (5MB)
  for (const page of pages) {
    const sizeBytes = (page.imageBase64.length * 3) / 4;
    if (sizeBytes > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `페이지 ${page.pageNum}의 이미지가 너무 큽니다 (5MB 제한)` } },
        { status: 400 }
      );
    }
  }

  const ai = getClient();
  const results: { pageNum: number; problems: unknown[]; concepts?: unknown[] }[] = [];

  // 페이지별 순차 처리 (rate limit 방지)
  for (const page of pages) {
    try {
      // base64에서 data URL prefix 제거
      const base64Data = page.imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/png', data: base64Data } },
              { text: page.textLayer 
                  ? `${SYSTEM_PROMPT}\n\n[OCR Text Content for Reference]\n${page.textLayer}\n\n위의 텍스트 레이어 정보를 참고하여 이미지 속의 문제를 오타 없이 완벽하게 추출하세요.`
                  : SYSTEM_PROMPT 
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: PDF_EXTRACT_SCHEMA,
        },
      });

      if (!response.text) {
        results.push({ pageNum: page.pageNum, problems: [] });
        continue;
      }

      let jsonStr = response.text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const data = JSON.parse(jsonStr);
      // LaTeX 이스케이프 복원 (\times → tab 등 JSON 파싱 부작용 수정)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixedProblems = (data.problems || []).map((p: any) => ({
        ...p,
        content: fixLatexEscaping(p.content),
        choices: Array.isArray(p.choices) ? p.choices.map(fixLatexEscaping) : p.choices,
        boxItems: Array.isArray(p.boxItems) ? p.boxItems.map(fixLatexEscaping) : p.boxItems,
        answer: fixLatexEscaping(p.answer),
        sectionHeader: fixLatexEscaping(p.sectionHeader),
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixedConcepts = (data.concepts || []).map((c: any) => ({
        ...c,
        content: fixLatexEscaping(c.content),
        title: fixLatexEscaping(c.title),
        sectionHeader: fixLatexEscaping(c.sectionHeader),
      }));
      results.push({
        pageNum: page.pageNum,
        problems: fixedProblems,
        concepts: fixedConcepts,
      });
    } catch (err) {
      console.error(`페이지 ${page.pageNum} 추출 실패:`, err);
      results.push({ pageNum: page.pageNum, problems: [], concepts: [] });
    }
  }

  return NextResponse.json({ data: results });
}
