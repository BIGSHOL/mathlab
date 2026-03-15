import { prisma } from '@/lib/db';

// ─── Day Computation ───

function toKSTDate(date: Date): Date {
  const adjusted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return new Date(adjusted.getFullYear(), adjusted.getMonth(), adjusted.getDate());
}

export function computeDayIndex(startDate: Date, targetDate?: Date): number {
  const target = targetDate ?? new Date();
  const startMs = toKSTDate(startDate).getTime();
  const targetMs = toKSTDate(target).getTime();
  return Math.floor((targetMs - startMs) / 86_400_000);
}

// ─── Types ───

export type QuestionDayStatus = 'NOT_STARTED' | 'COMPLETED' | 'FUTURE';

export interface QuestionHomeworkGridStudent {
  id: string;
  name: string;
  grade: number | null;
  /** dayIndex → attempt info */
  dayResults: Record<number, { score: number; correctCount: number; totalCount: number }>;
  completionRate: number;
  avgScore: number;
}

export interface QuestionHomeworkGridDay {
  dayIndex: number;
  date: string;
  questions: { id: string; content: string; chapter: string | null; difficulty: string }[];
}

export interface QuestionHomeworkGridData {
  plan: {
    id: string;
    seq: number;
    title: string;
    startDate: Date;
    totalDays: number;
    passingScore: number;
    isActive: boolean;
  };
  days: QuestionHomeworkGridDay[];
  students: QuestionHomeworkGridStudent[];
  dailyCompletionRates: number[];
}

export interface TodayQuestionHomework {
  planId: string;
  planTitle: string;
  dayIndex: number;
  dayLabel: string;
  questionCount: number;
  status: QuestionDayStatus;
  score?: number;
}

// ─── Plan CRUD ───

interface CreateQuestionHomeworkParams {
  title: string;
  createdBy: string;
  startDate: string;
  questionIds: string[];
  questionsPerDay: number;
  passingScore?: number;
  studentIds: string[];
}

export async function createQuestionHomeworkPlan(params: CreateQuestionHomeworkParams) {
  const { title, createdBy, startDate, questionIds, questionsPerDay, passingScore, studentIds } = params;

  if (questionIds.length === 0) throw new Error('문제를 1개 이상 선택해주세요');

  // 문제 존재 확인
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true },
  });
  if (questions.length !== questionIds.length) {
    throw new Error('일부 문제를 찾을 수 없습니다');
  }

  // 날짜별 문제 배분
  const perDay = Math.max(1, questionsPerDay);
  const dailyQuestions: string[][] = [];
  for (let i = 0; i < questionIds.length; i += perDay) {
    dailyQuestions.push(questionIds.slice(i, i + perDay));
  }
  const totalDays = dailyQuestions.length;

  const plan = await prisma.questionHomeworkPlan.create({
    data: {
      title,
      createdBy,
      startDate: new Date(startDate),
      totalDays,
      dailyQuestions: JSON.parse(JSON.stringify(dailyQuestions)),
      passingScore: passingScore ?? 80,
    },
  });

  if (studentIds.length > 0) {
    await prisma.questionHomeworkEnrollment.createMany({
      data: studentIds.map((studentId) => ({ planId: plan.id, studentId })),
      skipDuplicates: true,
    });
  }

  return plan;
}

// ─── Teacher: Grid Data ───

