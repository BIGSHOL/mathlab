/**
 * 내신대비 캠페인 일정 생성기 (P2)
 *
 * 캠페인 큐레이션 결과 + D-day → 5 Phase 학습 일정 자동 생성.
 * 학생이 캠페인에 등록되는 시점에 1회 실행되어 enrollment.schedule에 저장된다.
 *
 * Phase 비율 (전체 D-day 일수 기준):
 *   1. 개념 복습       — 33% (앞)
 *   2. 기출 익히기     — 33%
 *   3. 약점 보강       — 17%
 *   4. 실전 모의       — 13%
 *   5. 최종 점검       — 4% (최소 1일)
 *
 * D-day가 짧으면 Phase 4·5만 유지하고 1·2를 압축한다.
 */

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ── 타입 ──

export type ActivityType = 'concept' | 'questions' | 'mock_test' | 'review';

export interface ScheduleActivity {
  type: ActivityType;
  /** 단일 참조 (개념 1개, mock test 1개) */
  refId?: string;
  /** 다중 참조 (그날 풀어야 할 문제 5~10개 등) */
  refIds?: string[];
  /** 활동 제목 (학생 UI 노출용) */
  title: string;
  /** 예상 소요 시간 (분) */
  estimatedMinutes: number;
  /** 완료 여부 */
  completed: boolean;
  /** 완료 시각 (ISO) */
  completedAt?: string;
  /** 건너뛰기 여부 — 완료로 집계되지는 않지만 UI상 다음 활동이 열림 */
  skipped?: boolean;
  /** 건너뛴 시각 (ISO) */
  skippedAt?: string;
  /** 최근 응시 정답 수 (채점 결과) */
  correctCount?: number;
  /** 최근 응시 총 문제 수 */
  totalCount?: number;
}

export interface ScheduleDay {
  /** 0부터 시작하는 day index (시작일 = 0) */
  dayIndex: number;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** 1~5 단계 */
  phase: 1 | 2 | 3 | 4 | 5;
  /** 단계 라벨 */
  phaseLabel: string;
  /** 그날의 활동 목록 */
  activities: ScheduleActivity[];
}

// ── 상수 ──

const PHASE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '개념 복습',
  2: '기출 익히기',
  3: '약점 보강',
  4: '실전 모의',
  5: '최종 점검',
};

const PHASE_RATIOS: Array<{ phase: 1 | 2 | 3 | 4 | 5; ratio: number; minDays: number }> = [
  { phase: 1, ratio: 0.33, minDays: 1 },
  { phase: 2, ratio: 0.33, minDays: 1 },
  { phase: 3, ratio: 0.17, minDays: 1 },
  { phase: 4, ratio: 0.13, minDays: 1 },
  { phase: 5, ratio: 0.04, minDays: 1 },
];

/** 하루 적정 문제 수 (Phase 별) */
const QUESTIONS_PER_DAY: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,   // 개념만
  2: 8,
  3: 6,
  4: 20,  // 모의고사
  5: 10,  // 오답 정리
};

const CONCEPTS_PER_DAY = 2;

// ── Phase 분배 ──

interface PhasePlan {
  phase: 1 | 2 | 3 | 4 | 5;
  startDayIndex: number;
  endDayIndex: number;
}

/**
 * 전체 일수를 5 Phase로 분배.
 * 짧은 D-day는 앞 Phase부터 1일씩 줄이며 압축.
 */
export function distributePhases(totalDays: number): PhasePlan[] {
  if (totalDays <= 0) return [];

  // 너무 짧으면 (5일 이하): Phase 4·5 우선 유지, 나머지는 1일씩
  if (totalDays <= 5) {
    const plans: PhasePlan[] = [];
    let cursor = 0;
    const order: Array<1 | 2 | 3 | 4 | 5> = totalDays === 1 ? [5]
      : totalDays === 2 ? [4, 5]
      : totalDays === 3 ? [2, 4, 5]
      : totalDays === 4 ? [2, 3, 4, 5]
      : [1, 2, 3, 4, 5];
    for (const phase of order) {
      plans.push({ phase, startDayIndex: cursor, endDayIndex: cursor });
      cursor += 1;
    }
    return plans;
  }

  // 비율 분배
  const raw = PHASE_RATIOS.map((p) => ({
    phase: p.phase,
    days: Math.max(p.minDays, Math.round(totalDays * p.ratio)),
  }));

  // 합이 totalDays와 다르면 Phase 1·2부터 조정
  let sum = raw.reduce((s, r) => s + r.days, 0);
  let i = 0;
  while (sum > totalDays && i < raw.length) {
    if (raw[i].days > 1) {
      raw[i].days -= 1;
      sum -= 1;
    }
    i += 1;
    if (i >= raw.length) i = 0;
    if (sum === totalDays) break;
  }
  while (sum < totalDays) {
    raw[1].days += 1; // Phase 2(기출)에 추가
    sum += 1;
  }

  const plans: PhasePlan[] = [];
  let cursor = 0;
  for (const r of raw) {
    plans.push({
      phase: r.phase,
      startDayIndex: cursor,
      endDayIndex: cursor + r.days - 1,
    });
    cursor += r.days;
  }
  return plans;
}

