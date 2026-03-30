'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ExamPaperList } from '@/components/exam-analysis/ExamPaperList';
import { ExamUploadForm } from '@/components/exam-analysis/ExamUploadForm';
import { AnalysisResultView } from '@/components/exam-analysis/AnalysisResultView';
import { ExtendedReportView } from '@/components/exam-analysis/ExtendedReportView';
import { StatusBadge } from '@/components/exam-analysis/StatusBadge';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';
import { Plus, X, Printer, Settings2 } from 'lucide-react';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

interface ExamPaperData {
  id: string;
  title: string;
  subject: 'MATH' | 'ENGLISH';
  grade: string;
  examType: string;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
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
    extensions: Array<{ id: string; agentType: string; createdAt: string; errorMessage: string | null }>;
  }>;
}

export default function ExamAnalysisPage() {
  const [items, setItems] = useState<ExamPaperData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ExamPaperData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const limit = 20;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exam-analysis?page=${page}&limit=${limit}`);
      const json = await res.json();
      setItems(json.data || []);
      setTotal(json.meta?.total || 0);
    } catch {
      toast.error('시험지 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [page]);

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

  const latestAnalysis = selectedDetail?.analyses?.[0];

  return (
    <div className="flex-1 flex min-h-0">
      {/* 좌측 사이드바 */}
      <aside className="w-72 border-r flex flex-col bg-white">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">기출 분석</h2>
          <div className="flex gap-1">
            <Link href="/exam-analysis/admin">
              <Button size="sm" variant="ghost" title="패턴 관리">
                <Settings2 className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-1" />
              업로드
            </Button>
          </div>
        </div>
        {loading ? (
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
        )}
      </aside>

      {/* 우측 메인 */}
      <main className="flex-1 overflow-y-auto p-6">
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
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selectedDetail.title}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedDetail.subject === 'MATH' ? '수학' : '영어'} · {selectedDetail.grade}
                  {selectedDetail.schoolName && ` · ${selectedDetail.schoolName}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedDetail.status} />
                {selectedDetail.status === 'COMPLETED' && (
                  <Link href={`/exam-analysis/${selectedDetail.id}/print`}>
                    <Button size="sm" variant="outline">
                      <Printer className="w-4 h-4 mr-1" /> 인쇄
                    </Button>
                  </Link>
                )}
                {(selectedDetail.status === 'PENDING' || selectedDetail.status === 'FAILED') && (
                  <Button onClick={() => handleAnalyze(selectedDetail.id)} disabled={analyzing}>
                    {analyzing ? '분석 중...' : '분석 실행'}
                  </Button>
                )}
              </div>
            </div>

            {selectedDetail.status === 'FAILED' && selectedDetail.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-sm p-3 mb-4 text-sm text-red-700">
                {selectedDetail.errorMessage}
              </div>
            )}

            {selectedDetail.status === 'ANALYZING' && (
              <AnalyzingProgress />
            )}

            {latestAnalysis && selectedDetail.status === 'COMPLETED' && (
              <>
                <AnalysisResultView
                  questions={latestAnalysis.questions}
                  summary={latestAnalysis.summary as Parameters<typeof AnalysisResultView>[0]['summary']}
                  totalPoints={latestAnalysis.totalPoints}
                  earnedPoints={latestAnalysis.earnedPoints}
                  examType={selectedDetail.examType}
                />

                {/* 확장 분석 리포트 */}
                <div className="mt-8">
                  <ExtendedReportView
                    analysisId={latestAnalysis.id}
                    extensions={latestAnalysis.extensions as unknown as Parameters<typeof ExtendedReportView>[0]['extensions']}
                    onRefresh={() => fetchDetail(selectedDetail.id)}
                  />
                </div>
              </>
            )}
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

// ── 분석 진행 상태 컴포넌트 ──

const ANALYSIS_STEPS = [
  { label: '파일 로드', description: '시험지 이미지를 읽고 있습니다', duration: '2-3초' },
  { label: '프롬프트 구성', description: '학년/과목에 맞는 분석 규칙을 준비합니다', duration: '1초' },
  { label: 'AI 문항 분석', description: 'Gemini가 각 문항의 난이도, 유형, 단원을 판별합니다', duration: '15-30초' },
  { label: '결과 검증', description: '배점 합계, 난이도 분포 등을 교차 검증합니다', duration: '1-2초' },
  { label: 'DB 저장', description: '분석 결과를 저장합니다', duration: '1초' },
];

function AnalyzingProgress() {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // 단계별 타이밍 시뮬레이션
    const timings = [2000, 3000, 20000, 25000, 28000];
    const timers = timings.map((t, i) =>
      setTimeout(() => setStep(i), t)
    );

    // 경과 시간
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-slate-50 border rounded-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm font-medium text-slate-700">AI 분석 진행 중...</span>
        <span className="text-xs text-slate-400 ml-auto">{elapsed}초 경과</span>
      </div>

      <div className="space-y-3">
        {ANALYSIS_STEPS.map((s, i) => {
          const isActive = i === step;
          const isDone = i < step;

          return (
            <div key={i} className="flex items-start gap-3">
              {/* 스텝 인디케이터 */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                isDone ? 'bg-green-500 text-white' :
                isActive ? 'bg-primary text-white animate-pulse' :
                'bg-slate-200 text-slate-400'
              }`}>
                {isDone ? '✓' : i + 1}
              </div>

              {/* 스텝 내용 */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  isDone ? 'text-green-700' :
                  isActive ? 'text-slate-800' :
                  'text-slate-400'
                }`}>
                  {s.label}
                  {isActive && <span className="ml-2 text-xs text-slate-400">({s.duration})</span>}
                </div>
                {(isActive || isDone) && (
                  <p className={`text-xs mt-0.5 ${isDone ? 'text-green-600' : 'text-slate-500'}`}>
                    {isDone ? '완료' : s.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        PDF 페이지 수에 따라 30초~1분 소요될 수 있습니다
      </p>
    </div>
  );
}
