import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';
import { getExamScope } from '@/lib/demo/accounts';
import { isStalePromptVersion } from '@/lib/exam-analysis/constants';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';
import { toUserFacingError } from '@/lib/exam-analysis/shared/error-message';
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

/**
 * 이 라우트는 AI 호출이 끝날 때까지 요청 안에서 기다린다 — 짧은 API 가 아니다.
 * 300초는 Hobby 플랜의 함수 실행 상한이자 기본값이며(fluid compute 기준),
 * Pro 로 올라가도 그대로 유효하다. 분석 자체 예산은 GEMINI_ANALYZE_TIMEOUT_MS(180초)라
 * 여유가 있다. 이 값을 줄이면 분석이 끝나기 전에 함수가 잘린다.
 *
 * ⚠️ vercel.json 의 `supportsCancellation` 을 켜지 말 것. Vercel 은 기본적으로
 * 클라이언트 연결이 끊겨도 함수를 끝까지 돌린다(취소는 opt-in). 그래서 사용자가
 * 분석 도중 페이지를 떠나도 결과가 DB 에 저장된다 — 켜는 순간 그게 깨진다.
 */
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/**
 * PDF 만 형식이 확정이다. 이미지는 빈 힌트를 반환해 **파일별 매직바이트**로 판별하게 한다.
 * 예전엔 첫 파일 확장자로 전부를 단정해, 여러 장이 섞이면 뒤 장들의 형식을 잘못 신고했다
 * (적대적 리뷰 1.10).
 */
function mimeFromPaper(fileType: string, firstUrl: string): string {
  if (fileType === 'pdf' || firstUrl.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  return '';
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
  // 저장된 팩은 버전과 무관하게 붙잡아 둔다 — 재생성이 실패하면 이게 마지막 방어선이다.
  // (버전 검사만 넣고 폴백을 안 두면, 규칙이 바뀐 순간 멀쩡히 보이던 화면이 에러로 바뀐다.)
  const cachedPack = existing?.result ? parseEnglishStudyResult(existing.result) : null;
  if (!force && cachedPack && !existing?.errorMessage && isCurrentEnglishStudyPack(cachedPack)) {
    return NextResponse.json({ data: cachedPack });
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
    // 잘린 응답은 "완결본"이 아니다 → errorMessage 를 남겨 다음 요청에 다시 뽑게 한다.
    // 결과 자체는 돌려준다(앞쪽 몇 건이라도 보는 편이 빈손보다 낫다).
    await savePack(
      latest.id,
      user.id,
      pack,
      pack.truncated ? '응답이 잘려 일부만 정리되었습니다 — 다시 시도하면 더 채워집니다' : null,
    );
    return NextResponse.json({ data: pack });
  } catch (e) {
    const failMsg = e instanceof Error ? e.message : '단어·구문 정리에 실패했습니다';
    console.warn('[영어 학습대책] 시험지 본문 추출 실패:', failMsg);

    // 폴백 사슬 — 빈손보다 낫다: 문항 분석분 → 직전 캐시(구버전이라도)
    if (fromQuestions) {
      // ⚠️ errorMessage 를 남겨야 한다. 성공으로 저장하면 일시적 실패가
      //    캐시에 굳어 다시는 본문을 훑지 않는다.
      await savePack(latest.id, user.id, fromQuestions, failMsg);
      return NextResponse.json({ data: fromQuestions });
    }
    if (cachedPack) {
      console.warn('[영어 학습대책] 직전 저장분으로 폴백 (재생성 실패)');
      return NextResponse.json({ data: cachedPack });
    }

    // 재료가 아예 없다. 원인을 특정해 사용자가 할 일을 알려준다.
    // 구버전 분석본에는 문항별 key_vocab / key_structures 자체가 없어서
    // 본문 추출이 실패하면 폴백할 것이 남지 않는다 → "다시 정리"가 아니라 "다시 분석"이 답이다.
    const staleAnalysis = isStalePromptVersion(latest.modelVersion, 'ENGLISH');
    if (staleAnalysis) {
      return badRequest(
        '이 시험지는 예전 버전으로 분석되어 문항에 단어·구문 정보가 없습니다. 시험지를 다시 분석하면 채워집니다.',
      );
    }

    // 벤더·환경변수·CLI 흔적을 지운 사용자 문구 (CLAUDE.md #0-1)
    const userMsg = toUserFacingError(failMsg, '단어·구문 정리에 실패했습니다. 다시 시도해 주세요.');
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
