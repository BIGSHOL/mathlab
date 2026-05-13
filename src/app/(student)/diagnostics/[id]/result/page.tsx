/**
 * /diagnostics/[id]/result — Pattern B V1 (점수 영웅) 적용.
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1
 * 매니페스트 §3.2 — 디자인이 정답.
 *
 * V1 컴포넌트 매핑:
 *   HeroScore.score      ← overallAccuracy (정답률 %)
 *   HeroScore.total      ← 100
 *   HeroScore.grade      ← recommendLevel (심화/상/중/기초 첫 글자)
 *   HeroScore.title      ← "진단평가 결과"
 *   UnitBars (강점)      ← strongAreas
 *   UnitBars (약점)      ← weakAreas
 *   AICommentary         ← 학습 추천 텍스트 (규칙 기반)
 *   NextActions          ← 취약 영역 학습 / 시험 목록
 *
 * 사용 안 함: KpiGrid (진단 결과엔 부적합), WrongList (오답 데이터 없음), RewardBox (보상 없음)
 */
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ResultReportLayout,
  HeroScore,
  UnitBars,
  AICommentary,
  NextActions,
  type UnitAccuracy,
  type NextAction,
} from '@/components/result-report';

// API 가 `string[]` 또는 `{chapter, accuracy, total}[]` 양쪽 형식으로 줄 수 있어 진입부 정규화 (CLAUDE.md §11)
interface DiagnosticResultData {
  id: string;
  diagnosticType: string;
  recommendLevel: string;
  weakAreas: unknown;
  strongAreas: unknown;
  overallAccuracy: number;
  createdAt: string;
}

interface AreaItem {
  chapter: string;
  accuracy: number;
  total: number;
}

/** weakAreas/strongAreas 를 string[] 또는 object[] 어느 쪽이든 AreaItem[] 로 정규화. */
function normalizeAreas(raw: unknown): AreaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      // 시드 데이터의 단순 chapter 문자열 형식 → accuracy/total 알 수 없음
      return { chapter: item, accuracy: 0, total: 0 };
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const chapter = typeof obj.chapter === 'string' ? obj.chapter : String(obj.chapter ?? '');
      const accuracy = typeof obj.accuracy === 'number' ? obj.accuracy : Number(obj.accuracy ?? 0);
      const total = typeof obj.total === 'number' ? obj.total : Number(obj.total ?? 0);
      return { chapter, accuracy, total };
    }
    return { chapter: String(item), accuracy: 0, total: 0 };
  });
}

// 추천 레벨 → HeroScore 뱃지 한 글자.
// 한글 레벨명, 영문 grade 코드 양쪽 모두 처리.
const LEVEL_BADGE_KO: Record<string, string> = {
  심화: 'S',
  상: 'A',
  중: 'B',
  기초: 'C',
  '기초 보충': 'D',
};

function levelBadge(raw: string): string {
  if (!raw) return '·';
  const hit = LEVEL_BADGE_KO[raw];
  if (hit) return hit;
  // grade 코드 (elementary_3 / middle_2 / high_algebra 등) → 학교급 한 글자
  const lower = raw.toLowerCase();
  if (lower.startsWith('elementary')) return '초';
  if (lower.startsWith('middle')) return '중';
  if (lower.startsWith('high')) return '고';
  return raw.charAt(0).toUpperCase();
}

// 추천 레벨 표시용 한글 라벨 (메타에 노출)
const GRADE_LABEL: Record<string, string> = {
  elementary_3: '초3', elementary_4: '초4', elementary_5: '초5', elementary_6: '초6',
  middle_1: '중1', middle_2: '중2', middle_3: '중3',
  high_1: '공통수학1', high_2: '공통수학2', high_algebra: '대수',
  high_calculus1: '미적분I', high_prob: '확률과 통계',
  high_calculus2: '미적분II', high_geo: '기하',
};

function levelLabel(raw: string): string {
  return GRADE_LABEL[raw] ?? raw;
}

