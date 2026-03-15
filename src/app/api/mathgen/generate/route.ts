import { NextRequest, NextResponse } from 'next/server';
import { generateMathProblem } from '@/lib/services/mathgen';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SelectionState, SchoolLevel, Difficulty, ProblemType, AnswerType } from '@/types/mathgen';
import type { QuestionDifficulty, QuestionType } from '@/types';

function deriveBookCode(schoolLevel: SchoolLevel, grade: string): string {
  const match = grade.match(/(\d+)학년\s*(\d+)학기/);
  if (match) {
    const [, gradeNum, semester] = match;
    switch (schoolLevel) {
      case SchoolLevel.ELEMENTARY:
        return `E${gradeNum}-${semester}`;
      case SchoolLevel.MIDDLE:
        return `${gradeNum}-${semester}`;
      case SchoolLevel.HIGH:
        return `H${gradeNum}-${semester}`;
    }
  }
  return grade.substring(0, 10);
}

function mapDifficulty(difficulty: Difficulty): QuestionDifficulty {
  const map: Record<Difficulty, QuestionDifficulty> = {
    [Difficulty.LOW]: 'BASIC',
    [Difficulty.MEDIUM]: 'MEDIUM',
    [Difficulty.HIGH]: 'HIGH',
    [Difficulty.EXTREME]: 'HIGHEST',
  };
  return map[difficulty] ?? 'MEDIUM';
}

function mapQuestionType(answerType: AnswerType): QuestionType {
  return answerType === AnswerType.MULTIPLE_CHOICE ? 'MULTIPLE_CHOICE' : 'ESSAY';
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  try {
    const body = await request.json();

    const selection: SelectionState = {
      mode: body.mode || 'curriculum',
      sourceImage: body.sourceImage || null,
      schoolLevel: body.schoolLevel || SchoolLevel.HIGH,
      grade: body.grade || '공통수학1',
      mainUnit: body.mainUnit || '',
      subUnit: body.subUnit || '',
      detailUnit: body.detailUnit || '',
      difficulty: body.difficulty || Difficulty.MEDIUM,
      problemType: body.problemType || ProblemType.TYPE,
      answerType: body.answerType || AnswerType.MULTIPLE_CHOICE,
    };

    const problem = await generateMathProblem(selection);

    // Auto-save to question bank
    const bookCode = deriveBookCode(selection.schoolLevel, selection.grade);
    const chapter = selection.mainUnit;
    const section = [selection.subUnit, selection.detailUnit].filter(Boolean).join(' > ') || null;

    const maxQuestion = await prisma.question.findFirst({
      where: { bookCode, chapter },
      orderBy: { questionNum: 'desc' },
      select: { questionNum: true },
    });
    const questionNum = (maxQuestion?.questionNum ?? 0) + 1;

    const saved = await prisma.question.create({
      data: {
        bookCode,
        chapter,
        section,
        questionNum,
        difficulty: mapDifficulty(selection.difficulty),
        type: mapQuestionType(selection.answerType),
        content: problem.question,
        choices: problem.choices ?? undefined,
        answer: problem.answer,
        explanation: problem.solution || undefined,
        sourceTag: 'AI 생성',
        diagramSpec: problem.diagramSpec ?? undefined,
        diagramSVG: problem.diagramSVG ?? undefined,
      },
    });

    // AI 문제 생성 로그 기록
    if (currentUser) {
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
          questionId: saved.id,
          success: true,
        },
      }).catch(() => {}); // 로그 실패는 무시
    }

    return NextResponse.json({
      data: problem,
      saved: { id: saved.id, bookCode, chapter, questionNum },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Math generation error:', error);

    // AI 문제 생성 실패 로그
    if (currentUser) {
      await prisma.questionGenerationLog.create({
        data: {
          teacherId: currentUser.id,
          mode: 'curriculum',
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: { code: 'GENERATION_FAILED', message: '문제 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 500 }
    );
  }
}
