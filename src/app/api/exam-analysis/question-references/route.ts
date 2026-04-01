import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, requireOwner, isResponse, badRequest } from '@/lib/api';

/** GET /api/exam-analysis/question-references — 참조 문제 목록 (TEACHER+, 테넌트 스코핑) */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  // 테넌트 스코핑: ExamPaper를 통해 해당 테넌트의 examPaperId만 허용
  let tenantExamPaperIds: string[] | null = null;
  if (user.tenantId) {
    const tenantPapers = await prisma.examPaper.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    tenantExamPaperIds = tenantPapers.map(p => p.id);
  }
  const tenantScope = tenantExamPaperIds !== null
    ? { examPaperId: { in: tenantExamPaperIds } }
    : {};

  // mode=stats: 통계 반환
  if (mode === 'stats') {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.examQuestionReference.count({ where: tenantScope }),
      prisma.examQuestionReference.count({ where: { reviewStatus: 'pending', ...tenantScope } }),
      prisma.examQuestionReference.count({ where: { reviewStatus: 'approved', ...tenantScope } }),
      prisma.examQuestionReference.count({ where: { reviewStatus: 'rejected', ...tenantScope } }),
    ]);
    return NextResponse.json({ data: { total, pending, approved, rejected } });
  }

  const subject = searchParams.get('subject') as 'MATH' | 'ENGLISH' | null;
  const grade = searchParams.get('grade');
  const difficulty = searchParams.get('difficulty');
  const reviewStatus = searchParams.get('reviewStatus');
  const examPaperId = searchParams.get('examPaperId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const where: Record<string, unknown> = {
    ...tenantScope,
    ...(subject && { subject }),
    ...(grade && { grade }),
    ...(difficulty && { difficulty }),
    ...(reviewStatus && { reviewStatus }),
    ...(examPaperId && { examPaperId }),
  };

  const [items, total] = await Promise.all([
    prisma.examQuestionReference.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.examQuestionReference.count({ where }),
  ]);

  // ExamPaper 제목 조회 (출처 표시용)
  const examPaperIds = [...new Set(items.map(i => i.examPaperId).filter(Boolean))] as string[];
  const examPapers = examPaperIds.length > 0
    ? await prisma.examPaper.findMany({
        where: { id: { in: examPaperIds } },
        select: { id: true, title: true, grade: true },
      })
    : [];
  const paperMap = new Map(examPapers.map(p => [p.id, p]));

  // 문제은행에서 매칭되는 문제 조회 (기출 추출 → 문제은행 저장된 경우)
  const paperTitles = [...new Set(examPapers.map(p => p.title))];
  const questionNums = items.map(i => i.questionNumber).filter((n): n is number => n !== null);
  const bankQuestions = paperTitles.length > 0 && questionNums.length > 0
    ? await prisma.question.findMany({
        where: {
          source: { in: paperTitles },
          questionNum: { in: questionNums },
        },
        select: {
          id: true,
          source: true,
          questionNum: true,
          content: true,
          choices: true,
          answer: true,
          type: true,
        },
      })
    : [];
  // source + questionNum → Question 매핑
  const bankMap = new Map(
    bankQuestions.map(q => [`${q.source}::${q.questionNum}`, q])
  );

  // 클라이언트 필드명에 맞게 매핑
  const mappedItems = items.map(item => {
    const paperTitle = item.examPaperId ? paperMap.get(item.examPaperId)?.title ?? null : null;
    const bankQuestion = paperTitle && item.questionNumber
      ? bankMap.get(`${paperTitle}::${item.questionNumber}`) ?? null
      : null;

    return {
      id: item.id,
      questionNumber: item.questionNumber,
      topic: item.topicHierarchy,
      confidence: item.confidence,
      aiComment: item.content,
      difficulty: item.difficulty,
      questionType: item.questionType,
      grade: item.grade,
      reviewStatus: item.reviewStatus,
      reviewNote: item.reviewNote,
      createdAt: item.createdAt,
      examPaperTitle: paperTitle,
      // 문제은행 연동 데이터
      bankQuestion: bankQuestion ? {
        id: bankQuestion.id,
        content: bankQuestion.content,
        choices: bankQuestion.choices,
        answer: bankQuestion.answer,
        type: bankQuestion.type,
      } : null,
    };
  });

  return NextResponse.json({
    data: mappedItems,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/** POST /api/exam-analysis/question-references — 참조 문제 추가 (OWNER+) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { subject, grade, difficulty, questionType, content, answer, source } = body;

  if (!subject || !grade || !difficulty || !questionType || !content) {
    return badRequest('필수 항목을 입력하세요');
  }

  const ref = await prisma.examQuestionReference.create({
    data: {
      subject,
      grade,
      difficulty,
      questionType,
      content,
      answer: answer || null,
      source: source || null,
    },
  });

  return NextResponse.json({ data: ref }, { status: 201 });
}
