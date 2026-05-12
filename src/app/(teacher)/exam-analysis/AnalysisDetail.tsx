'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Sparkles, Database, Download, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/Toast';
import { AnalysisResultView } from '@/components/exam-analysis/AnalysisResultView';
import { AnalysisCommentTab } from '@/components/exam-analysis/AnalysisCommentTab';
import { StudyStrategyTab } from '@/components/exam-analysis/StudyStrategyTab';
import { ExtractToBankModal } from '@/components/exam-analysis/ExtractToBankModal';
import { AddToWorkbookButton } from '@/components/workbook-shared/AddToWorkbookButton';
import { useAuth } from '@/hooks/useAuth';
import type { AnalysisSummary } from '@/lib/exam-analysis/types';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { DIFFICULTY_BAR_COLORS } from '@/lib/exam-analysis/constants';
import type { ExamPaperData, AnalysisTab } from './types';
import { getConfidenceInfo, getOverallDifficultyLevel, getDifficultyBreakdown } from './helpers';
import { DIFF_LEVEL_LABELS } from './constants';
import { CommentarySection } from './CommentarySection';
import { AnalyzingProgress } from './AnalyzingProgress';

const ArticleEditorModal = dynamic(
  () => import('@/components/exam-analysis/ArticleEditorModal').then((m) => ({ default: m.ArticleEditorModal })),
  { ssr: false },
);

interface AnalysisDetailProps {
  detail: ExamPaperData;
  analyzing: boolean;
  onAnalyze: (id: string) => void;
  onRefresh: () => void;
}

