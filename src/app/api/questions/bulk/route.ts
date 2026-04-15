import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, validateBody, serverError } from '@/lib/api';
import { bulkCreateQuestionsSchema } from '@/lib/schemas/question';
import { autoTag } from '@/lib/services/question-tagger';

// POST /api/questions/bulk — 문제 일괄 생성
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, bulkCreateQuestionsSchema);
  if (isResponse(parsed)) {
    // 어떤 필드에서 실패했는지 서버 로그 (Vercel 로그에서 확인)
    try {
      const body = await parsed.clone().json();
      console.error('[bulk] validation failed:', JSON.stringify(body?.error?.details ?? body));
    } catch { /* ignore */ }
    return parsed;
  }

  const { questions, examPaperId, tenantIdOverride, isDraft: isDraftFlag, draftBatchId } = parsed;
  const isDraft = Boolean(isDraftFlag);

  // tenantId 결정
  // 1) examPaperId 있으면 해당 시험지의 tenantId 우선 (지점 전용 문제 보장)
  // 2) SUPER_ADMIN + tenantIdOverride 지정 시 사용
  // 3) 일반 사용자는 본인 지점
  // 4) SUPER_ADMIN + override 없음 → null (공용)
  let resolvedTenantId: string | null = null;
  let resolvedExamPaper: { id: string; tenantId: string } | null = null;

  if (examPaperId) {
    const paper = await prisma.examPaper.findUnique({
      where: { id: examPaperId },
      select: { id: true, tenantId: true },
    });
    if (!paper) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '시험지를 찾을 수 없습니다' } }, { status: 404 });
    }
    resolvedExamPaper = paper;
    resolvedTenantId = paper.tenantId;
  } else if (user.role === 'SUPER_ADMIN' && tenantIdOverride) {
    resolvedTenantId = tenantIdOverride;
  } else if (user.role !== 'SUPER_ADMIN') {
    resolvedTenantId = user.viewingTenantId ?? user.tenantId ?? null;
  }

  try {
    const taggedQuestions = await Promise.all(
      questions.map(async (q) => {
        const tag = await autoTag({ chapter: q.chapter, section: q.section, difficulty: q.difficulty, bookCode: q.bookCode });
        return {
          ...q,
          domain: q.domain || tag.domain,
          abilityDomain: tag.abilityDomain,
          conceptId: q.conceptId || tag.conceptId,
        };
      })
    );

    const result = await prisma.$transaction(async (tx) => {
      // Idempotent: examPaperId 지정 시 기존 Question 삭제 후 재생성
      let deletedCount = 0;
      if (resolvedExamPaper && !isDraft) {
        const del = await tx.question.deleteMany({
          where: { examPaperId: resolvedExamPaper.id, isDraft: false },
        });
        deletedCount = del.count;
      }

      const created = await tx.question.createMany({
        data: taggedQuestions.map((q) => ({
          bookCode: q.bookCode,
          chapter: q.chapter,
          section: q.section || null,
          questionNum: q.questionNum,
          pageNum: q.pageNum || null,
          difficulty: q.difficulty,
          type: q.type,
          content: q.content,
          choices: q.choices || undefined,
          answer: q.answer,
          explanation: q.explanation || null,
          scoringCriteria: q.scoringCriteria || null,
          source: q.source || null,
          sourceTag: q.sourceTag || null,
          domain: q.domain || null,
          abilityDomain: q.abilityDomain || null,
          conceptId: q.conceptId || null,
          diagramSpec: q.diagramSpec || undefined,
          diagramSVG: q.diagramSVG || null,
          tenantId: resolvedTenantId,
          createdById: user.id,
          examPaperId: resolvedExamPaper?.id ?? null,
          isDraft,
          draftBatchId: isDraft ? (draftBatchId ?? null) : null,
          draftOwnerId: isDraft ? user.id : null,
        })),
        skipDuplicates: true,
      });

      if (resolvedExamPaper && !isDraft && created.count > 0) {
        await tx.examPaper.update({
          where: { id: resolvedExamPaper.id },
          data: {
            extractedToBankAt: new Date(),
            extractedQuestionCount: created.count,
            lastExtractError: null,
          },
        }).catch(() => { /* 무시 */ });
      }
      return { created: created.count, deleted: deletedCount };
    });

    return NextResponse.json(
      { data: { created: result.created, replaced: result.deleted } },
      { status: 201 }
    );
  } catch (err) {
    console.error('문제 일괄 생성 실패:', err);
    return serverError('문제 생성 중 오류가 발생했습니다');
  }
}
