'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Sparkles, Database, Download, FileText, X, Copy } from 'lucide-react';
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
import { sumPoints, roundPoints, formatPoints } from '@/lib/exam-analysis/points';
import type { ExamPaperData, AnalysisTab } from './types';
import { getConfidenceInfo, getOverallDifficultyLevel, getDifficultyBreakdown, interpolateDifficultyColor } from './helpers';
import { DIFF_LEVEL_LABELS } from './constants';
import { CommentarySection } from './CommentarySection';
import { AnalyzingProgress } from './AnalyzingProgress';
import { buildNaverV3Html } from '@/lib/exam-analysis/naver-v3-renderer';
import { buildNaverV4Html } from '@/lib/exam-analysis/naver-v4-renderer';

const ArticleEditorModal = dynamic(
  () => import('@/components/exam-analysis/ArticleEditorModal').then((m) => ({ default: m.ArticleEditorModal })),
  { ssr: false },
);

// V3 강화 (2026-05-29): V4 콘텐츠를 V3에 흡수 → [V4 네이버 복사] 버튼 비활성화.
// handleCopyV4Naver + buildNaverV4Html 코드는 보존 (재활성 시 true로).
const V4_NAVER_COPY_ENABLED = false;

// V3 일원화 (2026-05-29): 기존 V2 "기출 분석 글 작성"(ArticleEditorModal — 차트 블로그 글) 비활성화.
// V3 총평 + [네이버 복사]로 일원화. ArticleEditorModal/article-generator 코드는 보존(MD 문서 백업).
const V2_ARTICLE_ENABLED = false;

interface AnalysisDetailProps {
  detail: ExamPaperData;
  analyzing: boolean;
  onAnalyze: (id: string) => void;
  onRefresh: () => void;
  /** 분석 시 총평 자동 생성 옵션 (page.tsx에서 localStorage 관리) */
  autoCommentary?: boolean;
  onToggleAutoCommentary?: (v: boolean) => void;
  /** V3 총평용 메타데이터(base scaffolding)를 백그라운드 생성 중인지 — true면 [총평 생성] 차단 */
  metadataGenerating?: boolean;
}

