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
          images: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                box: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: '바운딩 박스 [y_min, x_min, y_max, x_max] (0~1000 정규화 좌표)',
                },
                label: {
                  type: Type.STRING,
                  description: '도형/이미지 설명 (예: "원", "삼각형", "좌표평면", "수직선")',
                },
              },
              required: ['box', 'label'],
            },
            description: '문제에 포함된 도형/이미지의 바운딩 박스. 없으면 빈 배열',
          },
          diagrams: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: '다이어그램 종류: number_line, fraction_circle, fraction_rect, place_value, dot_array, flow_chart, coordinate_plane, circle, triangle, quadrilateral, function_graph, venn_diagram, regular_polygon',
                },
                params: {
                  type: Type.OBJECT,
                  description: '다이어그램 파라미터 (타입별 상이). number_line: {min,max,step,marks}, fraction_circle: {totalParts,coloredParts,label}, fraction_rect: {rows,cols,coloredCells,label}, place_value: {hundreds,tens,ones}, dot_array: {rows,cols}, coordinate_plane: {xRange,yRange,points,lines}, triangle: {vertices,sides,angles}, circle: {radius,labels,arcs}, quadrilateral: {vertices,sides,type}, function_graph: {xRange,yRange,functions,points}, venn_diagram: {sets,intersection}, regular_polygon: {sides,labels,diagonals}',
                  properties: {},
                },
              },
              required: ['type', 'params'],
            },
            description: '도형/그래프를 SVG로 생성하기 위한 구조화 데이터. 수직선, 분수원, 좌표평면, 삼각형 등 텍스트로 표현 불가한 시각 요소에 사용. 없으면 빈 배열',
          },
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
8. 이미지/도형이 포함된 부분:
   - content에 [그림] 또는 [그림1], [그림2] 표시 (여러 개면 번호 부여)
   - images 배열에 해당 도형/이미지의 바운딩 박스를 [y_min, x_min, y_max, x_max] 형식으로 반환
   - 좌표는 이미지 전체 크기 대비 0~1000 범위의 정규화 좌표
   - label에는 도형 종류 (예: "원", "삼각형", "좌표평면", "수직선")
   - images 순서와 [그림] 번호가 대응. 도형 없으면 images 빈 배열
   - **바운딩 박스는 그림/도형 영역만 최소한으로 잡으세요.** 주변 텍스트, 문제 번호, 수식은 절대 포함하지 마세요.
   - **수식/숫자/분수는 이미지가 아닙니다.** $\\\\frac{1}{4}$, $216 + 432 = \\\\boxed{}$ 등은 텍스트로 표현하세요. 이미지로 처리하면 안 됩니다.
   - 이미지로 처리해야 하는 것: 색칠된 도형, 수직선, 그래프, 사진, 수 모형, 색깔 블록 등 **텍스트/수식으로 표현 불가능한 시각 요소**만
9. 정답이 같은 페이지에 보이면 answer에 포함, 아니면 빈 문자열
10. 유형 설명 박스(개념 요약)가 있으면 concepts 배열에 추출하세요. title은 개념 제목, content는 전체 설명 (번호 포함). 문제 번호가 없는 설명/정의 박스가 대상입니다.
11. **중요** 문제 안에 테두리/네모박스/사각형 박스가 있으면 그 안의 내용을 content에 반드시 포함하세요.
    - "보기" 라벨이 없는 단순 숫자/수식 박스 → content 본문 뒤에 줄바꿈 2번 후 마크다운 인용블록(>)으로 포함
    - 예시: "다음 중 소수는 몇 개인지 구하시오.\\n\\n> 1, 7, 21, 33, 47, 91, 113, 169"
    - 이 박스 내용이 누락되면 문제를 풀 수 없으므로 절대 생략하지 마세요
12. 수식에서 곱셈은 반드시 \\\\times 사용 (예: $2^{3} \\\\times 3^{2}$). 거듭제곱은 ^{} 사용 (예: $a^{2}$). 분수는 반드시 \\\\dfrac 사용 (예: $\\\\dfrac{1}{4}$). \\\\frac 대신 \\\\dfrac을 써야 분자/분모가 작아지지 않습니다.
13. **중요** 문제 본문과 보기의 모든 숫자와 수학 변수(a, b, x, y, n 등)는 반드시 $...$로 감싸세요.
    - 예: "25 미만의 자연수" → "$25$ 미만의 자연수"
    - 예: "a와 b의 합" → "$a$와 $b$의 합"
    - 예: "> 1, 7, 21" → "> $1$, $7$, $21$"
    - 보기 번호(①②③④⑤)와 ㄱㄴㄷ은 감싸지 않음
