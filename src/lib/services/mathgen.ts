import { Type } from '@google/genai';
import { GeneratedProblem, SelectionState, SchoolLevel, Difficulty } from '@/types/mathgen';
import { getGeminiClient, stripCodeFence } from './gemini';

/**
 * 학교급 + 난이도에 따라 Gemini 모델 자동 선택
 * - 초등 전체, 중등 L1~L2 → Flash (빠르고 저렴)
 * - 중등 L3~L5, 고등 전체 → gemini-3-flash-preview (고퀄리티)
 */
function selectModel(selection: SelectionState): string {
  const { schoolLevel, difficulty, mode } = selection;

  // 이미지 모드(유사/동일)는 SVG 생성 + 고난도 분석 필요 → 항상 상위 모델
  if (mode === 'image' || mode === 'exact') return 'gemini-2.5-flash';

  if (schoolLevel === SchoolLevel.HIGH) return 'gemini-3-flash-preview';

  if (schoolLevel === SchoolLevel.MIDDLE) {
    if (difficulty === Difficulty.LEVEL3 || difficulty === Difficulty.LEVEL4 || difficulty === Difficulty.LEVEL5) {
      return 'gemini-3-flash-preview';
    }
  }

  return 'gemini-2.5-flash';
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    question: {
      type: Type.STRING,
      description: 'The main text. Use Markdown. WRAP MATH IN $...$. NO IMG TAGS.',
    },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Array of 5 options. Leave EMPTY for subjective. WRAP MATH IN $...$.',
    },
    answer: {
      type: Type.STRING,
      description: "The final answer. IF OBJECTIVE: Include number (e.g., '(3) ...'). IF SUBJECTIVE: Just the value.",
    },
    solution: {
      type: Type.STRING,
      description: 'Detailed step-by-step solution. MUST USE NEWLINES BETWEEN STEPS.',
    },
    topic: {
      type: Type.STRING,
      description: 'Topic label derived from image or selection.',
    },
    difficulty: {
      type: Type.STRING,
      description: 'Difficulty level.',
    },
    diagramSVG: {
      type: Type.STRING,
      description: 'DEPRECATED. Use diagramSpec instead. Raw SVG fallback only if diagramSpec cannot represent the diagram.',
      nullable: true,
    },
    diagramSpec: {
      type: Type.OBJECT,
      description: `Structured diagram spec. Do NOT provide coordinates — use presets and the system calculates geometry automatically.

TYPES:
1. triangle: { type:"triangle", preset:"right"|"equilateral"|"isosceles"|"scalene"|"right-isosceles", sides?:{a:3,b:4,c:5}, angles?:{A:90,B:60,C:30}, vertexLabels?:["A","B","C"] }
2. circle: { type:"circle", showRadius?:true, showDiameter?:true, chords?:[{from:30,to:150}], arcs?:[{from:0,to:90,label:"l"}] }
3. coordinatePlane: { type:"coordinatePlane", functions?:[{expr:"x^2-2*x+1",label:"y=f(x)"}], points?:[{coord:[1,0],label:"P"}], showGrid?:true }
   (xRange/yRange auto-calculated from functions)
4. quadrilateral: { type:"quadrilateral", preset:"square"|"rectangle"|"parallelogram"|"rhombus"|"trapezoid", sides?:{width:8,height:5,top:4}, vertexLabels?:["A","B","C","D"], diagonals?:true }
5. solid: { type:"solid", shape:"cube"|"cylinder"|"cone"|"sphere"|"prism"|"pyramid", dimensions?:{radius:5,height:10}, showDimensions?:true }
6. composite: { type:"composite", elements:[...specs] }

RULES: Use preset names, NOT coordinates. Provide side lengths/angles from the problem. The system handles all geometry.`,
      nullable: true,
      properties: {
        type: { type: Type.STRING, description: 'Diagram type' },
      },
    },
  },
  required: ['question', 'answer', 'solution', 'topic', 'difficulty'],
};

