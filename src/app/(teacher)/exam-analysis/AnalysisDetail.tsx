'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/components/providers/SubscriptionProvider';
import type { AnalysisSummary } from '@/lib/exam-analysis/types';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { DIFFICULTY_BAR_COLORS, isStalePromptVersion, extractPromptVersion, PROMPT_VERSION } from '@/lib/exam-analysis/constants';
import { sumPoints, roundPoints, formatPoints } from '@/lib/exam-analysis/points';
import { koImg } from '@/lib/exam-analysis/section-blocks';
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

// 네이버 섹션 캡처 캐시 무효화 버전 — 캡처 로직/스타일을 바꾸거나 서버 이미지를 초기화하면 bump.
// v2: 캡처 이미지 일괄 초기화 + 3일 TTL 도입(2026-05-30) → 기존 v1 클라 캐시 무시.
// v3: 옆트임 강제 paste는 네이버가 무조건 fit으로 재빌드 → 불가능 확정. 옆트임 실험 제거,
//     표준(문서너비 720px) 단일 경로로 정리(2026-05-30). 옆트임은 사용자가 네이버에서 수동 적용.
const NAVER_CAPTURE_VERSION = 'v3';
// 클라 캐시 유효기간 — 서버 cleanup(3일)과 동일. 만료 시 재캡처(서버가 이미 지웠을 수 있어 죽은 URL 재사용 방지).
const NAVER_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/** 짧은 문자열 해시(djb2) — 캐시 시그니처용. 충돌 위험은 무시 가능 수준. */
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** el 내부 모든 <img>가 로드될 때까지 대기 (최대 timeoutMs). 자동 펼침 직후 차트 PNG 누락 캡처 방지. */
function waitForImages(el: HTMLElement, timeoutMs: number): Promise<void> {
  const pending = (Array.from(el.querySelectorAll('img')) as HTMLImageElement[])
    .filter((img) => !img.complete || img.naturalWidth === 0);
  if (pending.length === 0) return Promise.resolve();
  return Promise.race([
    Promise.all(pending.map((img) => new Promise<void>((res) => {
      img.addEventListener('load', () => res(), { once: true });
      img.addEventListener('error', () => res(), { once: true });
    }))).then(() => undefined),
    new Promise<void>((res) => setTimeout(res, timeoutMs)),
  ]);
}

interface AnalysisDetailProps {
  detail: ExamPaperData;
  analyzing: boolean;
  onAnalyze: (id: string) => void;
  onRefresh: () => void;
  /** 분석 시 총평 자동 생성 옵션 (page.tsx에서 localStorage 관리) */
  autoCommentary?: boolean;
  onToggleAutoCommentary?: (v: boolean) => void;
  /** 현재 시험지의 생성 단계 (page.tsx genState) — metadata(준비) / commentary(자동 총평) + 진행시각 */
  gen?: { phase: 'metadata' | 'commentary'; startMs: number; willChain: boolean } | null;
  /** 수동 [총평 생성] 시작/종료를 page.tsx에 알림 → 사이드바 배지 실시간 반영 + 완료 시 목록 갱신 */
  onCommentaryGenChange?: (id: string, started: boolean) => void;
}

