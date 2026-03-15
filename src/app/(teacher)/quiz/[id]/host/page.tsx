'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Zap,
  Users,
  Play,
  SkipForward,
  Square,
  Trophy,
  Loader2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';

interface Participant {
  id: string;
  studentName: string;
  score: number;
  correctCount: number;
  rank: number | null;
}

interface QuizData {
  id: string;
  title: string;
  joinCode: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  currentQ: number;
  totalQuestions: number;
  participants: Participant[];
  currentQuestion: {
    id: string;
    content: string;
    choices: string[] | null;
    difficulty: string;
    chapter: string;
  } | null;
}

export default function QuizHostPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz/${id}`);
      if (res.ok) {
        const json = await res.json();
        setQuiz(json.data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    fetchQuiz();
    const interval = setInterval(fetchQuiz, 3000);
    return () => clearInterval(interval);
  }, [fetchQuiz]);

  const handleAction = async (action: 'start' | 'next' | 'end') => {
    await fetch(`/api/quiz/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    fetchQuiz();
  };

  const copyCode = () => {
    if (quiz) {
      navigator.clipboard.writeText(quiz.joinCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  if (loading || !quiz) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedParticipants = [...quiz.participants].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2">
              <Zap className="w-8 h-8 text-yellow-400" />
              {quiz.title}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-slate-400 text-sm">
              <button
                onClick={copyCode}
                className="flex items-center gap-1 font-mono text-xl font-black text-yellow-400 hover:text-yellow-300"
              >
                {quiz.joinCode}
                {codeCopied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {quiz.participants.length}명 참가
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {quiz.status === 'WAITING' && (
              <Button
                onClick={() => handleAction('start')}
                disabled={quiz.participants.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Play className="w-4 h-4 mr-1" />
                시작
              </Button>
            )}
            {quiz.status === 'ACTIVE' && (
              <>
                <Button onClick={() => handleAction('next')} className="bg-blue-600 hover:bg-blue-700">
                  <SkipForward className="w-4 h-4 mr-1" />
                  {quiz.currentQ >= quiz.totalQuestions - 1 ? '결과 보기' : '다음 문제'}
                </Button>
                <Button onClick={() => handleAction('end')} variant="secondary" className="text-red-400 border-red-400">
                  <Square className="w-4 h-4 mr-1" />
                  종료
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Waiting screen */}
        {quiz.status === 'WAITING' && (
          <Card className="bg-slate-800 border-slate-700 p-12 text-center">
            <div className="text-6xl font-black text-yellow-400 font-mono mb-4">
              {quiz.joinCode}
            </div>
            <p className="text-slate-400 text-lg">학생들에게 참가 코드를 알려주세요</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {quiz.participants.map((p) => (
                <span key={p.id} className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm font-medium">
                  {p.studentName}
                </span>
              ))}
              {quiz.participants.length === 0 && (
                <p className="text-slate-500">대기 중...</p>
              )}
            </div>
          </Card>
        )}

        {/* Active — show current question */}
        {quiz.status === 'ACTIVE' && quiz.currentQuestion && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-sm text-slate-400">
                문제 {quiz.currentQ + 1} / {quiz.totalQuestions}
              </span>
              <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${((quiz.currentQ + 1) / quiz.totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            <Card className="bg-slate-800 border-slate-700 p-8">
              <div className="text-xs text-slate-500 mb-2">{quiz.currentQuestion.chapter}</div>
              <div className="text-xl text-white leading-relaxed">
                <MathRenderer content={quiz.currentQuestion.content} />
              </div>
              {quiz.currentQuestion.choices && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {(quiz.currentQuestion.choices as string[]).map((c, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 bg-slate-700 rounded-xl text-white text-sm"
                    >
                      <span className="font-bold text-yellow-400 mr-2">{i + 1}</span>
                      <MathRenderer content={c} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Live ranking */}
            <Card className="bg-slate-800 border-slate-700 p-5">
              <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                실시간 순위
              </h3>
              <div className="space-y-2">
                {sortedParticipants.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      idx === 0 ? 'bg-yellow-500/20' : idx === 1 ? 'bg-slate-600/50' : idx === 2 ? 'bg-amber-700/20' : 'bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-500' : 'text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">{p.studentName}</span>
                    </div>
                    <span className="font-bold text-yellow-400">{p.score}점</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Completed — final ranking */}
        {quiz.status === 'COMPLETED' && (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-black mb-6">최종 결과</h2>
            <div className="max-w-md mx-auto space-y-3">
              {sortedParticipants.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                    idx === 0 ? 'bg-yellow-500/20 ring-2 ring-yellow-400' :
                    idx === 1 ? 'bg-slate-600/50' :
                    idx === 2 ? 'bg-amber-700/20' : 'bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black ${
                      idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-500' : 'text-slate-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-lg">{p.studentName}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xl text-yellow-400">{p.score}점</p>
                    <p className="text-xs text-slate-400">{p.correctCount}문제 정답</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
