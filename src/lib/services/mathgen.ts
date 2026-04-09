import { Type } from '@google/genai';
import { GeneratedProblem, SelectionState, SchoolLevel, Difficulty } from '@/types/mathgen';
import { getGeminiClient, stripCodeFence } from './gemini';
import { TEXTBOOK_CATALOG, getPublisher } from '@/lib/constants/textbook-curriculum';
import { DIAGRAM_PARAMS_SCHEMA } from '@/lib/constants/diagram-schema';
import { normalizeDiagramParams } from '@/lib/utils/diagram-param-collect';

/**
 * 학교급 + 난이도에 따라 Gemini 모델 자동 선택
 * - 초등 전체, 중등 L1~L2 → Flash (빠르고 저렴)
 * - 중등 L3~L5, 고등 전체 → gemini-3-flash-preview (고퀄리티)
 */
function selectModel(selection: SelectionState): string {
  const { schoolLevel, difficulty, mode } = selection;

  // 이미지 모드(유사/동일)는 SVG 생성 + 고난도 분석 필요 → Pro 모델
  if (mode === 'image' || mode === 'exact') return 'gemini-3-pro-preview';

  if (schoolLevel === SchoolLevel.HIGH) return 'gemini-3-pro-preview';

  if (schoolLevel === SchoolLevel.MIDDLE) {
    if (difficulty === Difficulty.LEVEL3 || difficulty === Difficulty.LEVEL4 || difficulty === Difficulty.LEVEL5) {
      return 'gemini-3-pro-preview';
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
      description: 'DEPRECATED fallback. Only use if diagramParams cannot represent the diagram (e.g., very complex custom layouts).',
      nullable: true,
    },
    diagramParams: {
      ...DIAGRAM_PARAMS_SCHEMA,
      nullable: true,
    },
  },
  required: ['question', 'answer', 'solution', 'topic', 'difficulty'],
};