14. **세로셈(세로 연산)** 교재에서 세로로 배치된 덧셈/뺄셈/곱셈/나눗셈은 반드시 세로 형식을 유지해야 합니다. 가로로 변환하면 안 됩니다.
    - 세로셈은 마크다운 코드블록 형태로 표현하세요 (KaTeX array 사용 금지):
    \`\`\`
      436
    + 251
    -----
    \`\`\`
    - 답 빈칸이 있는 경우:
    \`\`\`
      436
    + 251
    -----
      □□□
    \`\`\`
    - 보기(예시)와 풀이 문제가 함께 있으면 각각 별도의 코드블록으로
    - 올림 표시가 있으면 해당 자릿수 위에 작은 숫자로 표시
    - 초등생에게 세로셈과 가로셈은 완전히 다른 문제이므로 절대 가로로 변환하지 마세요
15. **빈칸/답란** 문제에 네모칸(□), 빈칸, ( ) 등 학생이 답을 쓰는 공란이 있으면:
    - 수식 안의 빈칸: $216 + 432 = \\\\boxed{\\\\phantom{000}}$
    - 여러 빈칸: 각각 \\\\boxed{\\\\phantom{000}} 사용
    - 빈칸 답란은 절대 생략하지 마세요. 초등 수학에서 답란은 문제의 핵심입니다.
    - "□ 안에"와 같은 문구는 원본 그대로 보존하세요
16. **시각적 구조(흐름도, 배수표 등)** 화살표, 배수표, 흐름도 등 시각적 요소가 포함된 문제는:
    - **반드시** 텍스트+수식으로 내용을 먼저 표현하고, 추가로 [그림]과 images 바운딩 박스도 포함
    - [그림]만 넣고 텍스트 내용을 생략하면 안 됩니다. 이미지가 표시되지 않을 수 있으므로 텍스트가 반드시 있어야 합니다.
17. **트리/분기 구조** 하나의 수에서 여러 갈래로 분기하는 구조(중괄호, 화살표 등)는:
    - 텍스트로 완벽히 표현하기 어려우므로 [그림]으로 처리하고 images에 바운딩 박스 포함
    - 분기 내용은 텍스트로도 함께 나열
18. **$$...$$ 블록 수식 안에서 $...$를 중첩 사용하지 마세요.** 블록 수식 내부의 숫자/변수는 $ 없이 그대로 씁니다.
19. **원본 충실성** 교재 이미지에 보이는 텍스트/수식/레이아웃을 그대로 추출하세요. 교재에 없는 텍스트를 임의로 추가하거나 해석을 덧붙이지 마세요. 줄바꿈 위치도 원본을 따르세요.
20. **2열 레이아웃** 원본에서 수식/빈칸이 2열로 나란히 배치되어 있으면 마크다운 테이블을 사용하여 2열 레이아웃을 유지하세요.
21. **숫자 표(수 배열표)** 숫자들이 표 형태로 나열되어 있으면 반드시 마크다운 테이블로 추출하세요. [그림]으로만 처리하면 안 됩니다.
22. **온라인 변환** 교재에서 "○표 하세요", "색칠하세요", "선으로 이으세요" 등 종이에서만 가능한 지시는 온라인에서 가능한 형태로 변환:
    - "○표 하세요" → "모두 구하세요" 또는 "모두 쓰세요"
    - "색칠하세요" → "찾으세요" 또는 "쓰세요"
    - "선으로 이으세요" → "짝지어 쓰세요"
23. **텍스트 우선 원칙** 수직선, 도형 등 텍스트로 표현 불가능한 것은 [그림]+images로 처리하되, 표/흐름도/계산과정 등 텍스트로 표현 가능한 것은 반드시 텍스트로 먼저 표현하세요.
24. **AI 난이도 판단** 교재에 난이도 태그가 없으면(difficultyTag가 빈 문자열), 문제 내용을 분석하여 난이도를 판단하세요:
    - "하": 단순 계산, 한 단계 풀이, 개념 확인 (예: 단순 덧셈/뺄셈, 구구단)
    - "중하": 2단계 이내 풀이, 기본 응용 (예: 받아올림 있는 덧셈, 기본 약수 구하기)
    - "중": 2~3단계 풀이, 보통 응용 (예: 혼합계산, 규칙 찾기)
    - "중상": 3~4단계 풀이, 심화 응용 (예: 여러 조건 결합, 서술형)
    - "상": 4단계 이상, 고난이도 사고력 (예: 복합 문장제, 증명)
    - 판단한 난이도를 difficultyTag에 넣으세요.
25. **다이어그램 구조화 데이터** 도형/그래프가 포함된 문제는 images(바운딩 박스)와 함께 diagrams 배열에 SVG 생성용 구조화 데이터를 제공하세요.
    - 지원 타입과 필수 파라미터:
      - number_line: {min, max, step, marks: [{value, label}], highlights: [{from, to}]}
      - fraction_circle: {totalParts, coloredParts, label}
      - fraction_rect: {rows, cols, coloredCells: [0-based index], label}
      - place_value: {hundreds, tens, ones}
      - dot_array: {rows, cols}
      - coordinate_plane: {xRange: [min,max], yRange: [min,max], points: [{x,y,label}], lines: [{points,style}]}
      - triangle: {vertices: [{x,y,label},{x,y,label},{x,y,label}], sides: [{from,to,label}], angles: [{vertex,value}]}
      - circle: {radius, labels: [{text, angle}], arcs: [{startAngle, endAngle, label}]}
      - quadrilateral: {vertices: [4개 {x,y,label}], sides, type: "rectangle"|"square"|"parallelogram"|"trapezoid"|"rhombus"}
      - function_graph: {xRange, yRange, functions: [{expression, label}], points}
      - venn_diagram: {sets: [{label, elements}], intersection: {elements}}
      - regular_polygon: {sides, labels: [{vertex, text}], diagonals, sideLength}
    - 수직선에 점 표시 → number_line, 분수 색칠 원 → fraction_circle, 좌표평면 그래프 → coordinate_plane 또는 function_graph
    - 사진/실물 이미지는 diagrams에 넣지 말고 images만 사용
    - diagrams와 images를 함께 제공하면 SVG 우선, 실패시 크롭 이미지를 폴백으로 사용합니다`;

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
        images: Array.isArray(p.images) ? p.images : [],
        diagrams: Array.isArray(p.diagrams) ? p.diagrams : [],
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
