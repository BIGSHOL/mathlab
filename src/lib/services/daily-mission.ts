import { prisma } from '@/lib/db';

interface MissionDef {
  type: string;
  label: string;
  target: number;
}

// ── 미션 풀 (type 기준으로 중복 없이 선택됨) ──

const MISSION_POOL: MissionDef[] = [
  // ── 연산 ──
  { type: 'arithmetic_5', label: '연산 문제 5개 맞히기', target: 5 },
  { type: 'arithmetic_10', label: '연산 문제 10개 맞히기', target: 10 },
  { type: 'arithmetic_20', label: '연산 문제 20개 풀기', target: 20 },

  // ── 개념 학습 ──
  { type: 'concept_read', label: '개념 1개 읽기', target: 1 },
  { type: 'concept_read_2', label: '개념 2개 읽기', target: 2 },
  { type: 'concept_blank', label: '빈칸 1단계 완료', target: 1 },
  { type: 'concept_blank_hard', label: '빈칸 어려움 단계 완료', target: 1 },
  { type: 'concept_any_stage', label: '개념 학습 2단계 완료', target: 2 },
  { type: 'concept_any_stage_3', label: '개념 학습 3단계 완료', target: 3 },

  // ── XP ──
  { type: 'xp_earn_30', label: 'XP 30 이상 모으기', target: 30 },
  { type: 'xp_earn_50', label: 'XP 50 이상 모으기', target: 50 },
  { type: 'xp_earn_100', label: 'XP 100 이상 모으기', target: 100 },

  // ── 시험/숙제 ──
  { type: 'test_complete', label: '시험 1개 완료하기', target: 1 },
  { type: 'homework_complete', label: '오늘의 숙제 풀기', target: 1 },

  // ── 타임어택 ──
  { type: 'timeattack', label: '타임어택 1회 도전', target: 1 },
  { type: 'timeattack_2', label: '타임어택 2회 도전', target: 2 },

  // ── 복습 ──
  { type: 'review_complete', label: '복습 문제 1개 완료', target: 1 },

  // ── 종합 활동 ──
  { type: 'total_problems', label: '문제 총 15개 풀기', target: 15 },
  { type: 'multi_activity', label: '2가지 이상 활동 참여', target: 2 },
];

// type 접두사로 진행도 체크 분기 매핑 (같은 계열은 같은 쿼리)
const TYPE_PREFIX_MAP: Record<string, string> = {
  arithmetic_5: 'arithmetic',
  arithmetic_10: 'arithmetic',
  arithmetic_20: 'arithmetic',
  concept_read_2: 'concept_read',
  concept_any_stage_3: 'concept_any_stage',
  xp_earn_30: 'xp_earn',
  xp_earn_50: 'xp_earn',
  xp_earn_100: 'xp_earn',
  timeattack_2: 'timeattack',
};

/** 오늘 날짜 (UTC 기준 KST 날짜) */
function todayKST(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600000);
  return new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
}

/** 오늘 미션 가져오기 (없으면 자동 생성) */
export async function getOrCreateTodayMission(userId: string) {
  const today = todayKST();

  let mission = await prisma.dailyMission.findUnique({
    where: { studentId_date: { studentId: userId, date: today } },
  });

  if (!mission) {
    // login 고정 + 풀에서 같은 계열 중복 없이 2개 랜덤 선택
    const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
    const picked: MissionDef[] = [];
    const usedCategories = new Set<string>();
    for (const m of shuffled) {
      if (picked.length >= 2) break;
      const category = TYPE_PREFIX_MAP[m.type] ?? m.type;
      if (usedCategories.has(category)) continue;
      usedCategories.add(category);
      picked.push(m);
    }

    const selected: MissionDef[] = [
      { type: 'login', label: '오늘 접속하기', target: 1 },
      ...picked,
    ];

    const missions = selected.map((m) => ({
      type: m.type,
      label: m.label,
      target: m.target,
      current: 0,
      completed: false,
    }));

    mission = await prisma.dailyMission.create({
      data: { studentId: userId, date: today, missions },
    });
  }

  return mission;
}

