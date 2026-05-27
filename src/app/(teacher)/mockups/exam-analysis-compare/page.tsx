'use client';

/**
 * 시험지 분석 모델 비교 목업
 *
 * 같은 시험지를 여러 Gemini 모델로 동시 분석 → 결과/속도/비용 비교.
 * 3.5 Flash로 충분한지 vs Pro Preview까지 필요한지 의사결정 도구.
 *
 * - DB 저장 X (analyze-compare API 사용)
 * - 동일 시험지 + 동일 프롬프트 + 다른 모델만 변경
 */

import { useEffect, useState, useCallback, Fragment } from 'react';
import { Play, Loader2, AlertCircle, CheckCircle2, DollarSign, Clock, FileQuestion, Target } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

// 비교 대상 모델 4개
const COMPARE_MODELS = [
  {
    id: 'gemini-2.5-flash',
    label: '2.5 Flash',
    desc: '이전 메인 (저렴)',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    accent: 'border-l-slate-400',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: '2.5 Flash Lite',
    desc: '최저가',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    accent: 'border-l-emerald-400',
  },
  {
    id: 'gemini-3.5-flash',
    label: '3.5 Flash',
    desc: '신규 GA (2026-05)',
    color: 'bg-blue-50 text-blue-700 border-blue-300',
    accent: 'border-l-blue-500',
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: '3.1 Pro Preview',
    desc: '최고 정확도 (느림/비쌈)',
    color: 'bg-violet-50 text-violet-700 border-violet-300',
    accent: 'border-l-violet-500',
  },
] as const;

type ModelId = typeof COMPARE_MODELS[number]['id'];

interface ExamPaperOption {
  id: string;
  title: string;
  grade: string;
  status: string;
}

interface AnalyzedQuestion {
  question_number: number | string;
  difficulty: string;
  question_type: string;
  ability_domain: string | null;
  question_format: string | null;
  points: number | null;
  topic: string | null;
  ai_comment: string | null;
  confidence: number;
  confidence_reason: string | null;
}

interface CompareResult {
  model: string;
  timings: {
    loadMs: number;
    promptMs: number;
    aiMs: number;
    totalMs: number;
  };
  cost: {
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedUsd: number;
    pricingPer1M: { input: number; output: number };
  };
  accuracy: {
    totalQuestions: number;
    totalPoints: number;
    pointsExpected: number;
    pointsDiff: number;
    avgConfidence: number;
    unknownTopicCount: number;
    unknownTopicPct: number;
  };
  summary: {
    difficulty_distribution: Record<string, number>;
    type_distribution: Record<string, number>;
    average_difficulty: string;
    dominant_type: string;
  } | null;
  examInfo: {
    total_questions: number;
    total_points: number;
    school_name: string | null;
    format_distribution?: { objective: number; short_answer: number; essay: number };
  };
  questions: AnalyzedQuestion[];
}

type ModelState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: CompareResult }
  | { status: 'error'; message: string };

const DIFFICULTY_LABELS: Record<string, string> = {
  '1': '기본', '2': '표준', '3': '응용', '4': '심화', '5': '최고난도',
};

const TYPE_LABELS: Record<string, string> = {
  number: '수와 연산',
  algebra: '문자와 식',
  function: '함수',
  geometry: '기하',
  statistics: '확률과 통계',
};

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}

