'use client';

/**
 * 공개 데모 — 실제 기출분석 페이지((teacher)/exam-analysis/page.tsx)의 *과정 그대로* 재생.
 * 좌측 시험지 목록 패널(ExamPaperList 재사용) + 업로드 폼(실제 폼 복제) + AnalysisDetail.
 *
 * AI 비용 0:
 *  - 업로드: DemoUploadForm 연출 (스토리지/DB 없음) → 목록에 PENDING 항목 추가
 *  - 분석: status/analysisStep 을 타이머로 스크립트 구동 (실제 폴링이 받는 상태 변화 재현)
 *  - 데이터: src/lib/demo/demo-exams.json (실제 분석본 익명화 픽스처, id=demo-g1/m2/m3)
 *  - 컴포넌트 내부 fetch: 데모 리터럴 라우트 /api/exam-analysis/demo-g1 등 (인증·AI·DB 없는 연출/echo)
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, RotateCcw, Plus, X, FileSearch, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import demoExamsJson from '@/lib/demo/demo-exams.json';
import type { ExamPaperData } from '@/app/(teacher)/exam-analysis/types';
import { AnalysisDetail } from '@/app/(teacher)/exam-analysis/AnalysisDetail';
import { ExamPaperList } from '@/components/exam-analysis/ExamPaperList';
import { DemoSubscriptionProvider } from '@/components/providers/SubscriptionProvider';
import { InquiryModal } from '@/components/landing/InquiryModal';
import { ToastContainer, toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { NarrowScreenGuard } from '@/components/ui/NarrowScreenGuard';
import { DemoUploadForm } from './DemoUploadForm';

const DEMO_EXAMS = demoExamsJson as unknown as ExamPaperData[];
const GRADE_OPTIONS = ['중1', '중2', '중3', '고1', '고2', '고3'];

// 분석 진행 스크립트 — 실제(2~3분)를 ~20초로 압축 재생 (step: AnalyzingProgress STEP_LOGS 1~4)
const ANALYZE_SCRIPT: Array<{ atMs: number; step: number }> = [
  { atMs: 0, step: 1 },      // 파일 로드
  { atMs: 2500, step: 2 },   // 분류 규칙 준비
  { atMs: 5000, step: 3 },   // 비전 AI 분석 (가장 길게 — 자동 진행 로그 노출)
  { atMs: 17000, step: 4 },  // 검증·저장
];
const ANALYZE_DONE_MS = 20500;

interface DemoItem {
  sampleIdx: number;          // DEMO_EXAMS 인덱스
  title: string;              // 업로드 폼에서 수정 가능
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED';
  withCommentary: boolean;
  createdAt: string;
}

export function DemoClient() {
  const [items, setItems] = useState<DemoItem[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<string, number>>({}); // listId → analysisStep
  const [showInquiry, setShowInquiry] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  // 검색 + 필터 (실제 페이지와 동일 UI — 데모는 로컬 필터링)
  const [searchInput, setSearchInput] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const timersRef = useRef<Record<string, Array<ReturnType<typeof setTimeout>>>>({});

  const idOf = (sampleIdx: number) => DEMO_EXAMS[sampleIdx].id; // demo-g1/m2/m3

  const clearTimersOf = useCallback((listId: string) => {
    (timersRef.current[listId] ?? []).forEach(clearTimeout);
    timersRef.current[listId] = [];
  }, []);
  useEffect(() => () => { Object.values(timersRef.current).flat().forEach(clearTimeout); }, []);

  const patchItem = useCallback((listId: string, patch: Partial<DemoItem>) => {
    setItems((prev) => prev.map((it) => (idOf(it.sampleIdx) === listId ? { ...it, ...patch } : it)));
  }, []);

  // ── 업로드 완료 → 목록에 PENDING 항목 추가 + 선택 (실제 onSuccess 흐름과 동일) ──
  const handleUploadSuccess = useCallback((sampleIdx: number, title: string) => {
    setShowUpload(false);
    setItems((prev) => {
      if (prev.some((it) => it.sampleIdx === sampleIdx)) return prev; // 중복 방지 (picker에서 비활성이라 도달 안 함)
      return [{ sampleIdx, title, status: 'PENDING' as const, withCommentary: false, createdAt: new Date().toISOString() }, ...prev];
    });
    setSelectedId(idOf(sampleIdx));
  }, []);

  // ── 분석 연출 — 목록/상세의 [분석 실행]·재분석 버튼이 호출 (실제 handleAnalyze 위치) ──
  const handleAnalyze = useCallback((listId: string) => {
    clearTimersOf(listId);
    patchItem(listId, { status: 'ANALYZING', withCommentary: false });
    setSteps((p) => ({ ...p, [listId]: 0 }));
    toast.info('AI 분석이 시작되었습니다');
    const ts: Array<ReturnType<typeof setTimeout>> = [];
    for (const { atMs, step } of ANALYZE_SCRIPT) {
      ts.push(setTimeout(() => setSteps((p) => ({ ...p, [listId]: step })), atMs));
    }
    ts.push(setTimeout(() => patchItem(listId, { status: 'COMPLETED' }), ANALYZE_DONE_MS));
    timersRef.current[listId] = ts;
  }, [clearTimersOf, patchItem]);

  // 총평 생성 성공 후 AnalysisDetail이 onRefresh 호출 → 픽스처의 commentary 노출
  const handleRefresh = useCallback(() => {
    if (selectedId) patchItem(selectedId, { withCommentary: true });
  }, [selectedId, patchItem]);

  const resetAll = useCallback(() => {
    Object.values(timersRef.current).flat().forEach(clearTimeout);
    timersRef.current = {};
    setItems([]);
    setSelectedId(null);
    setSteps({});
    setShowUpload(false);
    setSearchInput(''); setFilterGrade(''); setFilterStatus('');
  }, []);

  // ── ExamPaperList 용 아이템 파생 (실제 API 응답 형태) + 로컬 필터 ──
  const listItems = useMemo(() => {
    return items
      .map((it) => {
        const base = DEMO_EXAMS[it.sampleIdx];
        const a = base.analyses[0];
        return {
          ...base,
          title: it.title,
          status: it.status,
          createdAt: it.createdAt,
          analyses: it.status === 'COMPLETED'
            ? [{ ...a, extensions: it.withCommentary ? a.extensions : [] }]
            : [],
        } as ExamPaperData;
      })
      .filter((it) => {
        if (filterGrade && it.grade !== filterGrade) return false;
        if (filterStatus && it.status !== filterStatus) return false;
        const q = searchInput.trim();
        if (q && !it.title.includes(q) && !(it.schoolName ?? '').includes(q)) return false;
        return true;
      });
  }, [items, filterGrade, filterStatus, searchInput]);

  // ── 선택된 상세 (실제 fetchDetail 결과 형태) ──
  const selectedItem = items.find((it) => idOf(it.sampleIdx) === selectedId) ?? null;
  const selectedDetail: ExamPaperData | null = useMemo(() => {
    if (!selectedItem) return null;
    const base = DEMO_EXAMS[selectedItem.sampleIdx];
    const a = base.analyses[0];
    const listId = idOf(selectedItem.sampleIdx);
    if (selectedItem.status === 'PENDING') return { ...base, title: selectedItem.title, status: 'PENDING', analysisStep: 0, analyses: [] };
    if (selectedItem.status === 'ANALYZING') return { ...base, title: selectedItem.title, status: 'ANALYZING', analysisStep: steps[listId] ?? 1, analyses: [] };
    return {
      ...base,
      title: selectedItem.title,
      status: 'COMPLETED',
      analyses: [{ ...a, extensions: selectedItem.withCommentary ? a.extensions : [] }],
    };
  }, [selectedItem, steps]);

  const uploadedIdxs = items.map((it) => it.sampleIdx);

  return (
    <div className="h-dvh flex flex-col bg-background">
      <ToastContainer />

      {/* ── 데모 상단 바 (브랜드 잉크 네이비 밴드) ── */}
      <div className="shrink-0 z-40 bg-[#13142B] text-white border-b border-white/10">
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[#A5B4FC] shrink-0" />
            <p className="text-[13px] truncate">
              <b className="font-extrabold">데모 체험</b>
              <span className="text-white/75"> — 샘플 시험지로 실제 화면 그대로 전 과정을 체험합니다. 변경사항은 저장되지 않습니다.</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {items.length > 0 && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] text-white/85 hover:text-white border border-white/30 hover:border-white/60 rounded-full transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> 처음부터
              </button>
            )}
            <button
              onClick={() => setShowInquiry(true)}
              className="px-3 py-1 text-[12px] font-semibold rounded-full transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(100deg, #4F46E5, #7C3AED)' }}
            >
              도입 문의
            </button>
            <Link
              href="/login"
              className="px-2.5 py-1 text-[12px] text-white/85 hover:text-white border border-white/30 hover:border-white/60 rounded-full transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>

      {/* ── 실제 기출분석 페이지 레이아웃 (page.tsx 복제) ── */}
      <NarrowScreenGuard minWidth={1024} label="기출 분석 데모">
      <DemoSubscriptionProvider>
      <div className="flex-1 flex min-h-0">
        {/* 좌측 사이드바 */}
        <aside
          className={`shrink-0 border-r border-slate-200 bg-white flex-col transition-all duration-200 ${
            leftPanelCollapsed ? 'w-12' : 'w-72'
          } flex`}
        >
          <div className="flex items-center justify-between p-3 border-b border-slate-200">
            {!leftPanelCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <FileSearch className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-sm text-slate-800 truncate">기출 분석</span>
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary shrink-0">
                  {listItems.length}
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 bg-amber-100 text-amber-700" title="데모 모드 — 사용량 제한 없이 체험">
                  데모
                </span>
              </div>
            )}
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="p-1 rounded-sm hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
              title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
            >
              {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {!leftPanelCollapsed && (
            <div className="flex items-center gap-1 p-2 border-b">
              <Button size="sm" className="flex-1 bg-[linear-gradient(100deg,#4F46E5,#7C3AED)]" onClick={() => setShowUpload(true)}>
                <Plus className="w-4 h-4 mr-1" />
                업로드
              </Button>
            </div>
          )}

          {/* 검색 + 필터 (실제 페이지와 동일 UI) */}
          {!leftPanelCollapsed && (
            <div className="px-2 py-2 border-b border-slate-200 space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="제목·학교 검색"
                  className="w-full pl-7 pr-7 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                    title="검색어 지우기"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5">
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="flex-1 min-w-0 text-xs border border-slate-200 rounded-sm py-1.5 px-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">학년 전체</option>
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 min-w-0 text-xs border border-slate-200 rounded-sm py-1.5 px-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">상태 전체</option>
                  <option value="COMPLETED">완료</option>
                  <option value="ANALYZING">분석중</option>
                  <option value="PENDING">대기</option>
                  <option value="FAILED">실패</option>
                </select>
              </div>
            </div>
          )}

          {/* 목록 */}
          {!leftPanelCollapsed && (
            <div className="flex-1 min-h-0">
              {items.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  <p>업로드된 시험지가 없습니다</p>
                  <p className="mt-1 text-xs">위 <b className="text-primary">[업로드]</b>로 샘플 시험지를 올려보세요</p>
                </div>
              ) : (
                <ExamPaperList
                  items={listItems as unknown as Parameters<typeof ExamPaperList>[0]['items']}
                  total={listItems.length}
                  page={1}
                  limit={20}
                  onPageChange={() => undefined}
                  onSelect={setSelectedId}
                  onAnalyze={handleAnalyze}
                  onDelete={(id) => {
                    setItems((prev) => prev.filter((it) => idOf(it.sampleIdx) !== id));
                    if (selectedId === id) setSelectedId(null);
                  }}
                  selectedId={selectedId}
                  canEditSchool={false}
                  onUpdate={() => undefined}
                  genState={{}}
                />
              )}
            </div>
          )}
        </aside>

        {/* 우측 메인 */}
        <main className="flex-1 overflow-y-auto p-6 bg-brand-cream-2/50">
          {showUpload ? (
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">시험지 업로드</h2>
                <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <DemoUploadForm
                uploadedIdxs={uploadedIdxs}
                onSuccess={handleUploadSuccess}
                onCancel={() => setShowUpload(false)}
              />
            </div>
          ) : selectedDetail ? (
            <>
              {/* 데모 가이드 — 단계별 다음 행동 안내 (페이퍼 박스 + 좌측 괘선: 진행=잉크 / 완료=레드) */}
              {selectedItem?.status === 'PENDING' && (
                <DemoGuide tone="progress">
                  업로드가 완료되었습니다. 아래 <b>[분석 실행]</b>을 눌러 AI 분석을 시작하세요.
                </DemoGuide>
              )}
              {selectedItem?.status === 'ANALYZING' && (
                <DemoGuide tone="progress">
                  데모 모드 — 실제 분석(2~3분)을 약 20초로 압축 재생 중입니다.
                </DemoGuide>
              )}
              {selectedItem?.status === 'COMPLETED' && !selectedItem.withCommentary && (
                <DemoGuide tone="done">
                  분석이 완료되었습니다. 탭에서 결과를 살펴보고, <b>[총평지 생성]</b>으로 AI 시험 총평까지 체험해 보세요.
                </DemoGuide>
              )}
              {selectedItem?.status === 'COMPLETED' && selectedItem.withCommentary && (
                <DemoGuide tone="done">
                  여기까지가 전 과정입니다 — 총평 우측 상단 <b>[블로그용 총평지]</b>로 블로그 발행용 캡처까지 체험할 수 있습니다.
                  도입을 원하시면 상단 <b>[도입 문의]</b>를 이용하세요.
                </DemoGuide>
              )}
              <AnalysisDetail
                detail={selectedDetail}
                analyzing={selectedItem?.status === 'ANALYZING'}
                onAnalyze={handleAnalyze}
                onRefresh={handleRefresh}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              {items.length === 0 ? (
                <div className="text-center max-w-md">
                  <span className="brand-eyebrow">체험 데모</span>
                  <p className="mt-4 text-[24px] font-extrabold tracking-[-0.02em] leading-snug text-[#13142B] [word-break:keep-all]">
                    실제 화면 그대로,<br />업로드부터 블로그 복사까지
                  </p>
                  {/* 진행 스텝 — 그라데이션 인덱스 */}
                  <div className="mt-6 flex items-stretch justify-center">
                    {[['01', '업로드'], ['02', 'AI 분석'], ['03', '총평·공유']].map(([n, l], i) => (
                      <div key={n} className={`px-6 text-center ${i > 0 ? 'border-l border-brand-line' : ''}`}>
                        <p className="leading-none m-0 text-[28px] font-extrabold tracking-[-0.03em] brand-grad-text">
                          {n}
                        </p>
                        <p className="mt-1.5 text-[11px] font-bold text-[#4B4D6B] m-0">{l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm mt-5 text-slate-500">
                    좌측 <b className="text-brand-indigo">[업로드]</b> 버튼을 눌러 샘플 시험지(PDF)를 올리는 것부터
                    분석 · AI 총평 · 블로그 복사까지 전 과정을 진행해 보세요.
                  </p>
                  <Button size="sm" variant="brand" className="mt-5" onClick={() => setShowUpload(true)}>
                    <Plus className="w-4 h-4 mr-1" /> 시험지 업로드
                  </Button>
                </div>
              ) : (
                <p className="text-sm">시험지를 선택하거나 새로 업로드하세요</p>
              )}
            </div>
          )}
        </main>
      </div>
      </DemoSubscriptionProvider>
      </NarrowScreenGuard>

      {/* 도입 문의 모달 (랜딩과 동일) */}
      {showInquiry && <InquiryModal onClose={() => setShowInquiry(false)} />}
    </div>
  );
}

/** 데모 가이드 배너 — 브랜드 크림 박스 + 좌측 3px 포인트선 (진행=잉크 네이비, 완료=인디고). */
function DemoGuide({ tone, children }: { tone: 'progress' | 'done'; children: React.ReactNode }) {
  return (
    <div
      className="max-w-[960px] mx-auto mb-4 px-4 py-2.5 text-[13px] text-[#2A2A2A] bg-brand-cream border border-brand-line rounded-[8px]"
      style={{ borderLeft: `3px solid ${tone === 'done' ? '#4F46E5' : '#13142B'}` }}
    >
      {children}
    </div>
  );
}
