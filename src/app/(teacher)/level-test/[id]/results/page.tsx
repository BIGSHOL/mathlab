'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Target,
  Loader2,
  RefreshCw,
  GraduationCap,
  BarChart3,
  ChevronRight,
  Printer,
  X,
  PenLine,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LevelBadge } from '@/components/level-test/LevelBadge';
import { LevelTestResultCard } from '@/components/level-test/LevelTestResultCard';
import { RadarChart } from '@/components/level-test/RadarChart';
import { DOMAIN_LABELS, DOMAIN_COLORS, LEVEL_COLORS } from '@/types';
import type { LevelTestDomain } from '@/types';

const DOMAIN_ORDER: LevelTestDomain[] = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];
const LEVEL_ORDER = ['1등급', '2등급', '3등급', '4등급', '5등급', '6등급', '7등급', '8등급', '9등급'];

// 인라인 스타일용 레벨 바 색상 (Tailwind 퍼지 문제 방지)
const LEVEL_BAR_COLORS: Record<string, string> = {
  '1등급': '#7c3aed',
  '2등급': '#6366f1',
  '3등급': '#3b82f6',
  '4등급': '#0ea5e9',
  '5등급': '#22c55e',
  '6등급': '#84cc16',
  '7등급': '#eab308',
  '8등급': '#f97316',
  '9등급': '#ef4444',
};

interface DomainScoreData {
  total: number;
  correct: number;
  accuracy: number;
}

interface DiagnosticResult {
  recommendLevel: string;
  overallAccuracy: number;
  domainScores: Record<string, DomainScoreData>;
  weakAreas: { chapter: string; accuracy: number; total: number; correct: number }[];
  strongAreas: { chapter: string; accuracy: number; total: number; correct: number }[];
}

interface AnswerData {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

interface QuestionData {
  id: string;
  chapter: string;
  difficulty: string;
  domain: string | null;
  answer: string;
  questionNum: number;
}

interface ResultItem {
  attemptId: string;
  student: { id: string; name: string; grade: number | null };
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
  entryMethod?: string;
  answers: AnswerData[];
  diagnostic: DiagnosticResult | null;
}

interface LevelTestInfo {
  id: string;
  title: string;
  grade: number;
}

type SortKey = 'name' | 'accuracy' | 'level';
type SortDir = 'asc' | 'desc';

export default function LevelTestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<LevelTestInfo | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [testRes, resultsRes] = await Promise.all([
        fetch(`/api/level-tests/${id}`),
        fetch(`/api/level-tests/${id}/results`),
      ]);

