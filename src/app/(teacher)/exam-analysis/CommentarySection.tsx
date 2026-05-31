'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { sumPoints } from '@/lib/exam-analysis/points';
import { V3CommentaryView, type V3Meta, type V3ChartImages } from './v3/V3CommentaryView';
import { V4CommentaryView, hasV4Data } from './v4/V4CommentaryView';
import { toast } from '@/components/ui/Toast';

/** 사용자 뷰 모드 (localStorage 키) */
const VIEW_MODE_KEY = 'mathlab_commentary_view_mode';
type ViewMode = 'v3' | 'v4';

// V3 강화 (2026-05-29): V4 핵심 콘텐츠를 V3에 흡수 완료 → V4 토글 비활성화.
// V4 코드(V4CommentaryView, naver-v4-renderer, generate-v4 등)는 보존 — 재활성 시 true로.
const V4_TOGGLE_ENABLED = false;

interface CommentarySectionProps {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  onRegenerate: () => void;
  isRegenerating: boolean;
  elapsedSeconds?: number;
  includeNearby: boolean;
  onIncludeNearbyChange: (v: boolean) => void;
  nearbyCount: number | null;
  /** 주변 학교 hover tooltip (포함 학교명 목록) */
  nearbyTitle?: string;
  includeYearCompare: boolean;
  onIncludeYearCompareChange: (v: boolean) => void;
  yearCount: number | null;
  /** 연도 비교 hover tooltip (포함 연도 목록) */
  yearTitle?: string;
  hasSchool: boolean;
  /** 구버전(이전 PROMPT_VERSION) 분석본이면 prompt 버전 라벨 — 총평 재생성 차단 + 재분석 유도 */
  staleVersion?: string | null;
  /** 기본 재분석 트리거 (구버전일 때 안내 버튼) */
  onReanalyze?: () => void;
  reanalyzing?: boolean;
  /** V3 메타 정보 (있으면 V3 헤더에 사용. 없으면 blog_kicker/blog_headline 폴백) */
  examMeta?: {
    title: string;
    grade: string;
    schoolName: string | null;
    analyzedAt: string | null;
  };
  /** V3 차트 PNG (선택). 분석 화면에서 차트가 이미 별도 렌더 중이면 미전달. */
  v3Charts?: V3ChartImages;
  /** V4 lazy 생성용 시험지 ID. 미전달 시 V4 모드는 데이터 있을 때만 활성. */
  examPaperId?: string;
  /** V4 생성 완료 시 부모에게 알림 (commentary state 갱신용) */
  onV4Generated?: (updatedCommentary: CommentaryResult) => void;
  /** 네이버 이미지 복사 트리거 (부모의 handleCopyNaverImages). 헤더 버튼에서 호출 — 접혀 있으면 자동 펼친 뒤 실행 */
  onCopyImages?: () => void;
  /** 이미지 복사 진행 중 (버튼 disabled 표시) */
  copyingImages?: boolean;
}

