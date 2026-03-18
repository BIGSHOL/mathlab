'use client';

import { useState, useEffect } from 'react';
import { Swords, CheckCircle2, XCircle, Trophy, ArrowLeft, Loader2, Star } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';

interface QuestionItem {
  id: string;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  difficulty: string;
  chapter: string;
}

interface Suggestion {
  chapter: string;
  difficulty: string;
  wrongCount: number;
  questions: QuestionItem[];
}

export default function RevengePage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selectedAnswer: string; isCorrect: boolean }>>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ correctCount: number; totalCount: number; accuracy: number; xpEarned: number } | null>(null);

  useEffect(() => {
    fetch('/api/learning/revenge-suggestions')
      .then((r) => r.json())
      .then((json) => { if (json.data) setSuggestions(json.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleAnswer = (answer: string) => {
    if (feedback !== null || !selected) return;
    const q = selected.questions[currentIdx];
    const isCorrect = answer.trim().toUpperCase() === q.answer.trim().toUpperCase();
    setFeedback(isCorrect);
    setAnswers((prev) => [...prev, { questionId: q.id, selectedAnswer: answer, isCorrect }]);
  };

  const handleNext = async () => {
    if (!selected) return;
    if (currentIdx >= selected.questions.length - 1) {
      setFinished(true);
      const res = await fetch('/api/learning/revenge-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: [...answers], chapter: selected.chapter }),
      });
      const json = await res.json();
      if (json.data) setResult(json.data);
    } else {
      setCurrentIdx((i) => i + 1);
      setFeedback(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // 선택 화면
  if (!selected) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <button className="p-2 rounded-sm hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Swords className="w-6 h-6 text-red-500" />
            복수전
          </h1>
        </div>

        {suggestions.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-text-secondary">아직 복수전 대상이 없습니다. 시험을 풀어보세요!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <Card
                key={i}
                className="p-4 cursor-pointer hover:border-red-200 transition-colors"
                onClick={() => { setSelected(s); setCurrentIdx(0); setAnswers([]); setFeedback(null); setFinished(false); setResult(null); }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-text-primary">{s.chapter}</p>
                    <p className="text-sm text-text-secondary">{s.difficulty} · 오답 {s.wrongCount}회</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-red-600">{s.questions.length}문제 도전</span>
                    <Swords className="w-4 h-4 text-red-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 결과 화면
  if (finished) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="p-5 text-center space-y-4">
          <Trophy className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-black text-text-primary">복수전 완료!</h2>
          {result && result.xpEarned > 0 && (
            <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-sm py-2">
              <Star className="w-5 h-5" />
              <span className="font-bold">+{result.xpEarned} XP 획득!</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-2xl font-black text-primary">{result?.correctCount ?? 0}/{result?.totalCount ?? 0}</p>
              <p className="text-xs text-text-secondary">정답</p>
            </div>
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-2xl font-black text-text-primary">{result?.accuracy ?? 0}%</p>
              <p className="text-xs text-text-secondary">정답률</p>
            </div>
          </div>
          <Button className="w-full" onClick={() => setSelected(null)}>
            다른 유형 도전
          </Button>
        </Card>
      </div>
    );
  }

  // 풀이 화면
  const q = selected.questions[currentIdx];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-sm font-bold text-red-500">복수전: {selected.chapter}</span>
          <span className="text-sm text-text-secondary">{currentIdx + 1}/{selected.questions.length}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="text-xl font-bold text-text-primary">
              <MathRenderer content={q.content} />
            </div>
          </div>

          {q.choices && (
            <div className="grid grid-cols-2 gap-3">
              {(q.choices as string[]).map((choice, idx) => {
                const isCorrectChoice = choice.trim().toUpperCase() === q.answer.trim().toUpperCase();
                const showResult = feedback !== null;
                return (
                  <button
                    key={idx}
                    disabled={feedback !== null}
                    onClick={() => handleAnswer(choice)}
                    className={`px-4 py-3 rounded-sm border-2 text-sm font-medium transition-all ${
                      showResult
                        ? isCorrectChoice
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 opacity-50 text-text-secondary'
                        : 'border-slate-200 hover:border-primary text-text-primary'
                    }`}
                  >
                    <MathRenderer content={choice} />
                  </button>
                );
              })}
            </div>
          )}

          {feedback !== null && (
            <div className={`mt-4 p-3 rounded-sm flex items-center gap-2 text-sm ${
              feedback ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              {feedback ? (
                <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="font-bold text-emerald-700">정답!</span></>
              ) : (
                <><XCircle className="w-4 h-4 text-red-600" /><span className="font-bold text-red-700">오답</span><span className="text-sm text-red-600 ml-1">정답: <MathRenderer content={q.answer} /></span></>
              )}
            </div>
          )}

          {feedback !== null && (
            <Button className="w-full mt-4" onClick={handleNext}>
              {currentIdx >= selected.questions.length - 1 ? '결과 보기' : '다음 문제'}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
