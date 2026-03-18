'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Clock,
  Zap,
  Star,
  ArrowLeft,
  Loader2,
  Target,
  RotateCcw,
  History,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { MathStatusBadge } from '@/components/ui/MathStatusBadge';
import { LevelTestResultCard } from '@/components/level-test/LevelTestResultCard';
import { classifyAnswer, getStatusSummary } from '@/lib/utils/answer-status';
import { DIFFICULTY_LABELS } from '@/types';

interface AnswerDetail {
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  comboCount: number;
  pointsEarned: number;
  selectedAnswer: string;
  hintUsed?: boolean;
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
  domain?: string | null;
}

interface AttemptHistory {
  id: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
  xpEarned: number;
}

export default function TestResultPage() {
  const { id: testSeq } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<{
    score: number;
    maxScore: number;
    correctCount: number;
    totalCount: number;
    xpEarned: number;
    comboMax: number;
    attemptNumber: number;
    answers: AnswerDetail[];
    test: { title: string; maxAttempts: number | null; testType: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    diagnosticResult: any | null;
  } | null>(null);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [attemptHistory, setAttemptHistory] = useState<AttemptHistory[]>([]);
  const [canRetake, setCanRetake] = useState(false);
  const [expandedSimilar, setExpandedSimilar] = useState<string | null>(null);
  const [similarQuestions, setSimilarQuestions] = useState<Record<string, QuestionInfo[]>>({});
  const [similarLoading, setSimilarLoading] = useState<string | null>(null);

  const loadSimilar = async (questionId: string) => {
    if (expandedSimilar === questionId) {
      setExpandedSimilar(null);
      return;
    }
    setExpandedSimilar(questionId);
    if (similarQuestions[questionId]) return;
    setSimilarLoading(questionId);
    try {
      const res = await fetch(`/api/questions/similar?questionId=${questionId}&limit=3`);
      if (res.ok) {
        const json = await res.json();
        setSimilarQuestions((prev) => ({ ...prev, [questionId]: json.data.similar ?? [] }));
      }
    } catch (err) { console.error('유사 문제 조회 실패:', err); }
    setSimilarLoading(null);
  };

  useEffect(() => {
    async function load() {
      try {
        // Get test details with questions
        const testRes = await fetch(`/api/tests/${testSeq}`);
        if (testRes.ok) {
          const testJson = await testRes.json();
          setQuestions(testJson.data.questions ?? []);
        }

        // Get my attempt
        const testsRes = await fetch('/api/tests');
        if (testsRes.ok) {
          const testsJson = await testsRes.json();
          const test = testsJson.data?.find((t: { seq: number }) => String(t.seq) === testSeq);
          if (test) {
            // Fetch attempt details
            const attRes = await fetch(`/api/tests/${testSeq}/attempt`, { method: 'POST' });
            if (attRes.ok) {
              const attJson = await attRes.json();
              const detailRes = await fetch(`/api/tests/attempts/${attJson.data.id}`);
              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                setAttempt(detailJson.data);
              }
            }

            // Check retake
            const attemptCount = test.attemptCount ?? 0;
            const maxAttempts = test.maxAttempts;
            setCanRetake(maxAttempts === null || attemptCount < maxAttempts);
          }
        }

        // 시도 이력 조회
        const histRes = await fetch(`/api/tests/${testSeq}/attempts`);
        if (histRes.ok) {
          const histJson = await histRes.json();
          setAttemptHistory(
            (histJson.data ?? []).filter((a: AttemptHistory) => a.completedAt)
          );
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [testSeq]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
      <Card className="p-5 mb-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
        <p className="text-5xl font-black text-primary">
          {attempt.score}
          <span className="text-2xl text-primary/60">/{attempt.maxScore}</span>
        </p>
        <p className="text-text-secondary mt-1">점수</p>
        {canRetake && (
          <Link href={`/my-tests/${testSeq}/play`} className="inline-block mt-4">
            <Button variant="secondary" size="sm">
              <RotateCcw className="w-4 h-4 mr-1" />
              다시 풀기
            </Button>
          </Link>
        )}
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

      {/* 레벨테스트 결과 */}
      {attempt.test?.testType === 'level_test' && attempt.diagnosticResult && (
        <div className="mb-6">
          <LevelTestResultCard
            recommendLevel={attempt.diagnosticResult.recommendLevel}
            overallAccuracy={attempt.diagnosticResult.overallAccuracy}
            domainScores={attempt.diagnosticResult.domainScores ?? {}}
            weakAreas={attempt.diagnosticResult.weakAreas ?? []}
            strongAreas={attempt.diagnosticResult.strongAreas ?? []}
            answers={attempt.answers}
            questions={questions}
          />
        </div>
      )}

      {/* 시도 이력 */}
      {attemptHistory.length > 1 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            응시 이력
          </h2>
          <div className="grid gap-2">
            {attemptHistory.map((h) => (
              <Card key={h.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-text-secondary">{h.attemptNumber}회차</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {h.score}/{h.maxScore}점
                  </span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    (h.correctCount / h.totalCount) >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                    (h.correctCount / h.totalCount) >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {Math.round((h.correctCount / h.totalCount) * 100)}%
                  </span>
                </div>
                <span className="text-xs text-text-secondary">
                  +{h.xpEarned} XP
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 학습 상태 요약 */}
      {(() => {
        const statuses = attempt.answers.map((ans) => {
          const q = questionMap.get(ans.questionId);
          return classifyAnswer({
            isCorrect: ans.isCorrect,
            timeSpentSeconds: ans.timeSpentSeconds,
            difficulty: q?.difficulty ?? 'MEDIUM',
          }).status;
        });
        const summary = getStatusSummary(statuses);
        return (
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-bold text-text-primary mb-3">학습 상태 분석</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-lg font-bold text-emerald-600">○</span>
                <p className="text-xs text-text-secondary">정답</p>
                <p className="text-sm font-bold text-text-primary">{summary.correct}</p>
              </div>
              <div>
                <span className="text-lg font-bold text-amber-600">△</span>
                <p className="text-xs text-text-secondary">풀이 미흡</p>
                <p className="text-sm font-bold text-text-primary">{summary.partial}</p>
              </div>
              <div>
                <span className="text-lg font-bold text-orange-600">●</span>
                <p className="text-xs text-text-secondary">계산 실수</p>
                <p className="text-sm font-bold text-text-primary">{summary.calcError}</p>
              </div>
              <div>
                <span className="text-lg font-bold text-red-600">★</span>
                <p className="text-xs text-text-secondary">개념 부족</p>
                <p className="text-sm font-bold text-text-primary">{summary.conceptWeak}</p>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Answer review */}
      <h2 className="text-lg font-bold text-text-primary mb-4">문제별 결과</h2>
      <div className="space-y-3">
        {attempt.answers.map((ans, idx) => {
          const q = questionMap.get(ans.questionId);
          if (!q) return null;

          return (
            <Card key={ans.questionId} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  <MathStatusBadge
                    isCorrect={ans.isCorrect}
                    timeSpentSeconds={ans.timeSpentSeconds}
                    difficulty={q.difficulty}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500">
                      #{idx + 1} · {q.chapter}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
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
                    {ans.hintUsed && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        <Lightbulb className="w-3 h-3" />
                        힌트
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-text-primary line-clamp-2 mb-1">
                    <MathRenderer content={q.content.slice(0, 200)} />
                  </div>
                  <div className="text-xs text-text-secondary">
                    내 답: <span className={`${ans.isCorrect ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'} [&_p]:inline [&_p]:m-0`}>
                      <MathRenderer content={ans.selectedAnswer} />
                    </span>
                    {!ans.isCorrect && (
                      <> · 정답: <span className="text-emerald-600 font-medium [&_p]:inline [&_p]:m-0"><MathRenderer content={q.answer} /></span></>
                    )}
                  </div>
                  {!ans.isCorrect && (
                    <button
                      onClick={() => loadSimilar(ans.questionId)}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Shuffle className="w-3 h-3" />
                      유사 문제
                      {expandedSimilar === ans.questionId ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
              {expandedSimilar === ans.questionId && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {similarLoading === ans.questionId ? (
                    <div className="flex items-center gap-2 text-xs text-text-secondary py-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> 유사 문제 찾는 중...
                    </div>
                  ) : (similarQuestions[ans.questionId] ?? []).length === 0 ? (
                    <p className="text-xs text-text-secondary py-2">유사 문제를 찾을 수 없습니다</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">유사 문제 {(similarQuestions[ans.questionId] ?? []).length}개</p>
                      {(similarQuestions[ans.questionId] ?? []).map((sq) => (
                        <div key={sq.id} className="bg-slate-50 rounded-sm p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-text-secondary">{sq.chapter}</span>
                            <span className={`px-1 py-0.5 rounded text-xs font-bold ${
                              sq.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                              sq.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              sq.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {DIFFICULTY_LABELS[sq.difficulty as keyof typeof DIFFICULTY_LABELS]}
                            </span>
                          </div>
                          <div className="text-sm text-text-primary line-clamp-2">
                            <MathRenderer content={sq.content.slice(0, 150)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center flex justify-center gap-3">
        <Link href="/my-tests">
          <Button variant="secondary">시험 목록으로 돌아가기</Button>
        </Link>
        {canRetake && (
          <Link href={`/my-tests/${testSeq}/play`}>
            <Button>
              <RotateCcw className="w-4 h-4 mr-1" />
              다시 풀기
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
