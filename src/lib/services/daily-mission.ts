import { prisma } from '@/lib/db';

interface MissionDef {
  type: string;
  label: string;
  target: number;
}

const MISSION_POOL: MissionDef[] = [
  { type: 'arithmetic', label: '연산 10문제 풀기', target: 10 },
  { type: 'arithmetic', label: '연산 5문제 풀기', target: 5 },
  { type: 'concept_read', label: '개념 1개 읽기', target: 1 },
  { type: 'concept_blank', label: '빈칸 1단계 완료', target: 1 },
  { type: 'login', label: '오늘 접속하기', target: 1 },
];

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
    // 랜덤 미션 3개 선택 (login 항상 포함 + 나머지 2개)
    const loginMission = MISSION_POOL.find((m) => m.type === 'login')!;
    const others = MISSION_POOL.filter((m) => m.type !== 'login');
    const shuffled = others.sort(() => Math.random() - 0.5);
    const selected = [loginMission, shuffled[0], shuffled[1]];

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

    switch (m.type) {
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
          where: {
            userId,
            stage: 'READING',
            completed: true,
            completedAt: { gte: todayStart, lt: todayEnd },
          },
        });
        m.current = count;
        m.completed = count >= m.target;
        break;
      }
      case 'concept_blank': {
        const count = await prisma.learningProgress.count({
          where: {
            userId,
            stage: 'BLANK_EASY',
            completed: true,
            completedAt: { gte: todayStart, lt: todayEnd },
          },
        });
        m.current = count;
        m.completed = count >= m.target;
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
