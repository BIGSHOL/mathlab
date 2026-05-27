import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, getTenantFilter, notFound, badRequest } from '@/lib/api';
import { getGeminiClient } from '@/lib/services/gemini';
import {
  MATH_EXTRACT_SCHEMA,
  MATH_SYSTEM_PROMPT,
  mathTextbookPlugin,
} from '@/lib/pdf-extract-engine/presets/math-textbook';
import {
  mergeExtractedWithAnalysis,
  type ExtractedProblemForMerge,
} from '@/lib/exam-analysis/exam-to-question-mapper';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import path from 'path';
import { readFile } from 'fs/promises';

/** fileUrl이 http(s) URL이면 fetch, 로컬 경로면 readFile */
async function loadFileAsBase64(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`파일 다운로드 실패: ${res.status} ${res.statusText}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf).toString('base64');
  }
  const filePath = path.join(process.cwd(), 'public', fileUrl);
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

type Params = { params: Promise<{ id: string }> };

const EXAM_PROMPT_SUFFIX = `

[추가 지시 — 학교 시험지 (최우선)]
이 문서는 학교 시험지입니다. 일반 교재와 다른 규칙을 적용하세요:

1. **문제 번호(questionNum)를 반드시 정확히 식별하세요!**
   - 시험지에 인쇄된 번호를 그대로 사용: 1, 2, 3, ..., 18 등
   - 서술형/서답형은 별도 번호 체계일 수 있음 (예: 서답형1→19, 서답형2→20 등 순차 부여)
   - 절대 1부터 자동 순번을 매기지 마세요. 시험지의 실제 문항 번호를 읽으세요.

2. **객관식 보기(①②③④⑤)를 반드시 choices 배열로 추출하세요!**
   - 시험지의 객관식 문항에는 반드시 보기가 있습니다.
   - 보기는 ①, ②, ③, ④, ⑤ 또는 1, 2, 3, 4, 5 번호로 시작합니다.
   - content에는 보기를 포함하지 말고, choices 배열에만 넣으세요.
   - 보기가 2열로 배치되어 있어도 모두 추출하세요.
   - problemType을 "객관식"으로 설정하세요.

3. 시험지에 정답이 없으면 answer는 빈 문자열로 두세요.
4. 배점 표시(예: "[5점]", "(4점)")는 무시하세요.
5. 서술형/서답형 문항도 빠짐없이 추출하세요. problemType을 "서술형"으로 설정하세요.
6. 단답형(주관식) 문항은 problemType을 "주관식"으로 설정하세요.

7. **[보기]/[조건] 표기 통일 (필수!)**
   - 시험지에서 <보기>, (보기), 〈보기〉, ＜보기＞ 등 다양한 형태로 표기될 수 있지만, content에서는 반드시 **[보기]**로 통일하세요.
   - 마찬가지로 <조건>, (조건), 〈조건〉 등은 반드시 **[조건]**으로 통일하세요.
   - 보기 항목(ㄱ, ㄴ, ㄷ)은 boxItems 배열에 별도 저장하세요.

8. **도형/그림이 있는 문항은 반드시 diagramSvgs로 SVG를 생성하세요!**
   - 시험지에 도형(삼각형, 사각형, 원, 좌표평면, 그래프 등)이 포함된 문항은 해당 도형을 SVG 코드로 재구성하여 diagramSvgs 배열에 넣으세요.
   - content에는 [그림1], [그림2] 등 플레이스홀더를 넣고, diagramSvgs에 대응하는 SVG를 생성하세요.
   - SVG는 viewBox="0 0 300 300" 기준, 검은색 선(stroke="#333"), 흰색 배경, 꼭짓점 라벨과 변 길이를 텍스트로 포함하세요.
   - [그림] 플레이스홀더만 남기고 SVG를 생성하지 않는 것은 금지! 도형이 보이면 반드시 SVG로 재구성하세요.

9. **sectionHeader는 교육과정 표준 소단원명을 사용!**
   - "유형 01", "01 소인수분해", "16~18 단답형" 같은 교재 고유 분류 금지
   - 올바른 예: "소인수분해", "최대공약수와 최소공배수", "제곱근과 실수"
   - 해당 문항이 어떤 교육과정 소단원에 해당하는지 판단하여 표준 명칭 기재`;

/** POST /api/exam-analysis/[id]/extract-to-bank — 기출시험 문제 추출 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  const body = await request.json();
  const bookCode = body.bookCode as string;
  if (!bookCode) return badRequest('bookCode가 필요합니다');

  const tenantWhere = getTenantFilter(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
    include: {
      analyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');
  if (examPaper.status !== 'COMPLETED') return badRequest('분석이 완료되지 않은 시험지입니다');

  const latestAnalysis = examPaper.analyses[0];
  if (!latestAnalysis) return badRequest('분석 결과가 없습니다');

  try {
    // ── 1. 파일 로드 → base64 ──
    const fileUrls = examPaper.fileUrls.split(',');
    const imageDataList: string[] = [];

    for (const fileUrl of fileUrls) {
      imageDataList.push(await loadFileAsBase64(fileUrl));
    }

    // ── 2. Gemini 호출 — PDF추출 프롬프트 + 시험지 특화 ──
    const client = getGeminiClient();
    const mimeType = examPaper.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
    const prompt = MATH_SYSTEM_PROMPT + EXAM_PROMPT_SUFFIX;

    const imageParts = imageDataList.map((data) => ({
      inlineData: { mimeType, data },
    }));

    const response = await client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [{
        role: 'user',
        parts: [...imageParts, { text: prompt }],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: MATH_EXTRACT_SCHEMA,
      },
    });

    const text = response.text || '';
    if (!text) {
      return NextResponse.json(
        { error: { code: 'EXTRACTION_EMPTY', message: 'AI 응답이 비어있습니다' } },
        { status: 500 },
      );
    }

    // ── 3. JSON 파싱 + 후처리 ──
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // 코드펜스 제거 후 재시도
      const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const extractedRaw = mathTextbookPlugin.postProcess(parsed, 1);

    // ExtractedMathProblem → ExtractedProblemForMerge 변환
    const extracted: ExtractedProblemForMerge[] = extractedRaw.map((p) => ({
      questionNum: p.questionNum,
      pageNum: p.pageNum,
      sectionHeader: p.sectionHeader,
      content: p.content,
      choices: p.choices,
      answer: p.answer,
      explanation: p.explanation || '',
      sourceTag: p.sourceTag,
      difficulty: p.difficulty,
      type: p.type,
      diagramParams: p.diagramParams,
      diagramSvgs: p.diagramSvgs,
    }));

    // ── 4. 기출분석 메타와 병합 ──
    const analyzed = latestAnalysis.questions as unknown as AnalyzedQuestion[];
    const mergeResult = mergeExtractedWithAnalysis(extracted, analyzed, bookCode, examPaper.title);

    return NextResponse.json({ data: mergeResult });
  } catch (error) {
    console.error('[extract-to-bank] 추출 실패:', error);
    const message = error instanceof Error ? error.message : '문제 추출에 실패했습니다';
    return NextResponse.json(
      { error: { code: 'EXTRACTION_FAILED', message } },
      { status: 500 },
    );
  }
}
