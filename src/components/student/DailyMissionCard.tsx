'use client';

import { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Mission {
  type: string;
  label: string;
  target: number;
  current: number;
  completed: boolean;
}

interface MissionData {
  id: string;
  missions: Mission[];
  allComplete: boolean;
  xpAwarded: number;
}

export function DailyMissionCard() {
  const [data, setData] = useState<MissionData | null>(null);
  const [checking, setChecking] = useState(false);
  const [bonusEarned, setBonusEarned] = useState(false);

  useEffect(() => {
    fetch('/api/missions/today')
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!data || !data.allComplete || data.xpAwarded > 0 || checking || bonusEarned) return;
    setChecking(true);
    fetch('/api/missions/check', { method: 'POST' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.xpAwarded > 0) setBonusEarned(true);
      })
      .finally(() => setChecking(false));
  }, [data, checking, bonusEarned]);

  if (!data) return null;

  const completedCount = data.missions.filter((m) => m.completed).length;

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-text-primary">오늘의 미션</h3>
        </div>
        <span className="text-xs font-medium text-text-secondary">
          {completedCount}/{data.missions.length} 완료
        </span>
      </div>

      <div className="space-y-3">
        {data.missions.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            {m.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className={`text-sm font-medium ${m.completed ? 'text-emerald-600 line-through' : 'text-text-primary'}`}>
                {m.label}
              </span>
              {!m.completed && m.target > 1 && (
                <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }}
                  />
                </div>
              )}
            </div>
            {!m.completed && m.target > 1 && (
              <span className="text-xs text-text-secondary">{m.current}/{m.target}</span>
            )}
          </div>
        ))}
      </div>

      {(data.allComplete || bonusEarned) && (
        <div className="mt-4 flex items-center gap-2 bg-amber-50 rounded-sm p-3 text-amber-700">
          <Star className="w-4 h-4" />
          <span className="text-sm font-bold">
            {bonusEarned ? '미션 보너스 +20 XP 획득!' : '모든 미션 완료!'}
          </span>
        </div>
      )}
    </Card>
  );
}
