import { prisma } from '@/lib/db';
import {
  type ArithmeticCategory,
  type ArithmeticLevel,
  type GeneratedProblem,
} from './arithmetic-generator';
import {
  type ProgressionMode,
  type RetryMode,
  type CountMode,
  type SlotConfig,
} from './homework/types';

export type { ProgressionMode, RetryMode, CountMode, SlotConfig };
import { getAssignmentStrategy } from './homework/strategies';

// ─── Day Computation (크론잡 불필요) ───

/** KST 기준 날짜 계산 (오전 6시 기준으로 하루 전환) */
function toKSTDate(date: Date): Date {
  const adjusted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return new Date(adjusted.getFullYear(), adjusted.getMonth(), adjusted.getDate());
}

/** startDate 기준으로 오늘이 몇일차인지 계산 (0-based, KST 06:00 전환) */
export function computeDayIndex(startDate: Date, targetDate?: Date): number {
  const target = targetDate ?? new Date();
  const startMs = toKSTDate(startDate).getTime();
  const targetMs = toKSTDate(target).getTime();
  return Math.floor((targetMs - startMs) / 86_400_000);
}

/** dayIndex에 해당하는 실제 날짜 (KST 기준) */
function getDayDate(startDate: Date, dayIndex: number): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

export type HomeworkDayStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FUTURE' | 'MISSED' | 'REST';

export function getDayStatus(
  dayIndex: number,
  currentDayIndex: number,
  totalDays: number,
  attempt: { completedAt: Date | null } | null,
  isRestDay?: boolean
): HomeworkDayStatus {
  if (isRestDay) return 'REST';
  if (dayIndex >= totalDays) return 'FUTURE';
  if (attempt?.completedAt) return 'COMPLETED';
  if (dayIndex > currentDayIndex) return attempt ? 'IN_PROGRESS' : 'FUTURE';
  if (attempt) return 'IN_PROGRESS';
  if (dayIndex === currentDayIndex) return 'NOT_STARTED';
  return 'MISSED';
}

// ─── Plan Creation ───

interface CreatePlanParams {
  title: string;
  createdBy: string;
  progressionMode: ProgressionMode;
  countMode: CountMode;
  dailyCount: number;
  perCatCounts?: Record<string, number>;
  startDate: string;
  studentIds: string[];
  passingScore?: number;
  retryOnFail?: boolean;
  retryMode?: RetryMode;
  maxRetries?: number;
  slots?: SlotConfig[];
  categories?: ArithmeticCategory[];
  daysPerCategory?: number;
  weekdayMap?: Record<string, ArithmeticCategory[]>;
  weeks?: number;
}

export async function createHomeworkPlan(params: CreatePlanParams) {
  const {
    title, createdBy, progressionMode, studentIds, startDate,
    passingScore, retryOnFail, retryMode, maxRetries, dailyCount
  } = params;

  // 1. 전략 패턴 적용: 배정 전략 선택 및 실행
  const strategy = getAssignmentStrategy(progressionMode);
  const level: ArithmeticLevel = 'easy';
  const { dailyProblems, allCategories } = strategy.generate({ ...params, level });

  if (dailyProblems.length === 0) throw new Error('유효한 카테고리가 없습니다');

  // 2. DB 저장
  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.arithmeticHomeworkPlan.create({
      data: {
        title,
        createdBy,
        categories: allCategories,
        level,
        dailyCount,
        totalDays: dailyProblems.length,
        startDate: new Date(startDate),
        dailyProblems: JSON.parse(JSON.stringify(dailyProblems)),
        progressionMode,
        weekdayMap: progressionMode === 'weekday' ? params.weekdayMap : undefined,
        passingScore: passingScore ?? 80,
        retryOnFail: retryOnFail ?? false,
        retryMode: retryOnFail ? (retryMode ?? 'wrong_same') : 'wrong_same',
        maxRetries: retryOnFail ? (maxRetries ?? 3) : 3,
      },
    });

    if (studentIds.length > 0) {
      await tx.arithmeticHomeworkEnrollment.createMany({
        data: studentIds.map((studentId) => ({
          planId: created.id,
          studentId,
        })),
        skipDuplicates: true,
      });
    }

    return created;
  });

  return plan;
}

/** Find the next non-rest day from startIdx */
function findNextSession(allProblems: GeneratedProblem[][], startIdx: number, totalDays: number): number | null {
  for (let d = startIdx; d < totalDays; d++) {
    if (allProblems[d] && allProblems[d].length > 0) return d;
  }
  return null;
}

// ─── Student: Today's Homework ───

