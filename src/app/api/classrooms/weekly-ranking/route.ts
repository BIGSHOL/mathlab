import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse } from '@/lib/api';

/** GET /api/classrooms/weekly-ranking — 이번 주 반별 XP 합산 랭킹 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  // 이번 주 월요일 00:00 (KST)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  const day = kst.getUTCDay(); // 0=Sun
  const diffToMon = day === 0 ? 6 : day - 1;
  const monday = new Date(kst);
  monday.setUTCDate(monday.getUTCDate() - diffToMon);
  monday.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(monday.getTime() - kstOffset);

  const classrooms = await prisma.classroom.findMany({
    include: { students: { select: { id: true, name: true } } },
  });

  const ranking = await Promise.all(
    classrooms.map(async (c) => {
      const studentIds = c.students.map((s) => s.id);
      if (studentIds.length === 0) return { id: c.id, name: c.name, totalXp: 0, studentCount: 0, avgXp: 0 };

      const result = await prisma.pointTransaction.aggregate({
        where: {
          userId: { in: studentIds },
          type: 'EARN',
          createdAt: { gte: weekStart },
        },
        _sum: { amount: true },
      });

      const totalXp = result._sum.amount ?? 0;
      return {
        id: c.id,
        name: c.name,
        totalXp,
        studentCount: studentIds.length,
        avgXp: Math.round(totalXp / studentIds.length),
      };
    })
  );

  ranking.sort((a, b) => b.totalXp - a.totalXp);

  return NextResponse.json({ data: ranking });
}