const COMMON_INSTRUCTIONS = `
    Requirements:
    1. The problem must be mathematically accurate and suitable for Korean students.
    2. [Text Formatting & LaTeX - CRITICAL]
       - Use LaTeX formatting for **ALL** mathematical expressions, numbers, variables, and formulas in the Question/Answer/Solution text.
       - **Inline Math**: Wrap in single dollar signs, e.g., $x^2 + 2x + 1$.
       - **Block Math**: Wrap in double dollar signs, e.g., $$ \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$.
       - **CHOICES (보기)**: You MUST wrap the mathematical content of each choice in $ symbols.
         - Incorrect: "x^2 + x"
         - Correct: "$x^2 + x$"
       - **NO HTML TAGS**: NEVER include ANY HTML tags in the output text. No <img>, <span>, <div>, <br>, or any other HTML element. Use only plain text and Markdown with LaTeX ($...$, $$...$$).
       - **NO Markdown images**: Do NOT use ![...](...) syntax.
       - **NO PLACEHOLDERS**: Do NOT write "[Diagram]", "[그래프]", or any placeholder text. If a diagram is needed, use the "diagramSpec" field.
       - **NO \\dfrac**: NEVER use \\dfrac. Always use \\frac instead. \\dfrac creates oversized fractions in inline math.
       - **NO LINE BREAKS before conditions**: Trailing conditions like "(단, ...)", "(단, $a < b$)", "(정답 2개)" MUST stay on the same line as the preceding sentence. NEVER put them on a new line.

    3. [Question Format Rules - CRITICAL]
       - **If Question Format is '객관식 (5지선다)'**:
         - You MUST provide exactly 5 choices in the "choices" array.
         - The answer must be one of these choices.
         - NEVER include the choices (①②③④⑤) in the "question" field. Choices go ONLY in the "choices" array.
       - **If Question Format is '주관식/서술형'**:
         - The "choices" array MUST be empty [].

    4. [Layout, Line Breaks & Boxed Content - CRITICAL]
       - **Line Breaks**: You MUST preserve the original line breaks. Do NOT squash text into a single paragraph. Use double newlines (\\n\\n) to separate lines and paragraphs.
       - **Dialogues**: If the problem contains a dialogue (e.g., Person A: ..., Person B: ...), each speaker's line MUST be on a new line separated by double newlines (\\n\\n).
       - **Boxed Content**: If ANY part of the problem is enclosed in a box (like <보기>, a dialogue box, or a condition box), you MUST wrap that entire section in a Markdown Blockquote (>).
         Example:
         > **<보 기>**
         > ㄱ. Statement 1
         > ㄴ. Statement 2
       - **Rules**:
         - The first line inside the blockquote MUST be \`**<보 기>**\`.
         - Each item (ㄱ, ㄴ, ㄷ...) MUST be on a NEW LINE within the blockquote.
         - Dialogue boxes must also use blockquote syntax:
           > 솔이: 내 사물함의 비밀번호는 ...
           >
           > 정우: 힌트 좀 줘.

    5. [Visuals & Diagrams - USE PRESETS, NOT COORDINATES]
       - **When to generate**: If the topic involves **Geometry**, **Functions/Graphs**, or **Statistics**.
       - **Use "diagramSpec"**: Provide a preset-based JSON. Do NOT calculate coordinates — our system does it automatically.
       - **Examples**:
         - 직각삼각형 (밑변 3, 높이 4): { "type":"triangle", "preset":"right", "sides":{"b":4,"c":3} }
         - 정삼각형 (한 변 6): { "type":"triangle", "preset":"equilateral", "sides":{"a":6} }
         - 원 (반지름 표시): { "type":"circle", "showRadius":true }
         - 이차함수 그래프: { "type":"coordinatePlane", "functions":[{"expr":"x^2-2*x+1","label":"y=x²-2x+1"}], "showGrid":true }
         - 직사각형 (가로 8, 세로 5): { "type":"quadrilateral", "preset":"rectangle", "sides":{"width":8,"height":5} }
         - 원기둥 (반지름 5, 높이 10): { "type":"solid", "shape":"cylinder", "dimensions":{"radius":5,"height":10}, "showDimensions":true }
       - **CRITICAL**: Use the actual numbers from your problem in sides/dimensions.
       - **Functions format**: "x^2+3*x-1" (supports +,-,*,/,^,sin,cos,tan,sqrt,abs,log,ln,pi,e).
       - **Do NOT provide raw SVG in "diagramSVG"**.
       - **NEVER generate an empty coordinatePlane without functions/points.** If the problem involves a graph, you MUST include the function expression(s) in "functions" array. Example for a derivative graph: { "type":"coordinatePlane", "functions":[{"expr":"-3*(x-1)^2+3","label":"y=f'(x)"}], "points":[{"coord":[0,0],"label":"O"},{"coord":[1,3]}], "showGrid":true }
       - **NEVER use HTML tags (span, div, etc.) in the question text to reference diagrams.** Use plain text like "아래 그림과 같다" instead.

    6. [Solution Quality - WORKBOOK STYLE]
       - Provide a professional, detailed solution similar to famous Korean workbooks (like Ssen, Black Label).
       - **Formatting (CRITICAL)**:
         - **You MUST insert a blank line (double newline \\n\\n) BEFORE starting a new step or header.**
         - Ensure the text is NOT one large block. Visually separate each logical step.
         - **EVERY mathematical expression in the solution MUST be wrapped in $...$ or $$...$$. NO EXCEPTIONS.**
         - A line that is entirely a formula MUST be wrapped in $$...$$ (block math).
         - NEVER mix bare math with $...$ in the same line (e.g., WRONG: "f'(x) = 12x^3 - $x^2$"). Either wrap the ENTIRE expression or use block math.
       - **Answer Field**:
         - **If Multiple Choice**: MUST start with the choice number in parentheses or circled number, followed by the value (e.g., "(3) 5" or "③ 5").
         - **If Subjective**: Strictly contain the final result (e.g., "5", "$4\\pi$", "x=2"). Do not include the full sentence "The answer is...".

    7. The output MUST be valid JSON.

    Language: Korean (한국어)
`;