function fmtUsd(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

export default function ExamAnalysisComparePage() {
  const [examPapers, setExamPapers] = useState<ExamPaperOption[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [paperListLoading, setPaperListLoading] = useState(true);
  const [results, setResults] = useState<Record<ModelId, ModelState>>({
    'gemini-2.5-flash': { status: 'idle' },
    'gemini-2.5-flash-lite': { status: 'idle' },
    'gemini-3.5-flash': { status: 'idle' },
    'gemini-3.1-pro-preview': { status: 'idle' },
  });
  const [selectedModels, setSelectedModels] = useState<Set<ModelId>>(
    new Set(['gemini-3.5-flash', 'gemini-3.1-pro-preview']),
  );

  // 시험지 목록 로드
  useEffect(() => {
    let mounted = true;
    setPaperListLoading(true);
    fetch('/api/exam-analysis?limit=50&page=1')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        const items = (json.data || []) as Array<{
          id: string;
          title: string;
          grade: string;
          status: string;
        }>;
        setExamPapers(items);
      })
      .catch(() => {
        toast.error('시험지 목록 로드 실패');
      })
      .finally(() => {
        if (mounted) setPaperListLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleModel = (modelId: ModelId) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  };

  const runCompare = useCallback(async () => {
    if (!selectedPaperId) {
      toast.warning('시험지를 먼저 선택하세요');
      return;
    }
    if (selectedModels.size === 0) {
      toast.warning('비교할 모델을 1개 이상 선택하세요');
      return;
    }

    // 모든 선택 모델을 idle → loading으로 초기화 (대기 상태 표시)
    setResults((prev) => {
      const next = { ...prev };
      for (const modelId of selectedModels) {
        next[modelId] = { status: 'idle' };
      }
      return next;
    });

    // ⚠️ 순차 호출 — Promise.all로 4개 동시 호출 시 dev 서버 OOM crash 발생.
    // 모델별 base64 이미지 + Gemini API 응답이 메모리 누적 → process killed.
    // 가벼운 모델부터 시작하여 빠른 피드백 + 무거운 Pro Preview는 마지막.
    const orderedModels = COMPARE_MODELS
      .filter((m) => selectedModels.has(m.id))
      .map((m) => m.id);

    let successCount = 0;
    let errorCount = 0;

    for (const modelId of orderedModels) {
      // 현재 모델만 loading으로 전환
      setResults((prev) => ({ ...prev, [modelId]: { status: 'loading' } }));

      try {
        const res = await fetch(
          `/api/exam-analysis/${selectedPaperId}/analyze-compare?model=${encodeURIComponent(modelId)}`,
          { method: 'POST' },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: {} }));
          throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }
        const json = await res.json();
        setResults((prev) => ({
          ...prev,
          [modelId]: { status: 'success', result: json.data as CompareResult },
        }));
        successCount++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setResults((prev) => ({
          ...prev,
          [modelId]: { status: 'error', message },
        }));
        errorCount++;
      }
    }

    if (errorCount === 0) {
      toast.success(`${successCount}개 모델 분석 완료`);
    } else if (successCount === 0) {
      toast.error(`모든 모델 분석 실패 (${errorCount}개)`);
    } else {
      toast.warning(`${successCount}개 성공 / ${errorCount}개 실패`);
    }
  }, [selectedPaperId, selectedModels]);

  const anyLoading = Object.values(results).some((r) => r.status === 'loading');

  return (
    <div className="flex-1 p-6 max-w-[1800px] mx-auto w-full">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileQuestion className="w-6 h-6 text-primary" />
          시험지 분석 모델 비교
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          동일 시험지를 여러 Gemini 모델로 동시 분석 → 정확도/속도/비용 비교 (DB 저장 안 함)
        </p>
      </div>

      {/* Step 1: 시험지 선택 */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-text-primary">
            1. 시험지 선택 {selectedPaperId && '✓'}
          </h2>
          {selectedPaperId && (
            <span className="text-xs text-slate-400 font-mono">{selectedPaperId.slice(0, 8)}…</span>
          )}
        </div>
        {paperListLoading ? (
          <div className="flex items-center justify-center py-4 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> 시험지 목록 로드 중...
          </div>
        ) : examPapers.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">업로드된 시험지가 없습니다. /exam-analysis에서 먼저 업로드하세요.</p>
        ) : (
          <select
            value={selectedPaperId || ''}
            onChange={(e) => setSelectedPaperId(e.target.value || null)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
          >
            <option value="">-- 시험지 선택 --</option>
            {examPapers.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.grade}] {p.title} ({p.status})
              </option>
            ))}
          </select>
        )}
      </Card>

      {/* Step 2: 모델 선택 */}
      <Card className="p-4 mb-4">
        <h2 className="font-bold text-sm text-text-primary mb-3">
          2. 비교할 모델 선택 ({selectedModels.size}개)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {COMPARE_MODELS.map((m) => {
            const isSelected = selectedModels.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleModel(m.id)}
                className={`text-left p-3 rounded-sm border-2 transition-all ${
                  isSelected ? m.color + ' shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{m.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <p className="text-[11px] opacity-80">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Step 3: 실행 */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-text-primary mb-1">3. 동시 분석 실행</h2>
            <p className="text-xs text-slate-500">
              {selectedModels.size}개 모델을 병렬로 호출합니다. (Pro Preview는 2~5분 소요)
            </p>
          </div>
          <Button
            onClick={runCompare}
            disabled={!selectedPaperId || selectedModels.size === 0 || anyLoading}
            size="md"
          >
            {anyLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 분석 중...</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> 비교 분석 시작</>
            )}
          </Button>
        </div>
      </Card>

      {/* Step 4: 결과 비교 — 카드 가로 배치 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {COMPARE_MODELS.map((m) => {
          const state = results[m.id];
          if (!selectedModels.has(m.id) && state.status === 'idle') return null;
          return (
            <ResultCard key={m.id} model={m} state={state} />
          );
        })}
      </div>

      {/* 비교 요약 표 */}
      <CompareSummaryTable results={results} />

      {/* 문항별 상세 비교 (선택사항) */}
      <QuestionDetailCompare results={results} selectedModels={selectedModels} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 모델별 결과 카드
// ─────────────────────────────────────────────

function ResultCard({
  model,
  state,
}: {
  model: typeof COMPARE_MODELS[number];
  state: ModelState;
}) {
  if (state.status === 'idle') {
    return (
      <div className={`bg-white border-l-4 ${model.accent} border-y border-r border-slate-200 rounded-sm p-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm">{model.label}</span>
          <span className="text-[10px] text-slate-400">대기</span>
        </div>
        <p className="text-xs text-slate-400">분석 시작 전</p>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className={`bg-white border-l-4 ${model.accent} border-y border-r border-slate-200 rounded-sm p-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm">{model.label}</span>
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
        <p className="text-xs text-slate-500">분석 중...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`bg-red-50 border-l-4 ${model.accent} border-y border-r border-red-200 rounded-sm p-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm">{model.label}</span>
          <AlertCircle className="w-4 h-4 text-red-500" />
        </div>
        <p className="text-xs text-red-700 break-words">{state.message}</p>
      </div>
    );
  }

  // success
  const { result } = state;
  const pointsOk = result.accuracy.pointsDiff === 0;
  return (
    <div className={`bg-white border-l-4 ${model.accent} border-y border-r border-slate-200 rounded-sm p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm">{model.label}</span>
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      </div>

      <div className="space-y-2 text-xs">
        <Row icon={<Clock className="w-3 h-3" />} label="소요시간" value={fmtMs(result.timings.totalMs)} subValue={`AI: ${fmtMs(result.timings.aiMs)}`} />
        <Row icon={<DollarSign className="w-3 h-3" />} label="추정비용" value={fmtUsd(result.cost.estimatedUsd)} subValue={`${result.cost.estimatedInputTokens.toLocaleString()}→${result.cost.estimatedOutputTokens.toLocaleString()} tok`} />
        <Row icon={<FileQuestion className="w-3 h-3" />} label="문항 수" value={`${result.accuracy.totalQuestions}개`} />
        <Row
          icon={<Target className="w-3 h-3" />}
          label="배점 합계"
          value={`${result.accuracy.totalPoints}점`}
          subValue={pointsOk ? '✓ 정확' : `${result.accuracy.pointsDiff > 0 ? '+' : ''}${result.accuracy.pointsDiff}점 차이`}
          subColor={pointsOk ? 'text-emerald-600' : 'text-amber-600'}
        />
        <Row
          icon={<span className="w-3 h-3 inline-block">📊</span>}
          label="평균 신뢰도"
          value={`${(result.accuracy.avgConfidence * 100).toFixed(1)}%`}
        />
        <Row
          icon={<span className="w-3 h-3 inline-block">📂</span>}
          label="단원 미분류"
          value={`${result.accuracy.unknownTopicCount}개`}
          subValue={`${result.accuracy.unknownTopicPct}%`}
          subColor={result.accuracy.unknownTopicPct > 10 ? 'text-amber-600' : 'text-slate-400'}
        />
      </div>

      {/* 난이도 분포 (간단 bar) */}
      {result.summary?.difficulty_distribution && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[10px] font-semibold text-slate-500 mb-1">난이도 분포</div>
          <div className="flex gap-0.5 h-3 rounded overflow-hidden">
            {(['1', '2', '3', '4', '5'] as const).map((lv) => {
              const cnt = result.summary?.difficulty_distribution?.[lv] || 0;
              const total = result.accuracy.totalQuestions || 1;
              const pct = (cnt / total) * 100;
              if (pct === 0) return null;
              const colors = ['#10b981', '#84cc16', '#94a3b8', '#f59e0b', '#ef4444'];
              return (
                <div
                  key={lv}
                  style={{ width: `${pct}%`, background: colors[parseInt(lv, 10) - 1] }}
                  title={`${DIFFICULTY_LABELS[lv]}: ${cnt}개`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
            {(['1', '2', '3', '4', '5'] as const).map((lv) => (
              <span key={lv}>{result.summary?.difficulty_distribution?.[lv] || 0}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  icon, label, value, subValue, subColor = 'text-slate-400',
}: {
  icon: React.ReactNode; label: string; value: string; subValue?: string; subColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-1 text-slate-500 shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-right min-w-0">
        <div className="font-bold text-slate-700">{value}</div>
        {subValue && <div className={`text-[10px] ${subColor}`}>{subValue}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 비교 요약 표
// ─────────────────────────────────────────────

function CompareSummaryTable({ results }: { results: Record<ModelId, ModelState> }) {
  const successResults = COMPARE_MODELS
    .map((m) => ({ model: m, state: results[m.id] }))
    .filter((x) => x.state.status === 'success')
    .map((x) => ({ model: x.model, result: (x.state as { status: 'success'; result: CompareResult }).result }));

  if (successResults.length === 0) return null;

  // 메트릭별 best/worst 찾기 (시각적 강조)
  const bestTime = Math.min(...successResults.map((x) => x.result.timings.totalMs));
  const bestCost = Math.min(...successResults.map((x) => x.result.cost.estimatedUsd));
  const bestConfidence = Math.max(...successResults.map((x) => x.result.accuracy.avgConfidence));
  const bestUnknown = Math.min(...successResults.map((x) => x.result.accuracy.unknownTopicCount));

  return (
    <Card className="p-4 mb-6">
      <h2 className="font-bold text-sm text-text-primary mb-3">📋 비교 요약</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 font-semibold text-slate-600">모델</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">소요시간</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">비용</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">문항</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">배점합</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">신뢰도</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">단원미분류</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-600">우세 유형</th>
            </tr>
          </thead>
          <tbody>
            {successResults.map(({ model, result }) => (
              <tr key={model.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-2 font-bold">{model.label}</td>
                <td className={`py-2 px-2 text-right ${result.timings.totalMs === bestTime ? 'text-emerald-600 font-bold' : ''}`}>
                  {fmtMs(result.timings.totalMs)}
                </td>
                <td className={`py-2 px-2 text-right ${result.cost.estimatedUsd === bestCost ? 'text-emerald-600 font-bold' : ''}`}>
                  {fmtUsd(result.cost.estimatedUsd)}
                </td>
                <td className="py-2 px-2 text-right">{result.accuracy.totalQuestions}</td>
                <td className={`py-2 px-2 text-right ${result.accuracy.pointsDiff === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600'}`}>
                  {result.accuracy.totalPoints}/{result.accuracy.pointsExpected}
                </td>
                <td className={`py-2 px-2 text-right ${result.accuracy.avgConfidence === bestConfidence ? 'text-emerald-600 font-bold' : ''}`}>
                  {(result.accuracy.avgConfidence * 100).toFixed(1)}%
                </td>
                <td className={`py-2 px-2 text-right ${result.accuracy.unknownTopicCount === bestUnknown ? 'text-emerald-600 font-bold' : 'text-amber-600'}`}>
                  {result.accuracy.unknownTopicCount} ({result.accuracy.unknownTopicPct}%)
                </td>
                <td className="py-2 px-2">
                  {TYPE_LABELS[result.summary?.dominant_type || ''] || result.summary?.dominant_type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 mt-2">
        ✓ 녹색 굵게 = 최고. 비용은 추정값(input + output 토큰 × per-1M 가격). 신뢰도는 AI 자체 판단(0~1).
      </p>
    </Card>
  );
}

// ─────────────────────────────────────────────
// 문항별 상세 비교 (선택)
// ─────────────────────────────────────────────

function QuestionDetailCompare({
  results,
  selectedModels,
}: {
  results: Record<ModelId, ModelState>;
  selectedModels: Set<ModelId>;
}) {
  const [open, setOpen] = useState(false);

  const successResults = COMPARE_MODELS
    .filter((m) => selectedModels.has(m.id))
    .map((m) => ({ model: m, state: results[m.id] }))
    .filter((x) => x.state.status === 'success')
    .map((x) => ({ model: x.model, result: (x.state as { status: 'success'; result: CompareResult }).result }));

  if (successResults.length < 2) return null;

  // 모델 0번 기준으로 문항 매핑 (question_number 기준)
  const baseQuestions = successResults[0].result.questions;
  const qNumbers = Array.from(new Set(baseQuestions.map((q) => String(q.question_number))));

  return (
    <Card className="p-4 mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between font-bold text-sm text-text-primary"
      >
        <span>🔍 문항별 상세 비교 ({qNumbers.length}문항)</span>
        <span className="text-xs text-slate-400">{open ? '접기 ▴' : '펼치기 ▾'}</span>
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-semibold text-slate-600">번호</th>
                {successResults.map(({ model }) => (
                  <th key={model.id} colSpan={4} className="text-center py-2 px-2 font-semibold text-slate-600 border-l border-slate-200">
                    {model.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th></th>
                {successResults.map(({ model }) => (
                  <Fragment key={model.id}>
                    <th className="text-center py-1 px-1 text-[10px] font-normal text-slate-500 border-l border-slate-200">난이도</th>
                    <th className="text-center py-1 px-1 text-[10px] font-normal text-slate-500">유형</th>
                    <th className="text-center py-1 px-1 text-[10px] font-normal text-slate-500">배점</th>
                    <th className="text-center py-1 px-1 text-[10px] font-normal text-slate-500">신뢰도</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {qNumbers.map((qNum) => {
                // 각 모델에서 해당 번호의 문항 찾기
                const cells = successResults.map(({ result }) =>
                  result.questions.find((q) => String(q.question_number) === qNum),
                );

                // 모델 간 차이 감지 (난이도/유형이 다르면 강조)
                const diffs = cells.map((c) => c?.difficulty || '?');
                const types = cells.map((c) => c?.question_type || '?');
                const diffMismatch = new Set(diffs.filter((d) => d !== '?')).size > 1;
                const typeMismatch = new Set(types.filter((t) => t !== '?')).size > 1;

                return (
                  <tr key={qNum} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 font-bold">{qNum}</td>
                    {cells.map((q, idx) => (
                      <Fragment key={idx}>
                        <td className={`text-center py-2 px-1 border-l border-slate-100 ${diffMismatch ? 'bg-amber-50' : ''}`}>
                          {q?.difficulty || '—'}
                        </td>
                        <td className={`text-center py-2 px-1 ${typeMismatch ? 'bg-amber-50' : ''}`}>
                          {TYPE_LABELS[q?.question_type || ''] || q?.question_type || '—'}
                        </td>
                        <td className="text-center py-2 px-1">
                          {q?.points ?? '—'}
                        </td>
                        <td className="text-center py-2 px-1">
                          {q?.confidence != null ? `${(q.confidence * 100).toFixed(0)}%` : '—'}
                        </td>
                      </Fragment>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-400 mt-2">
            🟡 노란 셀 = 모델 간 결과 불일치 (난이도 또는 유형 다름). 모델별 판단 차이 확인용.
          </p>
        </div>
      )}
    </Card>
  );
}
