'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ExamPaperList } from '@/components/exam-analysis/ExamPaperList';
import { ExamUploadForm } from '@/components/exam-analysis/ExamUploadForm';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';
import { Plus, X, Settings2, PanelLeftClose, PanelLeftOpen, FileSearch } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/lib/constants/navigation';
import type { ExamPaperData } from './types';
import { AnalysisDetail } from './AnalysisDetail';

export default function ExamAnalysisPage() {
  const { user } = useAuth();
  const isOwnerPlus = user ? hasMinRole(user.role as 'TEACHER' | 'MANAGER' | 'OWNER' | 'SUPER_ADMIN', 'OWNER') : false;
  const isManagerPlus = user ? hasMinRole(user.role as 'TEACHER' | 'MANAGER' | 'OWNER' | 'SUPER_ADMIN', 'MANAGER') : false;
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
      if (!res.ok) {
        // 503/500/403 등의 응답을 빈 목록으로 삼키지 말고 사용자에게 노출
        const err = await res.json().catch(() => null);
        const code = err?.error?.code as string | undefined;
        if (!silent) {
          if (res.status === 503 || code === 'MAINTENANCE') {
            toast.warning('시스템 점검 중입니다. 잠시 후 다시 이용해 주세요');
          } else if (res.status === 403) {
            toast.error(err?.error?.message || '시험지 목록에 접근할 권한이 없습니다');
          } else {
            toast.error(err?.error?.message || '시험지 목록을 불러오지 못했습니다');
          }
        }
        setItems([]);
        setTotal(0);
        return;
      }
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

  // 분석 중 자동 폴링 — ref로 함수 참조하여 interval 재생성 방지
  // selectedDetail.status도 확인 — 사이드바 items 갱신 전이라도 detail이 ANALYZING이면 polling 시작
  const hasAnalyzing = items.some(i => i.status === 'ANALYZING') || selectedDetail?.status === 'ANALYZING';
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const pollCountRef = useRef(0);
  const fetchListRef = useRef(fetchList);
  fetchListRef.current = fetchList;
  const fetchDetailRef = useRef(fetchDetail);
  fetchDetailRef.current = fetchDetail;

  useEffect(() => {
    if (!hasAnalyzing) {
      pollCountRef.current = 0;
      return;
    }

    const MAX_POLLS = 60; // 최대 3분 (3초 × 60)
    const interval = setInterval(() => {
      pollCountRef.current++;
      if (pollCountRef.current > MAX_POLLS) {
        clearInterval(interval);
        // 클라이언트에서 강제로 ANALYZING → FAILED 전환 (무한폴링 방지)
        setItems(prev => prev.map(item =>
          item.status === 'ANALYZING' ? { ...item, status: 'FAILED' as const } : item
        ));
        toast.warning('분석 시간이 초과되었습니다. 다시 시도해주세요.');
        return;
      }
      fetchListRef.current(true);
      if (selectedIdRef.current) fetchDetailRef.current(selectedIdRef.current);
    }, 3000);

    return () => clearInterval(interval);
  }, [hasAnalyzing]);

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
            canEditSchool={isManagerPlus}
            onUpdate={(id, data) => {
              setItems(prev => prev.map(item =>
                item.id === id ? { ...item, ...data } as ExamPaperData : item
              ));
            }}
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