function buildTextPrompt(selection: SelectionState): string {
  const topicPath = `${selection.schoolLevel} ${selection.grade} > ${selection.mainUnit} > ${selection.subUnit} > ${selection.detailUnit}`;

  return `
    You are an expert Mathematics Teacher in South Korea, specializing in the "2022 Revised National Curriculum" (2022 개정 교육과정).

    Task: Create a mathematics problem based on the following specifications.

    Target Audience/Topic:
    - Curriculum Path: ${topicPath}
    - Difficulty: ${selection.difficulty} (Level 1=기본, Level 2=표준, Level 3=응용, Level 4=심화, Level 5=최고난도)
    - Target Ability: ${selection.problemType} (계산력=빠른 연산, 이해력=개념 파악, 문제해결력=응용 문제, 추론력=논리적 추론)
    - Question Format: ${selection.answerType}

    ${COMMON_INSTRUCTIONS}
  `;
}

function buildExactPrompt(removeScore?: boolean): string {
  const scoreInstruction = removeScore
    ? `\n       - **CRITICAL**: Remove any score or points mentioned in the problem text (e.g., "(10점)", "[5점]", "4점", "②점"). Do NOT include them in the output.`
    : '';

  return `
    You are an expert Mathematics Teacher in South Korea.

    Task: Extract and convert the provided image of a math problem into **EXACTLY THE SAME** problem in text format.

    1. **Extract**: Read the problem text, choices, and any mathematical formulas exactly as they appear in the image.${scoreInstruction}
       - **CRITICAL**: Preserve the EXACT layout, line breaks, and formatting. If there is a box, use blockquotes. If there is a dialogue, keep each person's speech on a new line.
    2. **Format**: Convert the extracted content into the required JSON format.
       - Do NOT change the numbers, functions, or context.
       - If there are choices in the image, put them in the "choices" array. If there are no choices, leave it empty [].
       - If there is a diagram with a graph, use "diagramSpec": { "type":"coordinatePlane", "functions":[{"expr":"...","label":"..."}], "showGrid":true }. NEVER leave functions empty.
       - Provide the correct answer and a detailed solution for the problem.
       - Estimate the topic and difficulty level.

    ${COMMON_INSTRUCTIONS}
  `;
}

function buildImagePrompt(selection: SelectionState): string {
  return `
    You are an expert Mathematics Teacher in South Korea.

    Task: Analyze the provided image of a math problem and generate a **NEW, SIMILAR** problem.

    1. **Analyze**: Identify the mathematical concept, topic, and difficulty level of the problem in the image. If the image contains a graph or diagram, identify the function(s), key points, and visual features.
    2. **Generate**: Create a **NEW** problem that tests the **same concept** and has a **similar difficulty**.
       - Do NOT just solve the problem in the image.
       - Do NOT copy the problem exactly. Change numbers, functions, or context while keeping the core logic similar.
    3. **Constraint Override**:
       - Target Difficulty: ${selection.difficulty} (Adjust the generated problem to match this difficulty if possible, otherwise stick to the image's level).
       - Question Format: ${selection.answerType} (Force the output to be this format).

    4. **Diagrams/Graphs**: If the original image has a function graph, use "diagramSpec" JSON:
       - Example: { "type":"coordinatePlane", "functions":[{"expr":"-3*(x-1)^2+3","label":"y=f'(x)"}], "points":[{"coord":[0,0],"label":"O"},{"coord":[2,0]}], "showGrid":true }
       - "expr" uses JS math syntax: +,-,*,/,^ (e.g., "-3*(x-1)^2+3" for a downward parabola with vertex at (1,3))
       - **You MUST include at least one function in the "functions" array. NEVER submit an empty coordinatePlane.**
       - Include key points (x-intercepts, vertices) in the "points" array.
       - Do NOT use diagramSVG.

    ${COMMON_INSTRUCTIONS}
  `;
}