export function AnalysisDetail({ detail, analyzing, onAnalyze, onRefresh }: AnalysisDetailProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('basic');
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryStartTime, setCommentaryStartTime] = useState<number | null>(null);
  const [commentaryElapsed, setCommentaryElapsed] = useState(0);
  const [includeNearby, setIncludeNearby] = useState(true);
  const [includeYearCompare, setIncludeYearCompare] = useState(true);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [yearCount, setYearCount] = useState<number | null>(null);

  // 주변/연도 기출 건수 조회
  useEffect(() => {
    if (!detail.schoolId) { setNearbyCount(0); setYearCount(0); return; }
    const params = new URLSearchParams({ schoolId: detail.schoolId, grade: detail.grade, examPaperId: detail.id });
    fetch(`/api/exam-analysis/nearby-count?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setNearbyCount(d?.data?.nearbyCount ?? 0); setYearCount(d?.data?.yearCount ?? 0); })
      .catch(() => { setNearbyCount(0); setYearCount(0); });
  }, [detail.schoolId, detail.grade, detail.id]);

  // 기출지 변경 시 탭 + 총평 생성 상태 초기화
  // (다른 시험지에서 총평 생성 중인데 이 시험지로 전환하면 진행 프로그레스가 잘못 보이는 버그 방지)
  useEffect(() => {
    setActiveTab('basic');
    setCommentaryLoading(false);
    setCommentaryStartTime(null);
    setCommentaryElapsed(0);
  }, [detail.id]);

  // 총평 생성 경과 시간 타이머
  useEffect(() => {
    if (!commentaryLoading || !commentaryStartTime) {
      setCommentaryElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setCommentaryElapsed(Math.floor((Date.now() - commentaryStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [commentaryLoading, commentaryStartTime]);

  const latestAnalysis = detail.analyses?.[0];
  const questions = latestAnalysis?.questions || [];
  const summary = (latestAnalysis?.summary || null) as AnalysisSummary | null;
  const totalPoints = latestAnalysis?.totalPoints;

  const confidenceInfo = useMemo(() => getConfidenceInfo(questions), [questions]);
  const diffLevel = useMemo(() => getOverallDifficultyLevel(summary), [summary]);

  // 총평 데이터: extensions에서 commentary 에이전트 결과 추출
  const commentaryExt = latestAnalysis?.extensions?.find(e => e.agentType === 'commentary');
  const commentary = (commentaryExt?.result as unknown as CommentaryResult) ?? null;

  const handleGenerateCommentary = async () => {
    if (!latestAnalysis) return;
    const startId = detail.id; // 응답 처리 시 시험지 전환 여부 검증용
    setCommentaryLoading(true);
    setCommentaryStartTime(Date.now());
    try {
      const res = await fetch(`/api/exam-analysis/${startId}/analyze-extended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: ['commentary'], forceRegenerate: !!commentary, includeNearby, includeYearCompare }),
      });
      // 사용자가 다른 시험지로 전환했으면 응답 무시 (UI/toast/refresh 모두 영향 X)
      if (startId !== detail.id) return;
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error?.message || '총평 생성에 실패했습니다');
        return;
      }
      toast.success('총평이 생성되었습니다');
      onRefresh();
    } catch {
      if (startId === detail.id) toast.error('총평 생성 중 오류가 발생했습니다');
    } finally {
      // 같은 시험지에서만 로딩 해제 (다른 시험지로 전환된 경우는 useEffect reset이 처리)
      if (startId === detail.id) {
        setCommentaryLoading(false);
        setCommentaryStartTime(null);
      }
    }
  };

  const tabItems = [
    { key: 'basic' as const, label: '기본 분석' },
    { key: 'comments' as const, label: 'AI 코멘트', count: questions.length },
    { key: 'strategy' as const, label: '학습 대책' },
  ];

  return (
    <div className="max-w-[960px] mx-auto">
      {/* ── 헤더 ── */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{detail.title}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-sm">
                {detail.grade}
              </span>
              <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-sm">
                {detail.subject === 'MATH' ? '수학' : '영어'}
              </span>
              {detail.status === 'COMPLETED' && questions.length > 0 && (
                <>
                  <span className="text-xs text-slate-500">
                    총 {questions.length}문항{totalPoints ? ` · ${totalPoints}점 만점` : ''}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm ${confidenceInfo.color}`}>
                    신뢰도 {confidenceInfo.avg}%
                  </span>
                  {latestAnalysis?.modelVersion && (
                    <span className="text-[10px] text-slate-400" title={latestAnalysis.modelVersion}>
                      {latestAnalysis.modelVersion.includes('prompt') ? latestAnalysis.modelVersion.split('/ ').pop() : `prompt v0`}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 우측: 버튼 + 등급 뱃지 */}
          <div className="flex items-center gap-3 shrink-0">
            {detail.status === 'COMPLETED' && (
              <>
                {user?.role === 'SUPER_ADMIN' && (
                  <Button size="sm" variant="secondary" onClick={() => setShowExtractModal(true)}>
                    <Database className="w-4 h-4 mr-1" /> 문제은행에 추가
                  </Button>
                )}
                {/* 추출 완료된 시험지만 워크북에 추가 가능 (Question.examPaperId FK 필요) */}
                {detail.extractedToBankAt && (
                  <AddToWorkbookButton
                    kind="EXAM_PAPER"
                    refId={detail.id}
                    displayTitle={detail.title}
                    variant="secondary"
                    size="sm"
                  />
                )}
                <Link href={`/exam-analysis/${detail.id}/print`}>
                  <Button size="sm" variant="secondary">
                    <Download className="w-4 h-4 mr-1" /> 내보내기
                  </Button>
                </Link>
              </>
            )}
            {(detail.status === 'PENDING' || detail.status === 'FAILED') && (
              <Button onClick={() => onAnalyze(detail.id)} disabled={analyzing}>
                {analyzing ? '분석 중...' : '분석 실행'}
              </Button>
            )}

            {/* 종합 난이도 카드 — 클릭 시 판단 기준 모달 */}
            {detail.status === 'COMPLETED' && diffLevel > 0 && (() => {
              const activeColor = DIFFICULTY_BAR_COLORS[diffLevel - 1];
              const breakdown = getDifficultyBreakdown(summary);
              return (
                <button
                  type="button"
                  onClick={() => setShowDiffModal(true)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm border cursor-pointer hover:shadow-sm transition-all text-left"
                  style={{ borderColor: `${activeColor}50`, backgroundColor: `${activeColor}0A` }}
                  aria-label="시험 난이도 판단 기준 보기"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-500">시험 난이도</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(level => {
                        const isActive = level === diffLevel;
                        const color = DIFFICULTY_BAR_COLORS[level - 1];
                        return (
                          <div
                            key={level}
                            className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold transition-all ${
                              isActive ? 'ring-2 ring-offset-1 shadow-sm scale-110' : 'opacity-25'
                            }`}
                            style={{
                              backgroundColor: color,
                              color: '#fff',
                              ...(isActive ? { boxShadow: `0 0 0 1.5px #fff, 0 0 0 3px ${color}` } : {}),
                            }}
                          >
                            {level}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-l pl-3" style={{ borderColor: `${activeColor}30` }}>
                    <span className="text-base font-extrabold" style={{ color: activeColor }}>Level {diffLevel}</span>
                    {breakdown && (
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        평균 {breakdown.weightedAvg.toFixed(1)}/5
                      </div>
                    )}
                  </div>
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── 에러 상태 ── */}
      {detail.status === 'FAILED' && detail.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-3 mb-4 text-sm text-red-700">
          {detail.errorMessage}
        </div>
      )}

      {/* ── 분석 중 ── */}
      {detail.status === 'ANALYZING' && (
        <AnalyzingProgress serverStep={detail.analysisStep} />
      )}

      {/* ── 분석 완료 ── */}
      {latestAnalysis && detail.status === 'COMPLETED' && (
        <>
          {/* AI 총평 섹션 */}
          {!commentary ? (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-sm px-4 py-2.5 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-violet-600 rounded-sm flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">AI 시험 총평</h3>
                    {!commentaryLoading && <p className="text-[11px] text-slate-500">시험 전체에 대한 전문가 수준의 종합 평가를 받아보세요</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!commentaryLoading && (
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={handleGenerateCommentary}
                    >
                      총평 생성
                    </Button>
                  )}
                  {detail.schoolId && !commentaryLoading && (
                    <div className="flex items-center gap-3">
                      <label className={`flex items-center gap-1 text-[11px] cursor-pointer ${nearbyCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                        <input
                          type="checkbox"
                          checked={includeNearby && (nearbyCount ?? 0) > 0}
                          onChange={e => setIncludeNearby(e.target.checked)}
                          disabled={nearbyCount === 0}
                          className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                        />
                        주변 {nearbyCount != null && <span className={nearbyCount > 0 ? 'text-violet-500 font-medium' : ''}>({nearbyCount}교)</span>}
                      </label>
                      <label className={`flex items-center gap-1 text-[11px] cursor-pointer ${yearCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                        <input
                          type="checkbox"
                          checked={includeYearCompare && (yearCount ?? 0) > 0}
                          onChange={e => setIncludeYearCompare(e.target.checked)}
                          disabled={yearCount === 0}
                          className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                        />
                        연도 {yearCount != null && <span className={yearCount > 0 ? 'text-violet-500 font-medium' : ''}>({yearCount}건)</span>}
                      </label>
                    </div>
                  )}
                </div>
              </div>
              {commentaryLoading && (
                <div className="mt-3 px-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-violet-700">AI 분석 중...</span>
                    <span className="text-[11px] text-violet-500 tabular-nums">{commentaryElapsed}초</span>
                  </div>
                  <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.min(commentaryElapsed / 50 * 100, 95)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <CommentarySection
              commentary={commentary}
              questions={questions}
              onRegenerate={handleGenerateCommentary}
              isRegenerating={commentaryLoading}
              elapsedSeconds={commentaryElapsed}
              includeNearby={includeNearby}
              onIncludeNearbyChange={setIncludeNearby}
              nearbyCount={nearbyCount}
              includeYearCompare={includeYearCompare}
              onIncludeYearCompareChange={setIncludeYearCompare}
              yearCount={yearCount}
              hasSchool={!!detail.schoolId}
            />
          )}

          {/* 기출 분석 글 버튼 (총평 생성 후 활성화) */}
          {commentary && (() => {
            const hasArticle = latestAnalysis?.extensions?.some(e => e.agentType === 'blog-article');
            return (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  size="sm"
                  onClick={() => setShowArticleModal(true)}
                  className={hasArticle
                    ? 'bg-slate-700 hover:bg-slate-800 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  {hasArticle ? '기출 분석 글 확인' : '기출 분석 글 작성'}
                </Button>
                <span className="text-[11px] text-slate-400">
                  {hasArticle ? '저장된 글을 확인하거나 재생성할 수 있습니다' : 'AI가 블로그 글 + 차트 이미지를 자동 생성합니다'}
                </span>
              </div>
            );
          })()}

          {/* 탭 */}
          <div className="mb-5">
            <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} variant="underline" />
          </div>

          {/* 탭 컨텐츠 */}
          {activeTab === 'basic' && (
            <AnalysisResultView
              questions={questions}
              summary={summary}
              totalPoints={totalPoints ?? null}
              earnedPoints={latestAnalysis.earnedPoints ?? null}
              examType={detail.examType}
              examPaperId={detail.id}
              grade={detail.grade}
            />
          )}
          {activeTab === 'comments' && (
            <AnalysisCommentTab questions={questions} examPaperId={detail.id} />
          )}
          {activeTab === 'strategy' && (
            <StudyStrategyTab
              questions={questions}
              grade={detail.grade}
            />
          )}
        </>
      )}
      {/* 문제은행 추출 모달 */}
      {showExtractModal && (
        <ExtractToBankModal
          examPaperId={detail.id}
          grade={detail.grade}
          category={detail.category || undefined}
          examTitle={detail.title}
          onClose={() => setShowExtractModal(false)}
        />
      )}
      {/* 기출 분석 글 에디터 모달 */}
      {showArticleModal && (
        <ArticleEditorModal
          examPaperId={detail.id}
          schoolName={detail.schoolName}
          onClose={() => setShowArticleModal(false)}
        />
      )}

      {/* 시험 난이도 판단 기준 — 간이 모달 */}
      {showDiffModal && diffLevel > 0 && (() => {
        const breakdown = getDifficultyBreakdown(summary);
        const activeColor = DIFFICULTY_BAR_COLORS[diffLevel - 1];
        const levelLabel = DIFF_LEVEL_LABELS[diffLevel] ?? '';
        const distLabel = breakdown
          ? breakdown.counts.map((c, i) => `${i + 1}단계 ${c}문항`).join(' · ')
          : '';
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowDiffModal(false)}
          >
            <div
              className="bg-white rounded-sm shadow-xl max-w-md w-full p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    시험 난이도 <span style={{ color: activeColor }}>Level {diffLevel}</span>
                    <span className="text-slate-500 font-medium"> ({levelLabel})</span>
                  </h3>
                  {breakdown && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      가중평균 {breakdown.weightedAvg.toFixed(2)}/5 · 총 {breakdown.total}문항
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowDiffModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-sm leading-relaxed text-slate-700">
                <p>
                  AI가 시험지의 모든 문항을 <strong>1~5단계</strong> (1=기본 · 2=표준 · 3=응용 · 4=심화 · 5=최고난도) 로 분류한 뒤, 단계별 문항 수에 1~5의 가중치를 곱해 합산하고 총 문항 수로 나눠 <strong>가중평균</strong>을 구합니다.
                </p>
                {breakdown && (
                  <p>
                    이 시험은 분포가 <strong>{distLabel}</strong>로, 가중평균이 <strong>{breakdown.weightedAvg.toFixed(2)}점</strong>이 나와 반올림하여 <strong>Level {diffLevel}</strong>로 산정되었습니다.
                  </p>
                )}
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  평균 2.5점 미만은 평이한 시험(Lv 1~2), 3.5점 이상은 변별력이 높은 시험(Lv 4~5)으로 봅니다. 4·5단계 문항 비율이 높을수록 상위권 변별 의도가 강한 시험입니다.
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setShowDiffModal(false)}>닫기</Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
