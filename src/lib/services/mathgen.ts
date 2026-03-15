import { GoogleGenAI, Type } from '@google/genai';
import { GeneratedProblem, SelectionState } from '@/types/mathgen';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Set it in .env.local');
  }
  return new GoogleGenAI({ apiKey });
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
      description: `Structured diagram specification (preferred over diagramSVG). Supported types:
- triangle: { type:"triangle", vertices:[[x,y],[x,y],[x,y]], labels?:[{text,position:[x,y]}], showAngles?:[indices], angleValues?:["90°"], showLengths?:[{edge:[0,1],value:"5"}], rightAngle?:vertexIndex }
- circle: { type:"circle", center:[x,y], radius:number, showRadius?:bool, chords?:[{from:deg,to:deg}], arcs?:[{from:deg,to:deg,label?}], labels?:[] }
- coordinatePlane: { type:"coordinatePlane", xRange:[min,max], yRange:[min,max], showGrid?:bool, functions?:[{expr:"x^2-2*x+1",label?,color?,domain?}], points?:[{coord:[x,y],label?}], lines?:[{from,to,dashed?,label?}] }
- quadrilateral: { type:"quadrilateral", vertices:[[x,y]x4], diagonals?:bool, showAngles?,showLengths? }
- solid: { type:"solid", shape:"cube"|"cylinder"|"cone"|"sphere"|"prism"|"pyramid", dimensions:{radius?,height?,width?,size?}, showDimensions?:bool }
- composite: { type:"composite", elements:[...diagram specs] }

IMPORTANT: Use mathematical coordinates. The renderer handles SVG conversion automatically. Provide coordinates that make geometric sense (e.g., right triangle at origin with legs along axes).`,
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
       - **NO IMAGES IN TEXT**: Do NOT include <img> tags, Markdown images (![...](...)), or placeholders like "[Diagram]" in the "question" or "solution" fields.

    3. [Question Format Rules - CRITICAL]
       - **If Question Format is '객관식 (5지선다)'**:
         - You MUST provide exactly 5 choices in the "choices" array.
         - The answer must be one of these choices.
       - **If Question Format is '주관식/서술형'**:
         - The "choices" array MUST be empty [].

    4. [Boxed Content / <보기> - CRITICAL]
       - If the problem has a "View" or "Reference" box (common in Korean exams as <보기>), you MUST use Markdown Blockquote syntax (>).
       - **Structure**:
         > **<보 기>**
         > ㄱ. Statement 1
         > ㄴ. Statement 2
       - **Rules**:
         - The first line inside the blockquote MUST be \`**<보 기>**\`.
         - Each item (ㄱ, ㄴ, ㄷ...) MUST be on a NEW LINE.

    5. [Visuals & Diagrams - STRUCTURED SPEC REQUIRED]
       - **When to generate**: If the topic involves **Geometry** (Plane/Solid), **Functions** (Graphs), or **Statistics** (Charts/Histograms).
       - **Use "diagramSpec" (NOT "diagramSVG")**: Provide a structured JSON object in "diagramSpec". Our system renders accurate SVG from this spec automatically.
       - **Diagram Types & Examples**:
         - **Triangle**: { "type":"triangle", "vertices":[[0,0],[6,0],[0,4]], "rightAngle":0, "showLengths":[{"edge":[0,1],"value":"6"},{"edge":[0,2],"value":"4"}] }
         - **Circle**: { "type":"circle", "center":[150,150], "radius":80, "showRadius":true, "chords":[{"from":30,"to":150}] }
         - **Coordinate Plane**: { "type":"coordinatePlane", "xRange":[-5,5], "yRange":[-3,7], "showGrid":true, "functions":[{"expr":"x^2-2*x+1","label":"y=x²-2x+1"}], "points":[{"coord":[1,0],"label":"꼭짓점"}] }
         - **Quadrilateral**: { "type":"quadrilateral", "vertices":[[0,0],[8,0],[8,5],[0,5]], "showLengths":[{"edge":[0,1],"value":"8"},{"edge":[1,2],"value":"5"}] }
         - **Solid Figure**: { "type":"solid", "shape":"cylinder", "dimensions":{"radius":5,"height":10}, "showDimensions":true }
         - **Composite**: { "type":"composite", "elements":[...multiple specs] }
       - **Coordinate Rules**:
         - Use mathematical coordinates (the system handles Y-axis inversion for SVG).
         - For triangles/quadrilaterals: use reasonable scale (e.g., side lengths 50-200 for pixel coordinates, or small numbers if using mathematical scale).
         - For coordinate planes: functions use the expression format "x^2+3*x-1" (supports +,-,*,/,^,sin,cos,tan,sqrt,abs,log,ln,pi,e).
       - **Do NOT provide raw SVG in "diagramSVG"** unless the diagram type is not supported by diagramSpec.

    6. [Solution Quality - WORKBOOK STYLE]
       - Provide a professional, detailed solution similar to famous Korean workbooks (like Ssen, Black Label).
       - **Formatting (CRITICAL)**:
         - **You MUST insert a blank line (double newline \\n\\n) BEFORE starting a new step or header.**
         - Ensure the text is NOT one large block. Visually separate each logical step.
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
    - Difficulty: ${selection.difficulty} (Range: Lower, Middle, High, Highest)
    - Problem Goal: ${selection.problemType}
    - Question Format: ${selection.answerType}

    ${COMMON_INSTRUCTIONS}
  `;
}

function buildImagePrompt(selection: SelectionState): string {
  return `
    You are an expert Mathematics Teacher in South Korea.

    Task: Analyze the provided image of a math problem and generate a **NEW, SIMILAR** problem.

    1. **Analyze**: Identify the mathematical concept, topic, and difficulty level of the problem in the image.
    2. **Generate**: Create a **NEW** problem that tests the **same concept** and has a **similar difficulty**.
       - Do NOT just solve the problem in the image.
       - Do NOT copy the problem exactly. Change numbers, functions, or context while keeping the core logic similar.
    3. **Constraint Override**:
       - Target Difficulty: ${selection.difficulty} (Adjust the generated problem to match this difficulty if possible, otherwise stick to the image's level).
       - Question Format: ${selection.answerType} (Force the output to be this format).

    ${COMMON_INSTRUCTIONS}
  `;
}

function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    .replace(/<img[^>]*>/gi, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/<center>\s*<\/center>/gi, '')
    .trim();
}

export async function generateMathProblem(selection: SelectionState): Promise<GeneratedProblem> {
  const ai = getClient();
  let contents: unknown;

  if (selection.mode === 'image' && selection.sourceImage) {
    const base64Data = selection.sourceImage.split(',')[1];
    const mimeMatch = selection.sourceImage.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    contents = {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: buildImagePrompt(selection) },
      ],
    };
  } else {
    contents = buildTextPrompt(selection);
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents as string,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error('No content generated.');
  }

  let jsonString = response.text.trim();
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const data = JSON.parse(jsonString) as GeneratedProblem;

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

  return data;
}
