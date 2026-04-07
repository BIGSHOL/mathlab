import { NextRequest, NextResponse } from 'next/server';
import { generateMathProblem } from '@/lib/services/mathgen';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, serverError } from '@/lib/api';
import { SelectionState, SchoolLevel, Difficulty, ProblemType, AnswerType } from '@/types/mathgen';

export async function POST(request: NextRequest) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  let requestMode = 'curriculum';
  try {
    const body = await request.json();
    requestMode = body.mode || 'curriculum';

    const selection: SelectionState = {
      mode: body.mode || 'curriculum',
      sourceImage: body.sourceImage || null,
      schoolLevel: body.schoolLevel || SchoolLevel.HIGH,
      grade: body.grade || '공통수학1',
      mainUnit: body.mainUnit || '',
      subUnit: body.subUnit || '',
      detailUnit: body.detailUnit || '',
      difficulty: body.difficulty || Difficulty.LEVEL2,
      problemType: body.problemType || ProblemType.UNDERSTANDING,
      answerType: body.answerType || AnswerType.MULTIPLE_CHOICE,
      removeScore: body.removeScore ?? false,
      textbookId: body.textbookId || undefined,
    };

    const problem = await generateMathProblem(selection);

    // 디버그 로그
    // eslint-disable-next-line no-console
    console.log('[mathgen] mode:', selection.mode, '| diagramSpec:', problem.diagramSpec ? JSON.stringify(problem.diagramSpec).slice(0, 200) : 'null', '| diagramSVG:', problem.diagramSVG ? `${problem.diagramSVG.length}자` : 'null');
    // eslint-disable-next-line no-console
    console.log('[mathgen] solution (first 300):', problem.solution?.slice(0, 300));

    // 생성 로그 기록 (저장은 별도 API에서 처리)
    await prisma.questionGenerationLog.create({
      data: {
        teacherId: currentUser.id,
        mode: selection.mode,
        schoolLevel: selection.schoolLevel,
        grade: selection.grade,
        mainUnit: selection.mainUnit || null,
        subUnit: selection.subUnit || null,
        detailUnit: selection.detailUnit || null,
        difficulty: selection.difficulty,
        problemType: selection.problemType,
        success: true,
      },
    }).catch(() => {});

    return NextResponse.json({ data: problem });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Math generation error:', error);

    if (currentUser) {
      await prisma.questionGenerationLog.create({
        data: {
          teacherId: currentUser.id,
          mode: requestMode,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      }).catch(() => {});
    }

    return serverError('문제 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}
