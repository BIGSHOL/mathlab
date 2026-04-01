'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { ExamPaperList } from '@/components/exam-analysis/ExamPaperList';
import { ExamUploadForm } from '@/components/exam-analysis/ExamUploadForm';
import { AnalysisResultView } from '@/components/exam-analysis/AnalysisResultView';
import { AnalysisCommentTab } from '@/components/exam-analysis/AnalysisCommentTab';
import { StudyStrategyTab } from '@/components/exam-analysis/StudyStrategyTab';
import { ExtractToBankModal } from '@/components/exam-analysis/ExtractToBankModal';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';
import { Plus, X, Settings2, Sparkles, Download, Database, PanelLeftClose, PanelLeftOpen, FileSearch } from 'lucide-react';
import type { AnalyzedQuestion, AnalysisSummary } from '@/lib/exam-analysis/types';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/lib/constants/navigation';

interface ExamPaperData {
  id: string;
  title: string;
  subject: 'MATH' | 'ENGLISH';
  grade: string;
  category: string | null;
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
  const [filterSubject, _setFilterSubject] = useState<string>('');
  const [filterGrade, _setFilterGrade] = useState<string>('');

  const limit = 20;

  const fetchList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterSubject) params.set('subject', filterSubject);
      if (filterGrade) params.set('grade', filterGrade);
      const res = await fetch(`/api/exam-analysis?${params}`);
      const json = await res.json();
      setItems(json.data || []);
      setTotal(json.meta?.total || 0);
    } catch {
      if (!silent) toast.error('시험지 목록을 불러오지 못했습니다');
    } finally {
      if (!silent) setLoading(false);
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

  // 분석 중 자동 폴링 — items를 ref로 추적하여 interval 재생성 방지
  const hasAnalyzing = items.some(i => i.status === 'ANALYZING');
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    if (!hasAnalyzing) return;

    const interval = setInterval(() => {
      fetchList(true);
      if (selectedIdRef.current) fetchDetail(selectedIdRef.current);
    }, 3000);

    return () => clearInterval(interval);
  }, [hasAnalyzing, fetchList, fetchDetail]);

  const handleAnalyze = async (id: string) => {
    setAnalyzing(true);
    // 즉시 로컬 상태를 ANALYZING으로 변경 (폴링 트리거 + UI 즉시 반영)
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'ANALYZING' as const } : item
    ));
    toast.info('AI 분석이 시작되었습니다');
    try {
      // fire-and-forget: 서버에 분석 요청, 완료 시 갱신
      fetch(`/api/exam-analysis/${id}/analyze`, { method: 'POST' })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            toast.error(err.error?.message || '분석 실패');
          }
          // 서버 완료 시 즉시 갱신 (silent: 로딩 표시 안 함)
          fetchList(true);
          if (selectedId === id) fetchDetail(id);
        })
        .catch(() => {
          toast.error('분석 요청에 실패했습니다');
          // 실패 시 상태 복원
          setItems(prev => prev.map(item =>
            item.id === id ? { ...item, status: 'FAILED' as const } : item
          ));
        });
      // 폴링이 3초마다 상태 확인하므로 여기서 fetchList 안 함
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

// ── 종합 난이도 (1~5) 계산 ──
const DIFF_BAR_COLORS = ['#22C55E', '#84CC16', '#F59E0B', '#F97316', '#EF4444'];

