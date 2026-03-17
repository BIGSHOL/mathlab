import { Star, Flame, BookOpen, Trophy } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { xpToNextLevel } from '@/lib/utils/xp';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ _as?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');
  const user = await getViewAsUser(await searchParams) ?? realUser;

  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  const totalXp = profile?.totalXp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.currentStreak ?? 0;
  const longestStreak = profile?.longestStreak ?? 0;
  const nextLevel = xpToNextLevel(totalXp);

  const completedConcepts = await prisma.learningProgress.groupBy({
    by: ['conceptId'],
    where: { userId: user.id, stage: 'BLANK_FULL', completed: true },
  });

  const blankPageCompleted = completedConcepts.length;

  const totalCompleted = await prisma.learningProgress.count({
    where: { userId: user.id, completed: true },
  });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { grade: true } });

  return (
    <div className="px-4 md:px-10 py-8 max-w-[800px] mx-auto w-full">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-2xl font-bold">
          {user.name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{user.name}</h1>
          {dbUser?.grade && <p className="text-text-secondary">초등 {dbUser.grade}학년</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-xp-gold to-amber-500 text-white text-sm font-bold">
              Level {level}
            </span>
          </div>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-text-primary">Level {level} → Level {level + 1}</span>
          <span className="text-sm text-text-secondary">
            {nextLevel.current} / {nextLevel.required} XP
          </span>
        </div>
        <ProgressBar
          value={nextLevel.current}
          max={nextLevel.required}
          color="bg-gradient-to-r from-xp-gold to-amber-500"
        />
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          icon={<Star className="w-5 h-5 text-xp-gold" />}
          iconBg="bg-yellow-50"
          label="총 XP"
          value={totalXp.toLocaleString()}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-secondary" />}
          iconBg="bg-orange-50"
          label="연속 학습"
          value={`${streak}일`}
          subtext={`최장 ${longestStreak}일`}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-primary" />}
          iconBg="bg-blue-50"
          label="완료 단계"
          value={String(totalCompleted)}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-stage-blank-page" />}
          iconBg="bg-purple-50"
          label="백지쓰기 완료"
          value={String(blankPageCompleted)}
        />
      </div>
    </div>
  );
}
