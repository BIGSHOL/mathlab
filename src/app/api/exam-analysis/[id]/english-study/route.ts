import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';
import { getExamScope } from '@/lib/demo/accounts';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import {
  ENGLISH_STUDY_AGENT,
  buildEnglishStudyFromQuestions,
  ENGLISH_STUDY_PACK_VERSION,
  isCurrentEnglishStudyPack,
  parseEnglishStudyResult,
  type EnglishStudyExtracted,
} from '@/lib/exam-analysis/english-study-pack';
import {
  extractEnglishStudyFromExam,
  loadExamUrlAsBase64,
} from '@/lib/exam-analysis/english-study-extract';
import {
  isProductionRuntime,
  parseCliKind,
  runWithCliKind,
  type CliKind,
} from '@/lib/exam-analysis/cli-llm';

type Params = { params: Promise<{ id: string }> };

function mimeFromPaper(fileType: string, firstUrl: string): string {
  if (fileType === 'pdf' || firstUrl.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  if (firstUrl.toLowerCase().endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

async function savePack(
  analysisId: string,
  userId: string,
  pack: EnglishStudyExtracted,
  errorMessage: string | null = null,
) {
  const now = new Date();
  await prisma.examAnalysisExtension.upsert({
    where: {
      analysisId_agentType: { analysisId, agentType: ENGLISH_STUDY_AGENT },
    },
    create: {
      analysisId,
      agentType: ENGLISH_STUDY_AGENT,
      result: pack as unknown as Prisma.InputJsonValue,
      errorMessage,
      lastRunBy: userId,
      lastRunAt: now,
    },
    update: {
      result: pack as unknown as Prisma.InputJsonValue,
      errorMessage,
      lastRunBy: userId,
      lastRunAt: now,
    },
  });
}

/** POST /api/exam-analysis/[id]/english-study — 시험지에서 단어·구문 정리 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  let force = false;
  let cliKind: CliKind | undefined;
  try {
    const body = await request.json() as { forceRegenerate?: unknown; cli?: unknown };
    force = body?.forceRegenerate === true;
    if (!isProductionRuntime()) cliKind = parseCliKind(body?.cli);
  } catch {
    force = false;
  }

  const tenantWhere = await getExamScope(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');
  if (toExamSubjectKey(examPaper.subject) !== 'ENGLISH') {
    return badRequest('영어 시험지만 단어·구문을 정리합니다');
  }

  const latest = await prisma.examAnalysis.findFirst({
    where: { examPaperId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      extensions: {
        where: { agentType: ENGLISH_STUDY_AGENT },
        take: 1,
      },
    },
  });
  if (!latest) return badRequest('기본 분석을 먼저 실행하세요');

  const existing = latest.extensions[0];
  if (!force && existing?.result && !existing.errorMessage) {
    const parsed = parseEnglishStudyResult(existing.result);
    // 버전이 다르면(=추출 규칙이 그 사이 바뀌었으면) 캐시를 버리고 다시 뽑는다.
    // 버전 검사가 없던 시절엔 규칙을 고쳐도 옛 결과가 영원히 반환됐다.
    if (parsed && isCurrentEnglishStudyPack(parsed)) {
      return NextResponse.json({ data: parsed });
    }
  }

  const questions = (Array.isArray(latest.questions) ? latest.questions : []) as unknown as AnalyzedQuestion[];
  if (!questions.length) return badRequest('분석된 문항이 없습니다');

  const fromQuestions = buildEnglishStudyFromQuestions(questions);

  const fileUrls = examPaper.fileUrls.split(',').map((u) => u.trim()).filter(Boolean);
  if (!fileUrls.length) {
    if (fromQuestions) {
      // 파일이 없는 건 재시도해도 달라지지 않는 종착 상태 → 에러 없이 저장(캐시 유효).
      await savePack(latest.id, user.id, fromQuestions);
      return NextResponse.json({ data: fromQuestions });
    }
    return badRequest('시험지 파일이 없습니다');
  }

  try {
    const pack = await runWithCliKind(cliKind, async () => {
      const images: string[] = [];
      for (const url of fileUrls) {
        images.push(await loadExamUrlAsBase64(url));
      }
      return extractEnglishStudyFromExam({
        images,
        mimeTypeHint: mimeFromPaper(examPaper.fileType, fileUrls[0]),
        questions,
        grade: examPaper.grade,
      });
    });
    await savePack(latest.id, user.id, pack);
    return NextResponse.json({ data: pack });
  } catch (e) {
    const failMsg = e instanceof Error ? e.message : '단어·구문 정리에 실패했습니다';
    console.warn('[영어 학습대책] 시험지 본문 추출 실패 — 문항 분석분으로 폴백:', failMsg);
    if (fromQuestions) {
      // ⚠️ errorMessage 를 남겨야 한다. 성공으로 저장하면 일시적 실패가
      //    캐시에 굳어 다시는 본문을 훑지 않는다.
      await savePack(latest.id, user.id, fromQuestions, failMsg);
      return NextResponse.json({ data: fromQuestions });
    }
    const msg = failMsg;
    const userMsg = msg.includes('GEMINI') || msg.includes('API')
      ? '단어·구문 정리에 실패했습니다'
      : msg;
    try {
      await savePack(
        latest.id,
        user.id,
        { vocab: [], structures: [], source: 'exam', version: ENGLISH_STUDY_PACK_VERSION },
        userMsg,
      );
    } catch {
      /* 로그 실패해도 본 에러를 반환 */
    }
    return NextResponse.json(
      { error: { code: 'ENGLISH_STUDY_FAILED', message: userMsg } },
      { status: 500 },
    );
  }
}
