import { Crown, Medal, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

const rankStyle = (rank: number) => {
  if (rank === 1) return 'border-yellow-400 bg-yellow-50';
  if (rank === 2) return 'border-slate-300 bg-slate-50';
  if (rank === 3) return 'border-amber-600 bg-amber-50';
  return 'border-slate-200 bg-white';
};

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-text-secondary font-bold">{rank}</span>;
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ _as?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');
  const user = await getViewAsUser(await searchParams) ?? realUser;

  const profiles = await prisma.studentProfile.findMany({
    orderBy: { totalXp: 'desc' },
    take: 20,
    include: { user: { select: { id: true, name: true } } },
  });

  const rankings = profiles.map((p, i) => ({
    rank: i + 1,
    name: p.user.name,
    level: p.level,
    xp: p.totalXp,
    me: p.userId === user.id,
  }));

  return (
    <div className="px-4 md:px-10 py-8 max-w-[800px] mx-auto w-full">
      <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-2">랭킹 보드</h1>
      <p className="text-text-secondary mb-8">전체 학생 XP 랭킹입니다.</p>

      {rankings.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-text-secondary">아직 랭킹 데이터가 없습니다.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rankings.map((student) => (
            <Card
              key={student.rank}
              className={`flex items-center gap-4 p-5 border-2 ${rankStyle(student.rank)} ${student.me ? 'ring-2 ring-primary/30 border-primary' : ''}`}
            >
              <div className="w-10 h-10 flex items-center justify-center">
                {rankIcon(student.rank)}
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-sm font-bold">
                {student.name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">{student.name}</span>
                  {student.me && <Badge variant="info">나</Badge>}
                </div>
                <span className="text-text-secondary text-sm">Level {student.level}</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-xp-gold" />
                  <span className="font-bold text-text-primary">{student.xp.toLocaleString()}</span>
                </div>
                <span className="text-xs text-text-secondary">XP</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
