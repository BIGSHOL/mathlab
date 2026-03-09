'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function QuizJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setError('');

    try {
      const res = await fetch(`/api/quiz/${code.trim().toUpperCase()}/join`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        router.push(`/quiz/${json.data.sessionId}/play`);
      } else {
        const json = await res.json();
        setError(json.error?.message || '참가 실패');
      }
    } catch {
      setError('네트워크 오류');
    }
    setJoining(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="bg-slate-800 border-slate-700 p-8 max-w-sm w-full text-center">
        <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">퀴즈 배틀</h1>
        <p className="text-slate-400 text-sm mb-6">선생님이 알려준 참가 코드를 입력하세요</p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="참가 코드 (6자리)"
          maxLength={6}
          className="w-full px-4 py-4 text-center text-2xl font-mono font-bold bg-slate-700 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 tracking-widest"
          onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
        />

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <Button
          className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold"
          onClick={handleJoin}
          loading={joining}
          disabled={code.trim().length < 4}
        >
          참가하기
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </Card>
    </div>
  );
}