// ── 활동 분배 ──

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

const PHASE1_WARMUP_QUESTIONS_PER_DAY = 3;

function buildPhase1Activities(
  conceptIds: string[],
  totalPhaseDays: number,
  conceptTitles?: Record<string, string>,
  warmupPool: string[] = [],
): ScheduleActivity[][] {
  // 개념 복습: conceptIds를 totalPhaseDays에 균등 분배
  if (conceptIds.length === 0 || totalPhaseDays === 0) {
    return Array.from({ length: totalPhaseDays }, () => []);
  }
  const perDay = Math.max(CONCEPTS_PER_DAY, Math.ceil(conceptIds.length / totalPhaseDays));
  const chunks = chunkArray(conceptIds, perDay);
  const result: ScheduleActivity[][] = [];
  for (let d = 0; d < totalPhaseDays; d++) {
    const chunk = chunks[d] ?? [];
    const acts: ScheduleActivity[] = chunk.map((id) => ({
      type: 'concept' as const,
      refId: id,
      title: conceptTitles?.[id] ?? '개념 학습',
      estimatedMinutes: 10,
      completed: false,
    }));
    // 개념 학습 뒤에 워밍업 문제 3개를 추가 — 지루함 방지 + 이해 확인
    if (warmupPool.length > 0) {
      const start = (d * PHASE1_WARMUP_QUESTIONS_PER_DAY) % Math.max(1, warmupPool.length);
      const picked: string[] = [];
      for (let i = 0; i < PHASE1_WARMUP_QUESTIONS_PER_DAY; i++) {
        picked.push(warmupPool[(start + i) % warmupPool.length]);
      }
      const unique = Array.from(new Set(picked));
      if (unique.length > 0) {
        acts.push({
          type: 'questions',
          refIds: unique,
          title: `워밍업 ${unique.length}문제 — 오늘 개념 확인`,
          estimatedMinutes: unique.length * 2,
          completed: false,
        });
      }
    }
    result.push(acts);
  }
  return result;
}

function buildQuestionPhaseActivities(
  questionIds: string[],
  totalPhaseDays: number,
  phase: 2 | 3,
): ScheduleActivity[][] {
  if (questionIds.length === 0 || totalPhaseDays === 0) {
    return Array.from({ length: totalPhaseDays }, () => []);
  }
  const perDay = QUESTIONS_PER_DAY[phase];
  const chunks = chunkArray(questionIds, perDay);
  const result: ScheduleActivity[][] = [];
  for (let d = 0; d < totalPhaseDays; d++) {
    const chunk = chunks[d % chunks.length] ?? [];
    if (chunk.length === 0) {
      result.push([]);
      continue;
    }
    result.push([
      {
        type: 'questions' as const,
        refIds: chunk,
        title: phase === 2 ? `기출 ${chunk.length}문제` : `약점 보강 ${chunk.length}문제`,
        estimatedMinutes: chunk.length * 3,
        completed: false,
      },
    ]);
  }
  return result;
}

function buildPhase4Activities(questionIds: string[], totalPhaseDays: number): ScheduleActivity[][] {
  // 실전 모의: 매일 모의고사 1세트 (20문제)
  if (questionIds.length === 0 || totalPhaseDays === 0) {
    return Array.from({ length: totalPhaseDays }, () => []);
  }
  const perDay = QUESTIONS_PER_DAY[4];
  const result: ScheduleActivity[][] = [];
  for (let d = 0; d < totalPhaseDays; d++) {
    // 매일 다른 문제 세트 (rotation)
    const start = (d * perDay) % Math.max(1, questionIds.length);
    const set = questionIds.slice(start, start + perDay);
    if (set.length < perDay && questionIds.length >= perDay) {
      // wrap around
      set.push(...questionIds.slice(0, perDay - set.length));
    }
    result.push([
      {
        type: 'mock_test' as const,
        refIds: set,
        title: `실전 모의고사 ${d + 1}회 (${set.length}문제)`,
        estimatedMinutes: 50,
        completed: false,
      },
    ]);
  }
  return result;
}

function buildPhase5Activities(totalPhaseDays: number): ScheduleActivity[][] {
  // 최종 점검: 오답 복습 카드만 노출
  return Array.from({ length: totalPhaseDays }, () => [
    {
      type: 'review' as const,
      title: '누적 오답 복습 + 핵심 요약',
      estimatedMinutes: 30,
      completed: false,
    },
  ]);
}

