import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { GoogleGenAI, Type } from '@google/genai';
import { normalizeMathText, normalizeAnswerField } from '@/lib/pdf-extract-engine/ai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey });
}

const SOLUTION_EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    solutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNum: { type: Type.NUMBER, description: '문제 번호' },
          answer: { type: Type.STRING, description: '정답 (예: "⑤", "2개", "5")' },
          explanation: { type: Type.STRING, description: '풀이 과정 (마크다운+LaTeX). 채점 요소/기준은 여기에 포함하지 말 것' },
          scoringCriteria: { type: Type.STRING, description: '채점 요소/기준 (예: "1. 소인수분해 하기 30%"). 없으면 빈 문자열' },
        },
        required: ['questionNum', 'answer'],
      },
    },
  },
  required: ['solutions'],
};

const SOLUTION_PROMPT = `당신은 한국 수학 교재 해설 분석 전문가입니다.
주어진 해설 페이지 이미지(들)에서 각 문제의 정답과 풀이를 추출하세요. 여러 이미지가 주어지면 연속된 페이지이므로, 한 문제의 풀이가 페이지 경계를 넘어 이어지면 **두 페이지 내용을 합쳐서** 하나의 완전한 풀이로 추출하세요.

[⚠️ 절대 준수 — 레이아웃 인식 규칙]
A. **페이지 레이아웃을 먼저 판별하라.** 한국 수학 교재 해설은 대부분 **2단(좌/우 칼럼)** 또는 드물게 1단이다.
B. **2단 레이아웃인 경우:**
   - 반드시 **좌측 칼럼 전체를 위→아래로 완독한 후**, 우측 칼럼을 위→아래로 읽는다.
   - 절대로 좌우를 번갈아(zigzag) 읽지 말 것. Gemini가 흔히 저지르는 실수다.
   - 한 문제의 풀이가 **좌측 칼럼 하단에서 끝나지 않고 우측 칼럼 상단으로 이어지는 경우**가 매우 흔하다. 반드시 이 연속성을 인식하라.
   - 문제번호가 좌측에 있고 풀이의 일부가 우측 상단에 이어지면, 두 부분을 **하나의 explanation으로 합쳐** 출력한다.
   - 어느 칼럼에도 문제번호 없이 풀이 내용만 있는 경우, 이는 이전 칼럼의 연장이다. 이전 문제번호의 explanation에 **이어 붙여라**.
C. **페이지 경계 연속성:**
   - 여러 페이지 이미지가 주어진 경우, 각 페이지의 우측 칼럼 하단에서 다음 페이지 좌측 칼럼 상단으로 풀이가 이어질 수 있다. 끝까지 추적하라.
D. **자기검증 (출력 전 반드시 수행):**
   - 각 문제의 explanation이 "따라서 …이다" / "∴ …" / "답: …" 같은 **결론 문장으로 마무리되는지** 확인하라.
   - 중간에서 끊긴 느낌(예: "= 30/7" 으로 끝남)이면 우측 칼럼이나 다음 페이지에서 이어진 부분을 찾아 합쳐야 한다.
   - 만약 끝까지 찾아도 결론이 없으면, **explanation 끝에 "[⚠️ 해설 중단 가능성]" 을 명시**하라.

[규칙]
1. 문제번호(questionNum)를 정확히 식별
2. 정답(answer)은 원문 그대로 (예: "⑤", "2개", "1"). **LaTeX 수식이면 반드시 $...$로 감쌀 것** (예: "$\\frac{5}{4}$", "$2\\sqrt{3}$")
3. 풀이(explanation)는 마크다운으로 작성, 수식은 $...$로 감싸기
3-1. **도형/기호 문자는 반드시 LaTeX 커맨드로 변환 (수식 내부에 $...$로 감쌀 것):**
     - □, ⬜, ☐ → \\square
     - ○, ◯, ⭕ → \\bigcirc
     - △, ▲ → \\triangle
     - ∴ → \\therefore
     - ∵ → \\because
     - ⇒, → → \\rightarrow / \\Rightarrow
     - 예: "□ ÷ (-9/7)" → "$\\square \\div \\left(-\\frac{9}{7}\\right)$"
3-2. **인식이 불확실한 기호는 절대 추측으로 타자하지 말 것.** 정확히 보이지 않으면 \\text{?} 로 표기하고 해당 문제 전체를 누락 처리해도 된다.
     특히 £, ¥, ¢, Á, Ñ, ¼, ½ 등 한국 수학 교재에 등장하지 않는 기호가 보이면 OCR 오류 가능성 → 원본을 재확인하거나 해당 부분 건너뛰기.
4. 풀이가 여러 단계이면 줄바꿈으로 구분
4-1. **다단계 계산식(2줄 이상 연속되는 = 변형)은 반드시 \`aligned\` 환경 사용:** $$\\begin{aligned}&A \\\\&=B \\\\&=C\\end{aligned}$$ (각 줄 앞에 &, 줄 사이 \\\\). 평문 줄바꿈 \\n 으로 등호 나열 금지.
4-2. 인라인 수식 연속 시 반드시 공백: \`$A$ $B$\` (금지: \`$A$$B$\`)
5. 채점 요소/기준이 있으면 반드시 scoringCriteria 필드에 별도 분리 (explanation에 포함하지 말 것)
6. 채점 요소가 없으면 scoringCriteria는 빈 문자열
7. **페이지 경계 풀이:** 앞 페이지에서 시작해 다음 페이지로 이어지는 풀이는 끝까지 완전히 추출. 중간에 잘리지 않도록 주의.
8. **해설이 원본에 없는 경우 (정답만 표기된 경우):**
   - 일부 교재는 풀이 과정 없이 "답: ③" 형태로 정답만 제공한다.
   - 이 경우 explanation 필드를 빈 문자열로 두지 말고 반드시 \`"해설 없음."\` 이라고 명시할 것.
   - 이렇게 해야 추출 누락(빈 값)과 원본 부재(해설 없음)를 구분할 수 있다.
   - 절대로 답을 보고 풀이를 임의로 작성/추측하지 말 것. 원본에 없으면 "해설 없음." 한 줄만.`;

