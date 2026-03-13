import { prisma } from '@/lib/db';
import { Stage } from '@prisma/client';

// ─── Day Computation (homework.ts와 동일 로직) ───

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

/** 4단계 완료 상태 */
export interface ConceptStageProgress {
  reading: boolean;
  blankEasy: boolean;
  blankHard: boolean;
  blankFull: boolean;
  completedStages: number; // 0~4
}

export type ConceptDayStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FUTURE';

export interface ConceptHomeworkGridStudent {
  id: string;
  name: string;
  grade: number | null;
  /** conceptId → 4단계 진행 상황 */
  conceptProgress: Record<string, ConceptStageProgress>;
  completionRate: number; // 전체 개념 중 완료된 비율 (%)
}

export interface ConceptHomeworkGridDay {
  dayIndex: number;
  date: string;
  concepts: { id: string; title: string; conceptCode: string | null }[];
}

export interface ConceptHomeworkGridData {
  plan: {
    id: string;
    seq: number;
    title: string;
    startDate: Date;
    totalDays: number;
    requiredStage: Stage;
    isActive: boolean;
  };
  days: ConceptHomeworkGridDay[];
  students: ConceptHomeworkGridStudent[];
  /** 날짜별 완료율 (0~100 또는 -1=미래) */
  dailyCompletionRates: number[];
}

export interface TodayConceptHomework {
  planId: string;
  planTitle: string;
  dayIndex: number;
  dayLabel: string;
  concepts: {
    id: string;
    title: string;
    conceptCode: string | null;
    stages: { stage: Stage; completed: boolean }[];
    allCompleted: boolean;
  }[];
}

// ─── Stage 순서 유틸 ───

const STAGE_ORDER: Stage[] = [Stage.READING, Stage.BLANK_EASY, Stage.BLANK_HARD, Stage.BLANK_FULL];

function stageIndex(s: Stage): number {
  return STAGE_ORDER.indexOf(s);
}

function isConceptCompleted(progress: ConceptStageProgress, requiredStage: Stage): boolean {
  const required = stageIndex(requiredStage);
  // 모든 단계를 required까지 완료해야 함
  const stages = [progress.reading, progress.blankEasy, progress.blankHard, progress.blankFull];
  for (let i = 0; i <= required; i++) {
    if (!stages[i]) return false;
  }
  return true;
}

// ─── Plan CRUD ───

interface CreateConceptHomeworkParams {
  title: string;
  createdBy: string;
  startDate: string; // YYYY-MM-DD
  conceptIds: string[];
  conceptsPerDay: number;
  requiredStage?: Stage;
  studentIds: string[];
}

export async function createConceptHomeworkPlan(params: CreateConceptHomeworkParams) {
  const { title, createdBy, startDate, conceptIds, conceptsPerDay, requiredStage, studentIds } = params;

  if (conceptIds.length === 0) throw new Error('개념을 1개 이상 선택해주세요');
  if (conceptsPerDay < 1) throw new Error('하루당 개념 수는 1개 이상이어야 합니다');

  // 개념 존재 확인
  const concepts = await prisma.concept.findMany({
    where: { id: { in: conceptIds } },
    select: { id: true },
  });
  if (concepts.length !== conceptIds.length) {
    throw new Error('일부 개념을 찾을 수 없습니다');
  }

  // 날짜별 개념 배분
  const dailyConcepts: string[][] = [];
  for (let i = 0; i < conceptIds.length; i += conceptsPerDay) {
    dailyConcepts.push(conceptIds.slice(i, i + conceptsPerDay));
  }
  const totalDays = dailyConcepts.length;

  const plan = await prisma.conceptHomeworkPlan.create({
    data: {
      title,
      createdBy,
      startDate: new Date(startDate),
      totalDays,
      dailyConcepts: JSON.parse(JSON.stringify(dailyConcepts)),
      requiredStage: requiredStage ?? Stage.BLANK_FULL,
    },
  });

  // 학생 등록
  if (studentIds.length > 0) {
    await prisma.conceptHomeworkEnrollment.createMany({
      data: studentIds.map((studentId) => ({
        planId: plan.id,
        studentId,
      })),
      skipDuplicates: true,
    });
  }

  return plan;
}

