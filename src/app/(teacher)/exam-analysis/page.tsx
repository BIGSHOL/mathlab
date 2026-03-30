'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { ExamPaperList } from '@/components/exam-analysis/ExamPaperList';
import { ExamUploadForm } from '@/components/exam-analysis/ExamUploadForm';
import { AnalysisResultView } from '@/components/exam-analysis/AnalysisResultView';
import { AnalysisCommentTab } from '@/components/exam-analysis/AnalysisCommentTab';
import { StudyStrategyTab } from '@/components/exam-analysis/StudyStrategyTab';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';
import { Plus, X, Settings2, Sparkles, Download, PanelLeftClose, PanelLeftOpen, FileSearch } from 'lucide-react';
import type { AnalyzedQuestion, AnalysisSummary } from '@/lib/exam-analysis/types';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/lib/constants/navigation';

interface ExamPaperData {
  id: string;
  title: string;
  subject: 'MATH' | 'ENGLISH';
  grade: string;
  examType: string;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  analysisStep: number;
  schoolName: string | null;
  errorMessage: string | null;
  createdAt: string;
  teacher: { id: string; name: string };
  student: { id: string; name: string } | null;
  analyses: Array<{
    id: string;
    questions: AnalyzedQuestion[];
    summary: Record<string, unknown> | null;
    totalQuestions: number | null;
    totalPoints: number | null;
    earnedPoints: number | null;
    analyzedAt: string | null;
    extensions: Array<{ id: string; agentType: string; result?: Record<string, unknown>; createdAt: string; errorMessage: string | null }>;
  }>;
}