export function CommentarySection({
  commentary,
  questions: allQuestions,
  onRegenerate,
  isRegenerating,
  elapsedSeconds = 0,
  includeNearby,
  onIncludeNearbyChange,
  nearbyCount,
  nearbyTitle,
  includeYearCompare,
  onIncludeYearCompareChange,
  yearCount,
  yearTitle,
  hasSchool,
  staleVersion,
  onReanalyze,
  reanalyzing = false,
  examMeta,
  v3Charts,
  examPaperId,
  onV4Generated,
  onCopyImages,
  copyingImages = false,
}: CommentarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('v3');
  const [v4Generating, setV4Generating] = useState(false);
  const [v4ElapsedSeconds, setV4ElapsedSeconds] = useState(0);
  const [v4Logs, setV4Logs] = useState<Array<{ time: string; msg: string }>>([]);
  // 총평 재분석 실시간 로그 (V4 로그와 동일 디자인 — elapsedSeconds prop 기반 마일스톤)
  const [regenLogs, setRegenLogs] = useState<Array<{ time: string; msg: string }>>([]);
  // V4 토글 비활성 시 항상 V3 강제 (localStorage에 'v4' 남아있어도 무시)
  const effectiveViewMode: ViewMode = V4_TOGGLE_ENABLED ? viewMode : 'v3';

  // V4 생성 진행 시간 카운터 + 단계별 자동 로그 (분석 progress 패턴)
  useEffect(() => {
    if (!v4Generating) {
      setV4ElapsedSeconds(0);
      setV4Logs([]);
      return;
    }
    const id = setInterval(() => setV4ElapsedSeconds((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, [v4Generating]);

  // V4 단계별 로그 자동 추가 (hh:mm:ss 형식, 분석 progress와 동일 톤)
  useEffect(() => {
    if (!v4Generating) return;
    const nowHHMMSS = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    const milestones: Array<{ at: number; msg: string }> = [
      { at: 1, msg: 'Claude Sonnet 4.6 호출 시작' },
      { at: 5, msg: '시험 메타 + 단원별 출제 분석 입력 중' },
      { at: 10, msg: '9섹션 구조 생성 중 (들어가며 · 시험 개요 · 학원 전략)' },
      { at: 18, msg: '문제 번호별 난이도 · 한 줄 해설 생성 중' },
      { at: 28, msg: '출제 특징 · 핵심 포인트 단락 작성 중' },
      { at: 38, msg: '이전 시험 비교 · 킬러 문항 분석 중' },
      { at: 48, msg: '이번 시험 단원별 피드백 작성 중' },
      { at: 58, msg: 'JSON 응답 정규화 + DB 저장 중' },
    ];
    const matched = milestones.find((m) => m.at === v4ElapsedSeconds);
    if (matched) {
      setV4Logs((prev) => {
        if (prev.find((p) => p.msg === matched.msg)) return prev;
        return [...prev, { time: nowHHMMSS(), msg: matched.msg }];
      });
    }
  }, [v4Generating, v4ElapsedSeconds]);

  // 총평 재분석 단계별 로그 (elapsedSeconds prop 기반). 시험지 전환 후 복귀 시
  // 지나간 단계를 backfill하여 로그가 비지 않게 함 (key remount로 regenLogs는 시험지별 격리).
  useEffect(() => {
    if (!isRegenerating) { setRegenLogs([]); return; }
    const nowHHMMSS = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    const milestones: Array<{ at: number; msg: string }> = [
      { at: 1, msg: 'Claude Sonnet 4.6 호출 시작' },
      { at: 4, msg: '시험 데이터 + 단원별 출제 분석 입력 중' },
      { at: 10, msg: '종합 평가 · 등급별 전략 · 강약점 작성 중' },
      { at: 20, msg: 'Q&A 인터뷰 · 거대 숫자 헤드라인 생성 중' },
      { at: 32, msg: '문항별 난이도 표 · 영역별 분석 생성 중' },
      { at: 44, msg: '주요 킬러 문항 해설 · 단원별 피드백 작성 중' },
      { at: 56, msg: 'JSON 정규화 + DB 저장 중' },
    ];
    setRegenLogs((prev) => {
      const have = new Set(prev.map((p) => p.msg));
      const toAdd = milestones.filter((m) => m.at <= elapsedSeconds && !have.has(m.msg));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd.map((m) => ({ time: nowHHMMSS(), msg: m.msg }))];
    });
  }, [isRegenerating, elapsedSeconds]);

  // V4 lazy 생성 핸들러
  const handleGenerateV4 = async (force = false) => {
    if (!examPaperId) {
      toast.error('시험지 ID 누락 — V4 생성 불가');
      return;
    }
    setV4Generating(true);
    try {
      const res = await fetch(`/api/exam-analysis/${examPaperId}/generate-v4`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: {} }));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const newCommentary = { ...commentary, ...json.data } as CommentaryResult;
      onV4Generated?.(newCommentary);
      toast.success('V4 분석이 생성되었습니다');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'V4 생성 실패';
      toast.error(msg);
    } finally {
      setV4Generating(false);
    }
  };

  // localStorage에서 사용자 선호 viewMode 복원 (마운트 시 1회)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === 'v3' || saved === 'v4') {
        setViewMode(saved);
      }
    } catch {
      /* SSR/private 모드 등 무시 */
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch { /* 무시 */ }
  };

  // V3 활성화 조건 — Q&A 1개 이상 있으면 V3/V4 마크업 사용 (lazy migration 후 점진 적용)
  const useV3 = !!commentary.blog_qa && commentary.blog_qa.length > 0;

  // 폴백 감지: 규칙 기반 결과는 overall_comment가 "총 N문항"으로 시작
  const isFallback = commentary.overall_comment?.startsWith('총 ') && !commentary.overall_comment?.includes('이번 시험');

  // 구버전(이전 PROMPT_VERSION) 분석본 — 총평 재생성을 차단하고 재분석 유도.
  const isStale = !!staleVersion;

  // 네이버 이미지 복사 버튼 — V3 데이터 있을 때만. 접/펼침 양쪽 헤더에 동일 렌더.
  //   클릭 시 접혀 있으면 자동으로 펼친 뒤(.v3 마운트) 부모 캡처 콜백 실행 → 캡처는 .v3를 폴링.
  const copyImagesBtn = onCopyImages && useV3 ? (
    <Button
      size="sm"
      onClick={() => { if (!isExpanded) setIsExpanded(true); onCopyImages(); }}
      disabled={copyingImages}
      title="총평을 섹션 이미지로 캡처해 네이버 블로그용으로 복사 (접혀 있으면 자동으로 펼칩니다)"
      className="h-7 px-2 text-xs bg-[#BF1722] hover:bg-[#9A1219] text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Copy className="w-3.5 h-3.5 mr-1" />
      {copyingImages ? '복사 중...' : '이미지 복사'}
    </Button>
  ) : null;
  const staleBanner = isStale ? (
    <div className="bg-rose-50 border border-rose-200 rounded-sm px-3 py-2.5 flex items-start gap-2.5">
      <span className="text-rose-500 text-sm mt-0.5 shrink-0">&#9888;</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-rose-800">
          이전 버전(<b>{staleVersion}</b>)으로 분석된 시험지입니다
        </p>
        <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">
          구버전 분석 데이터로 총평을 재생성하면 최신 난이도·단원 기준과 어긋납니다. <strong>재분석</strong>으로 최신 분석한 뒤 총평을 생성하세요.
        </p>
        {onReanalyze && (
          <Button
            size="sm"
            onClick={onReanalyze}
            disabled={reanalyzing}
            className="mt-2 bg-rose-600 hover:bg-rose-700 text-white disabled:bg-slate-300"
          >
            {reanalyzing ? '재분석 중...' : '최신 버전으로 재분석'}
          </Button>
        )}
      </div>
    </div>
  ) : null;

  // V3/V4 모드 — 상단에 작은 컨트롤 row + view 컴포넌트
  if (useV3 && isExpanded) {
    const meta: V3Meta = {
      examTitle: examMeta?.title || '',
      grade: examMeta?.grade || '',
      schoolName: examMeta?.schoolName ?? null,
      analyzedAt: examMeta?.analyzedAt ?? null,
      totalQuestions: allQuestions.length,
      totalPoints: sumPoints(allQuestions.map((q) => q.points)),
      hasStudentData: allQuestions.some((q) => q.is_correct !== null),
    };
    return (
      <div className="bg-white border border-violet-200 rounded-sm mb-5 overflow-hidden">
        {/* 컨트롤 row (재분석 + 체크박스 + 접기) — 접힘 상태와 동일한 violet 헤더 디자인으로 통일 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 ${effectiveViewMode === 'v4' ? 'bg-amber-700' : 'bg-violet-600'} rounded-sm flex items-center justify-center shrink-0`}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900">AI 시험 총평</span>
            {/* V3 / V4 segmented control — V4_TOGGLE_ENABLED=false 시 숨김 (V3 강화로 V4 흡수 완료) */}
            {V4_TOGGLE_ENABLED && (
              <div className="inline-flex border border-slate-300 rounded-sm overflow-hidden ml-1" role="tablist" aria-label="총평 표시 모드">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('v3')}
                  className={`px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] transition-colors ${
                    viewMode === 'v3'
                      ? 'bg-[#BF1722] text-white'
                      : 'bg-white text-slate-400 hover:text-slate-600'
                  }`}
                  title="NYT Science 매거진 톤"
                >
                  V3
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('v4')}
                  className={`px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] transition-colors ${
                    viewMode === 'v4'
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-slate-400 hover:text-slate-600'
                  }`}
                  title="갈수학학원 스타일 (테이블 중심)"
                >
                  V4
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {copyImagesBtn}
            {!isRegenerating && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRegenerate}
                disabled={isStale}
                title={isStale ? `이전 버전(${staleVersion})으로 분석됨 — 재분석 후 총평 가능` : '총평 재생성'}
                className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                재분석
              </Button>
            )}
            {hasSchool && !isRegenerating && !isStale && (
              <div className="flex items-center gap-3">
                <label title={nearbyTitle} className={`flex items-center gap-1 text-[11px] cursor-pointer ${nearbyCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                  <input
                    type="checkbox"
                    checked={includeNearby && (nearbyCount ?? 0) > 0}
                    onChange={(e) => onIncludeNearbyChange(e.target.checked)}
                    disabled={nearbyCount === 0}
                    className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                  />
                  주변 {nearbyCount != null && <span className={nearbyCount > 0 ? 'text-violet-500 font-medium' : ''}>({nearbyCount}교)</span>}
                </label>
                <label title={yearTitle} className={`flex items-center gap-1 text-[11px] cursor-pointer ${yearCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                  <input
                    type="checkbox"
                    checked={includeYearCompare && (yearCount ?? 0) > 0}
                    onChange={(e) => onIncludeYearCompareChange(e.target.checked)}
                    disabled={yearCount === 0}
                    className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                  />
                  연도 {yearCount != null && <span className={yearCount > 0 ? 'text-violet-500 font-medium' : ''}>({yearCount}건)</span>}
                </label>
              </div>
            )}
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="접기"
            >
              <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        {/* 구버전 분석본 차단 안내 (재분석 유도) */}
        {staleBanner && <div className="px-3 pt-3">{staleBanner}</div>}
        {/* AI 재분석 진행 표시 (펼친 상태에서도 보이도록 — 사용자 보고 2026-05-28) */}
        {isRegenerating && (
          <div className="border-b border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full" />
                <span className="text-sm font-bold text-violet-900">AI 총평 재분석 중...</span>
              </div>
              <span className="text-xs text-violet-700 font-medium">{elapsedSeconds}초 경과</span>
            </div>
            <div className="h-1 bg-violet-200 rounded-full overflow-hidden">
              <div className="h-full bg-violet-600 animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-[11px] text-violet-700 mt-2">
              Claude Sonnet 4.6이 종합 평가 + V3 강화 필드(문항별 표·영역별 분석·Q&A·단원 피드백)를 생성 중입니다. 평균 60~120초 소요.
            </p>
            {/* 실시간 실행 로그 (분석 progress / V4 생성과 동일 디자인) */}
            {regenLogs.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-violet-800">실행 로그</span>
                  <span className="text-[10px] text-violet-600">{regenLogs.length}개 항목</span>
                </div>
                <div className="bg-slate-900 text-slate-100 rounded-sm px-3 py-2 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed">
                  {regenLogs.map((entry, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-400 shrink-0">{entry.time}</span>
                      <span className="text-slate-100">{entry.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* V3 / V4 콘텐츠 (effectiveViewMode — V4 비활성 시 항상 V3) */}
        {effectiveViewMode === 'v4' ? (
          hasV4Data(commentary) ? (
            <V4CommentaryView commentary={commentary} questions={allQuestions} meta={meta} charts={v3Charts} />
          ) : (
            <div className="p-8 bg-amber-50/50">
              {v4Generating ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin w-8 h-8 border-3 border-amber-700 border-t-transparent rounded-full mb-4" />
                  <p className="text-sm font-bold text-amber-900 mb-1">V4 (갈수학학원 스타일) 생성 중...</p>
                  <p className="text-xs text-amber-700 mb-4">{v4ElapsedSeconds}초 경과 · 평균 30~60초 소요</p>
                  {/* 분석 progress와 동일 톤 실시간 로그 panel */}
                  {v4Logs.length > 0 && (
                    <div className="w-full max-w-2xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-amber-800">실행 로그</span>
                        <span className="text-[10px] text-amber-600">{v4Logs.length}개 항목</span>
                      </div>
                      <div className="bg-slate-900 text-slate-100 rounded-sm px-3 py-2 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed">
                        {v4Logs.map((entry, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-slate-400 shrink-0">{entry.time}</span>
                            <span className="text-slate-100">{entry.msg}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Sparkles className="w-8 h-8 text-amber-700 mb-3" />
                  <p className="text-sm font-bold text-slate-900 mb-1">V4 분석이 아직 생성되지 않았습니다</p>
                  <p className="text-xs text-slate-500 mb-4 text-center max-w-md">
                    갈수학학원 스타일의 테이블 중심 분석을 별도 AI 호출로 생성합니다.<br />
                    예상 비용: ~$0.30 · 소요 시간: 30~60초
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateV4(false)}
                    className="bg-amber-700 hover:bg-amber-800 text-white"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    V4 분석 생성
                  </Button>
                </>
              )}
            </div>
          )
        ) : (
          <V3CommentaryView commentary={commentary} questions={allQuestions} meta={meta} charts={v3Charts} />
        )}
      </div>
    );
  }
  // V3 접힘 또는 legacy → 기존 흐름

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
          {copyImagesBtn}
          {!isRegenerating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRegenerate}
              disabled={isStale}
              title={isStale ? `이전 버전(${staleVersion})으로 분석됨 — 재분석 후 총평 가능` : undefined}
              className={`text-xs disabled:opacity-40 disabled:cursor-not-allowed ${isFallback ? 'text-amber-600 hover:text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {isFallback ? 'AI 재분석' : '재분석'}
            </Button>
          )}
          {hasSchool && !isRegenerating && !isStale && (
            <div className="flex items-center gap-3">
              <label title={nearbyTitle} className={`flex items-center gap-1 text-[11px] cursor-pointer ${nearbyCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                <input
                  type="checkbox"
                  checked={includeNearby && (nearbyCount ?? 0) > 0}
                  onChange={e => onIncludeNearbyChange(e.target.checked)}
                  disabled={nearbyCount === 0}
                  className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                />
                주변 {nearbyCount != null && <span className={nearbyCount > 0 ? 'text-violet-500 font-medium' : ''}>({nearbyCount}교)</span>}
              </label>
              <label title={yearTitle} className={`flex items-center gap-1 text-[11px] cursor-pointer ${yearCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                <input
                  type="checkbox"
                  checked={includeYearCompare && (yearCount ?? 0) > 0}
                  onChange={e => onIncludeYearCompareChange(e.target.checked)}
                  disabled={yearCount === 0}
                  className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                />
                연도 {yearCount != null && <span className={yearCount > 0 ? 'text-violet-500 font-medium' : ''}>({yearCount}건)</span>}
              </label>
            </div>
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

      {/* 구버전 분석본 차단 안내 (재분석 유도) — 펼친 상태에서 다른 경고보다 우선 */}
      {isExpanded && isStale && !isRegenerating && <div className="mb-3">{staleBanner}</div>}

      {isExpanded && !isStale && isFallback && !isRegenerating && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 mb-3 flex items-center gap-2">
          <span className="text-amber-500 text-xs">&#9888;</span>
          <p className="text-xs text-amber-700">AI 총평 생성에 실패하여 규칙 기반 요약으로 대체되었습니다. &quot;AI 재분석&quot; 버튼으로 다시 시도할 수 있습니다.</p>
        </div>
      )}

      {isRegenerating && (
        <div className="mt-3 px-1">
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
          {/* 실시간 실행 로그 (분석 progress / V4 생성과 동일 디자인) */}
          {regenLogs.length > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-violet-800">실행 로그</span>
                <span className="text-[10px] text-violet-600">{regenLogs.length}개 항목</span>
              </div>
              <div className="bg-slate-900 text-slate-100 rounded-sm px-3 py-2 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed">
                {regenLogs.map((entry, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-slate-400 shrink-0">{entry.time}</span>
                    <span className="text-slate-100">{entry.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/*
        레거시(구버전) 총평 펼침 상태 — V3 양식 데이터(blog_qa)가 없을 때.
        기존 카드형 본문 렌더(종합분석/등급전략/강약점/주목문항/지도추천)는 V3 일원화로 제거(2026-05-29).
        보존 기록: data/handoff-exam-analysis-v3/legacy-styles-archived.md
        → 본문 대신 "최신 양식(V3)으로 재생성" 안내만 표시.
        (isFallback인 경우는 위 amber 경고 배너 + 헤더 [AI 재분석] 버튼으로 안내하므로 여기선 제외)
      */}
      {isExpanded && !useV3 && !isFallback && !isStale && !isRegenerating && (
        <div className="bg-white/70 rounded-sm p-6 border border-violet-200 flex flex-col items-center text-center">
          <Sparkles className="w-7 h-7 text-[#BF1722] mb-2.5" />
          <p className="text-sm font-bold text-slate-900 mb-1">최신 양식(V3)으로 업그레이드하세요</p>
          <p className="text-xs text-slate-500 mb-4 max-w-md leading-relaxed">
            이 총평은 구버전 양식입니다. 재생성하면 문항별 난이도 표 · 영역별 분석 · Q&amp;A 인터뷰 · 단원별 피드백이 포함된 매거진 스타일로 만들어집니다.
          </p>
          <Button
            size="sm"
            onClick={onRegenerate}
            className="bg-[#BF1722] hover:bg-[#9A1219] text-white"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            최신 양식으로 재생성
          </Button>
        </div>
      )}
    </div>
  );
}
