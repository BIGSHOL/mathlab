'use client';

import { useState, useEffect } from 'react';
import { Swords, Crown, Users } from 'lucide-react';

interface ClassRanking {
  classroomId: string;
  name: string;
  totalXp: number;
  memberCount: number;
  rank: number;
}

export function ClassCompetitionCard() {
  const [rankings, setRankings] = useState<ClassRanking[]>([]);
  const [myClassroomId, setMyClassroomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gamification/class-competition')
      .then((r) => r.json())
      .then((json) => {
        if (json.data && !json.data.disabled) {
          setRankings(json.data.rankings ?? []);
          setMyClassroomId(json.data.myClassroomId ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || rankings.length < 2) return null;

  const maxXp = Math.max(...rankings.map((r) => r.totalXp), 1);

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Swords className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-800">반 대항전</h3>
          <p className="text-xs text-slate-400">이번 주 XP 레이스</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {rankings.map((cls) => {
          const isMyClass = cls.classroomId === myClassroomId;
          const widthPct = maxXp > 0 ? Math.max((cls.totalXp / maxXp) * 100, 8) : 8;

          return (
            <div
              key={cls.classroomId}
              className={`rounded-sm p-2.5 ${isMyClass ? 'bg-primary/5 border border-primary/20' : 'bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 text-center text-xs font-bold text-slate-400">
                  {cls.rank === 1 ? <Crown className="w-4 h-4 text-amber-500 mx-auto" /> : cls.rank}
                </span>
                <span className={`text-sm font-medium flex-1 ${isMyClass ? 'text-primary font-bold' : 'text-slate-700'}`}>
                  {cls.name}
                  {isMyClass && <span className="text-xs text-primary/60 ml-1">(우리 반)</span>}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                  {cls.memberCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cls.rank === 1 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : isMyClass ? 'bg-primary' : 'bg-slate-400'}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-600 w-16 text-right">
                  {cls.totalXp.toLocaleString()} XP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
