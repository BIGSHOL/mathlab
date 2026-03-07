'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Clock,
  Zap,
  Star,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  Target,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DIFFICULTY_LABELS } from '@/types';

interface AnswerDetail {
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  comboCount: number;
  pointsEarned: number;
  selectedAnswer: string;
}

interface QuestionInfo {
  id: string;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  difficulty: string;
  chapter: string;
  questionNum: number;
}

export default function TestResultPage() {
  const { id: testId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<{
    score: number;
    maxScore: number;
    correctCount: number;
    totalCount: number;
    xpEarned: number;
    comboMax: number;
    answers: AnswerDetail[];
    test: { title: string };
  } | null>(null);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);

  useEffect(() => {
    async function load() {
      try {
        // Get test details with questions
        const testRes = await fetch(`/api/tests/${testId}`);
        if (testRes.ok) {
          const testJson = await testRes.json();
          setQuestions(testJson.data.questions ?? []);
        }

        // Get my attempt
        const testsRes = await fetch('/api/tests');
        if (testsRes.ok) {
          const testsJson = await testsRes.json();
          const test = testsJson.data?.find((t: { id: string }) => t.id === testId);
          if (test) {
            // Fetch attempt details
            const attRes = await fetch(`/api/tests/${testId}/attempt`, { method: 'POST' });
            if (attRes.ok) {
              const attJson = await attRes.json();
              const detailRes = await fetch(`/api/tests/attempts/${attJson.data.id}`);
              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                setAttempt(detailJson.data);
              }
            }
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [testId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary">결과를 찾을 수 없습니다</p>
        <Link href="/my-tests">
          <Button variant="secondary" className="mt-4">시험 목록으로</Button>
        </Link>
      </div>
    );
  }

  const accuracy = attempt.totalCount > 0
    ? Math.round((attempt.correctCount / attempt.totalCount) * 100) : 0;
  const totalTime = attempt.answers.reduce((s, a) => s + a.timeSpentSeconds, 0);
  const avgTime = attempt.totalCount > 0
    ? Math.round(totalTime / attempt.totalCount) : 0;

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-tests" className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">{attempt.test?.title ?? '시험 결과'}</h1>
      </div>

      {/* Score card */}
      <Card className="p-8 mb-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
        <p className="text-5xl font-black text-primary">
          {attempt.score}
          <span className="text-2xl text-primary/60">/{attempt.maxScore}</span>
        </p>
        <p className="text-text-secondary mt-1">점수</p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-text-primary">{accuracy}%</p>
          <p className="text-xs text-text-secondary">정답률</p>
        </Card>
        <Card className="p-4 text-center">
          <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-text-primary">{attempt.comboMax}</p>
          <p className="text-xs text-text-secondary">최대 콤보</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-text-primary">{avgTime}초</p>
          <p className="text-xs text-text-secondary">평균 풀이 시간</p>
        </Card>
        <Card className="p-4 text-center">
          <Star className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-text-primary">+{attempt.xpEarned}</p>
          <p className="text-xs text-text-secondary">획득 XP</p>
        </Card>
      </div>

      {/* Answer review */}
      <h2 className="text-lg font-bold text-text-primary mb-4">문제별 결과</h2>
      <div className="space-y-3">
        {attempt.answers.map((ans, idx) => {
          const q = questionMap.get(ans.questionId);
          if (!q) return null;

          return (
            <Card key={ans.questionId} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  ans.isCorrect ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {ans.isCorrect
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <XCircle className="w-5 h-5 text-red-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500">
                      #{idx + 1} · {q.chapter}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      q.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                      q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS]}
                    </span>
                    <span className="text-xs text-slate-400">
                      {ans.timeSpentSeconds}초
                    </span>
                    {ans.pointsEarned > 0 && (
                      <span className="text-xs text-primary font-semibold">+{ans.pointsEarned}점</span>
                    )}
                  </div>
                  <div className="text-sm text-text-primary line-clamp-2 mb-1">
                    <MathRenderer content={q.content.slice(0, 200)} />
                  </div>
                  <div className="text-xs text-text-secondary">
                    내 답: <span className={ans.isCorrect ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                      {ans.selectedAnswer}
                    </span>
                    {!ans.isCorrect && (
                      <> · 정답: <span className="text-emerald-600 font-medium">{q.answer}</span></>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link href="/my-tests">
          <Button variant="secondary">시험 목록으로 돌아가기</Button>
        </Link>
      </div>
    </div>
  );
}
