import { Award, Star, CheckCircle, Flame, Play, BookOpen, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { xpToNextLevel } from '@/lib/utils/xp';

export default async function StudentDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Redirect teacher to teacher dashboard
  if (user.role === 'TEACHER' || user.role === 'ADMIN') {
    redirect('/overview');
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  const totalXp = profile?.totalXp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.currentStreak ?? 0;
  const nextLevel = xpToNextLevel(totalXp);

  const completedConcepts = await prisma.learningProgress.groupBy({
    by: ['conceptId'],
    where: { userId: user.id, stage: 'BLANK_PAGE', completed: true },
  });

  const totalConcepts = await prisma.concept.count({
    where: user.grade ? { subject: { gradeLevel: user.grade } } : {},
  });

  // Recent in-progress concepts
  const recentProgress = await prisma.learningProgress.findMany({
    where: { userId: user.id, completed: false },
    include: { concept: { include: { subject: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 3,
  });

  const stageLabels: Record<string, string> = {
    READING: 'Stage 1 - 개념 읽기',
    BLANK_EASY: 'Stage 2 - 빈칸 채우기 (쉬움)',
    BLANK_HARD: 'Stage 3 - 빈칸 채우기 (어려움)',
    BLANK_PAGE: 'Stage 4 - 백지 쓰기',
  };

  const completedCount = completedConcepts.length;
  const progressPercent = totalConcepts > 0 ? Math.round((completedCount / totalConcepts) * 100) : 0;

  return (
    <div className="px-4 md:px-10 py-8 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">대시보드</h1>
          {streak > 0 && (
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-secondary" />
              <p className="text-text-secondary text-sm">{streak}일 연속 학습 중입니다! 계속해서 힘내세요.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<Award className="w-6 h-6 text-primary" />}
          iconBg="bg-blue-50"
          label="현재 레벨"
          value={`Level ${level}`}
          subtext={`다음 레벨까지 ${nextLevel.remaining} XP`}
        />
        <StatCard
          icon={<Star className="w-6 h-6 text-secondary" />}
          iconBg="bg-orange-50"
          label="나의 포인트"
          value={totalXp.toLocaleString()}
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-indigo-500" />}
          iconBg="bg-indigo-50"
          label="완료한 개념"
          value={String(completedCount)}
          suffix={`/ ${totalConcepts}`}
        >
          <ProgressBar value={progressPercent} color="bg-indigo-500" size="sm" />
        </StatCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-text-primary">진행 중인 학습</h2>
              <Link href="/subjects" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                모두 보기 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              {recentProgress.length === 0 ? (
                <p className="text-text-secondary text-center py-8">아직 시작한 학습이 없습니다. 단원 목록에서 학습을 시작해보세요!</p>
              ) : (
                recentProgress.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group">
                    <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-text-primary font-semibold mb-1 group-hover:text-primary transition-colors">
                        {p.concept.subject.title}: {p.concept.title}
                      </h3>
                      <p className="text-text-secondary text-sm">{stageLabels[p.stage] ?? p.stage}</p>
                    </div>
                    <Link href={`/concepts/${p.conceptId}`}>
                      <Button size="sm">이어서 하기</Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-8">
            <h2 className="text-lg font-bold text-text-primary mb-6">빠른 실행</h2>
            <div className="flex flex-col gap-3">
              <Link href="/subjects">
                <Button size="md" className="w-full justify-center">
                  <Play className="w-5 h-5 mr-2" />
                  학습 시작하기
                </Button>
              </Link>
              <Link href="/ranking">
                <Button variant="ghost" size="md" className="w-full justify-center border border-slate-200">
                  랭킹 확인하기
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