// ── 메인 일정 생성 ──

export interface BuildScheduleParams {
  /** 시험일 (D-day) */
  examDate: Date;
  /** 등록일 (보통 today) */
  enrollmentDate: Date;
  /** 큐레이션된 개념 ID 목록 */
  curatedConceptIds: string[];
  /** 큐레이션된 문제 ID 목록 (기출 + 매칭 문제 풀) */
  curatedQuestionIds: string[];
  /** 개념 ID → 제목 매핑 (학생 UI 표시용) */
  conceptTitles?: Record<string, string>;
}

/**
 * Day index 계산: 등록일 = day 0, 시험일 전날까지 일정 생성.
 */
function dateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function diffDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function buildSchedule(params: BuildScheduleParams): ScheduleDay[] {
  const start = new Date(params.enrollmentDate);
  start.setHours(0, 0, 0, 0);
  const exam = new Date(params.examDate);
  exam.setHours(0, 0, 0, 0);

  const totalDays = diffDays(start, exam); // 시험일까지 (시험 당일 제외)
  if (totalDays <= 0) return [];

  const phasePlans = distributePhases(totalDays);
  if (phasePlans.length === 0) return [];

  // Phase별 활동 빌드
  const phaseActivitiesMap: Map<1 | 2 | 3 | 4 | 5, ScheduleActivity[][]> = new Map();

  // 기출 vs 변형 분리: 큐레이션 결과는 기출 + 매칭문제 통합 풀
  // Phase 2: 앞쪽 60%, Phase 3: 뒤쪽 40%
  const splitIdx = Math.floor(params.curatedQuestionIds.length * 0.6);
  const phase2Pool = params.curatedQuestionIds.slice(0, splitIdx);
  const phase3Pool = params.curatedQuestionIds.slice(splitIdx);

  for (const plan of phasePlans) {
    const phaseDays = plan.endDayIndex - plan.startDayIndex + 1;
    let activities: ScheduleActivity[][];
    switch (plan.phase) {
      case 1:
        // Phase 1에 워밍업 문제 풀: 난이도 낮은 기출부터 사용(앞쪽 30%)
        activities = buildPhase1Activities(
          params.curatedConceptIds,
          phaseDays,
          params.conceptTitles,
          params.curatedQuestionIds.slice(0, Math.ceil(params.curatedQuestionIds.length * 0.3)),
        );
        break;
      case 2:
        activities = buildQuestionPhaseActivities(phase2Pool, phaseDays, 2);
        break;
      case 3:
        activities = buildQuestionPhaseActivities(phase3Pool, phaseDays, 3);
        break;
      case 4:
        activities = buildPhase4Activities(params.curatedQuestionIds, phaseDays);
        break;
      case 5:
        activities = buildPhase5Activities(phaseDays);
        break;
    }
    phaseActivitiesMap.set(plan.phase, activities);
  }

  // 일정 조립
  const schedule: ScheduleDay[] = [];
  for (const plan of phasePlans) {
    const activities = phaseActivitiesMap.get(plan.phase) ?? [];
    for (let dayInPhase = 0; dayInPhase < activities.length; dayInPhase++) {
      const dayIndex = plan.startDayIndex + dayInPhase;
      const date = new Date(start);
      date.setDate(date.getDate() + dayIndex);
      schedule.push({
        dayIndex,
        date: dateToISO(date),
        phase: plan.phase,
        phaseLabel: PHASE_LABELS[plan.phase],
        activities: activities[dayInPhase],
      });
    }
  }

  return schedule;
}

// ── DB 연동: 캠페인 등록 + 일정 자동 생성 ──

/**
 * 학생을 캠페인에 등록하고 일정을 자동 생성한다.
 * 이미 등록된 경우 기존 enrollment를 반환.
 */
