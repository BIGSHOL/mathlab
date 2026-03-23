'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useXpNotification } from '@/stores/xp-notification';
import {
  Swords, CheckCircle2, XCircle, Trophy,
  Flame, Target, ArrowRight, RotateCcw,
  Zap, ChevronLeft, Crown, ArrowLeft, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { MathRenderer } from '@/components/math/MathRenderer';
import Link from 'next/link';

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

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string; textColor: string }> = {
  BASIC: { label: '기초', color: 'from-emerald-400 to-emerald-600', bg: 'bg-emerald-500', textColor: 'text-emerald-400' },
  MEDIUM: { label: '보통', color: 'from-amber-400 to-amber-600', bg: 'bg-amber-500', textColor: 'text-amber-400' },
  HIGH: { label: '어려움', color: 'from-orange-400 to-orange-600', bg: 'bg-orange-500', textColor: 'text-orange-400' },
  HIGHEST: { label: '최고', color: 'from-red-400 to-red-600', bg: 'bg-red-500', textColor: 'text-red-400' },
};

function getThreatLevel(wrongCount: number) {
  if (wrongCount >= 7) return { label: '매우 위험', flames: 4, color: 'text-red-400' };
  if (wrongCount >= 5) return { label: '위험', flames: 3, color: 'text-orange-400' };
  if (wrongCount >= 4) return { label: '경고', flames: 2, color: 'text-amber-400' };
  return { label: '주의', flames: 1, color: 'text-yellow-400' };
}

