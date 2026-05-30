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
import { sumPoints, roundPoints } from '@/lib/exam-analysis/points';

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
  // 분석 시 총평 자동 생성 옵션 (localStorage 기억)
  const [autoCommentary, setAutoCommentary] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAutoCommentary(localStorage.getItem('mathlab_auto_commentary') === '1');
    }
  }, []);
  const toggleAutoCommentary = useCallback((v: boolean) => {
    setAutoCommentary(v);
    if (typeof window !== 'undefined') localStorage.setItem('mathlab_auto_commentary', v ? '1' : '0');
  }, []);

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

  // 상세 조회 (cache:'no-store' — 분석 진행 중 stale 데이터 방지)
  const fetchDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/exam-analysis/${id}`, { cache: 'no-store' });
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

  // 시험지별 생성 단계 추적 — 'metadata'(V3 base 선생성) → 'commentary'(자동 총평).
  // startMs로 진행 시간 프로그레스 바 표시, willChain으로 안내 문구 분기.
  // Record 키=examId라 다른 시험지 진행과 겹치지 않음(고유 프로그레스).
  type GenPhase = { phase: 'metadata' | 'commentary'; startMs: number; willChain: boolean };
  const [genState, setGenState] = useState<Record<string, GenPhase>>({});
  const clearGen = useCallback((id: string) => {
    setGenState((p) => { const n = { ...p }; delete n[id]; return n; });
  }, []);
  // AnalysisDetail의 수동 [총평 생성]도 사이드바 배지에 실시간 반영 (genState 통합).
  // 시작: commentary 단계 등록 → 카드 "총평 생성중". 종료: 해제 + 목록 갱신 → "총평완료".
  const handleCommentaryGenChange = useCallback((id: string, started: boolean) => {
    if (started) {
      setGenState((p) => ({ ...p, [id]: { phase: 'commentary', startMs: Date.now(), willChain: false } }));
    } else {
      clearGen(id);
      fetchListRef.current(true); // 총평완료 상태 반영
    }
  }, [clearGen]);

  /**
   * 분석 완료 후: readiness 통과 시 V3 총평용 메타데이터를 백그라운드로 선생성.
   * (base scaffolding을 미리 만들어 두면 총평 클릭 시 V3 단독 호출로 빠르게 생성됨)
   * willChain(자동 총평)이면 메타데이터 준비 후 이어서 총평까지 생성.
   * 배점 합계 ≠ 만점 / 단원 UNKNOWN 이면 건너뛰고 안내 (AnalysisDetail readinessCheck 복제).
   */
  const prepareMetadataAndMaybeCommentary = useCallback(async (id: string, willChain: boolean) => {
    try {
      const res = await fetch(`/api/exam-analysis/${id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const analysis = json.data?.analyses?.[0];
      const questions: Array<{ points?: number | null; topic?: string | null }> = analysis?.questions || [];
      if (questions.length === 0) return;
      const expectedTotal = analysis?.totalPoints && analysis.totalPoints > 0 ? roundPoints(analysis.totalPoints) : 100;
      const pointsSum = sumPoints(questions.map((q) => q.points)); // 부동소수점 오차 제거
      const missingPoints = questions.filter((q) => q.points == null || q.points === 0).length;
      const unknownTopics = questions.filter((q) => {
        const t = (q.topic || '').trim();
        return !t || /UNKNOWN|미정|unknown/i.test(t);
      }).length;
      const ready = pointsSum === expectedTotal && missingPoints === 0 && unknownTopics === 0;
      if (!ready) {
        toast.warning('분석 완료. 배점·단원 확인 후 총평을 생성하세요');
        return;
      }

      // ① 메타데이터 단계 — V3 총평의 분석 기반(base) 선생성. 이 동안 총평 버튼은 "준비 중".
      setGenState((p) => ({ ...p, [id]: { phase: 'metadata', startMs: Date.now(), willChain } }));
      let metaOk = false;
      try {
        const mRes = await fetch(`/api/exam-analysis/${id}/generate-metadata`, { method: 'POST' });
        metaOk = mRes.ok;
        if (!mRes.ok) toast.error('총평 준비(메타데이터) 생성 실패 — 잠시 후 [총평 생성]을 시도하세요');
      } catch {
        toast.error('총평 준비 중 오류가 발생했습니다');
      }
      fetchListRef.current(true);
      if (selectedIdRef.current === id) fetchDetailRef.current(id);
      if (!metaOk) { clearGen(id); return; }

      // ② willChain(자동 총평 / 기존 총평 있는 재분석)이면 이어서 총평 생성 → commentary 단계.
      // forceRegenerate: true — 체인은 항상 신선한 분석 직후 실행되므로 기존 총평을 반드시 갱신.
      if (willChain) {
        setGenState((p) => ({ ...p, [id]: { phase: 'commentary', startMs: Date.now(), willChain } }));
        try {
          const cRes = await fetch(`/api/exam-analysis/${id}/analyze-extended`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agents: ['commentary'], forceRegenerate: true, includeNearby: true, includeYearCompare: true }),
          });
          if (cRes.ok) toast.success('분석 + V3 총평 자동 생성 완료');
          else toast.error('총평 자동 생성 실패 — 수동으로 생성하세요');
        } catch {
          toast.error('총평 자동 생성 중 오류가 발생했습니다');
        } finally {
          clearGen(id);
          fetchListRef.current(true);
          if (selectedIdRef.current === id) fetchDetailRef.current(id);
        }
      } else {
        clearGen(id);
        toast.success('V3 총평 준비 완료 — [총평 생성]을 누르면 빠르게 생성됩니다');
      }
    } catch {
      toast.error('총평 준비 중 오류가 발생했습니다');
      clearGen(id);
    }
  }, [clearGen]);

  const handleAnalyze = async (id: string) => {
    setAnalyzing(true);
    // 재분석 대상이 기존에 총평을 갖고 있었는지 (재분석 = 완전 최신화 → 총평도 V3로 자동 재생성)
    const target = items.find((it) => it.id === id);
    const hadCommentary = !!target?.analyses?.[0]?.extensions?.some((e) => e.agentType === 'commentary');
    // 즉시 로컬 상태를 ANALYZING으로 변경 (폴링 트리거 + UI 즉시 반영)
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'ANALYZING' as const } : item
    ));
    // 체크박스 ON 이거나, 기존에 총평이 있던 분석본의 재분석이면 → 총평까지 자동 V3 재생성
    const willChain = autoCommentary || hadCommentary;
    toast.info(
      willChain
        ? (hadCommentary && !autoCommentary
            ? 'AI 재분석 후 기존 V3 총평을 자동 갱신합니다'
            : 'AI 분석 후 V3 총평까지 자동 생성합니다')
        : 'AI 분석이 시작되었습니다',
    );
    try {
      // fire-and-forget: 서버에 분석 요청, 완료 시 갱신
      fetch(`/api/exam-analysis/${id}/analyze`, { method: 'POST' })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            toast.error(err.error?.message || '분석 실패');
            fetchList(true);
            if (selectedId === id) fetchDetail(id);
            return;
          }
          // 분석 성공 → 즉시 목록/상세 갱신(결과 표시) 후 메타데이터 백그라운드 선생성
          // (readiness 통과 시. willChain이면 메타데이터 준비 후 총평까지 자동 생성)
          fetchList(true);
          if (selectedId === id) fetchDetail(id);
          await prepareMetadataAndMaybeCommentary(id, willChain);
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
            genState={genState}
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
            autoCommentary={autoCommentary}
            onToggleAutoCommentary={toggleAutoCommentary}
            gen={genState[selectedDetail.id] ?? null}
            onCommentaryGenChange={handleCommentaryGenChange}
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