export default function DiagnosticResultPage() {
  const { id: attemptId } = useParams<{ id: string }>();
  const [result, setResult] = useState<DiagnosticResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/diagnostics/${attemptId}/result`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setResult(json.data);
      })
      .catch((err) => console.error('진단 결과 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [attemptId]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <div className="rr-frame">
          <div className="rr-topbar">
            <Skeleton className="h-4 w-5" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="rr-v1">
            <div className="rr-v1-main">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <aside className="rr-v1-side">
              <Skeleton className="h-28 w-full mb-4" />
              <Skeleton className="h-36 w-full" />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!result) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">진단 결과를 찾을 수 없습니다</p>
        <Link
          href="/my-tests"
          className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          돌아가기
        </Link>
      </div>
    );
  }

  // 진입부 정규화 (§11)
  const weakAreas = normalizeAreas(result.weakAreas);
  const strongAreas = normalizeAreas(result.strongAreas);

  // accuracy/total 데이터가 0/0 이면 막대 표시할 게 없으므로 fallback (total=1, correct=0)
  const weakUnits: UnitAccuracy[] = weakAreas.map((a) => ({
    name: a.chapter,
    correct: a.total > 0 ? Math.round((a.accuracy / 100) * a.total) : 0,
    total: a.total > 0 ? a.total : 1,
  }));
  const strongUnits: UnitAccuracy[] = strongAreas.map((a) => ({
    name: a.chapter,
    correct: a.total > 0 ? Math.round((a.accuracy / 100) * a.total) : 1,
    total: a.total > 0 ? a.total : 1,
  }));

  // HeroScore 메타
  const heroMeta = [
    { label: '추천 레벨', value: levelLabel(result.recommendLevel) },
    { label: '취약 영역', value: `${weakAreas.length}개` },
    { label: '우수 영역', value: `${strongAreas.length}개` },
  ];

  // AI commentary — 규칙 기반
  let aiComment: ReactNode;
  if (weakAreas.length === 0) {
    aiComment = (
      <>전체적으로 양호한 성취도를 보이고 있습니다. 심화 문제에 도전하며 더 높은 수준으로 도약해 보세요.</>
    );
  } else if (weakAreas.length >= 3) {
    aiComment = (
      <>
        <b>{weakAreas.slice(0, 3).map((a) => a.chapter).join(', ')}</b> 영역의 정답률이 낮습니다. 기초 개념부터 차근차근 복습한 뒤 단원 평가를 다시 응시해 보세요.
      </>
    );
  } else {
    aiComment = (
      <>
        <b>{weakAreas.map((a) => a.chapter).join(', ')}</b> 영역을 집중 보완하면 한 단계 더 높은 레벨로 성장할 수 있습니다. 강점 영역은 가볍게 점검만 하세요.
      </>
    );
  }

  // NextActions
  const actions: NextAction[] = [];
  if (weakAreas.length > 0) {
    actions.push({ label: '취약 영역 학습', primary: true, href: '/subjects' });
  }
  actions.push({ label: '시험 목록으로', href: '/my-tests' });

  const completedAt = new Date(result.createdAt);
  const metaText = `${completedAt.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })} 진단 완료`;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <ResultReportLayout
        backHref="/my-tests"
        title="진단평가 결과"
        meta={metaText}
        main={
          <>
            <HeroScore
              kicker="진단 결과"
              title={
                weakAreas.length === 0
                  ? '훌륭한 성취도예요'
                  : result.overallAccuracy >= 70
                    ? '좋은 출발이에요'
                    : '기초 보충이 필요해요'
              }
              score={result.overallAccuracy}
              total={100}
              grade={levelBadge(result.recommendLevel)}
              meta={heroMeta}
            />

            {strongUnits.length > 0 && (
              <div>
                <div className="rr-section-h">
                  <h3>우수 영역</h3>
                  <span className="sub">Top {strongUnits.length}</span>
                </div>
                <UnitBars units={strongUnits} />
              </div>
            )}

            {weakUnits.length > 0 && (
              <div>
                <div className="rr-section-h">
                  <h3>보완 필요 영역</h3>
                  <span className="sub">집중 학습 권장</span>
                </div>
                <UnitBars units={weakUnits} />
              </div>
            )}
          </>
        }
        side={
          <>
            <AICommentary tag="🎯 학습 추천">{aiComment}</AICommentary>
            <NextActions items={actions} />
          </>
        }
      />
    </div>
  );
}