      if (testRes.ok) {
        const testJson = await testRes.json();
        setTest(testJson.data);
      }
      if (resultsRes.ok) {
        const resultsJson = await resultsRes.json();
        setResults(resultsJson.data?.results ?? []);
        setQuestions(resultsJson.data?.questions ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/level-tests/${id}/results`, { method: 'POST' });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // ignore
    }
    setAnalyzing(false);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'accuracy' ? 'desc' : 'asc');
    }
  };

  const completedResults = useMemo(() => results.filter((r) => r.completedAt), [results]);

  const classStats = useMemo(() => {
    const count = completedResults.length;
    if (count === 0) return null;

    const avgAccuracy = Math.round(
      completedResults.reduce((sum, r) => {
        return sum + (r.totalCount > 0 ? (r.correctCount / r.totalCount) * 100 : 0);
      }, 0) / count
    );

    const levelCounts: Record<string, number> = {};
    completedResults.forEach((r) => {
      if (r.diagnostic?.recommendLevel) {
        const lvl = r.diagnostic.recommendLevel;
        levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
      }
    });

    const domainAvg: Record<string, { totalAcc: number; count: number }> = {};
    completedResults.forEach((r) => {
      if (!r.diagnostic?.domainScores) return;
      for (const domain of DOMAIN_ORDER) {
        const ds = r.diagnostic.domainScores[domain];
        if (ds) {
          if (!domainAvg[domain]) domainAvg[domain] = { totalAcc: 0, count: 0 };
          domainAvg[domain].totalAcc += ds.accuracy;
          domainAvg[domain].count++;
        }
      }
    });

    const radarData = DOMAIN_ORDER.map((domain) => ({
      domain,
      value: domainAvg[domain] ? Math.round(domainAvg[domain].totalAcc / domainAvg[domain].count) : 0,
    }));

    return { count, avgAccuracy, levelCounts, radarData };
  }, [completedResults]);

  const sortedResults = useMemo(() => {
    return [...completedResults].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') {
        return a.student.name.localeCompare(b.student.name) * dir;
      }
      if (sortKey === 'level') {
        const lvlA = LEVEL_ORDER.indexOf(a.diagnostic?.recommendLevel ?? '');
        const lvlB = LEVEL_ORDER.indexOf(b.diagnostic?.recommendLevel ?? '');
        return (lvlA - lvlB) * dir;
      }
      const accA = a.totalCount > 0 ? a.correctCount / a.totalCount : 0;
      const accB = b.totalCount > 0 ? b.correctCount / b.totalCount : 0;
      return (accA - accB) * dir;
    });
  }, [completedResults, sortKey, sortDir]);

  const selectedResult = useMemo(
    () => results.find((r) => r.attemptId === selectedAttemptId) ?? null,
    [results, selectedAttemptId]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return <span className="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* ===== LEFT: 전체 결과 목록 ===== */}
      <div
        className={`flex flex-col min-w-0 overflow-y-auto transition-all duration-200 ${
          selectedResult ? 'w-[420px] shrink-0 border-r border-slate-200' : 'flex-1'
        }`}
      >
        <div className={`p-6 ${selectedResult ? '' : 'max-w-[1024px] mx-auto w-full'}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/level-test" className="text-text-secondary hover:text-text-primary">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-text-primary">{test?.title ?? '레벨테스트 결과'}</h1>
                <p className="text-sm text-text-secondary">{classStats?.count ?? 0}명 응시 완료</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/manual-grading?testSeq=${id}`}>
                <Button size="sm" variant="secondary" className="whitespace-nowrap">
                  <PenLine className="w-4 h-4 mr-1" />수기 채점
                </Button>
              </Link>
              <Button size="sm" onClick={handleAnalyze} loading={analyzing} className="whitespace-nowrap">
                {analyzing ? (
                  '분석 중...'
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    분석 실행
                  </>
                )}
              </Button>
            </div>
          </div>

          {classStats && classStats.count > 0 && !selectedResult && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-sm">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">응시 인원</p>
                    <p className="text-2xl font-bold text-text-primary">{classStats.count}명</p>
                  </div>
                </Card>
                <Card className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-sm">
                    <Target className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">학급 평균</p>
                    <p className="text-2xl font-bold text-text-primary">{classStats.avgAccuracy}%</p>
                  </div>
                </Card>
                <Card className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-violet-100 rounded-sm">
                    <GraduationCap className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">분석 완료</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {completedResults.filter((r) => r.diagnostic).length}명
                    </p>
                  </div>
                </Card>
              </div>

              {/* Analytics: Radar + Level Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="p-5">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    학급 평균 영역 분석
                  </h3>
                  <RadarChart data={classStats.radarData} size={220} />
                </Card>
                <Card className="p-5">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
                    <GraduationCap className="w-4 h-4 text-violet-600" />
                    레벨 분포
                  </h3>
                  <div className="space-y-2.5">
                    {LEVEL_ORDER.map((level) => {
                      const count = classStats.levelCounts[level] || 0;
                      const pct = classStats.count > 0 ? Math.round((count / classStats.count) * 100) : 0;
                      const colors = LEVEL_COLORS[level] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
                      const barColor = LEVEL_BAR_COLORS[level] ?? '#94a3b8';
                      return (
                        <div key={level} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-14 shrink-0 ${colors.text}`}>
                            {level}
                          </span>
                          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: barColor }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-600">
                              {count > 0 ? `${count}명 (${pct}%)` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Student list */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">학생별 결과</h3>
              <p className="text-xs text-text-secondary">학생을 클릭하여 개별 분석 보기</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th
                      className="text-left px-5 py-3 text-xs font-semibold text-text-secondary cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort('name')}
                    >
                      학생
                      <SortIndicator column="name" />
                    </th>
                    <th
                      className="text-center px-4 py-3 text-xs font-semibold text-text-secondary cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort('accuracy')}
                    >
                      정답률
                      <SortIndicator column="accuracy" />
                    </th>
                    <th
                      className="text-center px-4 py-3 text-xs font-semibold text-text-secondary cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort('level')}
                    >
                      판정
                      <SortIndicator column="level" />
                    </th>
                    {!selectedResult &&
                      DOMAIN_ORDER.map((domain) => (
                        <th
                          key={domain}
                          className="text-center px-3 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap"
                        >
                          {DOMAIN_LABELS[domain]}
                        </th>
                      ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-text-secondary">
                        아직 완료된 응시가 없습니다
                      </td>
                    </tr>
                  ) : (
                    sortedResults.map((result) => {
                      const accuracy =
                        result.totalCount > 0 ? Math.round((result.correctCount / result.totalCount) * 100) : 0;
                      const isSelected = selectedAttemptId === result.attemptId;

                      return (
                        <tr
                          key={result.attemptId}
                          onClick={() => setSelectedAttemptId(isSelected ? null : result.attemptId)}
                          className={`border-b border-slate-100 cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-slate-50/50'
                          }`}
                        >
                          <td className="px-5 py-3">
                            <span className="font-medium text-text-primary text-sm">{result.student.name}</span>
                            {result.entryMethod === 'manual' && (
                              <span className="ml-1 px-1 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-600">수기</span>
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                accuracy >= 80
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : accuracy >= 60
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {accuracy}%
                            </span>
                          </td>
                          <td className="text-center px-4 py-3">
                            {result.diagnostic?.recommendLevel ? (
                              <LevelBadge level={result.diagnostic.recommendLevel} size="sm" />
                            ) : (
                              <span className="text-xs text-text-secondary">-</span>
                            )}
                          </td>
                          {!selectedResult &&
                            DOMAIN_ORDER.map((domain) => {
                              const ds = result.diagnostic?.domainScores?.[domain] as DomainScoreData | undefined;
                              const domainAcc = ds ? Math.round(ds.accuracy) : null;
                              const colors = DOMAIN_COLORS[domain];
                              return (
                                <td key={domain} className="text-center px-3 py-3">
                                  {domainAcc !== null ? (
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.bg} ${colors.text}`}>
                                      {domainAcc}%
                                    </span>
                                  ) : (
                                    <span className="text-xs text-text-secondary">-</span>
                                  )}
                                </td>
                              );
                            })}
                          <td className="px-2 py-3">
                            <ChevronRight
                              className={`w-4 h-4 transition-colors ${isSelected ? 'text-primary' : 'text-slate-300'}`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ===== RIGHT: 개별 학생 리포트 ===== */}
      {selectedResult && (
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-50/30">
          {/* Header */}
          <div className="shrink-0 px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{selectedResult.student.name[0]}</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">{selectedResult.student.name}</h2>
                <p className="text-xs text-text-secondary">
                  {selectedResult.completedAt
                    ? new Date(selectedResult.completedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : ''}{' '}
                  응시
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedResult.diagnostic && (
                <Link href={`/level-test/${id}/report?attemptId=${selectedResult.attemptId}`}>
                  <Button size="sm" variant="secondary">
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    보고서
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" />
                인쇄
              </Button>
              <button
                onClick={() => setSelectedAttemptId(null)}
                className="p-1.5 rounded-sm hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Report content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              {selectedResult.diagnostic ? (
                <LevelTestResultCard
                  recommendLevel={selectedResult.diagnostic.recommendLevel}
                  overallAccuracy={selectedResult.diagnostic.overallAccuracy}
                  domainScores={selectedResult.diagnostic.domainScores}
                  weakAreas={selectedResult.diagnostic.weakAreas}
                  strongAreas={selectedResult.diagnostic.strongAreas}
                  answers={selectedResult.answers}
                  questions={questions}
                />
              ) : (
                <Card className="p-5 text-center">
                  <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-text-secondary font-medium mb-3">분석 결과가 없습니다</p>
                  <Button size="sm" onClick={handleAnalyze} loading={analyzing}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    분석 실행
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