// ─── Teacher: Grid Data ───

export async function getConceptHomeworkGrid(
  planSeq: number,
  filters?: { grade?: number }
): Promise<ConceptHomeworkGridData> {
  const plan = await prisma.conceptHomeworkPlan.findUniqueOrThrow({
    where: { seq: planSeq },
  });

  const dailyConcepts = plan.dailyConcepts as unknown as string[][];
  const allConceptIds = dailyConcepts.flat();

  // 개념 정보 조회
  const concepts = await prisma.concept.findMany({
    where: { id: { in: allConceptIds } },
    select: { id: true, title: true, conceptCode: true },
  });
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  // 등록 학생 조회
  const enrollmentWhere: Record<string, unknown> = { planId: plan.id };
  if (filters?.grade) {
    enrollmentWhere.student = { grade: filters.grade };
  }

  const enrollments = await prisma.conceptHomeworkEnrollment.findMany({
    where: enrollmentWhere,
    include: { student: { select: { id: true, name: true, grade: true } } },
    orderBy: { student: { name: 'asc' } },
  });

  const studentIds = enrollments.map((e) => e.student.id);

  // LearningProgress 일괄 조회 (N+1 방지)
  const allProgress = await prisma.learningProgress.findMany({
    where: {
      userId: { in: studentIds },
      conceptId: { in: allConceptIds },
      completed: true,
    },
    select: { userId: true, conceptId: true, stage: true, completed: true },
  });

  // userId → conceptId → Set<Stage>
  const progressMap = new Map<string, Map<string, Set<Stage>>>();
  for (const p of allProgress) {
    if (!progressMap.has(p.userId)) progressMap.set(p.userId, new Map());
    const userMap = progressMap.get(p.userId)!;
    if (!userMap.has(p.conceptId)) userMap.set(p.conceptId, new Set());
    userMap.get(p.conceptId)!.add(p.stage);
  }

  const currentDayIndex = computeDayIndex(plan.startDate);

  // 날짜 데이터 구성
  const days: ConceptHomeworkGridDay[] = dailyConcepts.map((conceptIds, d) => {
    const date = new Date(plan.startDate);
    date.setDate(date.getDate() + d);
    return {
      dayIndex: d,
      date: date.toISOString().split('T')[0],
      concepts: conceptIds.map((cid) => {
        const c = conceptMap.get(cid);
        return { id: cid, title: c?.title ?? '(삭제됨)', conceptCode: c?.conceptCode ?? null };
      }),
    };
  });

  // 학생별 진도 구성
  const dailyCompletedCounts = new Array(plan.totalDays).fill(0);

  const students: ConceptHomeworkGridStudent[] = enrollments.map((enrollment) => {
    const userProgress = progressMap.get(enrollment.student.id);
    const conceptProgress: Record<string, ConceptStageProgress> = {};
    let completedConcepts = 0;

    for (let d = 0; d < plan.totalDays; d++) {
      const dayConcepts = dailyConcepts[d] ?? [];
      let dayComplete = true;

      for (const cid of dayConcepts) {
        const stages = userProgress?.get(cid) ?? new Set<Stage>();
        const sp: ConceptStageProgress = {
          reading: stages.has(Stage.READING),
          blankEasy: stages.has(Stage.BLANK_EASY),
          blankHard: stages.has(Stage.BLANK_HARD),
          blankFull: stages.has(Stage.BLANK_FULL),
          completedStages: [Stage.READING, Stage.BLANK_EASY, Stage.BLANK_HARD, Stage.BLANK_FULL]
            .filter((s) => stages.has(s)).length,
        };
        conceptProgress[cid] = sp;

        if (isConceptCompleted(sp, plan.requiredStage)) {
          completedConcepts++;
        } else {
          dayComplete = false;
        }
      }

      if (dayComplete && dayConcepts.length > 0 && d <= currentDayIndex) {
        dailyCompletedCounts[d]++;
      }
    }

    const completionRate = allConceptIds.length > 0
      ? Math.round((completedConcepts / allConceptIds.length) * 100)
      : 0;

    return {
      id: enrollment.student.id,
      name: enrollment.student.name,
      grade: enrollment.student.grade,
      conceptProgress,
      completionRate,
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
      requiredStage: plan.requiredStage,
      isActive: plan.isActive,
    },
    days,
    students,
    dailyCompletionRates,
  };
}

// ─── Student: Today's Concept Homework ───

export async function getTodayConceptHomework(studentId: string): Promise<TodayConceptHomework[]> {
  const enrollments = await prisma.conceptHomeworkEnrollment.findMany({
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

  // 오늘 배정된 모든 개념 ID 수집
  const allConceptIds = new Set<string>();
  for (const { plan, dayIndex } of activePlans) {
    const daily = plan.dailyConcepts as unknown as string[][];
    const todayConcepts = daily[dayIndex] ?? [];
    todayConcepts.forEach((id) => allConceptIds.add(id));
  }

  // 개념 정보 + 진행도 일괄 조회
  const [concepts, progress] = await Promise.all([
    prisma.concept.findMany({
      where: { id: { in: [...allConceptIds] } },
      select: { id: true, title: true, conceptCode: true },
    }),
    prisma.learningProgress.findMany({
      where: { userId: studentId, conceptId: { in: [...allConceptIds] }, completed: true },
      select: { conceptId: true, stage: true },
    }),
  ]);

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const progressSet = new Map<string, Set<Stage>>();
  for (const p of progress) {
    if (!progressSet.has(p.conceptId)) progressSet.set(p.conceptId, new Set());
    progressSet.get(p.conceptId)!.add(p.stage);
  }

  return activePlans.map(({ plan, dayIndex }) => {
    const daily = plan.dailyConcepts as unknown as string[][];
    const todayIds = daily[dayIndex] ?? [];

    const conceptItems = todayIds.map((cid) => {
      const c = conceptMap.get(cid);
      const stages = progressSet.get(cid) ?? new Set<Stage>();
      const stageList = STAGE_ORDER.map((s) => ({
        stage: s,
        completed: stages.has(s),
      }));
      const requiredIdx = stageIndex(plan.requiredStage);
      const allCompleted = stageList.slice(0, requiredIdx + 1).every((s) => s.completed);

      return {
        id: cid,
        title: c?.title ?? '(삭제됨)',
        conceptCode: c?.conceptCode ?? null,
        stages: stageList,
        allCompleted,
      };
    });

    return {
      planId: plan.id,
      planTitle: plan.title,
      dayIndex,
      dayLabel: `${dayIndex + 1}일차`,
      concepts: conceptItems,
    };
  });
}

// ─── Plan List ───

export async function listConceptHomeworkPlans(createdBy?: string) {
  const where = createdBy ? { createdBy } : {};
  const plans = await prisma.conceptHomeworkPlan.findMany({
    where,
    include: {
      _count: { select: { enrollments: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return plans.map((p) => {
    const dailyConcepts = p.dailyConcepts as unknown as string[][];
    const totalConcepts = dailyConcepts.flat().length;
    const currentDay = computeDayIndex(p.startDate);
    const progress = Math.min(Math.max(currentDay + 1, 0), p.totalDays);

    return {
      id: p.id,
      seq: p.seq,
      title: p.title,
      startDate: p.startDate,
      totalDays: p.totalDays,
      totalConcepts,
      requiredStage: p.requiredStage,
      isActive: p.isActive,
      studentCount: p._count.enrollments,
      creatorName: p.creator.name,
      progress: `${progress}/${p.totalDays}`,
      createdAt: p.createdAt,
    };
  });
}