export default function RevengePage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selectedAnswer: string; correctAnswer: string; isCorrect: boolean }>>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ correctCount: number; totalCount: number; accuracy: number; xpEarned: number; leveledUp?: boolean } | null>(null);
  const [showReview, setShowReview] = useState(false);

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
    setSelectedChoice(answer);
    setFeedback(isCorrect);
    setAnswers((prev) => [...prev, { questionId: q.id, selectedAnswer: answer, correctAnswer: q.answer, isCorrect }]);
  };

  const handleNext = async () => {
    if (!selected) return;
    if (currentIdx >= selected.questions.length - 1) {
      setFinished(true);
      const finalAnswers = [...answers];
      const res = await fetch('/api/learning/revenge-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers, chapter: selected.chapter, difficulty: selected.difficulty }),
      });
      const json = await res.json();
      if (json.data) {
        setResult(json.data);
        if (json.data.xpEarned > 0) useXpNotification.getState().show(json.data.xpEarned);
      }
    } else {
      setCurrentIdx((i) => i + 1);
      setFeedback(null);
      setSelectedChoice(null);
    }
  };

  const handleReset = () => {
    setSelected(null);
    setCurrentIdx(0);
    setAnswers([]);
    setFeedback(null);
    setSelectedChoice(null);
    setFinished(false);
    setResult(null);
    setShowReview(false);
  };

  const handleRetry = () => {
    if (!selected) return;
    setCurrentIdx(0);
    setAnswers([]);
    setFeedback(null);
    setSelectedChoice(null);
    setFinished(false);
    setResult(null);
    setShowReview(false);
  };

  // ═══════════════════════════════════════
  // 1. 선택 화면 (배틀 선택)
  // ═══════════════════════════════════════
  if (!selected) {
    const totalWrong = suggestions.reduce((sum, s) => sum + s.wrongCount, 0);

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center py-12">
        {/* 헤더 */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/30 to-orange-900/30" />
          <div className="relative max-w-2xl mx-auto px-4 pt-6 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-500/30 mb-4">
                <Swords className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2">복수전</h1>
              <p className="text-slate-400">틀렸던 문제를 다시 풀고 정복하세요</p>
            </motion.div>

            {/* 전체 통계 */}
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center gap-6 mt-6"
              >
                <div className="text-center">
                  <p className="text-2xl font-black text-red-400">{suggestions.length}</p>
                  <p className="text-xs text-slate-500">도전 가능</p>
                </div>
                <div className="w-px bg-slate-700" />
                <div className="text-center">
                  <p className="text-2xl font-black text-orange-400">{totalWrong}</p>
                  <p className="text-xs text-slate-500">총 오답</p>
                </div>
                <div className="w-px bg-slate-700" />
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-400">x3</p>
                  <p className="text-xs text-slate-500">XP 보너스</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* 배틀 카드 목록 */}
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <LoadingEmptyState
            loading={loading}
            empty={suggestions.length === 0}
            icon={<Shield className="w-12 h-12 text-slate-600" />}
            message="복수전 대상이 없습니다"
            description="시험에서 3회 이상 틀린 유형이 있으면 도전할 수 있어요!"
          >
            <div className="space-y-3 mt-2">
              {suggestions.map((s, i) => {
                const diff = DIFFICULTY_CONFIG[s.difficulty] ?? DIFFICULTY_CONFIG.MEDIUM;
                const threat = getThreatLevel(s.wrongCount);

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <button
                      onClick={() => { setSelected(s); setCurrentIdx(0); setAnswers([]); setFeedback(null); setSelectedChoice(null); setFinished(false); setResult(null); }}
                      className="w-full text-left bg-slate-800/80 border border-slate-700 rounded-xl p-4 hover:border-red-500/50 hover:bg-slate-800 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        {/* 난이도 뱃지 */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${diff.color} flex items-center justify-center shadow-lg`}>
                          <Target className="w-6 h-6 text-white" />
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white truncate">{s.chapter}</h3>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diff.bg} text-white`}>
                              {diff.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: threat.flames }).map((_, fi) => (
                                <Flame key={fi} className={`w-3.5 h-3.5 ${threat.color}`} />
                              ))}
                              <span className={`text-xs font-medium ${threat.color} ml-0.5`}>{threat.label}</span>
                            </div>
                            <span className="text-xs text-slate-500">오답 {s.wrongCount}회</span>
                          </div>
                        </div>

                        {/* 도전 버튼 */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <span className="text-sm font-bold text-red-400 group-hover:text-red-300 transition-colors">{s.questions.length}문제</span>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-red-400 transition-colors" />
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </LoadingEmptyState>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // 2. 결과 화면
  // ═══════════════════════════════════════
  if (finished) {
    const accuracy = result?.accuracy ?? 0;
    const isVictory = accuracy >= 60;
    const isPerfect = accuracy === 100;

    return (
      <div className={`min-h-screen ${isVictory ? 'bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900' : 'bg-gradient-to-b from-slate-900 via-red-950 to-slate-900'}`}>
        <div className="max-w-md mx-auto px-4 py-12">
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center"
            >
              {/* 결과 아이콘 */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl shadow-2xl mb-6 ${
                  isPerfect ? 'bg-gradient-to-br from-amber-400 to-yellow-600 shadow-amber-500/30'
                  : isVictory ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
                  : 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/30'
                }`}
              >
                {isPerfect ? <Crown className="w-12 h-12 text-white" /> : isVictory ? <Trophy className="w-12 h-12 text-white" /> : <Swords className="w-12 h-12 text-white" />}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black text-white mb-2"
              >
                {isPerfect ? '완벽한 복수!' : isVictory ? '복수 성공!' : '아쉬운 결과...'}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-slate-400 mb-2"
              >
                {selected.chapter}
              </motion.p>

              {/* XP */}
              {result && result.xpEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring' }}
                  className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-5 py-2 mt-2 mb-6"
                >
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-lg font-black text-amber-400">+{result.xpEarned} XP</span>
                </motion.div>
              )}

              {/* 스탯 카드 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-3 gap-3 mb-6 mt-4"
              >
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                  <p className={`text-3xl font-black ${isVictory ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result?.correctCount ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">정답</p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                  <p className="text-3xl font-black text-slate-300">{result?.totalCount ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">총 문제</p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                  <p className={`text-3xl font-black ${accuracy >= 80 ? 'text-emerald-400' : accuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {accuracy}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">정답률</p>
                </div>
              </motion.div>

              {/* 문제별 결과 미리보기 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center gap-2 mb-6"
              >
                {answers.map((a, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      a.isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </motion.div>

              {/* 오답 리뷰 토글 */}
              {answers.some((a) => !a.isCorrect) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <button
                    onClick={() => setShowReview(!showReview)}
                    className="text-sm text-slate-400 hover:text-white transition-colors mb-4 underline underline-offset-4"
                  >
                    {showReview ? '오답 리뷰 닫기' : '오답 리뷰 보기'}
                  </button>

                  <AnimatePresence>
                    {showReview && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-6"
                      >
                        <div className="space-y-3 text-left">
                          {answers.filter((a) => !a.isCorrect).map((a, i) => {
                            const q = selected.questions.find((q) => q.id === a.questionId);
                            if (!q) return null;
                            return (
                              <div key={i} className="bg-slate-800/80 border border-red-500/20 rounded-xl p-4">
                                <div className="text-sm text-white mb-2">
                                  <MathRenderer content={q.content} className="prose-invert" />
                                </div>
                                <div className="flex flex-col gap-1 text-sm">
                                  <div className="flex items-center gap-2">
                                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span className="text-red-400">내 답: <MathRenderer content={a.selectedAnswer} className="prose-invert" /></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="text-emerald-400">정답: <MathRenderer content={q.answer} className="prose-invert" /></span>
                                  </div>
                                  {q.explanation && (
                                    <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3">
                                      <MathRenderer content={q.explanation} className="prose-invert" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* 버튼 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="space-y-3"
              >
                {!isVictory && (
                  <Button onClick={handleRetry} className="w-full bg-red-500 hover:bg-red-600 text-white">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    다시 도전
                  </Button>
                )}
                <Button onClick={handleReset} variant={isVictory ? 'primary' : 'secondary'} className="w-full">
                  <Swords className="w-4 h-4 mr-2" />
                  다른 유형 도전
                </Button>
                <Link href="/dashboard" className="block">
                  <Button variant="secondary" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    대시보드로
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // 3. 풀이 화면 (배틀 모드)
  // ═══════════════════════════════════════
  const q = selected.questions[currentIdx];
  const diff = DIFFICULTY_CONFIG[selected.difficulty] ?? DIFFICULTY_CONFIG.MEDIUM;
  const progress = ((currentIdx + (feedback !== null ? 1 : 0)) / selected.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* 상단 바 */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleReset} className="text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-white">{selected.chapter}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diff.bg} text-white`}>
                {diff.label}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-400">{currentIdx + 1}/{selected.questions.length}</span>
          </div>

          {/* 프로그레스 바 */}
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* 문제 스텝 인디케이터 */}
          <div className="flex justify-center gap-1.5 mt-2">
            {selected.questions.map((_, i) => {
              const answered = answers[i];
              const isCurrent = i === currentIdx;
              return (
                <div
                  key={i}
                  className={`w-6 h-1.5 rounded-full transition-all ${
                    answered
                      ? answered.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                      : isCurrent ? 'bg-white' : 'bg-slate-700'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 문제 영역 */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* 문제 카드 */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-slate-500 bg-slate-700/50 px-2.5 py-1 rounded-full">
                  Q{currentIdx + 1}
                </span>
              </div>
              <div className="text-lg font-medium text-white leading-relaxed">
                <MathRenderer content={q.content} className="prose-invert" />
              </div>
            </div>

            {/* 선택지 */}
            {q.choices && (
              <div className="grid grid-cols-1 gap-3">
                {(q.choices as string[]).map((choice, idx) => {
                  const isCorrectChoice = choice.trim().toUpperCase() === q.answer.trim().toUpperCase();
                  const isSelected = selectedChoice === choice;
                  const showResult = feedback !== null;
                  const choiceLabels = ['①', '②', '③', '④', '⑤'];

                  return (
                    <motion.button
                      key={idx}
                      whileTap={!showResult ? { scale: 0.98 } : undefined}
                      disabled={feedback !== null}
                      onClick={() => handleAnswer(choice)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3 ${
                        showResult
                          ? isCorrectChoice
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : isSelected
                              ? 'border-red-500 bg-red-500/10 text-red-300'
                              : 'border-slate-700 bg-slate-800/50 text-slate-500'
                          : 'border-slate-700 bg-slate-800/50 text-slate-200 hover:border-slate-500 hover:bg-slate-700/50'
                      }`}
                    >
                      <span className={`text-lg ${
                        showResult
                          ? isCorrectChoice ? 'text-emerald-400' : isSelected ? 'text-red-400' : 'text-slate-600'
                          : 'text-slate-500'
                      }`}>
                        {choiceLabels[idx] ?? `${idx + 1}`}
                      </span>
                      <span className="flex-1">
                        <MathRenderer content={choice} className="prose-invert" />
                      </span>
                      {showResult && isCorrectChoice && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                      {showResult && isSelected && !isCorrectChoice && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 피드백 */}
            <AnimatePresence>
              {feedback !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div className={`p-4 rounded-xl flex items-center gap-3 ${
                    feedback ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    {feedback ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        <div>
                          <span className="font-bold text-emerald-400 text-lg">정답!</span>
                          <p className="text-sm text-emerald-400/70">+3 XP</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-red-400" />
                        <div>
                          <span className="font-bold text-red-400 text-lg">오답</span>
                          <p className="text-sm text-red-400/70">
                            정답: <MathRenderer content={q.answer} className="prose-invert" />
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 해설 */}
                  {q.explanation && !feedback && (
                    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-400 mb-2">해설</p>
                      <div className="text-sm text-slate-300">
                        <MathRenderer content={q.explanation} className="prose-invert" />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleNext}
                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3"
                  >
                    {currentIdx >= selected.questions.length - 1 ? (
                      <><Trophy className="w-4 h-4 mr-2" />결과 보기</>
                    ) : (
                      <><ArrowRight className="w-4 h-4 mr-2" />다음 문제</>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
