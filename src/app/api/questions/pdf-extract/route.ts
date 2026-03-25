import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { GoogleGenAI, Type } from '@google/genai';
import { renderDiagram } from '@/lib/utils/svg-diagrams';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey });
}

// 재시도 설정
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 1000;

/** 지수 백오프 재시도 래퍼 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof Error &&
        (/429|503|rate|limit|quota|overloaded/i.test(err.message));
      if (!isRetryable || attempt === MAX_RETRIES) break;
      const delay = RETRY_BASE_DELAY * 2 ** attempt;
      console.warn(`[pdf-extract] ${label} 재시도 ${attempt + 1}/${MAX_RETRIES} (${delay}ms 대기)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
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
          diagramSvgs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                svg: {
                  type: Type.STRING,
                  description: '완전한 SVG 코드 문자열. <svg>...</svg> 형태. viewBox 필수, width/height 300 이하',
                },
                label: {
                  type: Type.STRING,
                  description: '도형 설명 (예: "분수 원", "수직선", "좌표평면")',
                },
              },
              required: ['svg', 'label'],
            },
            description: '(폴백 전용) diagramParams로 표현 불가한 도형만 직접 SVG 코드 작성. 가능하면 diagramParams 사용',
          },
          diagramParams: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                diagramType: {
                  type: Type.STRING,
                  description: 'fraction_circle | fraction_rect | number_line | place_value | dot_array | coordinate_plane | triangle | quadrilateral | circle | function_graph | venn_diagram | regular_polygon | flow_chart',
                },
                label: {
                  type: Type.STRING,
                  description: '도형 설명 (예: "분수 원 3개 5등분", "수직선 0~1")',
                },
                // fraction_circle용
                totalParts: { type: Type.NUMBER, description: '원 등분 수 (예: 5등분이면 5). fraction_circle 전용' },
                coloredParts: { type: Type.NUMBER, description: '색칠된 조각 수. fraction_circle 전용' },
                count: { type: Type.NUMBER, description: '원/사각형 개수. fraction_circle, fraction_rect 공용' },
                // fraction_rect용
                rows: { type: Type.NUMBER, description: '행 수. fraction_rect, dot_array 공용' },
                cols: { type: Type.NUMBER, description: '열 수. fraction_rect, dot_array 공용' },
                coloredCount: { type: Type.NUMBER, description: '색칠할 칸 수 (앞에서부터). fraction_rect 전용' },
                hatching: { type: Type.BOOLEAN, description: '빗금(사선) 패턴 사용 여부. 교재에서 색칠 대신 빗금이면 true. fraction_rect 전용' },
                // number_line용
                min: { type: Type.NUMBER, description: '수직선 최솟값. number_line 전용' },
                max: { type: Type.NUMBER, description: '수직선 최댓값. number_line 전용' },
                step: { type: Type.NUMBER, description: '눈금 간격. number_line 전용' },
                // place_value용
                hundreds: { type: Type.NUMBER, description: '백 자리. place_value 전용' },
                tens: { type: Type.NUMBER, description: '십 자리. place_value 전용' },
                ones: { type: Type.NUMBER, description: '일 자리. place_value 전용' },
              },
              required: ['diagramType', 'label'],
            },
            description: '구조화된 다이어그램. content에 [그림] 플레이스홀더와 대응. 서버에서 SVG로 렌더링. 사용하지 않는 필드는 0으로',
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
          sectionHeader: { type: Type.STRING, description: '유형/단원 제목 원문 (예: "유형 01 소수와 합성수")' },
          title: { type: Type.STRING, description: '순수 주제명. sectionHeader에서 "유형 XX" 번호를 제거 (예: "소수와 합성수"). boxed/phantom 금지, 본문 첫줄 금지' },
          content: { type: Type.STRING, description: '개념 설명 전문 (마크다운+LaTeX). 모든 수식은 $...$로 감싼다. 본문 전체를 빠짐없이 포함' },
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

⚠️ 최우선 규칙 — 빈칸에 정답 채우기 절대 금지!
원본 교재에서 □, ( ), 빈칸으로 되어 있는 답란은 반드시 \\\\boxed{\\\\phantom{0}}로 비워두세요.
정답 숫자를 content에 넣으면 학생이 문제를 풀 수 없게 됩니다. 정답은 answer 필드에만!
예: 원본 "$\\\\dfrac{5}{9} \\div 3 = \\\\dfrac{□}{27}$" → "$\\\\dfrac{5}{9} \\\\div 3 = \\\\dfrac{\\\\boxed{\\\\phantom{0}}}{27}$" ✅
예: "$\\\\dfrac{5}{9} \\\\div 3 = \\\\dfrac{5}{27}$" ← ❌ 정답 5가 채워짐!

[규칙]
1. 각 문제의 번호, 유형(객관식/주관식/서술형), 난이도 태그를 식별
2. 문제 본문은 마크다운으로 작성. 모든 수식은 $...$로 감싸기 (예: $2^3 \\\\times 3^2$)
3. 객관식 보기는 각각 별도 문자열로 choices 배열에 포함 (번호 ①②③④⑤ 포함)
4. <보기> 항목(ㄱ,ㄴ,ㄷ)은 boxItems에 별도 저장
5. 난이도 태그가 문제번호 옆에 있으면 difficultyTag에 저장
6. 페이지 상단의 유형/단원 헤더를 sectionHeader에 저장
7. "대표문제" 같은 특수 태그는 sourceTag에 저장. "서술형"은 problemType으로만 분류 (sourceTag에 넣지 않음)
8. 도형/다이어그램 처리 (SVG 렌더링 시스템):
   - 모든 도형은 **diagramParams 배열**로 출력 → 서버가 정확한 SVG로 렌더링합니다.
   - content에는 **[그림1], [그림2], [그림3]...** 플레이스홀더만 넣으세요. 1개라도 [그림1] 사용!
   - **[그림N] 배치 규칙:**
     - 독립 도형: 별도 줄에 배치. "텍스트\\n\\n[그림1]\\n\\n수식"
     - 인용블록(>) 안의 도형: **반드시 > 안에 포함!** 해당 텍스트 줄 끝에 붙이세요.
       ✅: "> $1 \\\\div 3 = \\\\dfrac{\\\\boxed{\\\\phantom{0}}}{3}$ 이고 [그림1]"
       ❌: "> 텍스트 이고\\n\\n[그림1]" (blockquote 밖으로 빠지면 안 됨!)
     - **문장 중간에 [그림N]을 넣지 마세요!** "3÷5를 [그림1]으로" ← 이런 식은 금지
   - **"그림"이라는 한국어 단어와 [그림N] 플레이스홀더를 혼동하지 마세요!** "그림으로 나타내고"의 "그림"은 일반 텍스트이고, [그림1]은 도형 위치 표시입니다.
   - images 배열은 사용하지 않아도 됩니다 (빈 배열). diagramParams만 정확히 채우세요.
   - **수식/숫자/분수는 도형이 아닙니다.** 텍스트/KaTeX로 표현하세요.
9. 정답이 같은 페이지에 보이면 answer에 포함, 아니면 빈 문자열
10. 유형 설명 박스(개념 요약)가 있으면 concepts 배열에 추출하세요. 문제 번호가 없는 설명/정의 박스가 대상입니다.
   - **title**: 유형 헤더에서 "유형 XX" 번호를 제거한 순수 주제명 (예: "유형 05 소인수 구하기" → title: "소인수 구하기")
   - title에 $\\\\boxed{}, \\\\phantom{} 등 KaTeX 수식을 넣지 마세요. □는 "빈칸" 또는 "네모" 한글로 표현.
   - title에 본문 첫 줄("자연수 $A$가" 등)을 넣지 마세요. 반드시 유형 헤더에서 주제를 추출!
   - **content**: 개념 설명 전문 (마크다운+LaTeX). 본문 전체를 빠짐없이 포함.
11. **중요** 문제 안에 테두리/네모박스/사각형 박스/색 배경 영역이 있으면 그 안의 내용을 반드시 마크다운 인용블록(>)으로 감싸세요.
    - 숫자/수식 나열 박스: "다음 중 소수는 몇 개인지 구하시오.\\n\\n> 1, 7, 21, 33, 47, 91, 113, 169"
    - 풀이 과정 박스 (단계별 유도): 각 줄을 > 로 감싸기
      예시: "> $1 \\\\div 3 = \\\\dfrac{\\\\boxed{\\\\phantom{0}}}{3}$ 이고\\n> $4 \\\\div 3$는 $\\\\dfrac{1}{3}$이 $\\\\boxed{\\\\phantom{0}}$개입니다.\\n> $\\\\Rightarrow 4 \\\\div 3 = \\\\dfrac{\\\\boxed{\\\\phantom{0}}}{3} = \\\\boxed{\\\\phantom{0}}\\\\dfrac{\\\\boxed{\\\\phantom{0}}}{3}$"
    - 원본에서 박스/테두리 안에 있는 내용은 반드시 > 인용블록으로 감싸세요. 누락하면 안 됩니다.
12. 수식에서 곱셈은 반드시 \\\\times 사용 (예: $2^{3} \\\\times 3^{2}$). 거듭제곱은 ^{} 사용 (예: $a^{2}$). 분수는 반드시 \\\\frac 사용 (예: $\\\\frac{1}{4}$). \\\\dfrac 사용 금지.
13. **중요** 문제 본문과 보기의 모든 숫자와 수학 변수(a, b, x, y, n 등)는 반드시 $...$로 감싸세요.
    - 예: "25 미만의 자연수" → "$25$ 미만의 자연수"
    - 예: "a와 b의 합" → "$a$와 $b$의 합"
    - 예: "> 1, 7, 21" → "> $1$, $7$, $21$"
    - 보기 번호(①②③④⑤)와 ㄱㄴㄷ은 감싸지 않음
    - 문제 내부 소문항 번호 (1), (2), (3), (가), (나) 등 구조적 번호 표기는 수식이 아니므로 $...$로 감싸지 않음. 예: "(1) 소수" → "(1) 소수" ✅, "$(1)$ 소수" ❌
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
    - **절대 금지: 빈칸에 정답을 채워 넣지 마세요!** 원본에서 비어있는 □는 반드시 \\\\boxed{\\\\phantom{0}}로 빈 상태 유지! 정답은 오직 answer 필드에만! content의 빈칸에 답(1, 4, 3 등)을 넣으면 학생이 풀 수 없습니다. 이 규칙을 위반하면 문제가 쓸모없어집니다.
    - 예: "$1 \\\\div 3 = \\\\dfrac{1}{3}$" ← ❌ 정답 1이 채워짐. "$1 \\\\div 3 = \\\\dfrac{\\\\boxed{\\\\phantom{0}}}{3}$" ← ✅ 빈칸 유지
16. **시각적 구조(흐름도, 배수표 등)** 화살표, 배수표, 흐름도 등 시각적 요소가 포함된 문제는:
    - **반드시** 텍스트+수식으로 내용을 먼저 표현하고, 추가로 [그림]과 images 바운딩 박스도 포함
    - [그림]만 넣고 텍스트 내용을 생략하면 안 됩니다. 이미지가 표시되지 않을 수 있으므로 텍스트가 반드시 있어야 합니다.
17. **트리/분기 구조** 하나의 수에서 여러 갈래로 분기하는 구조(중괄호, 화살표 등)는:
    - 텍스트로 완벽히 표현하기 어려우므로 [그림]으로 처리하고 images에 바운딩 박스 포함
    - 분기 내용은 텍스트로도 함께 나열
18. **$$...$$ 블록 수식 안에서 $...$를 중첩 사용하지 마세요.** 블록 수식 내부의 숫자/변수는 $ 없이 그대로 씁니다.
19. **원본 충실성** 교재 이미지에 보이는 텍스트/수식/레이아웃을 그대로 추출하세요. 교재에 없는 텍스트를 임의로 추가하거나 해석을 덧붙이지 마세요. 줄바꿈 위치도 원본을 따르세요.
    - **\\\\underbrace / \\\\overbrace 규칙**: 중괄호 아래/위 주석이 있으면 반드시 실제 수식을 감싸세요. 물결(~)이나 공백으로 길이를 맞추지 마세요.
      ✅: $\\\\underbrace{a \\\\times a \\\\times \\\\dots \\\\times a}_{n\\\\text{개}}$
      ❌: $\\\\underbrace{\\\\qquad\\\\sim\\\\sim\\\\sim\\\\sim\\\\qquad}_{n\\\\text{개}}$ (물결로 폭 채우기 금지)
20. **2열 레이아웃** 원본에서 수식/빈칸이 2열로 나란히 배치되어 있으면 마크다운 테이블을 사용하여 2열 레이아웃을 유지하세요.
21. **숫자 표(수 배열표)** 숫자들이 표 형태로 나열되어 있으면 반드시 마크다운 테이블로 추출하세요. [그림]으로만 처리하면 안 됩니다.
22. **온라인 변환** 교재에서 "○표 하세요", "색칠하세요", "선으로 이으세요" 등 종이에서만 가능한 지시는 온라인에서 가능한 형태로 변환:
    - "○표 하세요" → "모두 구하세요" 또는 "모두 쓰세요"
    - "색칠하세요" → "찾으세요" 또는 "쓰세요"
    - "선으로 이으세요" → "짝지어 쓰세요"
23. **텍스트 우선 원칙** 수직선, 도형 등 텍스트로 표현 불가능한 것은 [그림]+images로 처리하되, 표/흐름도/계산과정 등 텍스트로 표현 가능한 것은 반드시 텍스트로 먼저 표현하세요.
24. **AI 난이도 판단** 교재에 난이도 태그가 없으면(difficultyTag가 빈 문자열), 문제 내용을 분석하여 난이도를 판단하세요:
    - "하": 단순 계산, 한 단계 풀이, 개념 확인 (예: 단순 덧셈/뺄셈, 구구단, 기본 분수 표현, 그림 보고 답 쓰기)
    - "중하": 2단계 이내 풀이, 기본 응용 (예: 받아올림 있는 덧셈, 기본 약수 구하기, 단위 변환)
    - "중": 2~3단계 풀이, 보통 응용 (예: 혼합계산, 규칙 찾기, 분수의 덧셈/뺄셈)
    - "중상": 3~4단계 풀이, 심화 응용 (예: 여러 조건 결합, 서술형, 분수/소수 복합)
    - "상": 4단계 이상, 고난이도 사고력 (예: 복합 문장제, 증명, 창의력 문제)
    - 판단한 난이도를 difficultyTag에 넣으세요.
    - **초등 저학년 기본 문제는 대부분 "하" 또는 "중하"입니다.** 무조건 "중"으로 넣지 마세요. 그림 보고 빈칸 채우기, 분수 표현하기 등 단순한 문제는 "하"입니다.
25. **다이어그램: diagramParams 사용** 도형/그래프가 포함된 문제는 **diagramParams** 배열에 파라미터를 출력하세요. 서버가 정확한 SVG로 렌더링합니다.
    - **content에는 반드시 [그림1], [그림2], [그림3]... 플레이스홀더를 넣으세요.** 1개라도 [그림1] 사용!
    - [분수 원], [수직선] 같은 라벨 텍스트를 content에 넣지 마세요. 반드시 [그림N] 형식만 사용!
    - **diagramParams 배열의 순서와 [그림N] 번호가 1:1 대응.** diagramParams[0]이 [그림1], diagramParams[1]이 [그림2]...
    - **단계별 다이어그램은 반드시 분리!** 한 문제에 여러 단계의 도형이 나오면 각 단계를 별도의 diagramParams 항목 + 별도 [그림N]으로 분리하세요.
      예: "1÷3 = 1/3이고 [그림1], 4÷3는 1/3이 4개 [그림2], → 4÷3 = 4/3 [그림3]"
      → diagramParams: [{fraction_rect 1개 3등분 1칸 색칠}, {fraction_rect 4개 3등분 전체 색칠}, {fraction_rect 1개 3등분 4칸 색칠}]
    - **복잡한 다단계 시각 설명(화살표+여러 색상+단계별 변환 과정 등)은 diagramParams로 무리하지 말고 images 바운딩 박스로 크롭하세요.**
    - **diagramType별 필수 필드값 (정확히 채우세요!):**
      - **fraction_circle**: totalParts(등분수, 예:5), coloredParts(색칠수, 예:3), count(원 개수, 예:3)
        예: "3÷5 원 3개 5등분" → diagramType:"fraction_circle", totalParts:5, coloredParts:0, count:3
      - **fraction_rect**: rows(행), cols(열), coloredCount(색칠 칸수), count(사각형 개수), hatching(빗금 여부)
        예: "1/4 색칠" → diagramType:"fraction_rect", rows:4, cols:1, coloredCount:1, count:1
        예: "세로 3등분" → rows:3, cols:1. "가로 4등분" → rows:1, cols:4
        예: "빗금 표시된 사각형" → hatching:true (교재에서 사선 빗금이 그려져 있으면 true)
      - **number_line**: min(최솟값), max(최댓값), step(눈금간격)
        예: "0~1 수직선 8등분" → diagramType:"number_line", min:0, max:1, step:0.125
        **수직선에 점이나 호(arc)가 있으면 반드시 marks/highlights도 출력!** (현재 Gemini 스키마에서 지원 안 되므로 images 크롭 병행)
      - **place_value**: hundreds, tens, ones
    - **중요:** 사용하지 않는 숫자 필드는 0으로 넣으세요. 비워두면 안 됩니다.
    - 사진/실물 이미지는 images 바운딩 박스만 사용`;

// ===== 개념 추출 전용 =====

const CONCEPT_EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    concepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionCode: { type: Type.STRING, description: '섹션 코드 원문 (예: "01-1", "01-2", "2-3"). 페이지에 없으면 빈 문자열' },
          sectionHeader: { type: Type.STRING, description: '섹션 제목 원문 (예: "01-1 소수와 합성수", "01-2 소인수분해")' },
          title: { type: Type.STRING, description: '순수 주제명. 코드를 제거한 제목 (예: "소수와 합성수", "소인수분해")' },
          content: { type: Type.STRING, description: '개념 전체 본문 (마크다운+LaTeX). 정의, 예시, 방법, 참고, 개념플러스, 보충 설명 등 해당 섹션의 모든 내용을 하나로 통합. 수식은 $...$로 감싼다' },
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
                label: { type: Type.STRING, description: '이미지 설명' },
              },
              required: ['box', 'label'],
            },
            description: '텍스트로 표현 불가한 도형/이미지의 바운딩 박스. 없으면 빈 배열',
          },
        },
        required: ['sectionHeader', 'title', 'content'],
      },
    },
  },
  required: ['concepts'],
};

const CONCEPT_SYSTEM_PROMPT = `당신은 한국 수학 교재의 개념 페이지를 분석하여, **빈칸 학습 문제**로 변환하기 좋은 구조의 개념 텍스트를 생성하는 전문가입니다.
주어진 교재 페이지 이미지에서 **개념 설명**을 섹션별로 추출하세요.
이 페이지는 문제 페이지가 아니라 **개념/정의/공식 설명 페이지**입니다.

[핵심 원칙]
- 각 섹션 헤더(예: 01-1, 01-2, 2-3 등)를 개념의 경계로 인식
- 각 섹션의 모든 내용을 빠짐없이 하나의 content로 통합 추출
- (1), (2), (3) 등 하위 항목은 **문제가 아니라 개념 내 구조**로 유지
- 밑줄/볼드 강조된 핵심 용어는 **볼드**로 보존 → 이 용어들이 빈칸 문제의 정답 후보가 됨

[빈칸 학습 최적화]
- 추출된 텍스트는 나중에 핵심 용어를 빈칸으로 만드는 "빈칸 학습" 문제로 변환됨
- 따라서 **핵심 정의와 용어가 명확한 문장 구조**로 작성:
  - "~를 ~라 한다", "~를 ~라고 한다" 형태 유지
  - 정의에서 핵심 단어를 **볼드**로 표시 (예: **소수**, **합성수**, **거듭제곱**)
  - 공식에서 각 요소의 의미를 명시 (예: **밑**: 거듭제곱에서 곱한 수나 문자, **지수**: 곱한 문자의 개수)
- 개념 내용이 학습 효과가 높도록, 중요 정보가 자연스럽게 녹아든 완전한 문장으로 작성

[콘텐츠 통합 규칙 — 모든 내용을 content 하나에 통합]
- "개념플러스", "참고", "보충", 페이지 우측/하단 보조 설명 등을 **별도 분리하지 말고** 본문(content) 안에 자연스럽게 통합
- 통합 방법: 관련된 개념 설명 바로 뒤에 자연스럽게 이어붙이기
  - 예: 소수 정의 뒤에 "참고: $2$는 소수 중 유일한 짝수이자 가장 작은 소수이다" 추가
  - 예: 소인수분해 설명 뒤에 "개념플러스: $1$의 거듭제곱은 항상 $1$이다" 추가
- 구분이 필요할 때는 **참고** 또는 **개념플러스** 레이블을 볼드로 표시하되, 같은 content 안에 포함

[수식 규칙]
1. 모든 수식은 $...$로 감싸기 (예: $2^3 \\times 3^2$)
2. 곱셈은 반드시 \\times 사용, 거듭제곱은 ^{}, 분수는 \\frac
3. 모든 숫자와 수학 변수(a, b, x, n 등)는 $...$로 감싸기
4. 단, 소문항 번호 (1), (2), (가), (나)와 원번호 ①②③은 감싸지 않음
5. $$...$$ 블록 수식 안에서 $...$를 중첩 사용하지 않기

[내용 추출 규칙]
1. **정의**: "소수: 1보다 큰 자연수 중에서..." → 정의 텍스트 그대로 추출. 핵심 용어 **볼드**
2. **공식**: 수식을 $...$로 감싸서 추출. 각 기호의 의미도 명시
3. **예시(예) 제외**: "예", "예:" 등 예제/풀이 과정은 추출하지 않음. 빈칸 학습 가치가 낮은 풀이 과정, 계산 예시, 방법1/방법2/방법3 등은 모두 생략
4. **표(table) 제외**: 마크다운 테이블(|...|)을 생성하지 않음. 표 내용이 핵심 개념이면 문장으로 풀어서 설명
5. **방법/절차**: 순서 유지하여 ①②③ 또는 번호 목록으로
6. **참고/개념플러스/보충**: 해당 개념 설명 뒤에 자연스럽게 본문에 통합
7. **도형/다이어그램**: 텍스트로 완전히 설명 가능하면 텍스트로 설명. 불가능한 경우만 images 바운딩 박스 사용
8. **읽는 방법**: [읽는 방법] 등 보조 설명도 본문에 포함

[줄바꿈 규칙]
- (1), (2), (3) 등 하위 항목 시작 전에 줄바꿈
- ①, ②, ③ 등 세부 항목 시작 전에 줄바꿈
- 예시, 참고 등 별도 블록 전에 줄바꿈

[원본 충실성]
- 교재에 있는 텍스트/수식을 그대로 추출. 임의로 추가하거나 해석하지 않기
- 순서, 번호 체계, 강조 표현을 원본 그대로 유지
- 단, 보조 설명(개념플러스/참고 등)을 본문에 통합할 때는 위치를 적절히 배치`;

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
    .replace(/\r(?!\n)/g, '\\r')
    // Gemini가 \\n을 리터럴로 출력하는 경우 실제 줄바꿈으로 변환
    // \nabla, \newcommand 등 LaTeX 명령어는 보호 (뒤에 알파벳이 오지 않는 경우만)
    .replace(/\\n(?![a-zA-Z])/g, '\n');
}

interface PageInput {
  pageNum: number;
  imageBase64: string;
  textLayer?: string;
}

// POST /api/questions/pdf-extract — PDF 페이지에서 문제 추출
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { pages, bookCode, filenameContext, mode } = body as {
    pages: PageInput[]; bookCode: string; chapter?: string; filenameContext?: string;
    mode?: 'problems' | 'concepts';
  };
  const isConceptMode = mode === 'concepts';

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return badRequest('pages 배열이 필요합니다');
  }

  if (!bookCode) {
    return badRequest('bookCode가 필요합니다');
  }

  // 페이지당 이미지 크기 제한 (5MB)
  for (const page of pages) {
    const sizeBytes = (page.imageBase64.length * 3) / 4;
    if (sizeBytes > 5 * 1024 * 1024) {
      return badRequest(`페이지 ${page.pageNum}의 이미지가 너무 큽니다 (5MB 제한)`);
    }
  }

  const ai = getClient();
  const results: { pageNum: number; problems: unknown[]; concepts?: unknown[] }[] = [];

  // 페이지별 순차 처리 (rate limit 방지)
  for (const page of pages) {
    try {
      // base64에서 data URL prefix 제거
      const base64Data = page.imageBase64.replace(/^data:image\/\w+;base64,/, '');

      // Gemini API 호출 (재시도 포함)
      const activePrompt = isConceptMode ? CONCEPT_SYSTEM_PROMPT : SYSTEM_PROMPT;
      const activeSchema = isConceptMode ? CONCEPT_EXTRACT_SCHEMA : PDF_EXTRACT_SCHEMA;
      const ocrSuffix = page.textLayer
        ? `\n[OCR Text Content for Reference]\n${page.textLayer}\n\n위의 텍스트 레이어 정보를 참고하여 이미지 속의 ${isConceptMode ? '개념을' : '문제를'} 오타 없이 완벽하게 추출하세요.`
        : '';

      const data = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/png', data: base64Data } },
                { text: [activePrompt, filenameContext || '', ocrSuffix].filter(Boolean).join('\n') },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: activeSchema,
          },
        });

        if (!response.text) throw new Error('AI 응답 없음');

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        return JSON.parse(jsonStr);
      }, `페이지 ${page.pageNum}`);
      // 개념 모드: concepts만 후처리
      if (isConceptMode) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fixedConcepts = (data.concepts || []).map((c: any) => {
          let title = fixLatexEscaping(c.title || '');
          const sectionCode = (c.sectionCode || '').trim();
          const sectionHeader = fixLatexEscaping(c.sectionHeader || '');

          // 제목에서 boxed/phantom 제거
          title = title.replace(/\$\\?\\?boxed\{\\?\\?phantom\{[^}]*\}\}\$/g, '□');
          title = title.replace(/\\boxed\{\\phantom\{[^}]*\}\}/g, '□');

          return {
            sectionCode,
            sectionHeader: fixLatexEscaping(sectionHeader),
            title,
            content: fixLatexEscaping(c.content || ''),
            images: Array.isArray(c.images) ? c.images : [],
          };
        });
        results.push({ pageNum: page.pageNum, problems: [], concepts: fixedConcepts });
        continue;
      }

      // 문제 모드: problems + concepts 후처리
      // LaTeX 이스케이프 복원 (\times → tab 등 JSON 파싱 부작용 수정)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixedProblems = (data.problems || []).map((p: any) => {
        // diagramParams (플랫 필드) → renderDiagram으로 정확한 SVG 생성
        const paramSvgs: { svg: string; label: string }[] = [];
        if (Array.isArray(p.diagramParams)) {
          for (const dp of p.diagramParams) {
            const dtype = dp.diagramType || dp.type;
            if (!dtype) continue;
            // 플랫 필드를 params 객체로 변환
            const params: Record<string, unknown> = dp.params || {};
            // 플랫 필드 병합 (스키마에서 명시적으로 정의된 필드들)
            for (const key of ['totalParts', 'coloredParts', 'count', 'rows', 'cols', 'coloredCount',
                               'hatching', 'min', 'max', 'step', 'hundreds', 'tens', 'ones']) {
              if (dp[key] !== undefined && dp[key] !== 0) {
                params[key] = dp[key];
              }
            }
            const svg = renderDiagram({ type: dtype, params });
            if (svg) {
              paramSvgs.push({ svg, label: dp.label || dtype });
            }
          }
        }
        // 기존 diagramSvgs (Gemini 직접 생성)와 병합 — paramSvgs 우선
        const rawSvgs: { svg: string; label: string }[] = Array.isArray(p.diagramSvgs) ? p.diagramSvgs : [];
        const mergedSvgs = paramSvgs.length > 0 ? paramSvgs : rawSvgs;

        // 정규화된 diagramParams 반환 (클라이언트 편집기용)
        const normalizedParams: { type: string; label: string; params: Record<string, unknown> }[] = [];
        if (Array.isArray(p.diagramParams)) {
          for (const dp of p.diagramParams) {
            const dtype = dp.diagramType || dp.type;
            if (!dtype) continue;
            const paramObj: Record<string, unknown> = dp.params || {};
            for (const key of ['totalParts', 'coloredParts', 'count', 'rows', 'cols', 'coloredCount',
                               'hatching', 'min', 'max', 'step', 'hundreds', 'tens', 'ones']) {
              if (dp[key] !== undefined && dp[key] !== 0) {
                paramObj[key] = dp[key];
              }
            }
            normalizedParams.push({ type: dtype, label: dp.label || dtype, params: paramObj });
          }
        }

        return {
          ...p,
          content: fixLatexEscaping(p.content),
          choices: Array.isArray(p.choices) ? p.choices.map(fixLatexEscaping) : p.choices,
          boxItems: Array.isArray(p.boxItems) ? p.boxItems.map(fixLatexEscaping) : p.boxItems,
          answer: fixLatexEscaping(p.answer),
          sectionHeader: fixLatexEscaping(p.sectionHeader),
          images: Array.isArray(p.images) ? p.images : [],
          diagramSvgs: mergedSvgs,
          diagramParams: normalizedParams,
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixedConcepts = (data.concepts || []).map((c: any) => {
        let title = fixLatexEscaping(c.title || '');
        const sectionHeader = fixLatexEscaping(c.sectionHeader || '');

        // 제목에서 $\boxed{\phantom{...}}$ 등 KaTeX 빈칸 → □ 또는 제거
        title = title.replace(/\$\\?\\?boxed\{\\?\\?phantom\{[^}]*\}\}\$/g, '□');
        title = title.replace(/\\boxed\{\\phantom\{[^}]*\}\}/g, '□');

        // 제목이 본문 첫줄처럼 보이면 (조사로 끝남) sectionHeader에서 주제 추출
        if (/[가-힣]\s*$/.test(title) && /[이가을를에서와은는]\s*$/.test(title)) {
          const headerTitle = sectionHeader
            .replace(/^유형\s*(UP\s*)?\d+\s*/i, '')
            .trim();
          if (headerTitle) title = headerTitle;
        }

        // sectionHeader에서도 boxed 제거
        const cleanHeader = sectionHeader
          .replace(/\$\\?\\?boxed\{\\?\\?phantom\{[^}]*\}\}\$/g, '□')
          .replace(/\\boxed\{\\phantom\{[^}]*\}\}/g, '□');

        return {
          ...c,
          content: fixLatexEscaping(c.content),
          title,
          sectionHeader: cleanHeader,
        };
      });
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