export async function enrollStudentInCampaign(params: {
  campaignId: string;
  studentId: string;
}): Promise<{ enrollmentId: string; schedule: ScheduleDay[] }> {
  const campaign = await prisma.examCampaign.findUnique({
    where: { id: params.campaignId },
    select: {
      id: true,
      examDate: true,
      curatedConceptIds: true,
      curatedQuestionIds: true,
    },
  });
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

  const existing = await prisma.examCampaignEnrollment.findUnique({
    where: { campaignId_studentId: { campaignId: params.campaignId, studentId: params.studentId } },
  });
  if (existing) {
    return {
      enrollmentId: existing.id,
      schedule: (existing.schedule as unknown as ScheduleDay[]) ?? [],
    };
  }

  const conceptIds = (campaign.curatedConceptIds as unknown as string[]) ?? [];
  const questionIds = (campaign.curatedQuestionIds as unknown as string[]) ?? [];

  const concepts = conceptIds.length > 0
    ? await prisma.concept.findMany({
        where: { id: { in: conceptIds } },
        select: { id: true, title: true },
      })
    : [];
  const conceptTitles: Record<string, string> = Object.fromEntries(
    concepts.map((c) => [c.id, c.title]),
  );

  const schedule = buildSchedule({
    examDate: campaign.examDate,
    enrollmentDate: new Date(),
    curatedConceptIds: conceptIds,
    curatedQuestionIds: questionIds,
    conceptTitles,
  });

  const enrollment = await prisma.examCampaignEnrollment.create({
    data: {
      campaignId: params.campaignId,
      studentId: params.studentId,
      status: 'ACTIVE',
      schedule: schedule as unknown as Prisma.InputJsonValue,
      progressPct: 0,
      startedAt: new Date(),
    },
  });

  return { enrollmentId: enrollment.id, schedule };
}

/**
 * 클래스룸 단위 일괄 등록 (반의 모든 학생).
 */
export async function enrollClassroomInCampaign(params: {
  campaignId: string;
  classroomId: string;
}): Promise<{ enrolled: number; skipped: number }> {
  const students = await prisma.user.findMany({
    where: { classroomId: params.classroomId, role: 'STUDENT', deletedAt: null },
    select: { id: true },
  });

  let enrolled = 0;
  let skipped = 0;
  for (const s of students) {
    try {
      await enrollStudentInCampaign({ campaignId: params.campaignId, studentId: s.id });
      enrolled += 1;
    } catch {
      skipped += 1;
    }
  }
  return { enrolled, skipped };
}

// ── 진도 업데이트 ──

/**
 * 활동 완료 표시 + 진도율 재계산.
 * dayIndex + 활동 인덱스로 특정 활동을 완료 처리한다.
 */
export async function markActivityCompleted(params: {
  enrollmentId: string;
  dayIndex: number;
  activityIndex: number;
  correctCount?: number;
  totalCount?: number;
}): Promise<{ progressPct: number }> {
  const enrollment = await prisma.examCampaignEnrollment.findUnique({
    where: { id: params.enrollmentId },
    select: { id: true, schedule: true },
  });
  if (!enrollment) throw new Error('ENROLLMENT_NOT_FOUND');

  const schedule = (enrollment.schedule as unknown as ScheduleDay[]) ?? [];
  const day = schedule.find((d) => d.dayIndex === params.dayIndex);
  if (!day) throw new Error('DAY_NOT_FOUND');
  const activity = day.activities[params.activityIndex];
  if (!activity) throw new Error('ACTIVITY_NOT_FOUND');

  if (!activity.completed) {
    activity.completed = true;
    activity.completedAt = new Date().toISOString();
  }
  if (typeof params.correctCount === 'number' && typeof params.totalCount === 'number') {
    activity.correctCount = params.correctCount;
    activity.totalCount = params.totalCount;
  }

  // 진도율 재계산
  const total = schedule.reduce((s, d) => s + d.activities.length, 0);
  const done = schedule.reduce(
    (s, d) => s + d.activities.filter((a) => a.completed).length,
    0,
  );
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  await prisma.examCampaignEnrollment.update({
    where: { id: params.enrollmentId },
    data: {
      schedule: schedule as unknown as Prisma.InputJsonValue,
      progressPct,
      ...(progressPct === 100 && { status: 'COMPLETED', completedAt: new Date() }),
    },
  });

  return { progressPct };
}

/**
 * 활동을 건너뛰기로 표시. 진도율 집계에는 포함되지 않으나 다음 활동 언락을 허용한다.
 */
export async function markActivitySkipped(params: {
  enrollmentId: string;
  dayIndex: number;
  activityIndex: number;
}): Promise<{ progressPct: number }> {
  const enrollment = await prisma.examCampaignEnrollment.findUnique({
    where: { id: params.enrollmentId },
    select: { id: true, schedule: true, progressPct: true },
  });
  if (!enrollment) throw new Error('ENROLLMENT_NOT_FOUND');

  const schedule = (enrollment.schedule as unknown as ScheduleDay[]) ?? [];
  const day = schedule.find((d) => d.dayIndex === params.dayIndex);
  if (!day) throw new Error('DAY_NOT_FOUND');
  const activity = day.activities[params.activityIndex];
  if (!activity) throw new Error('ACTIVITY_NOT_FOUND');

  if (!activity.completed) {
    activity.skipped = true;
    activity.skippedAt = new Date().toISOString();
  }

  await prisma.examCampaignEnrollment.update({
    where: { id: params.enrollmentId },
    data: { schedule: schedule as unknown as Prisma.InputJsonValue },
  });

  return { progressPct: enrollment.progressPct };
}
