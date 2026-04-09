import { NextRequest, NextResponse } from 'next/server';
import { autoTag } from '@/lib/services/question-tagger';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, serverError, badRequest } from '@/lib/api';
import type { QuestionDifficulty, QuestionType } from '@/types';

/**
 * POST /api/mathgen/save
 * AI 생성 문제를 문제 은행에 저장 (tenantId + createdById 포함)
 */
export async function POST(request: NextRequest) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  try {
    const body = await request.json();

    const {
      content, choices, answer, explanation,
      bookCode, chapter, section,
      difficulty, type,
      diagramSpec, diagramParams, diagramSVG,
      sourceTag,
    } = body;

    // diagramParams가 있으면 diagramSpec 필드에 DiagramParam[] 배열로 저장
    const finalDiagramSpec = diagramParams ?? diagramSpec;

    if (!content || !answer || !bookCode || !chapter || !difficulty || !type) {
      return badRequest('필수 필드가 누락되었습니다');
    }

    // questionNum 자동 산출
    const maxQuestion = await prisma.question.findFirst({
      where: { bookCode, chapter },
      orderBy: { questionNum: 'desc' },
      select: { questionNum: true },
    });
    const questionNum = (maxQuestion?.questionNum ?? 0) + 1;

    // 자동 태깅
    const tags = await autoTag({ chapter, section, difficulty, bookCode });

    const saved = await prisma.question.create({
      data: {
        bookCode,
        chapter,
        section: section || null,
        questionNum,
        difficulty: difficulty as QuestionDifficulty,
        type: type as QuestionType,
        content,
        choices: choices ?? undefined,
        answer,
        explanation: explanation || undefined,
        source: 'AI 문제 생성',
        sourceTag: sourceTag || 'AI 생성',
        diagramSpec: finalDiagramSpec ?? undefined,
        diagramSVG: diagramSVG ?? undefined,
        domain: tags.domain ?? undefined,
        conceptId: tags.conceptId ?? undefined,
        tenantId: currentUser.viewingTenantId ?? currentUser.tenantId ?? null,
        createdById: currentUser.id,
      },
    });

    return NextResponse.json({
      data: {
        id: saved.id,
        bookCode,
        chapter,
        questionNum,
        tenantId: saved.tenantId,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Question save error:', error);
    return serverError('문제 저장에 실패했습니다');
  }
}
