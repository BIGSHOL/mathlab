import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse } from '@/lib/api';

type Ctx = { params: Promise<{ id: string; username: string }> };

// GET /api/learning-courses/[id]/progress/[username] — 학생별 개념 진행 상세
export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id, username } = await params;
  const seq = Number(id);

  // 과정 조회
  const course = await prisma.learningCourse.findUnique({
    where: seq > 0 ? { seq } : { id },
    include: {
      concepts: {
        orderBy: { sortOrder: 'asc' },
        include: {
          concept: { select: { id: true, title: true, conceptCode: true, grade: true, chapter: true, section: true } },
        },
      },
      enrollments: {
        include: { student: { select: { id: true, name: true, username: true, grade: true } } },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '과정을 찾을 수 없습니다' } }, { status: 404 });
  }

  // 학생 찾기 (username으로)
  const enrollment = course.enrollments.find((e) => e.student.username === username);
  if (!enrollment) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '해당 학생이 이 과정에 배정되지 않았습니다' } }, { status: 404 });
  }

  const student = enrollment.student;
  const conceptIds = course.concepts.map((c) => c.conceptId);

  // 학생의 모든 진행 데이터 조회 + 개념별 fullContent + 빈칸 문제 + 답변 이력
  const [allProgress, conceptDetails, blankExercises, blankAttempts] = await Promise.all([
    prisma.learningProgress.findMany({
      where: {
        userId: student.id,
        conceptId: { in: conceptIds },
      },
      select: {
        conceptId: true,
        stage: true,
        completed: true,
        attempts: true,
        score: true,
        hintCount: true,
        revealCount: true,
        startedAt: true,
        completedAt: true,
      },
    }),
    prisma.concept.findMany({
      where: { id: { in: conceptIds } },
      select: { id: true, fullContent: true },
    }),
    prisma.blankExercise.findMany({
      where: { conceptId: { in: conceptIds } },
      select: { conceptId: true, templateText: true, blanks: true },
    }),
    prisma.blankAttempt.findMany({
      where: {
        studentId: student.id,
        conceptId: { in: conceptIds },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        conceptId: true,
        stage: true,
        score: true,
        allCorrect: true,
        createdAt: true,
        answers: {
          select: {
            blankPosition: true,
            submittedAnswer: true,
            correctAnswer: true,
            isCorrect: true,
          },
          orderBy: { blankPosition: 'asc' },
        },
      },
    }),
  ]);

  // 개념별 fullContent, blanks, 답변이력 맵
  const contentMap = new Map(conceptDetails.map((c: { id: string; fullContent: string }) => [c.id, c.fullContent]));
  const blanksMap = new Map<string, { templateText: string; blanks: unknown }>();
  for (const ex of blankExercises) {
    if (!blanksMap.has(ex.conceptId)) {
      blanksMap.set(ex.conceptId, { templateText: ex.templateText, blanks: ex.blanks });
    }
  }
  // 답변 이력: conceptId → attempts[]
  type AttemptItem = (typeof blankAttempts)[number];
  const attemptsMap = new Map<string, AttemptItem[]>();
  for (const a of blankAttempts) {
    if (!attemptsMap.has(a.conceptId)) attemptsMap.set(a.conceptId, []);
    attemptsMap.get(a.conceptId)!.push(a);
  }

  // conceptId별로 그룹화
  const progressMap = new Map<string, typeof allProgress>();
  for (const p of allProgress) {
    if (!progressMap.has(p.conceptId)) progressMap.set(p.conceptId, []);
    progressMap.get(p.conceptId)!.push(p);
  }

  const STAGES = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'] as const;

  // 개념별 진행 데이터 조립
  let completedCount = 0;
  const concepts = course.concepts.map((cc) => {
    const concept = cc.concept;
    const records = progressMap.get(concept.id) || [];

    const stages: Record<string, { completed: boolean; completedAt: string | null; attempts: number; score: number | null; hintCount: number; revealCount: number } | null> = {};
    for (const stage of STAGES) {
      const record = records.find((r) => r.stage === stage);
      stages[stage] = record
        ? {
            completed: record.completed,
            completedAt: record.completedAt?.toISOString() || null,
            attempts: record.attempts,
            score: record.score,
            hintCount: record.hintCount,
            revealCount: record.revealCount,
          }
        : null;
    }

    const isCompleted = stages.BLANK_FULL?.completed === true;
    if (isCompleted) completedCount++;

    // 현재 단계 판별
    let currentStage: string = 'NOT_STARTED';
    for (const stage of STAGES) {
      if (!stages[stage]) { currentStage = stage; break; }
      if (!stages[stage]!.completed) { currentStage = stage; break; }
      if (stage === 'BLANK_FULL' && stages[stage]!.completed) currentStage = 'COMPLETED';
    }

    const blankData = blanksMap.get(concept.id);
    return {
      id: concept.id,
      title: concept.title,
      chapter: concept.chapter,
      section: concept.section,
      sortOrder: cc.sortOrder,
      stages,
      isCompleted,
      currentStage,
      fullContent: contentMap.get(concept.id) || null,
      blankExercise: blankData ? { templateText: blankData.templateText, blanks: blankData.blanks } : null,
      blankAttempts: (attemptsMap.get(concept.id) || []).map((a) => ({
        id: a.id,
        stage: a.stage,
        score: a.score,
        allCorrect: a.allCorrect,
        createdAt: a.createdAt.toISOString(),
        answers: a.answers,
      })),
    };
  });

  return NextResponse.json({
    data: {
      course: { seq: course.seq, title: course.title },
      student: { name: student.name, username: student.username, grade: student.grade },
      enrollment: {
        status: enrollment.status,
        startedAt: enrollment.startedAt?.toISOString() || null,
        completedAt: enrollment.completedAt?.toISOString() || null,
      },
      concepts,
      summary: {
        completed: completedCount,
        total: concepts.length,
        percent: concepts.length > 0 ? Math.round((completedCount / concepts.length) * 100) : 0,
      },
    },
  });
}
