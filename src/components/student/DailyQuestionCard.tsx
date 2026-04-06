'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, XCircle, Users, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';

interface DailyQuestionData {
  id: string;
  date: string;
  question: {
    id: string;
    content: string;
    choices: string[];
    answer: string;
    explanation: string | null;
    difficulty: string;
  };
  stats: { totalAttempts: number; correctCount: number; correctRate: number };
  myAttempt: { selectedAnswer: string; isCorrect: boolean } | null;
}

export function DailyQuestionCard() {
  const [data, setData] = useState<DailyQuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; stats: DailyQuestionData['stats'] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/daily-question/today')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((json) => { if (json.data) setData(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selected || !data || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/daily-question/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyQuestionId: data.id, selectedAnswer: selected }),
      });
      const json = await res.json();
      if (json.data) {
        setResult(json.data);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  if (loading) return null;
  if (!data) return null;

  const alreadyAnswered = data.myAttempt !== null;
  const showResult = alreadyAnswered || result !== null;
  const isCorrect = result?.isCorrect ?? data.myAttempt?.isCorrect ?? false;
  const answered = data.myAttempt?.selectedAnswer ?? selected;
  const stats = result?.stats ?? data.stats;

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-5 h-5 text-violet-500" />
        <h3 className="font-bold text-text-primary">오늘의 한 문제</h3>
        <span className="text-xs text-text-secondary ml-auto">{data.date}</span>
      </div>

      <div className="mb-4 text-sm text-text-primary">
        <MathRenderer content={data.question.content} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {(data.question.choices as string[]).map((choice, idx) => {
          const choiceNum = String(idx + 1);
          const isAnswered = answered === choiceNum;
          const isCorrectChoice = choiceNum === data.question.answer;
          return (
            <button
              key={idx}
              disabled={showResult}
              onClick={() => setSelected(choiceNum)}
              className={`px-3 py-2 rounded-sm border text-sm font-medium transition-all text-left ${
                showResult
                  ? isCorrectChoice
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : isAnswered && !isCorrectChoice
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 text-text-secondary opacity-50'
                  : isAnswered
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:border-slate-300 text-text-primary'
              }`}
            >
              <MathRenderer content={choice} />
            </button>
          );
        })}
      </div>

      {showResult ? (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 p-3 rounded-sm text-sm ${
            isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            {isCorrect ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="font-bold text-emerald-700">정답!</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-red-600" /><span className="font-bold text-red-700">오답</span></>
            )}
            {!alreadyAnswered && (
              <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
                <Star className="w-3 h-3" /> +5 XP
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <Users className="w-3.5 h-3.5" />
            <span>{stats.totalAttempts}명 참여</span>
            <span>·</span>
            <span>정답률 {stats.correctRate}%</span>
          </div>

          {data.question.explanation && (
            <div className="text-sm text-text-secondary bg-slate-50 rounded-sm p-3">
              <MathRenderer content={data.question.explanation} />
            </div>
          )}
        </div>
      ) : (
        <Button
          className="w-full"
          size="sm"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!selected}
        >
          제출하기
        </Button>
      )}
    </Card>
  );
}