export interface TodayHomework {
  planId: string;
  planTitle: string;
  dayIndex: number;
  dayLabel: string;
  dailyCount: number;
  categories: ArithmeticCategory[];
  level: ArithmeticLevel;
  status: HomeworkDayStatus;
  existingAttemptId?: string;
  score?: number;
  correctCount?: number;
  totalCount?: number;
  isAdvance?: boolean;
  needsRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
  retryMode?: RetryMode;
  retryExhausted?: boolean;
  passingScore?: number;
  accuracy?: number;
}

export async function getTodayHomework(studentId: string): Promise<TodayHomework[]> {
  const enrollments = await prisma.arithmeticHomeworkEnrollment.findMany({
    where: { studentId },
    include: {
      plan: {
        select: {
          id: true,
          title: true,
          startDate: true,
          totalDays: true,
          dailyCount: true,
          categories: true,
          level: true,
          isActive: true,
          dailyProblems: true,
          passingScore: true,
          retryOnFail: true,
          retryMode: true,
          maxRetries: true,
        },
      },
    },
  });

  // 활성 플랜의 dayIndex 계산 및 필터링
  const activePlans = enrollments
    .filter((e) => e.plan.isActive)
    .map((e) => {
      const dayIndex = computeDayIndex(e.plan.startDate);
      return { plan: e.plan, dayIndex };
    })
    .filter(({ plan, dayIndex }) => {
      if (dayIndex < 0 || dayIndex >= plan.totalDays) return false;
      const allProblems = plan.dailyProblems as unknown as GeneratedProblem[][];
      const todayProblems = allProblems[dayIndex];
      return todayProblems && todayProblems.length > 0;
    });

  if (activePlans.length === 0) return [];

  // 모든 플랜의 시도를 한번에 조회 (N+1 제거)
  const planIds = activePlans.map((p) => p.plan.id);
  const allFetchedAttempts = await prisma.arithmeticAttempt.findMany({
    where: { studentId, homeworkPlanId: { in: planIds } },
    select: { id: true, completedAt: true, score: true, correctCount: true, problemCount: true, homeworkPlanId: true, homeworkDayIndex: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // planId+dayIndex로 그룹화
  const attemptMap = new Map<string, typeof allFetchedAttempts>();
  for (const att of allFetchedAttempts) {
    const key = `${att.homeworkPlanId}__${att.homeworkDayIndex}`;
    const arr = attemptMap.get(key) ?? [];
    arr.push(att);
    attemptMap.set(key, arr);
  }

  const results: TodayHomework[] = [];

  for (const { plan, dayIndex } of activePlans) {
    const allProblems = plan.dailyProblems as unknown as GeneratedProblem[][];
    const dayAttempts = attemptMap.get(`${plan.id}__${dayIndex}`) ?? [];

    const latestAttempt = dayAttempts[0] ?? null;
    const completedAttempts = dayAttempts.filter((a) => a.completedAt);
    const attemptCount = completedAttempts.length;

    const latestCompleted = completedAttempts[0];
    const latestAccuracy = latestCompleted && latestCompleted.problemCount > 0
      ? Math.round((latestCompleted.correctCount / latestCompleted.problemCount) * 100)
      : undefined;
    const hasPassed = latestAccuracy !== undefined && latestAccuracy >= plan.passingScore;

    const status = getDayStatus(dayIndex, dayIndex, plan.totalDays, latestAttempt);

    const needsRetry = plan.retryOnFail && status === 'COMPLETED' && !hasPassed;
    const retryExhausted = needsRetry && plan.maxRetries > 0 && attemptCount >= plan.maxRetries + 1;

    const hwItem: TodayHomework = {
      planId: plan.id,
      planTitle: plan.title,
      dayIndex,
      dayLabel: `${dayIndex + 1}일차`,
      dailyCount: plan.dailyCount,
      categories: plan.categories as unknown as ArithmeticCategory[],
      level: plan.level as ArithmeticLevel,
      status: needsRetry && !retryExhausted ? 'NOT_STARTED' : status,
      existingAttemptId: latestAttempt?.id,
      score: latestCompleted?.score ?? undefined,
      correctCount: latestCompleted?.correctCount ?? undefined,
      totalCount: latestCompleted?.problemCount ?? undefined,
      needsRetry: needsRetry && !retryExhausted,
      retryCount: attemptCount > 0 ? attemptCount - 1 : 0,
      maxRetries: plan.retryOnFail ? plan.maxRetries : undefined,
      retryMode: plan.retryOnFail ? plan.retryMode as RetryMode : undefined,
      retryExhausted,
      passingScore: plan.passingScore,
      accuracy: latestAccuracy,
    };

    results.push(hwItem);

    const canAdvance = status === 'COMPLETED' && (!plan.retryOnFail || hasPassed || retryExhausted);
    if (canAdvance) {
      const nextDay = findNextSession(allProblems, dayIndex + 1, plan.totalDays);
      if (nextDay !== null) {
        const nextDayAttempts = attemptMap.get(`${plan.id}__${nextDay}`) ?? [];
        const nextAttempt = nextDayAttempts[0] ?? null;
        const nextStatus = nextAttempt?.completedAt ? 'COMPLETED' as const
          : nextAttempt ? 'IN_PROGRESS' as const
          : 'NOT_STARTED' as const;

        results.push({
          planId: plan.id,
          planTitle: plan.title,
          dayIndex: nextDay,
          dayLabel: `${nextDay + 1}일차 (미리풀기)`,
          dailyCount: plan.dailyCount,
          categories: plan.categories as unknown as ArithmeticCategory[],
          level: plan.level as ArithmeticLevel,
          status: nextStatus,
          existingAttemptId: nextAttempt?.id,
          score: nextAttempt?.score ?? undefined,
          correctCount: nextAttempt?.correctCount ?? undefined,
          totalCount: nextAttempt?.problemCount ?? undefined,
          isAdvance: true,
        });
      }
    }
  }

  return results;
}

// ─── Student: Start Homework Attempt ───

export async function startHomeworkAttempt(
  studentId: string,
  planId: string,
  dayIndex: number,
  isRetry?: boolean
): Promise<{ attemptId: string; problems: GeneratedProblem[]; isRetry?: boolean }> {
  const enrollment = await prisma.arithmeticHomeworkEnrollment.findUnique({
    where: { planId_studentId: { planId, studentId } },
    include: { plan: true },
  });

  if (!enrollment) throw new Error('배정된 숙제가 없습니다');
  if (!enrollment.plan.isActive) throw new Error('비활성화된 숙제입니다');

  const plan = enrollment.plan;
  const currentDay = computeDayIndex(plan.startDate);
  if (dayIndex < 0 || dayIndex >= plan.totalDays) throw new Error('유효하지 않은 날짜입니다');

  if (dayIndex > currentDay) {
    const allProblems = plan.dailyProblems as unknown as GeneratedProblem[][];
    const nextSession = findNextSession(allProblems, currentDay + 1, plan.totalDays);
    if (dayIndex !== nextSession) throw new Error('아직 풀 수 없는 날짜입니다');
    const todayCompleted = await prisma.arithmeticAttempt.findFirst({
      where: { studentId, homeworkPlanId: planId, homeworkDayIndex: currentDay, completedAt: { not: null } },
    });
    if (!todayCompleted) throw new Error('오늘 숙제를 먼저 완료해야 합니다');
  }

  const dailyProblems = plan.dailyProblems as unknown as GeneratedProblem[][];
  const originalProblems = dailyProblems[dayIndex];
  if (!originalProblems) throw new Error('문제 데이터를 찾을 수 없습니다');

  const categories = plan.categories as unknown as ArithmeticCategory[];
  const category = categories[0] ?? 'add_1digit';

  const completedAttempts = await prisma.arithmeticAttempt.findMany({
    where: { studentId, homeworkPlanId: planId, homeworkDayIndex: dayIndex, completedAt: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, correctCount: true, problemCount: true },
  });

  const attemptCount = completedAttempts.length;
  let problems = originalProblems;
  let retryActive = false;

  if (attemptCount > 0 && plan.retryOnFail) {
    const latest = completedAttempts[0];
    const accuracy = latest.problemCount > 0 ? Math.round((latest.correctCount / latest.problemCount) * 100) : 0;
    if (accuracy >= plan.passingScore) {
      if (!isRetry) throw new Error('이미 통과한 숙제입니다');
    }

    if (plan.maxRetries > 0 && attemptCount > plan.maxRetries) {
      throw new Error('재시도 횟수를 초과했습니다');
    }

    const retryMode = plan.retryMode as RetryMode;
    retryActive = true;

    if (retryMode === 'wrong_same' || retryMode === 'wrong_new') {
      const latestAnswers = await prisma.arithmeticAnswer.findMany({
        where: { attemptId: latest.id, isCorrect: false },
        select: { problemIndex: true },
      });
      const wrongIndices = new Set(latestAnswers.map((a) => a.problemIndex));

      if (retryMode === 'wrong_same') {
        problems = originalProblems.filter((_, i) => wrongIndices.has(i));
      } else {
        const { generateProblems: genProbs } = await import('./arithmetic-generator');
        const wrongProblems = originalProblems.filter((_, i) => wrongIndices.has(i));
        problems = wrongProblems.map((prob) => {
          const newProbs = genProbs(prob.category as ArithmeticCategory, plan.level as ArithmeticLevel, 1);
          return newProbs[0] ?? prob;
        });
      }
    } else if (retryMode === 'all_same') {
      problems = originalProblems;
    } else {
      const { generateProblems: genProbs } = await import('./arithmetic-generator');
      problems = originalProblems.map((prob) => {
        const newProbs = genProbs(prob.category as ArithmeticCategory, plan.level as ArithmeticLevel, 1);
        return newProbs[0] ?? prob;
      });
    }

    if (problems.length === 0) problems = originalProblems;
  } else if (attemptCount > 0 && !isRetry) {
    throw new Error('이미 완료한 숙제입니다');
  }

  const attempt = await prisma.arithmeticAttempt.create({
    data: {
      studentId,
      category,
      level: plan.level,
      problemCount: problems.length,
      homeworkPlanId: planId,
      homeworkDayIndex: dayIndex,
    },
  });

  return { attemptId: attempt.id, problems, isRetry: retryActive };
}

// ─── Teacher: Grid Data (월 숙제부) ───

export interface HomeworkGridStudent {
  id: string;
  name: string;
  grade: number | null;
  completions: HomeworkGridCell[];
  completionRate: number;
  avgAccuracy: number;
}

export interface HomeworkGridCell {
  dayIndex: number;
  status: HomeworkDayStatus;
  score?: number;
  correctCount?: number;
  totalCount?: number;
  accuracy?: number;
  attemptId?: string;
  isEarly?: boolean;
  retryCount?: number;
  hasPassed?: boolean;
  retryExhausted?: boolean;
}

export interface HomeworkGridData {
  plan: {
    id: string;
    title: string;
    startDate: Date;
    totalDays: number;
    dailyCount: number;
    categories: ArithmeticCategory[];
    level: string;
    progressionMode: ProgressionMode;
    passingScore: number;
    retryOnFail: boolean;
    retryMode: RetryMode;
    maxRetries: number;
    totalSessions: number;
    currentSession: number;
  };
  dates: string[];
  students: HomeworkGridStudent[];
  dailyCompletionRates: number[];
}

export async function getHomeworkGrid(
  planSeq: number,
  filters?: { grade?: number }
): Promise<HomeworkGridData> {
  const plan = await prisma.arithmeticHomeworkPlan.findUniqueOrThrow({
    where: { seq: planSeq },
    select: {
      id: true,
      title: true,
      startDate: true,
      totalDays: true,
      dailyCount: true,
      categories: true,
      level: true,
      progressionMode: true,
      weekdayMap: true,
      dailyProblems: true,
      passingScore: true,
      retryOnFail: true,
      retryMode: true,
      maxRetries: true,
    },
  });

  const enrollmentWhere: Record<string, unknown> = { planId: plan.id };
  if (filters?.grade) {
    enrollmentWhere.student = { grade: filters.grade };
  }

  const enrollments = await prisma.arithmeticHomeworkEnrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: { select: { id: true, name: true, grade: true } },
    },
    orderBy: { student: { name: 'asc' } },
  });

  const studentIds = enrollments.map((e) => e.student.id);
  const attempts = await prisma.arithmeticAttempt.findMany({
    where: { homeworkPlanId: plan.id, studentId: { in: studentIds } },
    select: {
      id: true,
      studentId: true,
      homeworkDayIndex: true,
      completedAt: true,
      createdAt: true,
      score: true,
      correctCount: true,
      problemCount: true,
    },
  });

  type AttemptEntry = { latest: (typeof attempts)[0]; completedCount: number };
  const attemptMap = new Map<string, Map<number, AttemptEntry>>();
  for (const att of attempts) {
    if (att.homeworkDayIndex == null) continue;
    if (!attemptMap.has(att.studentId)) attemptMap.set(att.studentId, new Map());
    const existing = attemptMap.get(att.studentId)!.get(att.homeworkDayIndex);
    if (!existing) {
      attemptMap.get(att.studentId)!.set(att.homeworkDayIndex, {
        latest: att,
        completedCount: att.completedAt ? 1 : 0,
      });
    } else {
      if (att.completedAt) existing.completedCount++;
      if (att.completedAt && (!existing.latest.completedAt || att.createdAt > existing.latest.createdAt)) {
        existing.latest = att;
      } else if (!existing.latest.completedAt && att.createdAt > existing.latest.createdAt) {
        existing.latest = att;
      }
    }
  }

  const currentDayIndex = computeDayIndex(plan.startDate);

  const dates: string[] = [];
  for (let d = 0; d < plan.totalDays; d++) {
    const date = new Date(plan.startDate);
    date.setDate(date.getDate() + d);
    dates.push(date.toISOString().split('T')[0]);
  }

  const allProblems = plan.dailyProblems as unknown as GeneratedProblem[][];
  const restDays = new Set<number>();
  for (let d = 0; d < plan.totalDays; d++) {
    if (!allProblems[d] || allProblems[d].length === 0) restDays.add(d);
  }

  const dailyCompletedCounts = new Array(plan.totalDays).fill(0);

  const students: HomeworkGridStudent[] = enrollments.map((enrollment) => {
    const studentAttempts = attemptMap.get(enrollment.student.id);
    let completedDays = 0;
    let totalAccuracy = 0;
    let accuracyCount = 0;

    const completions: HomeworkGridCell[] = [];
    for (let d = 0; d < plan.totalDays; d++) {
      const isRestDay = restDays.has(d);
      const entry = studentAttempts?.get(d) ?? null;
      const att = entry?.latest ?? null;
      const status = getDayStatus(d, currentDayIndex, plan.totalDays, att, isRestDay);
      const accuracy = att?.completedAt && att.problemCount > 0
        ? Math.round((att.correctCount / att.problemCount) * 100)
        : undefined;

      const retryCount = entry ? Math.max(0, entry.completedCount - 1) : 0;
      const hasPassed = accuracy !== undefined && accuracy >= plan.passingScore;
      const retryExhausted = plan.retryOnFail && !hasPassed && status === 'COMPLETED'
        && plan.maxRetries > 0 && entry !== null && entry.completedCount > plan.maxRetries;

      if (status === 'COMPLETED') {
        completedDays++;
        dailyCompletedCounts[d]++;
        if (accuracy !== undefined) {
          totalAccuracy += accuracy;
          accuracyCount++;
        }
      }

      let isEarly = false;
      if (att?.completedAt && att.createdAt) {
        const dayDate = getDayDate(plan.startDate, d);
        const attemptDate = toKSTDate(att.createdAt);
        isEarly = attemptDate.getTime() < toKSTDate(dayDate).getTime();
      }

      completions.push({
        dayIndex: d,
        status,
        score: att?.score ?? undefined,
        correctCount: att?.correctCount ?? undefined,
        totalCount: att?.problemCount ?? undefined,
        accuracy,
        attemptId: att?.id ?? undefined,
        isEarly: isEarly || undefined,
        retryCount: retryCount > 0 ? retryCount : undefined,
        hasPassed: status === 'COMPLETED' ? hasPassed : undefined,
        retryExhausted: retryExhausted || undefined,
      });
    }

    let activePastDays = 0;
    for (let d = 0; d < Math.min(currentDayIndex + 1, plan.totalDays); d++) {
      if (!restDays.has(d)) activePastDays++;
    }
    const completionRate = activePastDays > 0 ? Math.round((completedDays / activePastDays) * 100) : 0;
    const avgAccuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : 0;

    return {
      id: enrollment.student.id,
      name: enrollment.student.name,
      grade: enrollment.student.grade,
      completions,
      completionRate,
      avgAccuracy,
    };
  });

  const pastDays = Math.min(currentDayIndex + 1, plan.totalDays);
  const totalStudents = students.length;
  const dailyCompletionRates = dailyCompletedCounts.map((count, d) =>
    restDays.has(d) ? -2 :
    d < pastDays && totalStudents > 0 ? Math.round((count / totalStudents) * 100) : -1
  );

  const totalSessions = plan.totalDays - restDays.size;
  let pastSessions = 0;
  for (let d = 0; d < Math.min(currentDayIndex + 1, plan.totalDays); d++) {
    if (!restDays.has(d)) pastSessions++;
  }

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      startDate: plan.startDate,
      totalDays: plan.totalDays,
      dailyCount: plan.dailyCount,
      categories: plan.categories as unknown as ArithmeticCategory[],
      level: plan.level,
      progressionMode: plan.progressionMode as ProgressionMode,
      passingScore: plan.passingScore,
      retryOnFail: plan.retryOnFail,
      retryMode: plan.retryMode as RetryMode,
      maxRetries: plan.maxRetries,
      totalSessions,
      currentSession: Math.min(pastSessions, totalSessions),
    },
    dates,
    students,
    dailyCompletionRates,
  };
}