export function AnalysisDetail({ detail, analyzing, onAnalyze, onRefresh, autoCommentary = false, onToggleAutoCommentary, metadataGenerating = false }: AnalysisDetailProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('basic');
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  // 총평 생성 중인 시험지 추적 (examId → 시작 ms). 시험지 전환에도 살아남도록 Record로 보관.
  // AnalysisDetail은 시험지 전환 시 unmount되지 않으므로(key 없음) 진행 상태가 유지됨 →
  // 다른 시험지 봤다가 돌아와도 진행바 복원. fetch promise도 계속 진행되어 생성은 멈추지 않음.
  const [commentaryGen, setCommentaryGen] = useState<Record<string, number>>({});
  const [commentaryElapsed, setCommentaryElapsed] = useState(0);
  const genStartedAt = commentaryGen[detail.id] ?? null;
  const commentaryLoading = genStartedAt !== null;
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

  // 기출지 변경 시 탭 초기화 + 열린 모달 닫기 (모달이 이전 시험지 데이터로 남는 누수 방지).
  // 단, 총평 생성 상태(commentaryGen)는 리셋하지 않음 → 시험지 전환 후 돌아와도 진행바 유지
  // (해당 시험지가 commentaryGen에 있으면 자동 표시. 시험지별 격리는 Record 키로 보장).
  useEffect(() => {
    setActiveTab('basic');
    setShowExtractModal(false);
    setShowArticleModal(false);
    setShowDiffModal(false);
  }, [detail.id]);

  // 총평 생성 경과 시간 타이머 — 현재 시험지의 생성 시작 시각(genStartedAt) 기준
  useEffect(() => {
    if (genStartedAt === null) {
      setCommentaryElapsed(0);
      return;
    }
    // 즉시 1회 반영 (전환 복귀 시 0→실제값 점프 최소화)
    setCommentaryElapsed(Math.floor((Date.now() - genStartedAt) / 1000));
    const interval = setInterval(() => {
      setCommentaryElapsed(Math.floor((Date.now() - genStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [genStartedAt]);

  const latestAnalysis = detail.analyses?.[0];
  const questions = latestAnalysis?.questions || [];
  const summary = (latestAnalysis?.summary || null) as AnalysisSummary | null;
  const totalPoints = latestAnalysis?.totalPoints;

  const confidenceInfo = useMemo(() => getConfidenceInfo(questions), [questions]);
  const diffLevel = useMemo(() => getOverallDifficultyLevel(summary), [summary]);

  // 총평 생성 사전 차단 — 배점 합계가 만점과 다르거나 단원 UNKNOWN 있으면 차단
  const readinessCheck = useMemo(() => {
    if (!questions.length) return { ready: false, reasons: ['분석 결과가 없습니다'] };
    const reasons: string[] = [];
    // 배점 합계 검증 (totalPoints가 있으면 기준, 없으면 100점 기본)
    // ⚠️ 소수 배점(4.6 등) 합산 부동소수점 오차 제거 — sumPoints/roundPoints 필수
    const expectedTotal = totalPoints && totalPoints > 0 ? roundPoints(totalPoints) : 100;
    const pointsSum = sumPoints(questions.map((q) => q.points));
    if (pointsSum !== expectedTotal) {
      const diff = roundPoints(pointsSum - expectedTotal);
      reasons.push(`배점 합계 ${formatPoints(pointsSum)}점 (만점 ${expectedTotal}점에서 ${diff > 0 ? '+' : ''}${formatPoints(diff)}점 차이)`);
    }
    // 미인식 배점 (null/0) 검증
    const missingPoints = questions.filter((q) => q.points === null || q.points === 0).length;
    if (missingPoints > 0) {
      reasons.push(`${missingPoints}개 문항의 배점이 미인식 상태`);
    }
    // 단원 UNKNOWN 검증
    const unknownTopics = questions.filter((q) => {
      const t = (q.topic || '').trim();
      return !t || /UNKNOWN|미정|unknown/i.test(t);
    }).length;
    if (unknownTopics > 0) {
      reasons.push(`${unknownTopics}개 문항의 단원이 미분류 상태`);
    }
    return { ready: reasons.length === 0, reasons };
  }, [questions, totalPoints]);

  // 총평 데이터: extensions에서 commentary 에이전트 결과 추출
  const commentaryExt = latestAnalysis?.extensions?.find(e => e.agentType === 'commentary');
  const commentary = (commentaryExt?.result as unknown as CommentaryResult) ?? null;

  // V3 메타데이터(base scaffolding) 준비 상태 — 분석 직후 백그라운드 생성됨 (DB 전용, 화면 비노출).
  // ⚠️ 게이팅은 "클라이언트 신호(metadataGenerating)"로만 판단한다.
  //    extension 부재로 판단하면 이 기능 이전의 기존 분석본(메타데이터 없음)이 영구 차단되어
  //    폴백 총평조차 못 쓰게 됨. 기존 분석본은 메타데이터 없이도 총평이 폴백으로 동작해야 한다.
  //    (새로고침 mid-generation 시 신호 유실 → 폴백 즉석 base 생성으로 graceful 처리)
  const metadataPending = metadataGenerating;
  // 총평 생성 가능 = readiness 통과 + 메타데이터 준비 중 아님
  const commentaryReady = readinessCheck.ready && !metadataPending;

  const handleGenerateCommentary = async () => {
    if (!latestAnalysis) return;
    const startId = detail.id;
    // 생성 시작 — commentaryGen에 등록 (시험지 전환에도 유지). fetch는 계속 진행됨.
    setCommentaryGen((p) => ({ ...p, [startId]: Date.now() }));
    try {
      const res = await fetch(`/api/exam-analysis/${startId}/analyze-extended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: ['commentary'], forceRegenerate: !!commentary, includeNearby, includeYearCompare }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error?.message || '총평 생성에 실패했습니다');
        return;
      }
      // 다른 시험지로 갔어도 완료 토스트는 표시 (생성이 멈추지 않았음을 알림).
      toast.success('총평이 생성되었습니다');
      // 현재 보고 있는 시험지면 즉시 갱신. 다른 시험지면 돌아올 때 page selection 효과가 자동 재조회.
      onRefresh();
    } catch {
      toast.error('총평 생성 중 오류가 발생했습니다');
    } finally {
      // 이 시험지 생성 종료 — Record에서 제거 (동시에 다른 시험지 생성 중이면 그건 유지)
      setCommentaryGen((p) => {
        const n = { ...p };
        delete n[startId];
        return n;
      });
    }
  };

  /**
   * V3 시안 (Q&A 인터뷰) HTML을 RichText로 클립보드 복사 — 네이버 블로그 본문에 그대로 붙여넣기.
   *
   * 차트 PNG 통합 (2026-05-27):
   * - 차트는 V2 [기출 분석 글 작성]을 한 번이라도 누른 분석본에서만 사용 가능 (DB의 blog-article extension에 저장됨).
   * - HEAD 요청으로 chart endpoint 존재 확인 → 있으면 absolute URL로 buildNaverV3Html에 전달.
   * - 없으면 차트 없이 진행 + toast로 안내.
   */
  const handleCopyV3Naver = async () => {
    if (!commentary || !commentary.blog_qa?.length) {
      toast.error('V3 데이터가 없습니다. 총평 재생성 후 다시 시도하세요.');
      return;
    }
    try {
      // 차트 PNG 미리 워밍업 + URL 수집 (lazy 생성 트리거)
      // ⚠️ 첫 호출은 serial로 — 4개 병렬 호출 시 각각 generateAllChartImages를 독립 실행 (4× 작업)
      // 첫 호출(difficulty) 완료 후 DB에 4종 캐시됨 → 나머지 3개 병렬은 cache hit으로 즉시.
      const baseUrl = window.location.origin;
      toast.info('차트 이미지 생성 중... (최초 30~60초, 이후 즉시)');
      const chartUrls: { topicBar?: string; discrimination?: string; difficulty?: string; abilityRadar?: string } = {};
      const tryFetch = async (
        type: 'topic-bar' | 'discrimination' | 'difficulty' | 'ability-radar',
        key: 'topicBar' | 'discrimination' | 'difficulty' | 'abilityRadar',
      ) => {
        try {
          // ?v=v2 — 차트 버전 bump 시 새 PNG로 강제 갱신 (browser/Naver CDN 캐시 우회)
          const r = await fetch(`/api/exam-analysis/${detail.id}/chart/${type}?v=v2`);
          if (r.ok) chartUrls[key] = `${baseUrl}/api/exam-analysis/${detail.id}/chart/${type}?v=v2`;
        } catch { /* 차트 없음 — 무시 */ }
      };
      // 1단계: 첫 차트 단독 호출 — 4종 일괄 생성 + DB 저장
      await tryFetch('difficulty', 'difficulty');
      // 2단계: 나머지 3개 병렬 — DB cache hit으로 즉시
      await Promise.all([
        tryFetch('topic-bar', 'topicBar'),
        tryFetch('discrimination', 'discrimination'),
        tryFetch('ability-radar', 'abilityRadar'),
      ]);
      const hasCharts = Object.keys(chartUrls).length > 0;

      const html = buildNaverV3Html({
        commentary,
        questions,
        chartUrls: hasCharts ? chartUrls : undefined,
        meta: {
          examTitle: detail.title,
          grade: detail.grade,
          schoolName: detail.schoolName ?? null,
          analyzedAt: latestAnalysis?.analyzedAt ?? null,
        },
      });
      // RichText 복사 — V2 prepareForNaver 패턴 차용 (element별 inline style 강제)
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.opacity = '0';
      container.style.width = '720px';
      container.style.fontFamily = '"NanumGothic", "나눔고딕", "맑은 고딕", "Noto Serif KR", sans-serif';
      container.style.fontSize = '15px';
      container.style.fontWeight = 'normal';
      container.style.lineHeight = '1.7';
      container.style.color = '#333';
      container.style.textAlign = 'left';
      document.body.appendChild(container);

      // V2 패턴: element별 inline style 강제 (네이버가 컨테이너 스타일 무시)
      container.querySelectorAll('p, h2, h3, td, th, div, span').forEach((el) => {
        const blockEl = el as HTMLElement;
        if (!blockEl.style.textAlign) blockEl.style.textAlign = 'left';
      });
      container.querySelectorAll('table').forEach((tbl) => {
        const tableEl = tbl as HTMLTableElement;
        if (!tableEl.style.tableLayout) tableEl.style.tableLayout = 'fixed';
        if (!tableEl.style.borderCollapse) tableEl.style.borderCollapse = 'collapse';
      });
      container.querySelectorAll('td, th').forEach((el) => {
        const cellEl = el as HTMLElement;
        if (!cellEl.style.wordBreak) cellEl.style.wordBreak = 'keep-all';
      });

      try {
        const range = document.createRange();
        range.selectNodeContents(container);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        const ok = document.execCommand('copy');
        selection?.removeAllRanges();
        if (!ok) throw new Error('execCommand copy 실패');
        if (hasCharts) {
          toast.success('총평이 클립보드에 복사되었습니다 (차트 포함). 네이버 블로그에 붙여넣으세요.');
        } else {
          toast.success('총평이 클립보드에 복사되었습니다. 네이버 블로그에 붙여넣으세요.');
        }
      } finally {
        document.body.removeChild(container);
      }
    } catch (e) {
      toast.error('복사 실패: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  /**
   * V4 (갈수학학원 스타일) RichText 복사 → 네이버 SmartEditor 붙여넣기
   * V3와 동일 패턴, naver-v4-renderer 사용.
   */
  const handleCopyV4Naver = async () => {
    if (!commentary || !commentary.v4_exam_overview) {
      toast.error('V4 데이터가 없습니다. AI 시험 총평에서 V4 분석을 먼저 생성하세요.');
      return;
    }
    try {
      // 차트 PNG 미리 워밍업 + URL 수집 (lazy 생성 트리거)
      // ⚠️ 첫 호출은 serial로 — 병렬 시 각 요청이 generateAllChartImages를 독립 실행 (4× 작업).
      // 첫 호출(difficulty) 완료 후 DB에 4종 캐시됨 → 나머지 3개 병렬은 cache hit으로 즉시.
      const baseUrl = window.location.origin;
      toast.info('차트 이미지 생성 중... (최초 30~60초, 이후 즉시)');
      const chartUrls: { topicBar?: string; discrimination?: string; difficulty?: string; abilityRadar?: string } = {};
      const tryFetch = async (
        type: 'topic-bar' | 'discrimination' | 'difficulty' | 'ability-radar',
        key: 'topicBar' | 'discrimination' | 'difficulty' | 'abilityRadar',
      ) => {
        try {
          // ?v=v2 — 차트 버전 bump 시 새 PNG로 강제 갱신 (browser/Naver CDN 캐시 우회)
          const r = await fetch(`/api/exam-analysis/${detail.id}/chart/${type}?v=v2`);
          if (r.ok) chartUrls[key] = `${baseUrl}/api/exam-analysis/${detail.id}/chart/${type}?v=v2`;
        } catch { /* 차트 없음 무시 */ }
      };
      // 1단계: 첫 차트 단독 호출 — 4종 일괄 생성 + DB 저장
      await tryFetch('difficulty', 'difficulty');
      // 2단계: 나머지 3개 병렬 — DB cache hit으로 즉시
      await Promise.all([
        tryFetch('topic-bar', 'topicBar'),
        tryFetch('discrimination', 'discrimination'),
        tryFetch('ability-radar', 'abilityRadar'),
      ]);
      const hasCharts = Object.keys(chartUrls).length > 0;

      const html = buildNaverV4Html({
        commentary,
        chartUrls: hasCharts ? chartUrls : undefined,
        meta: {
          examTitle: detail.title,
          grade: detail.grade,
          schoolName: detail.schoolName ?? null,
          analyzedAt: latestAnalysis?.analyzedAt ?? null,
          // 학원명 — tenant.name (session에서 옴) → V4 본문 {학원명} placeholder 치환
          academyName: user?.tenantName ?? null,
        },
      });

      // RichText 복사 — V2 prepareForNaver 패턴 차용 (네이버가 컨테이너 스타일 무시 → element별 inline 강제)
      const container = document.createElement('div');
      container.innerHTML = html;
      // 컨테이너 기본 스타일 (V2 handleCopyRichText 동일)
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.opacity = '0';
      container.style.width = '720px';
      container.style.fontFamily = '"NanumGothic", "나눔고딕", "맑은 고딕", "Noto Serif KR", sans-serif';
      container.style.fontSize = '15px';
      container.style.fontWeight = 'normal';
      container.style.lineHeight = '1.7';
      container.style.color = '#333';
      container.style.textAlign = 'left';
      document.body.appendChild(container);

      // V2 패턴: 네이버가 컨테이너 스타일 무시 → 개별 block 요소에 inline style 강제
      container.querySelectorAll('p, h2, h3, td, th, div, span').forEach((el) => {
        const blockEl = el as HTMLElement;
        if (!blockEl.style.textAlign) blockEl.style.textAlign = 'left';
      });
      // 모든 table에 table-layout: fixed 강제 (V3에서 학습한 네이버 호환 핵심)
      container.querySelectorAll('table').forEach((tbl) => {
        const tableEl = tbl as HTMLTableElement;
        if (!tableEl.style.tableLayout) tableEl.style.tableLayout = 'fixed';
        if (!tableEl.style.borderCollapse) tableEl.style.borderCollapse = 'collapse';
      });
      // 모든 td에 word-break: keep-all 강제 (한글 단어 분리 방지)
      container.querySelectorAll('td, th').forEach((el) => {
        const cellEl = el as HTMLElement;
        if (!cellEl.style.wordBreak) cellEl.style.wordBreak = 'keep-all';
      });

      try {
        const range = document.createRange();
        range.selectNodeContents(container);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        const ok = document.execCommand('copy');
        selection?.removeAllRanges();
        if (!ok) throw new Error('execCommand copy 실패');
        if (hasCharts) {
          toast.success('V4 시안 (차트 포함)이 클립보드에 복사되었습니다.');
        } else {
          toast.success('V4 시안이 클립보드에 복사되었습니다. (차트 추가하려면 [기출 분석 글 작성] 먼저 클릭)');
        }
      } finally {
        document.body.removeChild(container);
      }
    } catch (e) {
      toast.error('복사 실패: ' + (e instanceof Error ? e.message : String(e)));
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
        {/* 좁은 창에서 우측 그룹(버튼+난이도 카드)이 전역 헤더 사용자 메뉴와 겹치지 않도록 flex-wrap →
            좁아지면 우측 그룹이 제목 아래 줄로 내려감 (2026-05-29 사용자 보고) */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
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

          {/* 우측: 버튼 + 등급 뱃지 — 매우 좁을 땐 내부도 wrap */}
          <div className="flex flex-wrap items-center gap-3">
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
              <div className="flex items-center gap-3">
                <Button onClick={() => onAnalyze(detail.id)} disabled={analyzing}>
                  {analyzing ? '분석 중...' : '분석 실행'}
                </Button>
                {onToggleAutoCommentary && (
                  <label className="flex items-center gap-1.5 text-[12px] text-slate-600 cursor-pointer select-none" title="분석 완료 후 배점·단원이 정상이면 총평(V3)까지 자동 생성합니다">
                    <input
                      type="checkbox"
                      checked={autoCommentary}
                      onChange={(e) => onToggleAutoCommentary(e.target.checked)}
                      className="accent-violet-600"
                    />
                    분석 시 총평 자동 생성
                  </label>
                )}
              </div>
            )}

            {/* 종합 난이도 카드 — 클릭 시 판단 기준 모달 */}
            {detail.status === 'COMPLETED' && diffLevel > 0 && (() => {
              const breakdown = getDifficultyBreakdown(summary);
              // 가중평균이 있으면 소수점 위치 기준 그라데이션, 없으면 정수 Level 색
              const avg = breakdown?.weightedAvg ?? diffLevel;
              const activeColor = interpolateDifficultyColor(avg);
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
                    <div className="flex flex-col gap-0.5">
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
                                ...(isActive ? { boxShadow: `0 0 0 1.5px #fff, 0 0 0 3px ${activeColor}` } : {}),
                              }}
                            >
                              {level}
                            </div>
                          );
                        })}
                      </div>
                      {/* ▼ 마커 — 정확한 가중평균 위치 (2.5와 2.9 미세 차이 시각화) */}
                      <div className="relative h-1.5">
                        <div
                          className="absolute top-0 -translate-x-1/2 transition-all"
                          style={{ left: `${(Math.max(1, Math.min(5, avg)) - 1) * 26 + 12}px` }}
                          title={`정확한 가중평균: ${avg.toFixed(2)}`}
                        >
                          <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
                            <polygon points="4,0 0,6 8,6" fill={activeColor} />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-l pl-3" style={{ borderColor: `${activeColor}30` }}>
                    <span className="text-base font-extrabold" style={{ color: activeColor }}>Level {avg.toFixed(1)}</span>
                    {breakdown && (
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {breakdown.total}문항 가중평균
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

      {/* ── 분석 중 ── (latestAnalysis가 있으면 stale status 무시 — 분석 결과가 있다 = 완료) */}
      {detail.status === 'ANALYZING' && !latestAnalysis && (
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
                      className="bg-violet-600 hover:bg-violet-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
                      onClick={handleGenerateCommentary}
                      disabled={!commentaryReady}
                      title={
                        metadataPending
                          ? 'V3 총평 준비 중입니다 (분석 기반 데이터 생성). 잠시 후 가능합니다.'
                          : readinessCheck.ready
                          ? '총평 생성'
                          : '먼저 다음을 완성하세요:\n' + readinessCheck.reasons.map(r => '• ' + r).join('\n')
                      }
                    >
                      {metadataPending ? '준비 중...' : '총평 생성'}
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
              {/* ── 총평 생성 차단 경고 (배점/단원 미완성) ── */}
              {!readinessCheck.ready && !commentaryLoading && (
                <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm">
                  <p className="text-xs font-semibold text-amber-800 mb-1">총평 생성 전 다음을 완성하세요:</p>
                  <ul className="text-[11px] text-amber-700 space-y-0.5 list-disc list-inside">
                    {readinessCheck.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-600 mt-1.5 leading-relaxed">
                    아래 문항 테이블에서 <strong>배점은 클릭하여 직접 입력</strong>, <strong>단원은 ✏️ 아이콘으로 수정</strong> 가능합니다.
                  </p>
                </div>
              )}
              {/* ── 메타데이터 준비 중 안내 (배점/단원은 통과, V3 base 백그라운드 생성 중) ── */}
              {readinessCheck.ready && metadataPending && !commentaryLoading && (
                <div className="mt-3 px-3 py-2 bg-violet-50 border border-violet-200 rounded-sm flex items-center gap-2.5">
                  <div className="animate-spin w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-violet-800">V3 총평 준비 중... (약 10~20초)</p>
                    <p className="text-[11px] text-violet-600 leading-relaxed">분석 기반 데이터를 백그라운드로 생성하고 있습니다. 완료되면 [총평 생성]이 활성화됩니다.</p>
                  </div>
                </div>
              )}
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
              // 시험지별 격리 — 전환 시 remount하여 내부 상태(펼침/v4 진행·로그/viewMode)가
              // 다른 시험지로 새어나가지 않게 함. 총평 진행바(isRegenerating)는 부모의
              // 시험지별 commentaryGen에서 주입되므로 remount해도 정확히 유지됨.
              key={detail.id}
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
              examMeta={{
                title: detail.title,
                grade: detail.grade,
                schoolName: detail.schoolName ?? null,
                analyzedAt: latestAnalysis?.analyzedAt ?? null,
              }}
              examPaperId={detail.id}
              onV4Generated={() => onRefresh()}
            />
          )}

          {/* 기출 분석 글 버튼 (총평 생성 후 활성화) */}
          {commentary && (() => {
            const hasArticle = latestAnalysis?.extensions?.some(e => e.agentType === 'blog-article');
            const hasV3 = !!commentary.blog_qa && commentary.blog_qa.length > 0;
            return (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {V2_ARTICLE_ENABLED && (
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
                )}
                {hasV3 && (
                  <Button
                    size="sm"
                    onClick={handleCopyV3Naver}
                    className="bg-[#BF1722] hover:bg-[#9A1219] text-white"
                    title="총평을 네이버 블로그용 HTML로 클립보드에 복사 (차트 포함)"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    네이버 복사
                  </Button>
                )}
                {V4_NAVER_COPY_ENABLED && commentary?.v4_exam_overview && (
                  <Button
                    size="sm"
                    onClick={handleCopyV4Naver}
                    className="bg-amber-700 hover:bg-amber-800 text-white"
                    title="V4 시안(갈수학학원 스타일 테이블 중심)을 네이버 블로그용 HTML로 클립보드에 복사"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    V4 네이버 복사
                  </Button>
                )}
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
        const avg = breakdown?.weightedAvg ?? diffLevel;
        const activeColor = interpolateDifficultyColor(avg);
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
                    시험 난이도 <span style={{ color: activeColor }}>Level {avg.toFixed(1)}</span>
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
                    이 시험은 분포가 <strong>{distLabel}</strong>로, 가중평균 <strong>{breakdown.weightedAvg.toFixed(2)}점</strong> → <strong>Level {avg.toFixed(1)}</strong>로 산정되었습니다. (정수 그룹: Level {diffLevel})
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