function getOverallDifficultyLevel(summary: AnalysisSummary | null): number {
  if (!summary?.difficulty_distribution) return 0;
  const d = summary.difficulty_distribution;

  // 5단계 키 우선, 구 키 폴백
  const counts = [
    (d['1'] || d.concept || 0),
    (d['2'] || d.pattern || 0),
    (d['3'] || 0),
    (d['4'] || d.reasoning || 0),
    (d['5'] || d.creative || 0),
  ];
  const total = counts.reduce((s, c) => s + c, 0);
  if (!total) return 0;

  const weightedAvg = counts.reduce((s, c, i) => s + c * (i + 1), 0) / total;
  return Math.round(weightedAvg); // 1~5
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
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryStartTime, setCommentaryStartTime] = useState<number | null>(null);
  const [commentaryElapsed, setCommentaryElapsed] = useState(0);

  // 기출지 변경 시 탭 초기화
  useEffect(() => {
    setActiveTab('basic');
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
    setCommentaryLoading(true);
    setCommentaryStartTime(Date.now());
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
      setCommentaryStartTime(null);
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
                <Button size="sm" variant="secondary" onClick={() => setShowExtractModal(true)}>
                  <Database className="w-4 h-4 mr-1" /> 문제은행에 추가
                </Button>
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

            {/* 종합 난이도 카드 */}
            {detail.status === 'COMPLETED' && diffLevel > 0 && (() => {
              const activeColor = DIFF_BAR_COLORS[diffLevel - 1];
              return (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-sm border" style={{ borderColor: `${activeColor}50`, backgroundColor: `${activeColor}0A` }}>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-500">시험 난이도</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(level => {
                        const isActive = level === diffLevel;
                        const color = DIFF_BAR_COLORS[level - 1];
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
                  </div>
                </div>
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
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-sm p-4 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center ${commentaryLoading ? 'animate-pulse' : ''}`}>
                    <Sparkles className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">AI 시험 총평</p>
                    <p className="text-xs text-slate-500">
                      {commentaryLoading
                        ? `AI가 시험을 분석하고 있습니다... (${commentaryElapsed}초)`
                        : '시험 전체에 대한 전문가 수준의 종합 평가를 받아보세요'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={handleGenerateCommentary}
                  disabled={commentaryLoading}
                >
                  {commentaryLoading ? `${commentaryElapsed}초 경과` : '총평 생성'}
                </Button>
              </div>
              {commentaryLoading && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-violet-600 mb-1">
                    <span>문항 분석 → 종합 평가 → 전략 수립</span>
                    <span>약 30~60초 소요</span>
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
    </div>
  );
}

// ── AI 총평 텍스트 하이라이트 ──

/** 숫자/키워드에 종류별 다른 색상 하이라이트 */
function highlightText(text: string): React.ReactNode {
  // 그룹별 패턴: 숫자+단위 | 난이도/위험 | 형식 | 영역/범위 | 기타 강조
  const pattern = /(\d+(?:\.\d+)?(?:점대?|문항|번|개|단계))|(?:최고난도|고난도|기본|표준|응용|심화|킬러|변별력|취약)|(?:서술형\d*|객관식|단답형)|(?:상위권|최상위권|중상위권|하위권|핵심|필수적?|복합|다단계)|(?:'[^']+?'|'[^']+?')/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const word = match[0];
    let cls: string;

    if (/^\d/.test(word)) {
      // 숫자: 진한 볼드
      cls = 'font-bold text-slate-900 text-[13px]';
    } else if (/최고난도|고난도|킬러|변별력|취약/.test(word)) {
      // 난이도/위험: 빨간 계열
      cls = 'font-bold text-red-600 bg-red-50 px-0.5 rounded-sm text-[13px]';
    } else if (/서술형|객관식|단답형/.test(word)) {
      // 형식: 파란 계열
      cls = 'font-bold text-blue-600 bg-blue-50 px-0.5 rounded-sm text-[13px]';
    } else if (/상위권|최상위권|중상위권|하위권/.test(word)) {
      // 등급: 녹색 계열
      cls = 'font-bold text-emerald-600 bg-emerald-50 px-0.5 rounded-sm text-[13px]';
    } else if (/[''']/.test(word[0])) {
      // 인용 (단원명 등): 보라 계열
      cls = 'font-semibold text-violet-700 bg-violet-50 px-0.5 rounded-sm text-[13px]';
    } else {
      // 핵심/필수/복합 등: 보라 계열
      cls = 'font-bold text-violet-700 bg-violet-100/60 px-0.5 rounded-sm text-[13px]';
    }

    parts.push(<span key={match.index} className={cls}>{word}</span>);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

const FORMAT_BADGE: Record<string, { label: string; cls: string }> = {
  objective: { label: '객관식', cls: 'bg-sky-100 text-sky-700' },
  short_answer: { label: '단답형', cls: 'bg-teal-100 text-teal-700' },
  essay: { label: '서술형', cls: 'bg-amber-100 text-amber-700' },
};

// ── AI 총평 결과 표시 ──

function CommentarySection({ commentary, questions: allQuestions, onRegenerate, isRegenerating, elapsedSeconds = 0 }: {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  onRegenerate: () => void;
  isRegenerating: boolean;
  elapsedSeconds?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 폴백 감지: 규칙 기반 결과는 overall_comment가 "총 N문항"으로 시작
  const isFallback = commentary.overall_comment?.startsWith('총 ') && !commentary.overall_comment?.includes('이번 시험');

  return (
    <div className={`bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-sm mb-5 ${isExpanded ? 'p-5' : 'px-4 py-2.5'}`}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between ${isExpanded ? 'mb-4' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className={`${isExpanded ? 'w-9 h-9' : 'w-7 h-7'} bg-violet-600 rounded-sm flex items-center justify-center shrink-0`}>
            <Sparkles className={`${isExpanded ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-white`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI 시험 총평</h3>
            {isExpanded && <p className="text-[11px] text-slate-500">전문가 수준의 종합 평가 및 인사이트</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isRegenerating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRegenerate}
              className={`text-xs ${isFallback ? 'text-amber-600 hover:text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {isFallback ? 'AI 재분석' : '재분석'}
            </Button>
          )}
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

      {isExpanded && isFallback && !isRegenerating && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 mb-3 flex items-center gap-2">
          <span className="text-amber-500 text-xs">&#9888;</span>
          <p className="text-xs text-amber-700">AI 총평 생성에 실패하여 규칙 기반 요약으로 대체되었습니다. &quot;AI 재분석&quot; 버튼으로 다시 시도할 수 있습니다.</p>
        </div>
      )}

      {isRegenerating && (
        <div className="mb-3 bg-violet-50 border border-violet-200 rounded-sm px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-violet-700">AI 재분석 중...</span>
            <span className="text-[11px] text-violet-500 tabular-nums">{elapsedSeconds}초</span>
          </div>
          <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(elapsedSeconds / 60 * 100, 95)}%` }}
            />
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3">
          {/* 종합 분석 */}
          {commentary.overall_comment && (
            <div className="bg-white/70 rounded-sm p-4 border border-violet-200">
              <h4 className="text-xs font-semibold text-violet-800 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-violet-500 rounded-full" />
                종합 분석
              </h4>
              <div className="space-y-2">
                {commentary.overall_comment.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i} className="text-sm text-slate-700 leading-relaxed">{highlightText(para.trim())}</p>
                ))}
              </div>
            </div>
          )}

          {/* 등급별 점수 확보 전략 */}
          {commentary.score_strategies && commentary.score_strategies.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-indigo-800 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                등급별 점수 확보 전략
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {commentary.score_strategies.map((s, i) => {
                  const colors = [
                    { border: 'border-amber-300', bg: 'bg-amber-50', badge: 'bg-amber-500', label: 'text-amber-800' },
                    { border: 'border-blue-300', bg: 'bg-blue-50', badge: 'bg-blue-500', label: 'text-blue-800' },
                    { border: 'border-slate-300', bg: 'bg-slate-50', badge: 'bg-slate-500', label: 'text-slate-700' },
                  ];
                  const c = colors[i] || colors[2];
                  return (
                    <div key={i} className={`rounded-sm border ${c.border} ${c.bg} p-3`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white ${c.badge}`}>
                          {s.grade.split(' ')[0] || `${i + 1}등급`}
                        </span>
                        <span className={`text-xs font-semibold ${c.label}`}>{s.target}</span>
                      </div>
                      {s.points && s.points.length > 0 ? (
                        <ul className="space-y-1">
                          {s.points.map((p, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-slate-700">
                              <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                              <span>{highlightText(p)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : s.strategy ? (
                        <p className="text-xs text-slate-700 leading-relaxed">{highlightText(s.strategy)}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : commentary.score_strategy ? (
            <div className="bg-white/70 rounded-sm p-4 border border-indigo-200">
              <h4 className="text-xs font-semibold text-indigo-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                점수 확보 전략
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">{highlightText(commentary.score_strategy)}</p>
            </div>
          ) : null}

          {/* 강점 & 보완점 (2열) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commentary.strength_areas?.length > 0 && (
              <div className="bg-white/70 rounded-sm p-4 border border-green-200">
                <h4 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-green-500 rounded-full" />
                  강점 영역
                </h4>
                <ul className="space-y-1.5">
                  {commentary.strength_areas.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span className="text-green-500 mt-0.5 shrink-0">+</span>
                      <span>{highlightText(s)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {commentary.improvement_areas?.length > 0 && (
              <div className="bg-white/70 rounded-sm p-4 border border-amber-200">
                <h4 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-amber-500 rounded-full" />
                  주의 영역
                </h4>
                <ul className="space-y-1.5">
                  {commentary.improvement_areas.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                      <span>{highlightText(s)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 주목할 문항 */}
          {commentary.notable_questions?.length > 0 && (
            <div className="bg-white/70 rounded-sm p-4 border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-slate-500 rounded-full" />
                주목할 문항
              </h4>
              <div className="space-y-2.5">
                {[...commentary.notable_questions].sort((a, b) => {
                  const aStr = String(a.question_number);
                  const bStr = String(b.question_number);
                  const aIsEssay = /[^\d]/.test(aStr);
                  const bIsEssay = /[^\d]/.test(bStr);
                  // 객관식(숫자만) 먼저, 서술형(문자포함) 나중
                  if (aIsEssay !== bIsEssay) return aIsEssay ? 1 : -1;
                  // 같은 그룹 내에서는 숫자 추출 후 정렬
                  const aNum = parseInt(aStr.replace(/\D/g, '')) || 999;
                  const bNum = parseInt(bStr.replace(/\D/g, '')) || 999;
                  return aNum - bNum;
                }).map((q, i) => {
                  const qRaw = String(q.question_number || i + 1);
                  const qNumOnly = qRaw.replace(/\D/g, '') || qRaw;
                  // 실제 문항 매칭: 정확 → 숫자 부분 일치
                  const matched = allQuestions.find(aq => String(aq.question_number) === qRaw)
                    || allQuestions.find(aq => String(aq.question_number).replace(/\D/g, '') === qNumOnly);
                  const format = matched?.question_format || null;
                  const fmt = format ? FORMAT_BADGE[format] : null;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-sm bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                          {qNumOnly}
                        </span>
                        {fmt && (
                          <span className={`text-[9px] font-medium px-1 py-0.5 rounded-sm ${fmt.cls}`}>
                            {fmt.label}
                          </span>
                        )}
                      </div>
                      <p className="flex-1 text-xs text-slate-700 leading-relaxed pt-1">{highlightText(q.comment)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 지도 추천 (teaching_recommendations 우선, 레거시 study_priority 폴백) */}
          {(() => {
            const recs = commentary.teaching_recommendations ?? commentary.study_priority ?? [];
            if (recs.length === 0) return null;
            return (
              <div className="bg-white/70 rounded-sm p-4 border border-blue-200">
                <h4 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-blue-500 rounded-full" />
                  지도 추천
                </h4>
                <div className="space-y-1.5">
                  {recs.map((sp, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? 'bg-blue-600 text-white' : i === 1 ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sp.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800">{sp.topic}</p>
                        <p className="text-slate-500 mt-0.5">{highlightText(sp.reason)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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