/** JSON 파싱 후 LaTeX 이스케이프 복원 */
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

// POST /api/questions/pdf-extract-solutions — 해설 PDF에서 정답/풀이 추출
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { pages } = body as { pages: PageInput[] };

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return badRequest('pages 배열이 필요합니다');
  }

  const ai = getClient();
  type Sol = { questionNum: number; answer: string; explanation: string; scoringCriteria: string };
  const collected: Sol[] = [];

  // 페이지 경계를 넘나드는 풀이 처리: 최대 3페이지씩 겹쳐서 호출.
  // 예: [p1,p2,p3], [p2,p3,p4], [p3,p4,p5] ... 마지막에 dedupe
  // - 3-window로 2~3페이지 연장 풀이까지 잡음
  // - dedupe는 아래 두 우선순위: (1) answer 존재 (2) explanation 길이
  const WIN_SIZE = 3;
  const windows: PageInput[][] = [];
  if (pages.length <= WIN_SIZE) {
    windows.push([...pages]);
  } else {
    for (let i = 0; i <= pages.length - WIN_SIZE; i++) {
      windows.push(pages.slice(i, i + WIN_SIZE));
    }
  }

  for (const win of windows) {
    try {
      const imageParts = win.map((p) => ({
        inlineData: {
          mimeType: 'image/png',
          data: p.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      }));
      const textLayerCombined = win
        .map((p, i) => (p.textLayer ? `[페이지 ${i + 1} 텍스트]\n${p.textLayer}` : ''))
        .filter(Boolean)
        .join('\n\n');
      const pageCountHint = win.length > 1
        ? `\n\n주어진 이미지는 ${win.length}개의 연속된 페이지입니다. 한 문제의 풀이가 페이지를 걸쳐 이어지면 반드시 합쳐서 추출하세요.`
        : '';
      const promptText = textLayerCombined
        ? `${SOLUTION_PROMPT}${pageCountHint}\n\n[OCR Text Content for Reference]\n${textLayerCombined}\n\n위 텍스트 레이어를 참고하여 이미지 속 정답과 해설을 오타 없이 완벽하게 추출하세요.`
        : `${SOLUTION_PROMPT}${pageCountHint}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          { role: 'user', parts: [...imageParts, { text: promptText }] },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: SOLUTION_EXTRACT_SCHEMA,
        },
      });

      if (!response.text) continue;
      let jsonStr = response.text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      const data = JSON.parse(jsonStr);
      if (!data.solutions) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixed: Sol[] = data.solutions.map((s: any) => {
        let explanation = fixLatexEscaping(s.explanation || '');
        let scoringCriteria = fixLatexEscaping(s.scoringCriteria || '');
        if (!scoringCriteria) {
          const match = explanation.match(/\n{1,2}채점\s*요소\s*:\s*\n?/);
          if (match && match.index !== undefined) {
            scoringCriteria = explanation.substring(match.index + match[0].length).trim();
            explanation = explanation.substring(0, match.index).trimEnd();
          }
        }
        return {
          questionNum: s.questionNum,
          answer: normalizeAnswerField(fixLatexEscaping(s.answer || '')),
          explanation: normalizeMathText(explanation),
          scoringCriteria: normalizeMathText(scoringCriteria),
        };
      });
      collected.push(...fixed);
    } catch (err) {
      console.error(`해설 윈도우 [${win.map((p) => p.pageNum).join(',')}] 추출 실패:`, err);
    }
  }

  // Dedupe 우선순위: (1) answer 있는 것 우선 (2) explanation 길이 (3) scoringCriteria 길이
  const isBetter = (a: Sol, b: Sol): boolean => {
    const aHasAns = !!a.answer?.trim();
    const bHasAns = !!b.answer?.trim();
    if (aHasAns !== bHasAns) return aHasAns;
    const la = a.explanation?.length ?? 0;
    const lb = b.explanation?.length ?? 0;
    if (la !== lb) return la > lb;
    return (a.scoringCriteria?.length ?? 0) > (b.scoringCriteria?.length ?? 0);
  };
  const bestByNum = new Map<number, Sol>();
  for (const s of collected) {
    const prev = bestByNum.get(s.questionNum);
    if (!prev || isBetter(s, prev)) bestByNum.set(s.questionNum, s);
  }
  const allSolutions = Array.from(bestByNum.values()).sort((a, b) => a.questionNum - b.questionNum);

  return NextResponse.json({ data: { solutions: allSolutions } });
}
