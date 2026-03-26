'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
} from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { playSound } from '@/lib/sounds';

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
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  currentQ: number;
  totalQuestions: number;
  participants: Participant[];
  currentQuestion: {
    id: string;
    content: string;
    choices: string[] | null;
  } | null;
}

export default function QuizPlayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctAnswer: string } | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myXpEarned, setMyXpEarned] = useState(0);
  const lastQuestionRef = useRef(-1);
  const questionStartRef = useRef<number>(Date.now());

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz/${id}`);
      if (res.ok) {
        const json = await res.json();
        setQuiz(json.data);
        // Reset state when question changes
        if (json.data.currentQ !== lastQuestionRef.current) {
          lastQuestionRef.current = json.data.currentQ;
          // 서버의 문제 전환 시각이 있으면 폴링 지연 보정
          const changedAt = json.data.questionChangedAt
            ? new Date(json.data.questionChangedAt).getTime()
            : 0;
          const serverOffset = changedAt > 0
            ? Math.max(0, Date.now() - changedAt)
            : 0;
          questionStartRef.current = Date.now() - serverOffset;
          setSelectedAnswer('');
          setSubmitted(false);
          setFeedback(null);
        }
      }
    } catch (err) { console.error('퀴즈 상태 조회 실패:', err); }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchQuiz();
    const interval = setInterval(fetchQuiz, 2000);
    return () => clearInterval(interval);
  }, [fetchQuiz]);

  const handleSubmit = async () => {
    if (!quiz?.currentQuestion || submitted) return;
    setSubmitted(true);

    const timeSpentSeconds = Math.round((Date.now() - questionStartRef.current) / 1000);

    try {
      const res = await fetch(`/api/quiz/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: quiz.currentQuestion.id,
          selectedAnswer,
          timeSpentSeconds,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setFeedback(json.data);
        playSound(json.data.isCorrect ? 'correct' : 'wrong');
        setMyScore(json.data.newScore);
        if (json.data.xpEarned) setMyXpEarned((prev) => prev + json.data.xpEarned);
      }
    } catch (err) { console.error('퀴즈 답안 제출 실패:', err); }
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-4">
          <div className="bg-slate-800 rounded-sm p-6 space-y-3">
            <Skeleton className="h-6 w-32 mx-auto !bg-slate-700" />
            <Skeleton className="h-4 w-48 mx-auto !bg-slate-700" />
            <Skeleton className="h-20 w-full rounded-sm !bg-slate-700" />
          </div>
        </div>
      </div>
    );
  }

  // Waiting screen
  if (quiz.status === 'WAITING') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <Card padding="xl" className="bg-slate-800 border-slate-700 text-center max-w-sm w-full">
          <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{quiz.title}</h2>
          <p className="text-slate-400">선생님이 퀴즈를 시작할 때까지 기다려주세요</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {quiz.participants.map((p) => (
              <span key={p.id} className="px-2 py-1 bg-slate-700 rounded text-xs text-white">
                {p.studentName}
              </span>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Completed screen
  if (quiz.status === 'COMPLETED') {
    const sorted = [...quiz.participants].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-md mx-auto">
          <Card padding="xl" className="bg-slate-800 border-slate-700 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-2">퀴즈 종료!</h2>
            <p className="text-slate-400 mb-2">내 점수: <span className="text-yellow-400 font-bold">{myScore}점</span></p>
            {myXpEarned > 0 && (
              <p className="text-emerald-400 font-bold mb-4">+{myXpEarned} XP 획득!</p>
            )}
            <div className="space-y-2">
              {sorted.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-sm ${
                    idx === 0 ? 'bg-yellow-500/20 ring-2 ring-yellow-400' :
                    idx === 1 ? 'bg-slate-600/50' :
                    idx === 2 ? 'bg-amber-700/20' : 'bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${
                      idx === 0 ? 'text-yellow-400' : 'text-slate-400'
                    }`}>#{idx + 1}</span>
                    <span className="text-white font-medium">{p.studentName}</span>
                  </div>
                  <span className="font-bold text-yellow-400">{p.score}점</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => router.push('/dashboard')}
              >
                대시보드
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push('/quiz-join')}
              >
                다른 퀴즈
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Active — answer current question
  const question = quiz.currentQuestion;

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-400">
            {quiz.currentQ + 1} / {quiz.totalQuestions}
          </span>
          <span className="flex items-center gap-1 font-bold text-yellow-400">
            <Zap className="w-4 h-4" />
            {myScore}점
          </span>
        </div>

        <div className="w-full h-1.5 bg-slate-700 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${((quiz.currentQ + 1) / quiz.totalQuestions) * 100}%` }}
          />
        </div>

        {question ? (
          <Card padding="lg" className="bg-slate-800 border-slate-700">
            <div className="text-lg text-white leading-relaxed mb-6">
              <MathRenderer content={question.content} />
            </div>

            {question.choices && (
              <div className="grid grid-cols-2 gap-2">
                {(question.choices as string[]).map((choice, idx) => {
                  const choiceNum = String(idx + 1);
                  const isSelected = selectedAnswer === choiceNum;
                  const showResult = feedback !== null;
                  const isCorrectChoice = feedback?.correctAnswer === choiceNum;

                  return (
                    <button
                      key={idx}
                      disabled={submitted}
                      onClick={() => { setSelectedAnswer(choiceNum); }}
                      className={`w-full text-left px-3 py-2 rounded-sm border transition-all text-sm [&_.katex]:text-inherit ${
                        showResult
                          ? isCorrectChoice
                            ? 'border-emerald-400 bg-emerald-500/20 text-white'
                            : isSelected
                              ? 'border-red-400 bg-red-500/20 text-white'
                              : 'border-slate-600 text-slate-500'
                          : isSelected
                            ? 'border-yellow-400 bg-yellow-400/10 text-white'
                            : 'border-slate-600 hover:border-slate-500 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {showResult && isCorrectChoice && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                        {showResult && isSelected && !isCorrectChoice && <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                        <MathRenderer content={choice} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Submit or short answer */}
            {!question.choices && (
              <input
                type="text"
                value={selectedAnswer}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={submitted}
                placeholder="정답 입력"
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-sm text-white text-base focus:border-yellow-400"
                onKeyDown={(e) => { if (e.key === 'Enter' && !submitted) handleSubmit(); }}
              />
            )}

            {feedback && (
              <div className={`mt-4 p-3 rounded-sm text-center font-bold ${
                feedback.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {feedback.isCorrect ? '정답!' : <span className="[&_p]:inline [&_p]:m-0">오답 (정답: <MathRenderer content={feedback.correctAnswer} />)</span>}
              </div>
            )}

            {!submitted && (
              <Button
                className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold"
                onClick={handleSubmit}
                disabled={!selectedAnswer.trim()}
              >
                제출
              </Button>
            )}

            {submitted && !feedback && (
              <p className="text-center text-slate-400 mt-4 text-sm">채점 중...</p>
            )}
          </Card>
        ) : (
          <Card padding="xl" className="bg-slate-800 border-slate-700 text-center">
            <MathSpinner size="lg" className="mx-auto" />
            <p className="text-slate-400 mt-3">다음 문제를 기다리는 중...</p>
          </Card>
        )}
      </div>
    </div>
  );
}