/** 미션 진행도 실시간 계산 */
export async function checkMissionProgress(userId: string) {
  const today = todayKST();
  const todayStart = today;
  const todayEnd = new Date(today.getTime() + 86400000);

  const mission = await prisma.dailyMission.findUnique({
    where: { studentId_date: { studentId: userId, date: today } },
  });
  if (!mission || mission.allComplete) return mission;

  const missions = mission.missions as Array<{
    type: string; label: string; target: number; current: number; completed: boolean;
  }>;

  for (const m of missions) {
    if (m.completed) continue;

    // type 접두사 매핑 (arithmetic_5 → arithmetic 등)
    const checkType = TYPE_PREFIX_MAP[m.type] ?? m.type;

    switch (checkType) {
      case 'login':
        m.current = 1;
        m.completed = true;
        break;

      case 'arithmetic': {
        const count = await prisma.arithmeticAnswer.count({
          where: {
            attempt: { studentId: userId, createdAt: { gte: todayStart, lt: todayEnd } },
            isCorrect: true,
          },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }

      case 'concept_read': {
        const count = await prisma.learningProgress.count({
          where: { userId, stage: 'READING', completed: true, completedAt: { gte: todayStart, lt: todayEnd } },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }

      case 'concept_blank': {
        const count = await prisma.learningProgress.count({
          where: { userId, stage: 'BLANK_EASY', completed: true, completedAt: { gte: todayStart, lt: todayEnd } },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }

      case 'concept_blank_hard': {
        const count = await prisma.learningProgress.count({
          where: { userId, stage: 'BLANK_HARD', completed: true, completedAt: { gte: todayStart, lt: todayEnd } },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }

      case 'concept_any_stage': {
        const count = await prisma.learningProgress.count({
          where: { userId, completed: true, completedAt: { gte: todayStart, lt: todayEnd } },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }

      case 'xp_earn': {
        const result = await prisma.pointTransaction.aggregate({
          where: { userId, type: 'EARN', createdAt: { gte: todayStart, lt: todayEnd } },
          _sum: { amount: true },
        });
        const total = result._sum.amount ?? 0;
        m.current = total;
        m.completed = total >= m.target;
        break;
      }

      case 'test_complete': {
        const count = await prisma.testAttempt.count({
          where: { studentId: userId, completedAt: { gte: todayStart, lt: todayEnd } },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }

      case 'homework_complete': {
        const count = await prisma.arithmeticAttempt.count({
          where: {
            studentId: userId,
            homeworkPlanId: { not: null },
            completedAt: { gte: todayStart, lt: todayEnd },
          },
        });
        m.current = Math.min(count, m.target);
        m.completed = count >= m.target;
        break;
      }

      case 'timeattack': {
        const count = await prisma.timeAttackRecord.count({
          where: { studentId: userId, createdAt: { gte: todayStart, lt: todayEnd } },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }

      case 'review_complete': {
        const count = await prisma.reviewSchedule.count({
          where: { studentId: userId, completedAt: { gte: todayStart, lt: todayEnd } },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }

      case 'total_problems': {
        // 연산 정답 + 시험 문제 수
        const [arithCount, testCount] = await Promise.all([
          prisma.arithmeticAnswer.count({
            where: { attempt: { studentId: userId, createdAt: { gte: todayStart, lt: todayEnd } } },
          }),
          prisma.answerLog.count({
            where: { attempt: { studentId: userId, startedAt: { gte: todayStart, lt: todayEnd } } },
          }),
        ]);
        const total = arithCount + testCount;
        m.current = total;
        m.completed = total >= m.target;
        break;
      }

      case 'multi_activity': {
        // 2가지 이상 다른 활동 참여 여부
        const [hasArith, hasConcept, hasTest, hasTimeAttack] = await Promise.all([
          prisma.arithmeticAttempt.count({ where: { studentId: userId, createdAt: { gte: todayStart, lt: todayEnd } } }),
          prisma.learningProgress.count({ where: { userId, completedAt: { gte: todayStart, lt: todayEnd } } }),
          prisma.testAttempt.count({ where: { studentId: userId, completedAt: { gte: todayStart, lt: todayEnd } } }),
          prisma.timeAttackRecord.count({ where: { studentId: userId, createdAt: { gte: todayStart, lt: todayEnd } } }),
        ]);
        const activityCount = [hasArith, hasConcept, hasTest, hasTimeAttack].filter((c) => c > 0).length;
        m.current = activityCount;
        m.completed = activityCount >= m.target;
        break;
      }
    }
  }

  const allComplete = missions.every((m) => m.completed);

  const updated = await prisma.dailyMission.update({
    where: { id: mission.id },
    data: { missions, allComplete },
  });

  return updated;
}