function sanitizeText(text: string): string {
  if (!text) return text;
  let s = text
    .replace(/<img[^>]*>/gi, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/<center>\s*<\/center>/gi, '')
    // AI가 생성한 HTML 태그 제거 (내용은 보존) — 공백/유니코드 변형 포함
    .replace(/<\s*span[^>]*>([\s\S]*?)<\s*\/\s*span\s*>/gi, '$1')
    .replace(/<\s*span[^>]*>/gi, '')
    .replace(/<\s*\/\s*span\s*>/gi, '')
    .replace(/<\s*div[^>]*>([\s\S]*?)<\s*\/\s*div\s*>/gi, '$1')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    // AI가 공백/유니코드가 섞인 깨진 HTML을 출력하는 경우 catch-all 제거
    .replace(/<\s*\/?(?:span|div|p|br|img|center)[^>]*>/gi, '')
    // "< spanclass = ..." 같은 극단적 변형 (공백 포함 꺾쇠 패턴)
    .replace(/<\s*spanclass[^>]*>([\s\S]*?)<\s*\/\s*span\s*>/gi, '$1')
    .trim();

  // LaTeX 명령어가 $...$ 밖에 노출된 경우 감싸기
  // \frac, \geq, \leq, \alpha, \beta, \sqrt 등이 $ 밖에 있으면 래핑
  s = s.replace(/(?<!\$)\\(frac|geq|leq|geqslant|leqslant|alpha|beta|gamma|sqrt|pi|theta|neq|pm|mp|times|div|cdot|infty|sum|prod|int|lim|log|ln|sin|cos|tan)\b/g, (match) => {
    return `$${match}$`;
  });

  // x^n, a^2 등 $ 밖의 거듭제곱 패턴 래핑 (단, 이미 $ 안에 있는 것 제외)
  // 안전하게: 단어경계 + 변수^숫자 패턴만
  s = s.replace(/(?<!\$)(?<!\w)([a-zA-Z]\^[\d{][^$\s,.)]*)/g, (match) => {
    return `$${match}$`;
  });

  // 수식 줄 후처리: $가 비정상적으로 배치된 줄 수정
  s = s.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // 이미 $$...$$로 감싸진 줄은 건너뜀
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) return line;

    // 패턴 1: 줄 전체가 $...$로 감싸짐 → $$...$$로 변환 (블록 수식)
    // 예: "$f(1) = -1 + 6 - 9 + C = -4 + C = 2$"
    if (/^\$[^$]+\$$/.test(trimmed) && /[=+\-*/^]/.test(trimmed)) {
      return `$${trimmed}$`;  // $...$ → $$...$$
    }

    // $를 제거한 텍스트로 수식 줄 판별
    const stripped = trimmed.replace(/\$/g, '');
    const hasDollar = trimmed.includes('$');
    // 수식 줄: f(...) = ..., f'(...) = ..., M + m = ... 등
    const looksLikeFormula = /^\$?[a-zA-Z]['′]?\s*[\(∫]/.test(trimmed) && trimmed.includes('=');
    // 추가: $로 시작하는 수식줄 (예: "$f(x) = -$x^3$ + ...")
    const startsWithDollarFormula = /^\$[a-zA-Z]['′]?\s*\(/.test(trimmed) && trimmed.includes('=');

    // 패턴 2: $가 부분적으로 혼용된 수식 줄 → $를 모두 제거하고 $$...$$로 래핑
    if (hasDollar && (looksLikeFormula || startsWithDollarFormula)) {
      // 끝에 한글 접미사가 있으면 분리
      const suffixMatch2 = stripped.match(/^(.+[0-9)+\]})([가-힣]{1,6}[.]?)$/);
      if (suffixMatch2) {
        return `$$${suffixMatch2[1]}$$${suffixMatch2[2]}`;
      }
      return `$$${stripped}$$`;
    }

    // 패턴 3: $ 없이 수식만 있는 줄 → $$...$$로 래핑
    if (!hasDollar && looksLikeFormula) {
      const suffixMatch = stripped.match(/^(.+[0-9)+\]})([가-힣]{1,6}[.]?)$/);
      if (suffixMatch) {
        return `$$${suffixMatch[1]}$$${suffixMatch[2]}`;
      }
      return `$$${stripped}$$`;
    }

    return line;
  }).join('\n');

  return s;
}