export async function getQuestionHomeworkGrid(
  planSeq: number,
  filters?: { grade?: number }
): Promise<QuestionHomeworkGridData> {
  const plan = await prisma.questionHomeworkPlan.findUniqueOrThrow({ where: { seq: planSeq } });
  const dailyQuestions = plan.dailyQuestions as unknown as string[][];
  const allQuestionIds = dailyQuestions.flat();

  const questions = await prisma.question.findMany({
    where: { id: { in: allQuestionIds } },
    select: { id: true, content: true, chapter: true, difficulty: true },
  });
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const enrollmentWhere: Record<string, unknown> = { planId: plan.id };
  if (filters?.grade) enrollmentWhere.student = { grade: filters.grade };

  const enrollments = await prisma.questionHomeworkEnrollment.findMany({
    where: enrollmentWhere,
    include: { student: { select: { id: true, name: true, grade: true } } },
    orderBy: { student: { name: 'asc' } },
  });

  const studentIds = enrollments.map((e) => e.student.id);

  // 시도 일괄 조회
  const attempts = await prisma.questionHomeworkAttempt.findMany({
    where: { planId: plan.id, studentId: { in: studentIds }, completedAt: { not: null } },
    select: { studentId: true, dayIndex: true, score: true, correctCount: true, totalCount: true },
  });

  // studentId → dayIndex → attempt
  const attemptMap = new Map<string, Map<number, { score: number; correctCount: number; totalCount: number }>>();
  for (const a of attempts) {
    if (!attemptMap.has(a.studentId)) attemptMap.set(a.studentId, new Map());
    attemptMap.get(a.studentId)!.set(a.dayIndex, { score: a.score, correctCount: a.correctCount, totalCount: a.totalCount });
  }

  const currentDayIndex = computeDayIndex(plan.startDate);

  const days: QuestionHomeworkGridDay[] = dailyQuestions.map((qIds, d) => {
    const date = new Date(plan.startDate);
    date.setDate(date.getDate() + d);
    return {
      dayIndex: d,
      date: date.toISOString().split('T')[0],
      questions: qIds.map((qid) => {
        const q = questionMap.get(qid);
        return {
          id: qid,
          content: q?.content?.slice(0, 30) ?? '(삭제됨)',
          chapter: q?.chapter ?? null,
          difficulty: q?.difficulty ?? 'MEDIUM',
        };
      }),
    };
  });

  const dailyCompletedCounts = new Array(plan.totalDays).fill(0);

  const students: QuestionHomeworkGridStudent[] = enrollments.map((enrollment) => {
    const studentAttempts = attemptMap.get(enrollment.student.id);
    const dayResults: Record<number, { score: number; correctCount: number; totalCount: number }> = {};
    let completedDays = 0;
    let totalScore = 0;

    for (let d = 0; d < plan.totalDays; d++) {
      const att = studentAttempts?.get(d);
      if (att) {
        dayResults[d] = att;
        completedDays++;
        totalScore += att.score;
        if (d <= currentDayIndex) dailyCompletedCounts[d]++;
      }
    }

    const pastDays = Math.min(currentDayIndex + 1, plan.totalDays);
    return {
      id: enrollment.student.id,
      name: enrollment.student.name,
      grade: enrollment.student.grade,
      dayResults,
      completionRate: pastDays > 0 ? Math.round((completedDays / pastDays) * 100) : 0,
      avgScore: completedDays > 0 ? Math.round(totalScore / completedDays) : 0,
    };
  });

  const totalStudents = students.length;
  const dailyCompletionRates = dailyCompletedCounts.map((count, d) =>
    d <= currentDayIndex && totalStudents > 0 ? Math.round((count / totalStudents) * 100) : -1
  );

  return {
    plan: {
      id: plan.id,
      seq: plan.seq,
      title: plan.title,
      startDate: plan.startDate,
      totalDays: plan.totalDays,
      passingScore: plan.passingScore,
      isActive: plan.isActive,
    },
    days,
    students,
    dailyCompletionRates,
  };
}

// ─── Student: Today ───

export async function getTodayQuestionHomework(studentId: string): Promise<TodayQuestionHomework[]> {
  const enrollments = await prisma.questionHomeworkEnrollment.findMany({
    where: { studentId },
    include: { plan: true },
  });

  const activePlans = enrollments
    .filter((e) => e.plan.isActive)
    .map((e) => {
      const dayIndex = computeDayIndex(e.plan.startDate);
      return { plan: e.plan, dayIndex };
    })
    .filter(({ plan, dayIndex }) => dayIndex >= 0 && dayIndex < plan.totalDays);

  if (activePlans.length === 0) return [];

  const planIds = activePlans.map((p) => p.plan.id);
  const attempts = await prisma.questionHomeworkAttempt.findMany({
    where: { studentId, planId: { in: planIds }, completedAt: { not: null } },
    select: { planId: true, dayIndex: true, score: true },
  });

  const attemptSet = new Map<string, number>();
  for (const a of attempts) {
    attemptSet.set(`${a.planId}__${a.dayIndex}`, a.score);
  }

  return activePlans.map(({ plan, dayIndex }) => {
    const daily = plan.dailyQuestions as unknown as string[][];
    const todayQuestions = daily[dayIndex] ?? [];
    const key = `${plan.id}__${dayIndex}`;
    const score = attemptSet.get(key);

    return {
      planId: plan.id,
      planTitle: plan.title,
      dayIndex,
      dayLabel: `${dayIndex + 1}일차`,
      questionCount: todayQuestions.length,
      status: score !== undefined ? 'COMPLETED' as const : dayIndex > 0 ? 'NOT_STARTED' as const : 'NOT_STARTED' as const,
      score,
    };
  });
}

// ─── Plan List ───

export async function listQuestionHomeworkPlans(createdBy?: string) {
  const where = createdBy ? { createdBy } : {};
  const plans = await prisma.questionHomeworkPlan.findMany({
    where,
    include: {
      _count: { select: { enrollments: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return plans.map((p) => {
    const daily = p.dailyQuestions as unknown as string[][];
    const totalQuestions = daily.flat().length;
    const currentDay = computeDayIndex(p.startDate);
    const progress = Math.min(Math.max(currentDay + 1, 0), p.totalDays);

    return {
      id: p.id,
      seq: p.seq,
      title: p.title,
      startDate: p.startDate,
      totalDays: p.totalDays,
      totalQuestions,
      passingScore: p.passingScore,
      isActive: p.isActive,
      studentCount: p._count.enrollments,
      creatorName: p.creator.name,
      progress: `${progress}/${p.totalDays}`,
      createdAt: p.createdAt,
    };
  });
}