export function AnalysisDetail({ detail, analyzing, onAnalyze, onRefresh, autoCommentary = false, onToggleAutoCommentary, gen = null, onCommentaryGenChange }: AnalysisDetailProps) {
  const { user } = useAuth();
  const { features } = useSubscription(); // 플랜 기능 게이팅 (commentary/nearby)
  const [activeTab, setActiveTab] = useState<AnalysisTab>('basic');
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const copyingRef = useRef(false);              // 네이버 이미지 복사 진행 중 재진입(다중 클릭) 차단 — 즉시 동작하는 잠금
  const [copying, setCopying] = useState(false);  // 버튼 disabled 시각 표시용
  // 총평 생성 중인 시험지 추적 (examId → 시작 ms). 시험지 전환에도 살아남도록 Record로 보관.
  // AnalysisDetail은 시험지 전환 시 unmount되지 않으므로(key 없음) 진행 상태가 유지됨 →
  // 다른 시험지 봤다가 돌아와도 진행바 복원. fetch promise도 계속 진행되어 생성은 멈추지 않음.
  const [commentaryGen, setCommentaryGen] = useState<Record<string, number>>({});
  const [commentaryElapsed, setCommentaryElapsed] = useState(0);
  // 총평 생성 실시간 로그 — analyze-extended는 비스트리밍이라 경과시간 기준 마일스톤 메시지(V4/재분석과 동일 패턴)
  const [commentaryLogs, setCommentaryLogs] = useState<Array<{ time: string; msg: string }>>([]);
  // 외부(page.tsx 자동 체인) 생성 단계 — gen.phase로 metadata/commentary 분기.
  const metadataStartedAt = gen?.phase === 'metadata' ? gen.startMs : null;
  const externalCommentaryStartedAt = gen?.phase === 'commentary' ? gen.startMs : null;
  const metadataWillChain = !!gen?.willChain;
  const metadataPending = metadataStartedAt !== null;
  const [metadataElapsed, setMetadataElapsed] = useState(0);
  // 총평 진행 = 수동 버튼(commentaryGen) 또는 자동 체인(externalCommentaryStartedAt) 중 활성인 것.
  const genStartedAt = commentaryGen[detail.id] ?? externalCommentaryStartedAt ?? null;
  const commentaryLoading = genStartedAt !== null;
  const [includeNearby, setIncludeNearby] = useState(true);
  const [includeYearCompare, setIncludeYearCompare] = useState(true);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [yearCount, setYearCount] = useState<number | null>(null);
  const [nearbySchools, setNearbySchools] = useState<string[]>([]); // hover 표시용 학교명
  const [years, setYears] = useState<string[]>([]); // hover 표시용 비교 연도

  // 주변/연도 기출 건수 + 목록 조회 (주변비교는 Pro+ 기능 — free면 호출 단락 + 403 스팸 방지)
  useEffect(() => {
    if (!features.nearby) { setNearbyCount(0); setYearCount(0); setNearbySchools([]); setYears([]); return; }
    if (!detail.schoolId) { setNearbyCount(0); setYearCount(0); setNearbySchools([]); setYears([]); return; }
    const params = new URLSearchParams({ schoolId: detail.schoolId, grade: detail.grade, examPaperId: detail.id });
    fetch(`/api/exam-analysis/nearby-count?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setNearbyCount(d?.data?.nearbyCount ?? 0);
        setYearCount(d?.data?.yearCount ?? 0);
        setNearbySchools(Array.isArray(d?.data?.nearbySchools) ? d.data.nearbySchools : []);
        setYears(Array.isArray(d?.data?.years) ? d.data.years : []);
      })
      .catch(() => { setNearbyCount(0); setYearCount(0); setNearbySchools([]); setYears([]); });
  }, [detail.schoolId, detail.grade, detail.id, features.nearby]);

  // hover tooltip 문구
  const nearbyTitle = nearbySchools.length ? `포함 학교: ${nearbySchools.join(', ')}` : '같은 지역 동일 시기 기출이 없습니다';
  const yearTitle = years.length ? `비교 연도: ${years.map(y => `${y}년`).join(', ')}` : '같은 학교 다른 연도 기출이 없습니다';

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

  // 총평 생성 마일스톤 로그 — 경과시간이 임계치를 넘을 때마다 단계 메시지 추가 (실제 진행을 모사)
  useEffect(() => {
    if (!commentaryLoading) { setCommentaryLogs([]); return; }
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const stamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const milestones: Array<{ at: number; msg: string }> = [
      { at: 1, msg: 'AI 분석 호출 시작' },
      { at: 6, msg: '시험 메타 + 문항별 난이도·단원 입력 중' },
      { at: 14, msg: '종합 평가 + 강·약점 분석 중' },
      { at: 26, msg: '주변 학교 · 작년 시험 비교 분석 중' },
      { at: 40, msg: 'V3 매거진 필드 생성 중 (헤드라인 · Q&A 인터뷰)' },
      { at: 56, msg: '등급컷 추정 · 단원별 성취 분석 중' },
      { at: 74, msg: '킬러 문항 맵 · 학습 전략 작성 중' },
      { at: 94, msg: 'JSON 응답 정규화 (영문 enum·수식 보정) 중' },
      { at: 115, msg: '거의 완료 — DB 저장 중' },
    ];
    setCommentaryLogs((prev) => {
      const toAdd = milestones.filter((m) => commentaryElapsed >= m.at && !prev.some((l) => l.msg === m.msg));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd.map((m) => ({ time: stamp, msg: m.msg }))];
    });
  }, [commentaryLoading, commentaryElapsed]);

  // 메타데이터(V3 총평 준비) 경과 시간 타이머 — 프로그레스 바용
  useEffect(() => {
    if (metadataStartedAt === null) {
      setMetadataElapsed(0);
      return;
    }
    setMetadataElapsed(Math.floor((Date.now() - metadataStartedAt) / 1000));
    const interval = setInterval(() => {
      setMetadataElapsed(Math.floor((Date.now() - metadataStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [metadataStartedAt]);

  const latestAnalysis = detail.analyses?.[0];
  // 선생님 난이도 교정 오버레이 — 수정 즉시 종합 난이도 재계산 (서버 저장은 PATCH 가 별도 처리)
  const [diffEdits, setDiffEdits] = useState<Record<string, { difficulty: string; ai_difficulty: string | null }>>({});
  // 분석본 전환 시 오버레이 초기화
  useEffect(() => { setDiffEdits({}); }, [latestAnalysis?.id]);
  const questions = useMemo(() =>
    (latestAnalysis?.questions || []).map((q) => {
      const e = diffEdits[String(q.question_number)];
      return e ? { ...q, difficulty: e.difficulty, ai_difficulty: e.ai_difficulty, manually_edited: true } : q;
    }),
  [latestAnalysis?.questions, diffEdits]);
  const summary = (latestAnalysis?.summary || null) as AnalysisSummary | null;
  const totalPoints = latestAnalysis?.totalPoints;

  const confidenceInfo = useMemo(() => getConfidenceInfo(questions), [questions]);
  const diffLevel = useMemo(() => getOverallDifficultyLevel(summary, questions), [summary, questions]);

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
  // metadataPending(= gen.phase==='metadata')은 위에서 gen으로부터 파생. 클라이언트 신호로만 판단해
  // 기존 분석본(메타데이터 없음)이 영구 차단되지 않도록 함(폴백 총평 동작).

  // 구버전(이전 PROMPT_VERSION) 분석본 — 총평을 구버전 분석 데이터로 생성하면 품질 불일치.
  // → 총평 생성/재생성을 사전 차단하고 재분석을 유도한다 (사용자 요청 2026-05-30).
  const isStaleAnalysis = isStalePromptVersion(latestAnalysis?.modelVersion);
  const stalePromptLabel = extractPromptVersion(latestAnalysis?.modelVersion);

  // AI 총평은 Pro+ 플랜 기능 — free면 잠금 (기존 총평 열람은 허용, 생성/재생성만 차단)
  const commentaryLocked = !features.commentary;

  // 총평 생성 가능 = readiness 통과 + 메타데이터 준비 중 아님 + 구버전 아님 + 플랜 잠김 아님
  const commentaryReady = readinessCheck.ready && !metadataPending && !isStaleAnalysis && !commentaryLocked;

  const handleGenerateCommentary = async () => {
    if (!latestAnalysis) return;
    // Pro+ 플랜 기능 잠금 (서버에서도 403 FEATURE_LOCKED 방어)
    if (commentaryLocked) {
      toast.error('AI 총평은 Pro 플랜 이상에서 사용할 수 있습니다 — 구독에서 업그레이드하세요');
      return;
    }
    // 구버전 분석본 차단 — 재분석 후에만 총평 생성 가능 (모든 진입점 방어: 버튼/재생성)
    if (isStaleAnalysis) {
      toast.error(`이전 버전(${stalePromptLabel || '구버전'})으로 분석된 시험지입니다. 먼저 [재분석]으로 최신 분석 후 총평을 생성하세요.`);
      return;
    }
    const startId = detail.id;
    // 생성 시작 — commentaryGen에 등록 (시험지 전환에도 유지). fetch는 계속 진행됨.
    setCommentaryGen((p) => ({ ...p, [startId]: Date.now() }));
    onCommentaryGenChange?.(startId, true); // 사이드바 배지 "총평 생성중"
    try {
      const res = await fetch(`/api/exam-analysis/${startId}/analyze-extended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: ['commentary'], forceRegenerate: !!commentary, includeNearby, includeYearCompare }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error?.message || (res.status === 403 ? 'AI 총평은 Pro 플랜 이상에서 사용할 수 있습니다 — 구독에서 업그레이드하세요' : '총평 생성에 실패했습니다'));
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
      onCommentaryGenChange?.(startId, false); // 배지 해제 + 목록 갱신(총평완료)
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
  // dormant — [네이버 복사(서식)] 버튼 제거(2026-05-30). 네이버 이미지 복사로 일원화. 재활성 시 _ 제거.
  const _handleCopyV3Naver = async () => {
    if (!commentary || !commentary.blog_qa?.length) {
      toast.error('V3 데이터가 없습니다. 총평 재생성 후 다시 시도하세요.');
      return;
    }
    const tid = toast.loading('차트 이미지 생성 중... (최초 30~60초)');
    try {
      // 차트 PNG 미리 워밍업 + URL 수집 (lazy 생성 트리거)
      // ⚠️ 첫 호출은 serial로 — 4개 병렬 호출 시 각각 generateAllChartImages를 독립 실행 (4× 작업)
      // 첫 호출(difficulty) 완료 후 DB에 4종 캐시됨 → 나머지 3개 병렬은 cache hit으로 즉시.
      const baseUrl = window.location.origin;
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
        toast.success(
          hasCharts
            ? '총평이 클립보드에 복사되었습니다 (차트 포함). 네이버 블로그에 붙여넣으세요.'
            : '총평이 클립보드에 복사되었습니다. 네이버 블로그에 붙여넣으세요.',
          undefined,
          tid,
        );
      } finally {
        document.body.removeChild(container);
      }
    } catch (e) {
      toast.error('복사 실패: ' + (e instanceof Error ? e.message : String(e)), undefined, tid);
    }
  };

  /**
   * 네이버 "이미지 복사" — 실제 V3 화면(.v3)을 섹션별로 그대로 캡처(modern-screenshot) →
   * Supabase 업로드(공개 URL) → [이미지][핵심요약] 순으로 클립보드 복사.
   * 네이버가 매거진 HTML을 뭉개는 한계를 "실화면 이미지"로 우회 + 요약 텍스트로 검색 노출(이중첨부).
   */
  const handleCopyNaverImages = async () => {
    if (!commentary) { toast.error('총평이 없습니다. 먼저 총평을 생성하세요.'); return; }
    // 다중 클릭 차단 — 캡처/업로드가 진행 중이면 추가 클릭 무시 (병렬 실행 방지)
    if (copyingRef.current) { toast.info('이미 복사 중입니다. 완료 후 다시 시도하세요.'); return; }
    copyingRef.current = true;
    setCopying(true);
    // .v3 폴링 — 헤더 버튼이 접힌 상태에서 자동으로 펼치므로, 매거진(.v3)이 마운트될 때까지 최대 ~2.5s 대기
    let root: HTMLElement | null = null;
    for (let i = 0; i < 25; i++) {
      root = document.querySelector('.v3') as HTMLElement | null;
      if (root) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!root) {
      toast.error('총평 매거진을 찾을 수 없습니다. 다시 시도해 주세요.');
      copyingRef.current = false;
      setCopying(false);
      return;
    }
    // 자동 펼침 직후 차트 이미지가 미로드면 빈 차트로 캡처됨 → 이미지 로드 완료 대기 (최대 4s)
    await waitForImages(root, 4000);
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const summaryOf = (node: HTMLElement): string => {
      const heading = (node.querySelector('h1,h2,h3,h4,.v3-section-sub') as HTMLElement | null)?.innerText?.trim() || '';
      const para = (node.querySelector('p') as HTMLElement | null)?.innerText?.trim() || '';
      const firstSentence = para.split(/(?<=[.?!。])\s/)[0] || '';
      const merged = [heading, firstSentence].filter(Boolean).join(' — ');
      return koImg(merged).slice(0, 140);
    };
    const DISPLAY_W = 720; // 네이버 문서너비 표시 폭 (옆트임은 paste로 강제 불가 — 사용자가 네이버에서 수동 적용)

    // 내용 시그니처 — 총평/문항이 그대로면 재캡처·재업로드 없이 저장된 캡처 URL을 재사용(중복 낭비 방지).
    //   총평 재생성이나 문항(난이도·배점·유형 등) 수정 시 sig가 바뀌어 자동으로 다시 캡처한다.
    const qSig = (questions as { difficulty?: unknown; points?: unknown; question_type?: unknown; ability_domain?: unknown; is_correct?: unknown }[])
      .map((q) => `${q.difficulty}|${q.points}|${q.question_type ?? ''}|${q.ability_domain ?? ''}|${q.is_correct ?? ''}`).join(';');
    const sig = `${NAVER_CAPTURE_VERSION}|${hashStr(JSON.stringify(commentary))}|${hashStr(qSig)}`;
    const cacheKey = `mathlab_naver_sec_${detail.id}_std`;
    let blocks: { url: string; summary: string }[] = [];
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null') as { sig?: string; savedAt?: number; blocks?: { url: string; summary: string }[] } | null;
      // sig 일치 + 3일 이내(서버 cleanup TTL과 동일)일 때만 재사용. 만료/불일치면 재캡처.
      const fresh = cached?.savedAt != null && (Date.now() - cached.savedAt) < NAVER_CACHE_TTL_MS;
      if (cached && fresh && cached.sig === sig && Array.isArray(cached.blocks) && cached.blocks.length) blocks = cached.blocks;
    } catch { /* 캐시 파싱 실패 → 새로 캡처 */ }

    const reused = blocks.length > 0;
    const tid = toast.loading(reused ? '저장된 캡처 재사용 — 복사 준비 중...' : '실제 V3 화면 캡처·업로드 준비 중...');
    try {
      if (!reused) {
        const { domToPng } = await import('modern-screenshot');
        // V3 최상위 블록 모두 캡처 (header/kpi-row(div)/section들/conclusion(div)). footer(credits)·초소형 제외.
        const nodes = (Array.from(root.children) as HTMLElement[])
          .filter((el) => el.tagName.toLowerCase() !== 'footer' && el.offsetHeight >= 24);
        let i = 0;
        for (const node of nodes) {
          i += 1;
          toast.loading('섹션 캡처·업로드 중...', tid, { current: i, total: nodes.length });
          let dataUrl: string;
          try {
            // 섹션의 실제 배경색을 backdrop으로 전달 — dark 섹션(.v3-feature #121212 등)에서
            // 밝은 텍스트가 흰 배경 위에 찍혀 안 보이는 문제 방지. 투명이면 흰색.
            const bg = getComputedStyle(node).backgroundColor;
            const backgroundColor = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' ? bg : '#ffffff';
            dataUrl = await domToPng(node, {
              scale: 2,
              backgroundColor,
              // 브라우저 확장 프로그램이 주입한 floating 오버레이("AI 활용 설정" 토글 등) 제외.
              // V3 섹션 콘텐츠는 모두 정상 흐름(in-flow)이라 fixed 요소가 없음 → 안전.
              filter: (el: Node) => {
                if (el instanceof HTMLElement) {
                  if (getComputedStyle(el).position === 'fixed') return false;
                  if (el.hasAttribute('data-html2canvas-ignore')) return false;
                }
                return true;
              },
            });
          } catch { continue; }
          try {
            const res = await fetch(`/api/exam-analysis/${detail.id}/upload-section-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ section: `std_s${i}`, dataUrl }),
            });
            if (!res.ok) continue;
            const json = await res.json();
            if (json?.data?.url) blocks.push({ url: json.data.url, summary: summaryOf(node) });
          } catch { /* 업로드 실패한 섹션은 건너뜀 */ }
        }
        // 캡처 끝 → 인라인 폭 제거(원래 CSS 흐름 복귀). 저장값 복원이 아니라 '' 클리어 = 동시 실행돼도 stuck 안 됨.
        root.style.width = '';
        // 캐시 저장 — 다음 복사 때 동일 내용이면 위 캡처 루프를 통째로 건너뜀
        try { localStorage.setItem(cacheKey, JSON.stringify({ sig, blocks, savedAt: Date.now() })); } catch { /* 용량 초과 등 무시 */ }
      }
      if (!blocks.length) { toast.error('캡처/업로드된 섹션이 없습니다', undefined, tid); return; }

      // 첫 이미지(상단 헤더) 캡션은 항상 "학교 연도 학기 시험종류"로 시작 (검색 노출 강화).
      //   examScope(Json — 신형 객체/레거시 배열/null)는 진입부 정규화 후 사용. examType은 MIDTERM/FINAL.
      const examLabel = (() => {
        const parts: string[] = [];
        if (detail.schoolName?.trim()) parts.push(detail.schoolName.trim());
        const scope = detail.examScope;
        let year: unknown, sem: unknown;
        if (scope && typeof scope === 'object' && !Array.isArray(scope)) {
          year = (scope as { examYear?: unknown }).examYear;
          sem = (scope as { examSemester?: unknown }).examSemester;
        }
        const tail: string[] = [];
        if (typeof year === 'number' || (typeof year === 'string' && year)) tail.push(`${year}년`);
        if (typeof sem === 'number') tail.push(`${sem}학기`);
        const etLabel = ({ MIDTERM: '중간', FINAL: '기말' } as Record<string, string>)[detail.examType] ?? '';
        if (etLabel) tail.push(`${etLabel}고사`);
        if (tail.length) parts.push(tail.join(' '));
        return koImg(parts.join(' ')).trim();
      })();

      const html = `<div style="width:${DISPLAY_W}px;max-width:100%;">${blocks.map((b, idx) => {
        const cap = idx === 0 && examLabel ? (b.summary ? `${examLabel} — ${b.summary}` : examLabel) : b.summary;
        return `<p style="text-align:center;margin:0 0 6px;"><img src="${b.url}" style="width:${DISPLAY_W}px;max-width:100%;" /></p>` +
          (cap ? `<p style="font-size:14px;color:#555;line-height:1.75;margin:0 0 30px;word-break:keep-all;">${esc(cap)}</p>` : '');
      }).join('')}</div>`;

      // 클립보드 복사 — 캡처/업로드(긴 async) 후에는 execCommand의 user-gesture가 만료돼 실패할 수 있음.
      //   → 모던 Clipboard API 우선(문서 포커스만 있으면 async 후에도 동작). 실패 시 execCommand 폴백.
      const plain = blocks.map((b) => b.summary).filter(Boolean).join('\n\n');
      let copied = false;
      if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        try {
          if (!document.hasFocus()) window.focus();
          await navigator.clipboard.write([
            new window.ClipboardItem({
              'text/html': new Blob([html], { type: 'text/html' }),
              'text/plain': new Blob([plain], { type: 'text/plain' }),
            }),
          ]);
          copied = true;
        } catch { /* execCommand 폴백으로 진행 */ }
      }
      if (!copied) {
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;width:1000px;font-family:"맑은 고딕",sans-serif;color:#333;text-align:left;';
        document.body.appendChild(container);
        try {
          const range = document.createRange();
          range.selectNodeContents(container);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          copied = document.execCommand('copy');
          selection?.removeAllRanges();
        } finally {
          document.body.removeChild(container);
        }
      }
      if (!copied) throw new Error('클립보드 복사 실패 — 창을 클릭해 포커스를 둔 뒤 다시 시도하세요');
      toast.success(`${blocks.length}개 섹션 이미지 + 요약이 복사되었습니다.${reused ? ' (저장된 캡처 재사용)' : ''} 네이버 블로그에 붙여넣으세요.`, undefined, tid);
    } catch (e) {
      toast.error('이미지 복사 실패: ' + (e instanceof Error ? e.message : String(e)), undefined, tid);
    } finally {
      root.style.width = ''; // 안전망: 에러/동시실행에도 인라인 폭 제거 (stuck 960px 방지)
      copyingRef.current = false;   // 잠금 해제 → 다시 클릭 가능
      setCopying(false);
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
              const breakdown = getDifficultyBreakdown(summary, questions);
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
                      <div className="relative h-1.5 w-full">
                        <div
                          className="absolute top-0 -translate-x-1/2 transition-all"
                          style={{ left: `${((Math.max(1, Math.min(5, avg)) - 1) * 26 + 12) / 128 * 100}%` }}
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
                    <span className="text-base font-extrabold" style={{ color: activeColor }}>{avg.toFixed(1)}단계</span>
                    {breakdown && (
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {breakdown.total}문항 {breakdown.usedPoints ? '배점 가중평균' : '문항수 평균'}
                      </div>
                    )}
                    {(() => {
                      const editedCount = questions.filter((q) => q.manually_edited && q.ai_difficulty != null).length;
                      return editedCount > 0 ? (
                        <div className="text-[10px] text-primary font-medium mt-0.5">선생님 교정 {editedCount}건 반영</div>
                      ) : null;
                    })()}
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
                  {/* 구버전/플랜잠김이면 상단 버튼/옵션 숨김 — 아래 배너의 CTA가 단일 진입 (버튼 중복 방지) */}
                  {!commentaryLoading && !isStaleAnalysis && !commentaryLocked && (
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
                  {detail.schoolId && !commentaryLoading && !isStaleAnalysis && !commentaryLocked && (
                    <div className="flex items-center gap-3">
                      <label title={nearbyTitle} className={`flex items-center gap-1 text-[11px] cursor-pointer ${nearbyCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                        <input
                          type="checkbox"
                          checked={includeNearby && (nearbyCount ?? 0) > 0}
                          onChange={e => setIncludeNearby(e.target.checked)}
                          disabled={nearbyCount === 0}
                          className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                        />
                        주변 {nearbyCount != null && <span className={nearbyCount > 0 ? 'text-violet-500 font-medium' : ''}>({nearbyCount}교)</span>}
                      </label>
                      <label title={yearTitle} className={`flex items-center gap-1 text-[11px] cursor-pointer ${yearCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
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
              {/* ── 구버전 분석본 차단 (이전 PROMPT_VERSION) — 재분석 유도. 다른 경고보다 우선 ── */}
              {isStaleAnalysis && !commentaryLoading && (
                <div className="mt-3 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-sm flex items-start gap-2.5">
                  <span className="text-rose-500 text-sm mt-0.5 shrink-0">&#9888;</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-rose-800">
                      이전 버전(<b>{stalePromptLabel || '구버전'}</b>)으로 분석된 시험지입니다 — 현재 {PROMPT_VERSION}
                    </p>
                    <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">
                      구버전 분석 데이터로 총평을 생성하면 최신 난이도·단원 기준과 어긋납니다. <strong>재분석</strong>으로 최신 분석한 뒤 총평을 생성하세요.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => onAnalyze(detail.id)}
                      disabled={analyzing}
                      className="mt-2 bg-rose-600 hover:bg-rose-700 text-white disabled:bg-slate-300"
                    >
                      {analyzing ? '재분석 중...' : '최신 버전으로 재분석'}
                    </Button>
                  </div>
                </div>
              )}
              {/* ── 플랜 잠김 (AI 총평 = Pro+ 전용) — 구버전이 아닐 때, readiness보다 우선 ── */}
              {!isStaleAnalysis && commentaryLocked && !commentaryLoading && (
                <div className="mt-3 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-sm flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-violet-800">AI 시험 총평은 Pro 플랜 전용입니다</p>
                    <p className="text-[11px] text-violet-600 mt-1 leading-relaxed">
                      Pro 플랜으로 업그레이드하면 시험 전체에 대한 전문가 수준의 종합 평가와 주변 학교·연도 비교를 사용할 수 있습니다.
                    </p>
                    <Link
                      href="/billing"
                      className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-medium rounded-sm transition-colors"
                    >
                      구독 업그레이드
                    </Link>
                  </div>
                </div>
              )}
              {/* ── 총평 생성 차단 경고 (배점/단원 미완성) — 구버전·플랜잠김이 아닐 때만 ── */}
              {!isStaleAnalysis && !commentaryLocked && !readinessCheck.ready && !commentaryLoading && (
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
              {/* ── 메타데이터 준비 중 (배점/단원 통과, V3 base 백그라운드 생성) — 시험지별 고유 프로그레스 바 ── */}
              {!isStaleAnalysis && !commentaryLocked && readinessCheck.ready && metadataPending && !commentaryLoading && (
                <div className="mt-3 px-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-violet-700">V3 총평 준비 중...</span>
                    <span className="text-[11px] text-violet-500 tabular-nums">{metadataElapsed}초</span>
                  </div>
                  <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.min((metadataElapsed / 20) * 100, 95)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-violet-600 mt-1.5 leading-relaxed">
                    분석 기반 데이터를 생성하고 있습니다.{' '}
                    {metadataWillChain ? '완료되면 자동으로 총평이 이어서 생성됩니다.' : '완료되면 [총평 생성]이 활성화됩니다.'}
                  </p>
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
                      style={{ width: `${Math.min((commentaryElapsed / 110) * 100, 96)}%` }}
                    />
                  </div>
                  {/* 실시간 실행 로그 (분석 progress / V4 생성과 동일 디자인) — 바가 끝에 멈춰도 단계 메시지로 진행 체감 */}
                  {commentaryLogs.length > 0 && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-violet-800">실행 로그</span>
                        <span className="text-[10px] text-violet-600">{commentaryLogs.length}개 항목</span>
                      </div>
                      <div className="bg-slate-900 text-slate-100 rounded-sm px-3 py-2 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed">
                        {commentaryLogs.map((entry, idx) => (
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
              nearbyTitle={nearbyTitle}
              includeYearCompare={includeYearCompare}
              onIncludeYearCompareChange={setIncludeYearCompare}
              yearCount={yearCount}
              yearTitle={yearTitle}
              hasSchool={!!detail.schoolId}
              staleVersion={isStaleAnalysis ? (stalePromptLabel || '구버전') : null}
              commentaryLocked={commentaryLocked}
              onReanalyze={() => onAnalyze(detail.id)}
              reanalyzing={analyzing}
              examMeta={{
                title: detail.title,
                grade: detail.grade,
                schoolName: detail.schoolName ?? null,
                analyzedAt: latestAnalysis?.analyzedAt ?? null,
              }}
              examPaperId={detail.id}
              onV4Generated={() => onRefresh()}
              onCopyImages={handleCopyNaverImages}
              copyingImages={copying}
            />
          )}

          {/* 기출 분석 글 / V4 네이버 복사 — 현재 모두 dormant(플래그 false)라 미렌더.
              네이버 이미지 복사는 "AI 시험 총평" 헤더로 이동(CommentarySection onCopyImages). */}
          {commentary && (V2_ARTICLE_ENABLED || V4_NAVER_COPY_ENABLED) && (() => {
            const hasArticle = latestAnalysis?.extensions?.some(e => e.agentType === 'blog-article');
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
            <AnalysisCommentTab
              questions={questions}
              examPaperId={detail.id}
              onDifficultyEdit={(qNum, difficulty, aiDifficulty) =>
                setDiffEdits((prev) => ({ ...prev, [String(qNum)]: { difficulty, ai_difficulty: aiDifficulty } }))
              }
            />
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
        const breakdown = getDifficultyBreakdown(summary, questions);
        const avg = breakdown?.weightedAvg ?? diffLevel;
        const avgLabel = breakdown?.usedPoints ? '배점 가중평균' : '문항수 평균';
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
                    시험 난이도 <span style={{ color: activeColor }}>{avg.toFixed(1)}단계</span>
                    <span className="text-slate-500 font-medium"> ({levelLabel})</span>
                  </h3>
                  {breakdown && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {avgLabel} {breakdown.weightedAvg.toFixed(2)}/5 · 총 {breakdown.total}문항
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
                  AI가 시험지의 모든 문항을 <strong>1~5단계</strong> (1=기본 · 2=표준 · 3=응용 · 4=심화 · 5=최고난도) 로 분류한 뒤, <strong>각 문항의 배점을 가중치로</strong> 곱해 합산하고 <strong>총 배점</strong>으로 나눠 <strong>배점 가중평균</strong>을 구합니다. 배점이 큰 고난도 문항일수록 평균에 더 크게 반영됩니다. (배점 정보가 없으면 문항 수 기준 평균)
                </p>
                {breakdown && (
                  <p>
                    이 시험은 분포가 <strong>{distLabel}</strong>로, {avgLabel} <strong>{breakdown.weightedAvg.toFixed(2)}</strong> → <strong>{avg.toFixed(1)}단계</strong>로 산정되었습니다. (정수 그룹: {diffLevel}단계)
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