export async function generateMathProblem(selection: SelectionState): Promise<GeneratedProblem> {
  const ai = getGeminiClient();
  let contents: unknown;

  if ((selection.mode === 'image' || selection.mode === 'exact') && selection.sourceImage) {
    const base64Data = selection.sourceImage.split(',')[1];
    const mimeMatch = selection.sourceImage.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const prompt = selection.mode === 'exact'
      ? buildExactPrompt(selection.removeScore)
      : buildImagePrompt(selection);

    contents = {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt },
      ],
    };
  } else {
    contents = buildTextPrompt(selection);
  }

  const model = selectModel(selection);
  const response = await ai.models.generateContent({
    model,
    contents: contents as string,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error('No content generated.');
  }

  let data: GeneratedProblem;
  try {
    data = JSON.parse(stripCodeFence(response.text!)) as GeneratedProblem;
  } catch {
    // JSON이 잘린 경우 — 닫는 괄호를 추가해서 복구 시도
    let jsonStr = stripCodeFence(response.text!);
    // 열린 문자열 닫기
    const lastQuote = jsonStr.lastIndexOf('"');
    if (lastQuote > 0 && jsonStr.slice(lastQuote + 1).indexOf('"') === -1) {
      jsonStr = jsonStr.slice(0, lastQuote + 1);
    }
    // 열린 중괄호/배열 닫기
    const opens = (jsonStr.match(/{/g) || []).length;
    const closes = (jsonStr.match(/}/g) || []).length;
    jsonStr += '}'.repeat(Math.max(0, opens - closes));
    try {
      data = JSON.parse(jsonStr) as GeneratedProblem;
    } catch {
      throw new Error('AI 응답 JSON 파싱 실패');
    }
  }

  if (data.question) data.question = sanitizeText(data.question);
  if (data.solution) data.solution = sanitizeText(data.solution);

  if (data.diagramSVG) {
    data.diagramSVG = data.diagramSVG
      .replace(/^```(xml|svg)?/i, '')
      .replace(/```$/, '')
      .trim();
  }

  // diagramSpec이 문자열로 반환된 경우 파싱
  if (data.diagramSpec && typeof data.diagramSpec === 'string') {
    try {
      data.diagramSpec = JSON.parse(data.diagramSpec);
    } catch {
      data.diagramSpec = null;
    }
  }

  // coordinatePlane인데 functions가 비어있으면 → 문제/해설 텍스트에서 함수 추출 시도
  if (data.diagramSpec && typeof data.diagramSpec === 'object') {
    const spec = data.diagramSpec as Record<string, unknown>;
    if (spec.type === 'coordinatePlane') {
      const fns = spec.functions as unknown[] | undefined;
      if (!fns || fns.length === 0) {
        // f'(x) = -3x(x-2) 같은 패턴에서 함수 추출
        const allText = `${data.question}\n${data.solution || ''}`;
        const fnMatch = allText.match(/[yf]['′]?\s*\([x]\)\s*=\s*([^\n,가-힣(단]+)/);
        if (fnMatch) {
          let expr = fnMatch[1].trim()
            .replace(/\$/g, '')
            .replace(/\\frac/g, '')
            .replace(/[{}]/g, '')
            .replace(/\s+/g, '')
            // LaTeX → JS math
            .replace(/(\d)([x])/g, '$1*$2')
            .replace(/([)])([x(])/g, '$1*$2');
          if (expr && expr.length > 2) {
            spec.functions = [{ expr, label: "y=f'(x)" }];
            spec.showGrid = true;
          }
        }
        // 추출 실패 시 빈 좌표평면이라도 유지
      }
    }
  }

  return data;
}
