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
  if (isResponse(parsed)) return parsed;

  const { questions } = parsed;

  try {
    // domain/conceptId 미지정 시 자동 태깅
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
        })),
        skipDuplicates: true,
      });
      return created;
    });

    return NextResponse.json(
      { data: { created: result.count } },
      { status: 201 }
    );
  } catch (err) {
    console.error('문제 일괄 생성 실패:', err);
    return serverError('문제 생성 중 오류가 발생했습니다');
  }
}