/** exact 모드 전용 스키마 — diagramParams 우선, diagramSVG 폴백 */
const EXACT_RESPONSE_SCHEMA = {
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
    diagramParams: {
      ...DIAGRAM_PARAMS_SCHEMA,
      description: '이미지의 도형을 26개 타입 중 하나로 구조화. diagramSVG보다 우선 사용.',
      nullable: true,
    },
    diagramSVG: {
      type: Type.STRING,
      description: `Fallback: ONLY use if diagramParams cannot represent the diagram (complex custom shapes). CRITICAL RULES:
- NO LaTeX ($...$) inside SVG <text>! Use plain text + Unicode: ° π θ √ α β ∠
- SIZE: Each shape ≥180px wide, ≥150px tall. Tight viewBox.
- LABELS: font-size="16", font-family="sans-serif". Offset 15-20px from vertices.
- RIGHT ANGLE: 12×12px polyline □ mark. stroke-width="2" for outlines, "1" for arcs.`,
      nullable: true,
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
       - **NO PLACEHOLDERS**: Do NOT write "[Diagram]", "[그래프]", or any placeholder text. If a diagram is needed, use the "diagramParams" field.
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

    5. [Visuals & Diagrams — diagramParams]
       - **When to generate**: If the topic involves **Geometry**, **Functions/Graphs**, or **Statistics**.
       - Use the "diagramParams" array field with structured 26-type diagrams. The server renders SVG automatically.
       - **Key Types & Examples**:
         - **triangle**: { diagramType:"triangle", label:"삼각형", vertices:[{x:0,y:0,label:"A"},{x:100,y:0,label:"B"},{x:0,y:80,label:"C"}], sideLabels:[{from:0,to:1,label:"5"}], angleLabels:[{vertex:2,value:"90°"}] }
         - **quadrilateral**: { diagramType:"quadrilateral", label:"사각형", vertices:[{x:0,y:80},{x:100,y:80},{x:100,y:0},{x:0,y:0}], quadType:"rectangle" }
         - **circle**: { diagramType:"circle", label:"원", cx:100, cy:100, radius:80 }
         - **function_graph**: { diagramType:"function_graph", label:"함수 그래프", functions:[{expression:"-3*(x-1)^2+3",label:"y=f(x)"}], xRange:[-2,5], yRange:[-5,5], points:[{x:1,y:3,label:"꼭짓점"}] }
         - **coordinate_plane**: { diagramType:"coordinate_plane", label:"좌표평면", xRange:[-5,5], yRange:[-5,5], points:[{x:2,y:3,label:"A"}] }
         - **solid_figure**: { diagramType:"solid_figure", label:"입체도형", shape:"cylinder", dimensions:{radius:5,height:10} }
         - **number_line**: { diagramType:"number_line", label:"수직선", min:0, max:10, step:1 }
         - **venn_diagram**: { diagramType:"venn_diagram", label:"벤 다이어그램", sets:[{label:"A",elements:["1","3"]},{label:"B",elements:["2","4"]}], intersectionElements:["5"] }
       - **Functions format**: JS math syntax — +,-,*,/,^ (e.g., "x^2+3*x-1"). Supports sin,cos,tan,sqrt,abs,log,ln,pi,e.
       - **NEVER generate an empty function_graph without functions.**
       - **KEEP RANGES SMALL**: Use conceptual/schematic ranges (e.g., xRange:[-3,5], yRange:[-4,6]). Do NOT compute exact function values to set ranges. Maximum range span should be ~10-12 units per axis.
       - **diagramSVG**: ONLY as fallback for shapes that cannot be expressed by the 26 types.
       - **NEVER use HTML tags (span, div, etc.) in the question text to reference diagrams.**

    6. [Solution Quality - WORKBOOK STYLE]
       - Provide a professional, detailed solution similar to famous Korean workbooks (like Ssen, Black Label).
       - **Formatting (CRITICAL)**:
         - **You MUST insert a blank line (double newline \\n\\n) BEFORE starting a new step or header.**
         - Ensure the text is NOT one large block. Visually separate each logical step.
         - **EVERY mathematical expression in the solution MUST be wrapped in $...$ or $$...$$. NO EXCEPTIONS.**
         - A line that is entirely a formula MUST be wrapped in $$...$$ (block math).
         - NEVER mix bare math with $...$ in the same line (e.g., WRONG: "f'(x) = 12x^3 - $x^2$"). Either wrap the ENTIRE expression or use block math.
         - NEVER use \alpha, \beta, \frac, \left, \right OUTSIDE of $...$. ALL LaTeX commands MUST be inside delimiters.
         - WRONG: "점 B의 x좌표가 \alpha이므로" → CORRECT: "점 B의 $x$좌표가 $\\alpha$이므로"
       - **Answer Field**:
         - **If Multiple Choice**: MUST start with the choice number in parentheses or circled number, followed by the value (e.g., "(3) 5" or "③ 5").
         - **If Subjective**: Strictly contain the final result (e.g., "5", "$4\\pi$", "x=2"). Do not include the full sentence "The answer is...".

    7. The output MUST be valid JSON.

    Language: Korean (한국어)
`;

function buildTextbookContext(textbookId?: string, mainUnit?: string): string {
  if (!textbookId) return '';

  const textbook = TEXTBOOK_CATALOG.find(t => t.id === textbookId);
  if (!textbook) return '';

  const publisher = getPublisher(textbook.publisherId);
  const chapterMapping = textbook.chapters.find(
    c => c.curriculumNames.some(name => mainUnit?.includes(name)),
  );

  return `
    Reference Textbook Context:
    - Textbook: ${textbook.subject} (${publisher?.name || textbook.publisherId}, 저자: ${textbook.author})
    - Revision: 2022 개정 교육과정
    ${chapterMapping ? `- Textbook Chapter: ${chapterMapping.textbookChapter}단원 "${chapterMapping.textbookName}"` : ''}
    - Style Guide: Generate problems that match the style and difficulty progression of this textbook.
      Use terminology and problem formats commonly found in Korean ${publisher?.name || ''} math textbooks.
      Align with 내신(school exam) preparation level for this publisher's curriculum.
  `;
}

function buildTextPrompt(selection: SelectionState): string {
  const topicPath = `${selection.schoolLevel} ${selection.grade} > ${selection.mainUnit} > ${selection.subUnit} > ${selection.detailUnit}`;
  const textbookCtx = buildTextbookContext(selection.textbookId, selection.mainUnit);

  return `
    You are an expert Mathematics Teacher in South Korea, specializing in the "2022 Revised National Curriculum" (2022 개정 교육과정).

    Task: Create a mathematics problem based on the following specifications.

    Target Audience/Topic:
    - Curriculum Path: ${topicPath}
    - Difficulty: ${selection.difficulty} (Level 1=기본, Level 2=표준, Level 3=응용, Level 4=심화, Level 5=최고난도)
    - Target Ability: ${selection.problemType} (계산력=빠른 연산, 이해력=개념 파악, 문제해결력=응용 문제, 추론력=논리적 추론)
    - Question Format: ${selection.answerType}
    ${textbookCtx}
    ${COMMON_INSTRUCTIONS}
  `;
}

function buildExactPrompt(removeScore?: boolean): string {
  const scoreInstruction = removeScore
    ? `\n       - **CRITICAL**: Remove any score or points mentioned in the problem text (e.g., "(10점)", "[5점]", "4점", "②점"). Do NOT include them in the output.`
    : '';

  return `
    You are an expert Mathematics Teacher in South Korea.

    Task: Extract ONLY the printed text from the image. The original image will be displayed alongside, so do NOT describe diagrams in text.

    1. **Extract TEXT ONLY**: Read the problem text exactly as printed in the image.${scoreInstruction}
       - **CRITICAL**: Extract ONLY the text that is actually written/printed in the image.
       - Do NOT describe, explain, or transcribe what is shown in diagrams/figures/graphs.
       - If the image shows a triangle with angles labeled 70° and 45°, do NOT write "세 내각의 크기는 70°, 45°입니다" — that information is in the diagram, not the text.
       - If the problem says "다음 그림에서" followed by diagrams, just extract "다음 그림에서..." — the diagram will be reproduced as SVG.
       - Preserve the EXACT layout, line breaks, and formatting. If there is a box, use blockquotes.
    2. **Format**: Convert the extracted text into the required JSON format.
       - Do NOT change the numbers, functions, or context of the TEXT.
       - If there are choices in the image, put them in the "choices" array. If there are no choices, leave it empty [].
       - **Diagrams**: If the image contains diagrams/figures, reproduce them using "diagramParams" array with the 26-type structured format. Include ALL angle labels, side lengths, and special marks. Do NOT put diagram content in "question" text. Only use "diagramSVG" as a last resort for shapes that cannot be expressed by the 26 types.
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

    4. **Diagrams/Graphs**: If the original image has a function graph, use "diagramParams" array:
       - Example: [{ "diagramType":"function_graph", "label":"함수 그래프", "functions":[{"expression":"-3*(x-1)^2+3","label":"y=f'(x)"}], "xRange":[-2,5], "yRange":[-5,5], "points":[{"x":0,"y":0,"label":"O"},{"x":2,"y":0}] }]
       - "expression" uses JS math syntax: +,-,*,/,^ (e.g., "-3*(x-1)^2+3")
       - **You MUST include at least one function. NEVER submit an empty function_graph.**
       - Include key points (x-intercepts, vertices) in the "points" array.
       - Do NOT use diagramSVG.

    ${COMMON_INSTRUCTIONS}
  `;
}

function sanitizeText(text: string): string {
  if (!text) return text;
  let s = text
    // 리터럴 \n 문자열 → 실제 줄바꿈 (AI가 JSON에서 이스케이프를 잘못한 경우)
    .replace(/\\n/g, '\n')
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

  // LaTeX 명령어 연속 표현이 $...$ 밖에 있는 경우 전체를 하나의 $...$로 감싸기
  // 예: "h\left(-\frac{3}{2}\alpha\right)" → "$h\left(-\frac{3}{2}\alpha\right)$"
  // 예: "\frac{3}{2}\alpha" → "$\frac{3}{2}\alpha$"
  s = s.replace(/(?<!\$)(?:[a-zA-Z]*\\(?:frac|left|right|sqrt|alpha|beta|gamma|theta|pi|overline|bar|hat|vec|text)\b[^$\n]*?)(?=[\s,가-힣.]|$)/g, (match) => {
    // 이미 $로 감싸져 있으면 스킵
    if (match.startsWith('$') || match.endsWith('$')) return match;
    // 비어있거나 너무 짧으면 스킵
    if (match.trim().length < 3) return match;
    return `$${match.trim()}$`;
  });

  // 단일 LaTeX 명령어가 $...$ 밖에 노출된 경우 감싸기
  // \frac, \geq, \leq, \alpha 등
  s = s.replace(/(?<!\$)\\(frac|geq|leq|geqslant|leqslant|alpha|beta|gamma|sqrt|pi|theta|neq|pm|mp|times|div|cdot|infty|sum|prod|int|lim|log|ln|sin|cos|tan)\b/g, (match) => {
    return `$${match}$`;
  });

  // x^n, a^2 등 $ 밖의 거듭제곱 패턴 래핑
  s = s.replace(/(?<!\$)(?<!\w)([a-zA-Z]\^[\d{][^$\s,.)]*)/g, (match) => {
    return `$${match}$`;
  });

  // 이중 $$ 오류 정리: $...$$ → $...$, $$...$ → $...$
  s = s.replace(/\$\$([^$]+)\$/g, '$$$1$');
  s = s.replace(/\$([^$]+)\$\$/g, '$$$1$');

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
  const schema = selection.mode === 'exact' ? EXACT_RESPONSE_SCHEMA : RESPONSE_SCHEMA;

  // Pro 모델은 느리므로 120초, Flash는 60초 타임아웃
  const timeoutMs = model.includes('pro') ? 120_000 : 60_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: contents as string,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        abortSignal: controller.signal,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`AI 응답 시간 초과 (${timeoutMs / 1000}초). 다시 시도해주세요.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

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
      console.error('[mathgen] JSON 파싱 실패 — 원본 응답 (첫 500자):', response.text!.slice(0, 500));
      throw new Error('AI 응답 JSON 파싱 실패');
    }
  }

  if (data.question) data.question = sanitizeText(data.question);
  if (data.solution) data.solution = sanitizeText(data.solution);

  if (data.diagramSVG) {
    data.diagramSVG = data.diagramSVG
      .replace(/^```(xml|svg)?/i, '')
      .replace(/```$/, '')
      .trim()
      // SVG 안에 LaTeX가 들어간 경우 유니코드로 변환
      .replace(/\$(\d+)\^\\circ\$/g, '$1°')
      .replace(/\$\\angle\s*/g, '∠').replace(/\$([^$]*)\$/g, '$1')
      .replace(/\\circ/g, '°')
      .replace(/\\angle/g, '∠')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\sqrt/g, '√');
  }

  // diagramParams 정규화 (Gemini 플랫 응답 → { type, label, params } 형태)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (Array.isArray((data as any).diagramParams)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawParams = (data as any).diagramParams as Record<string, unknown>[];
    const normalized = normalizeDiagramParams(rawParams);

    // function_graph인데 functions가 비어있으면 → 문제/해설 텍스트에서 함수 추출 시도
    for (const dp of normalized) {
      if (dp.type === 'function_graph') {
        const fns = dp.params.functions as unknown[] | undefined;
        if (!fns || fns.length === 0) {
          const allText = `${data.question}\n${data.solution || ''}`;
          const fnMatch = allText.match(/[yf]['′]?\s*\([x]\)\s*=\s*([^\n,가-힣(단]+)/);
          if (fnMatch) {
            const expr = fnMatch[1].trim()
              .replace(/\$/g, '')
              .replace(/\\frac/g, '')
              .replace(/[{}]/g, '')
              .replace(/\s+/g, '')
              .replace(/(\d)([x])/g, '$1*$2')
              .replace(/([)])([x(])/g, '$1*$2');
            if (expr && expr.length > 2) {
              dp.params.functions = [{ expression: expr, label: "y=f'(x)" }];
            }
          }
        }
      }
    }

    // DB 저장용: diagramSpec 필드에 DiagramParam[] 배열로 저장
    data.diagramSpec = normalized.length > 0 ? normalized : null;
  }

  // 레거시 diagramSpec (객체) 폴백 — 이전 스키마에서 생성된 데이터 처리
  if (data.diagramSpec && typeof data.diagramSpec === 'object' && !Array.isArray(data.diagramSpec)) {
    if (typeof data.diagramSpec === 'string') {
      try {
        data.diagramSpec = JSON.parse(data.diagramSpec);
      } catch {
        data.diagramSpec = null;
      }
    }
  }

  // exact 모드: diagramParams가 있으면 diagramSVG 폴백 제거
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (selection.mode === 'exact' && Array.isArray(data.diagramSpec) && (data.diagramSpec as any[]).length > 0) {
    data.diagramSVG = null;
  }

  return data;
}