export default function ExamAnalysisPage() {
  const { user } = useAuth();
  const isOwnerPlus = user ? hasMinRole(user.role as 'TEACHER' | 'MANAGER' | 'OWNER' | 'SUPER_ADMIN', 'OWNER') : false;
  const [items, setItems] = useState<ExamPaperData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ExamPaperData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // 필터
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterGrade, setFilterGrade] = useState<string>('');

  const limit = 20;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterSubject) params.set('subject', filterSubject);
      if (filterGrade) params.set('grade', filterGrade);
      const res = await fetch(`/api/exam-analysis?${params}`);
      const json = await res.json();
      setItems(json.data || []);
      setTotal(json.meta?.total || 0);
    } catch {
      toast.error('시험지 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [page, filterSubject, filterGrade]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // 상세 조회
  const fetchDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/exam-analysis/${id}`);
      const json = await res.json();
      setSelectedDetail(json.data);
    } catch {
      toast.error('상세 정보를 불러오지 못했습니다');
    }
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    else setSelectedDetail(null);
  }, [selectedId, fetchDetail]);

  // 분석 중 자동 폴링
  useEffect(() => {
    const hasAnalyzing = items.some(i => i.status === 'ANALYZING');
    if (!hasAnalyzing) return;

    const interval = setInterval(() => {
      fetchList();
      if (selectedId) fetchDetail(selectedId);
    }, 3000);

    return () => clearInterval(interval);
  }, [items, selectedId, fetchList, fetchDetail]);

  const handleAnalyze = async (id: string) => {
    setAnalyzing(true);
    try {
      // fire-and-forget: 서버에 분석 요청만 보내고 즉시 UI 갱신
      // 서버는 ANALYZING → (작업) → COMPLETED/FAILED 상태를 알아서 갱신
      // 클라이언트는 폴링(5초)으로 상태 변경 감지
      fetch(`/api/exam-analysis/${id}/analyze`, { method: 'POST' })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            toast.error(err.error?.message || '분석 실패');
          }
          // 서버 완료 시 즉시 갱신
          fetchList();
          if (selectedId === id) fetchDetail(id);
        })
        .catch(() => {
          toast.error('분석 요청에 실패했습니다');
        });

      // UI 즉시 반영: 목록 새로고침하여 ANALYZING 상태 표시
      await new Promise(r => setTimeout(r, 500));
      fetchList();
      if (selectedId === id) fetchDetail(id);
      toast.info('AI 분석이 시작되었습니다');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* 좌측 사이드바 */}
      <aside
        className={`shrink-0 border-r border-slate-200 bg-white flex-col transition-all duration-200 ${
          leftPanelCollapsed ? 'w-12 hidden md:flex' : 'w-full md:w-72'
        } ${selectedId ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          {!leftPanelCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <FileSearch className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-slate-800 truncate">기출 분석</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary shrink-0">
                {total}
              </span>
            </div>
          )}
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="p-1 rounded-sm hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
            title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
          >
            {leftPanelCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {!leftPanelCollapsed && (
          <div className="flex items-center gap-1 p-2 border-b">
            {isOwnerPlus && (
              <Link href="/exam-analysis/admin" className="flex-none">
                <Button size="sm" variant="ghost" title="패턴 관리">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Button size="sm" className="flex-1" onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-1" />
              업로드
            </Button>
          </div>
        )}
        {!leftPanelCollapsed && (loading ? (
          <div className="p-4 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : (
          <ExamPaperList
            items={items as unknown as Parameters<typeof ExamPaperList>[0]['items']}
            total={total}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onSelect={setSelectedId}
            onAnalyze={handleAnalyze}
            onDelete={(id) => {
              if (selectedId === id) { setSelectedId(null); setSelectedDetail(null); }
              fetchList();
            }}
            selectedId={selectedId}
          />
        ))}
      </aside>

      {/* 우측 메인 */}
      <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        {showUpload ? (
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">시험지 업로드</h2>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ExamUploadForm
              onSuccess={() => { setShowUpload(false); fetchList(); }}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        ) : selectedDetail ? (
          <AnalysisDetail
            detail={selectedDetail}
            analyzing={analyzing}
            onAnalyze={handleAnalyze}
            onRefresh={() => fetchDetail(selectedDetail.id)}
          />
        ) : selectedId && !selectedDetail ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-3" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p className="text-sm">시험지를 선택하거나 새로 업로드하세요</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ── 신뢰도 계산 ──
function getConfidenceInfo(questions: AnalyzedQuestion[]) {
  if (!questions.length) return { avg: 0, label: '없음', color: 'bg-slate-200 text-slate-600' };
  const avg = Math.round((questions.reduce((s, q) => s + (q.confidence || 0), 0) / questions.length) * 100);
  if (avg >= 85) return { avg, label: '높음', color: 'bg-green-100 text-green-700 border border-green-200' };
  if (avg >= 70) return { avg, label: '보통', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
  return { avg, label: '낮음', color: 'bg-red-100 text-red-700 border border-red-200' };
}

// ── 종합 등급 계산 ──
function getOverallGrade(summary: AnalysisSummary | null): { grade: string; color: string; bg: string } {
  if (!summary?.difficulty_distribution) return { grade: '-', color: '#6B7280', bg: '#F3F4F6' };
  const d = summary.difficulty_distribution;
  const total = (d.concept || 0) + (d.pattern || 0) + (d.reasoning || 0) + (d.creative || 0);
  if (!total) return { grade: '-', color: '#6B7280', bg: '#F3F4F6' };

  // 가중평균: concept=1, pattern=2, reasoning=3, creative=4
  const weightedAvg = ((d.concept || 0) * 1 + (d.pattern || 0) * 2 + (d.reasoning || 0) * 3 + (d.creative || 0) * 4) / total;

  if (weightedAvg >= 3.5) return { grade: 'A+', color: '#FFFFFF', bg: '#DC2626' };
  if (weightedAvg >= 3.0) return { grade: 'A', color: '#FFFFFF', bg: '#EF4444' };
  if (weightedAvg >= 2.5) return { grade: 'B+', color: '#FFFFFF', bg: '#F97316' };
  if (weightedAvg >= 2.0) return { grade: 'B', color: '#FFFFFF', bg: '#F59E0B' };
  if (weightedAvg >= 1.5) return { grade: 'C+', color: '#FFFFFF', bg: '#3B82F6' };
  if (weightedAvg >= 1.2) return { grade: 'C', color: '#FFFFFF', bg: '#6366F1' };
  return { grade: 'D', color: '#FFFFFF', bg: '#6B7280' };
}

// ── 난이도별 문항 수 ──
function getDifficultyBreakdown(summary: AnalysisSummary | null) {
  if (!summary?.difficulty_distribution) return [];
  const d = summary.difficulty_distribution;
  return [
    { key: 'concept', label: '개념', count: d.concept || 0, color: '#10B981' },
    { key: 'pattern', label: '유형', count: d.pattern || 0, color: '#3B82F6' },
    { key: 'reasoning', label: '추론', count: d.reasoning || 0, color: '#F97316' },
    { key: 'creative', label: '창의', count: d.creative || 0, color: '#EF4444' },
  ].filter(x => x.count > 0);
}

// ── 분석 결과 상세 뷰 ──
type AnalysisTab = 'basic' | 'comments' | 'strategy';

function AnalysisDetail({ detail, analyzing, onAnalyze, onRefresh }: {
  detail: ExamPaperData;
  analyzing: boolean;
  onAnalyze: (id: string) => void;
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('basic');
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const latestAnalysis = detail.analyses?.[0];
  const questions = latestAnalysis?.questions || [];
  const summary = (latestAnalysis?.summary || null) as AnalysisSummary | null;
  const totalPoints = latestAnalysis?.totalPoints;

  const confidenceInfo = useMemo(() => getConfidenceInfo(questions), [questions]);
  const gradeInfo = useMemo(() => getOverallGrade(summary), [summary]);
  const diffBreakdown = useMemo(() => getDifficultyBreakdown(summary), [summary]);

  // 총평 데이터: extensions에서 commentary 에이전트 결과 추출
  const commentaryExt = latestAnalysis?.extensions?.find(e => e.agentType === 'commentary');
  const commentary = (commentaryExt?.result as unknown as CommentaryResult) ?? null;

  const handleGenerateCommentary = async () => {
    if (!latestAnalysis) return;
    setCommentaryLoading(true);
    try {
      const res = await fetch(`/api/exam-analysis/${detail.id}/analyze-extended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: ['commentary'], forceRegenerate: !!commentary }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error?.message || '총평 생성에 실패했습니다');
        return;
      }
      toast.success('총평이 생성되었습니다');
      onRefresh();
    } catch {
      toast.error('총평 생성 중 오류가 발생했습니다');
    } finally {
      setCommentaryLoading(false);
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
                </>
              )}
            </div>
          </div>

          {/* 우측: 버튼 + 등급 뱃지 */}
          <div className="flex items-center gap-3 shrink-0">
            {detail.status === 'COMPLETED' && (
              <Link href={`/exam-analysis/${detail.id}/print`}>
                <Button size="sm" variant="secondary">
                  <Download className="w-4 h-4 mr-1" /> 내보내기
                </Button>
              </Link>
            )}
            {(detail.status === 'PENDING' || detail.status === 'FAILED') && (
              <Button onClick={() => onAnalyze(detail.id)} disabled={analyzing}>
                {analyzing ? '분석 중...' : '분석 실행'}
              </Button>
            )}

            {/* 종합 등급 원형 뱃지 + 난이도 분포 */}
            {detail.status === 'COMPLETED' && diffBreakdown.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-right text-[10px] text-slate-500 leading-tight">종합<br/>난이도</div>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shadow-sm"
                  style={{ backgroundColor: gradeInfo.bg, color: gradeInfo.color }}
                >
                  {gradeInfo.grade}
                </div>
                <div className="text-[11px] leading-relaxed">
                  {diffBreakdown.map(d => (
                    <div key={d.key} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.label}</span>
                      <span className="text-slate-800 font-medium ml-0.5">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-sm p-4 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">AI 시험 총평</p>
                  <p className="text-xs text-slate-500">시험 전체에 대한 전문가 수준의 종합 평가를 받아보세요</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleGenerateCommentary}
                disabled={commentaryLoading}
              >
                {commentaryLoading ? '생성 중...' : '총평 생성'}
              </Button>
            </div>
          ) : (
            <CommentarySection
              commentary={commentary}
              onRegenerate={handleGenerateCommentary}
              isRegenerating={commentaryLoading}
            />
          )}

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
            />
          )}
          {activeTab === 'comments' && (
            <AnalysisCommentTab questions={questions} examPaperId={detail.id} />
          )}
          {activeTab === 'strategy' && (
            <StudyStrategyTab
              questions={questions}
              summary={summary}
              analysisId={latestAnalysis.id}
              extensions={latestAnalysis.extensions}
              onRefresh={onRefresh}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── AI 총평 결과 표시 ──

function CommentarySection({ commentary, onRegenerate, isRegenerating }: {
  commentary: CommentaryResult;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-sm p-5 mb-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI 시험 총평</h3>
            <p className="text-[11px] text-slate-500">전문가 수준의 종합 평가 및 인사이트</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-xs text-violet-600 hover:text-violet-700"
          >
            {isRegenerating ? '재생성 중...' : '재생성'}
          </Button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* 전체 평가 */}
          {commentary.overall_comment && (
            <div className="bg-white/70 rounded-sm p-4 border border-violet-200">
              <h4 className="text-xs font-semibold text-violet-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-violet-500 rounded-full" />
                종합 평가
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">{commentary.overall_comment}</p>
            </div>
          )}

          {/* 강점 & 개선점 (2열) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commentary.strength_areas?.length > 0 && (
              <div className="bg-white/70 rounded-sm p-4 border border-green-200">
                <h4 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-green-500 rounded-full" />
                  강점 영역
                </h4>
                <ul className="space-y-1">
                  {commentary.strength_areas.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span className="text-green-500 mt-0.5 shrink-0">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {commentary.improvement_areas?.length > 0 && (
              <div className="bg-white/70 rounded-sm p-4 border border-amber-200">
                <h4 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-amber-500 rounded-full" />
                  개선 영역
                </h4>
                <ul className="space-y-1">
                  {commentary.improvement_areas.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 주목할 문항 */}
          {commentary.notable_questions?.length > 0 && (
            <div className="bg-white/70 rounded-sm p-4 border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-slate-500 rounded-full" />
                주목할 문항
              </h4>
              <div className="space-y-1.5">
                {commentary.notable_questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 font-bold text-slate-700">{q.question_number}번</span>
                    <span className="text-slate-600">{q.comment}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 학습 우선순위 */}
          {commentary.study_priority?.length > 0 && (
            <div className="bg-white/70 rounded-sm p-4 border border-blue-200">
              <h4 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-blue-500 rounded-full" />
                학습 우선순위
              </h4>
              <div className="space-y-1.5">
                {commentary.study_priority.map((sp, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-blue-600 text-white' : i === 1 ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {sp.priority}
                    </span>
                    <span className="font-medium text-slate-800">{sp.topic}</span>
                    <span className="text-slate-500">{sp.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 격려 메시지 */}
          {commentary.encouragement && (
            <p className="text-xs text-violet-700 italic text-center pt-1">
              &quot;{commentary.encouragement}&quot;
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 분석 진행 상태 컴포넌트 (실제 서버 단계 기반) ──

const ANALYSIS_STEPS = [
  { label: '파일 로드', description: '시험지 이미지를 읽고 있습니다' },
  { label: '분류', description: '학년/과목에 맞는 분석 규칙을 준비합니다' },
  { label: 'AI 분석', description: '문항이 많으면 시간이 더 걸릴 수 있습니다' },
  { label: '저장', description: '분석 결과를 저장합니다' },
];

function AnalyzingProgress({ serverStep }: { serverStep: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSteps = ANALYSIS_STEPS.length;

  return (
    <div className="bg-slate-50 border rounded-sm p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm font-medium text-slate-700">분석 중...</span>
        </div>
        <span className="text-xs text-slate-400">{elapsed}초 경과</span>
      </div>

      {/* 스텝 인디케이터 (수평 라인) */}
      <div className="flex items-center gap-0 mb-3">
        {ANALYSIS_STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isDone = serverStep > stepNum;
          const isActive = serverStep === stepNum;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              {/* 원형 인디케이터 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                isDone ? 'bg-green-500 text-white' :
                isActive ? 'bg-primary text-white' :
                'bg-slate-200 text-slate-400'
              }`}>
                {isDone ? '✓' : stepNum}
              </div>

              {/* 연결선 (마지막 제외) */}
              {i < totalSteps - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-colors ${
                  isDone ? 'bg-green-400' : 'bg-slate-200'
                }`} />
              )}
            </div>
          );
        })}

        {/* 진행률 텍스트 */}
        <span className="ml-3 text-xs text-slate-500 shrink-0">
          {serverStep}/{totalSteps}
        </span>
      </div>

      {/* 현재 단계 설명 */}
      {serverStep > 0 && serverStep <= totalSteps && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-medium ${serverStep <= totalSteps ? 'text-primary' : 'text-green-600'}`}>
            {ANALYSIS_STEPS[serverStep - 1].label}
          </span>
          <span className="text-slate-400 text-xs">
            {ANALYSIS_STEPS[serverStep - 1].description}
          </span>
        </div>
      )}
    </div>
  );
}
