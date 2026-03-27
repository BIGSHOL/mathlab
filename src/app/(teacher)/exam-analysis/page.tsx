'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ExamPaperList } from '@/components/exam-analysis/ExamPaperList';
import { ExamUploadForm } from '@/components/exam-analysis/ExamUploadForm';
import { AnalysisResultView } from '@/components/exam-analysis/AnalysisResultView';
import { ExtendedReportView } from '@/components/exam-analysis/ExtendedReportView';
import { StatusBadge } from '@/components/exam-analysis/StatusBadge';
import { toast } from '@/components/ui/Toast';
import { Plus, X } from 'lucide-react';
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
    }, 5000);

    return () => clearInterval(interval);
  }, [items, selectedId, fetchList, fetchDetail]);

  const handleAnalyze = async (id: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/exam-analysis/${id}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || '분석 실패');
      }
      toast.success('분석이 시작되었습니다');
      fetchList();
      if (selectedId === id) fetchDetail(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '분석에 실패했습니다');
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
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="w-4 h-4 mr-1" />
            업로드
          </Button>
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
              <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 text-center text-sm text-blue-700">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                AI가 시험지를 분석하고 있습니다. 잠시만 기다려주세요...
              </div>
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
