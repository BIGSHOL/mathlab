'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Gift, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { playSound } from '@/lib/sounds';

interface RouletteResult {
  type: string;
  label: string;
  xp: number;
  alreadyDone: boolean;
}

export function DailyRouletteCard() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    fetch('/api/roulette/today')
      .then((r) => r.json())
      .then((json) => setResult(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSpin() {
    if (spinning || result?.alreadyDone) return;
    setSpinning(true);
    playSound('spin' as never); // Web Audio API에 없으면 무시됨

    try {
      const res = await fetch('/api/roulette/spin', { method: 'POST' });
      if (!res.ok) {
        toast.error('룰렛 실행 실패');
        setSpinning(false);
        return;
      }
      const json = await res.json();
      const r: RouletteResult = json.data;

      // 스핀 애니메이션을 위해 살짝 지연
      setTimeout(() => {
        setResult(r);
        setSpinning(false);
        if (r.type === 'jackpot') {
          toast.success('🎰 JACKPOT! ' + r.label);
          playSound('levelup' as never);
        } else {
          toast.success(r.label + ' 획득!');
          playSound('badge' as never);
        }
      }, 1400);
    } catch (_e) {
      toast.error('네트워크 오류');
      setSpinning(false);
    }
  }

  if (loading) return null;

  const isDone = result?.alreadyDone;

  return (
    <Card padding="md" className="relative overflow-hidden bg-gradient-to-br from-fuchsia-50 via-violet-50 to-indigo-50 border-violet-200">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-fuchsia-300 rounded-full opacity-20 blur-2xl" />
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-text-primary">일일 룰렛</h3>
        </div>
        {isDone && (
          <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-full">
            완료
          </span>
        )}
      </div>

      <div className="relative">
        {spinning ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-16 h-16 rounded-full border-4 border-fuchsia-300 border-t-violet-500 animate-spin" />
          </div>
        ) : result ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <Sparkles className={`w-10 h-10 ${result.type === 'jackpot' ? 'text-amber-500 animate-pulse' : 'text-violet-500'}`} />
            <p className="text-lg font-extrabold text-text-primary">{result.label}</p>
            <p className="text-xs text-text-secondary">
              {isDone ? '내일 다시 도전하세요!' : '오늘의 보상 획득!'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2 gap-3">
            <p className="text-sm text-text-secondary text-center">
              <Zap className="w-4 h-4 inline text-violet-500 mr-1" />
              매일 한 번, XP·프리즈·잭팟 중 하나!
            </p>
            <Button onClick={handleSpin} size="md" className="w-full max-w-[200px]">
              <Gift className="w-4 h-4 mr-1.5" />
              룰렛 돌리기
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
