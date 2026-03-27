'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Loader2, RefreshCw } from 'lucide-react';
import type { WeaknessProfile, LearningPlan, PerformancePrediction } from '@/lib/exam-analysis/types';

interface ExtensionData {
  id: string;
  agentType: string;
  result: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
}

interface ExtendedReportViewProps {
  analysisId: string;
  extensions: ExtensionData[];
  onRefresh: () => void;
}

const AGENT_LABELS: Record<string, string> = {
  weakness: '취약점 분석',
  learning: '학습 계획',
  prediction: '성적 예측',
  commentary: '종합 코멘트',
  'topic-strategy': '단원별 전략',
  'exam-prep': '시험 대비',
  'score-level-plan': '점수대별 계획',
};

const ALL_AGENTS = ['weakness', 'learning', 'prediction', 'commentary', 'topic-strategy', 'exam-prep', 'score-level-plan'];

export function ExtendedReportView({ analysisId, extensions, onRefresh }: ExtendedReportViewProps) {
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState(extensions[0]?.agentType || 'weakness');

  const extensionMap = new Map(extensions.map(e => [e.agentType, e]));
  const hasAny = extensions.length > 0;

  const runAll = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/exam-analysis/${analysisId}/analyze-extended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: ALL_AGENTS,
          forceRegenerate: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || '확장 분석 실패');
      }
      toast.success('확장 분석이 완료되었습니다');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '확장 분석에 실패했습니다');
    } finally {
      setRunning(false);
    }
  };

  if (!hasAny) {
    return (
      <div className="border rounded-sm p-8 text-center">
        <p className="text-sm text-slate-500 mb-4">확장 분석이 아직 실행되지 않았습니다.</p>
        <Button onClick={runAll} disabled={running}>
          {running ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 분석 중...</>
          ) : '확장 분석 실행'}
        </Button>
        <p className="text-xs text-slate-400 mt-2">취약점 분석, 학습 계획, 성적 예측 등을 AI가 생성합니다</p>
      </div>
    );
  }

  const tabItems = extensions
    .filter(e => !e.errorMessage)
    .map(e => ({
      key: e.agentType,
      label: AGENT_LABELS[e.agentType] || e.agentType,
    }));

  const currentExtension = extensionMap.get(activeTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">확장 분석 리포트</h3>
        <Button size="sm" variant="outline" onClick={runAll} disabled={running}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${running ? 'animate-spin' : ''}`} />
          재분석
        </Button>
      </div>

      <Tabs
        items={tabItems}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      <div className="border rounded-sm p-4">
        {currentExtension ? (
          <AgentResultRenderer
            agentType={currentExtension.agentType}
            result={currentExtension.result}
          />
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">결과를 선택하세요</p>
        )}
      </div>
    </div>
  );
}

function AgentResultRenderer({ agentType, result }: { agentType: string; result: Record<string, unknown> }) {
  switch (agentType) {
    case 'weakness':
      return <WeaknessView data={result as unknown as WeaknessProfile} />;
    case 'learning':
      return <LearningView data={result as unknown as LearningPlan} />;
    case 'prediction':
      return <PredictionView data={result as unknown as PerformancePrediction} />;
    default:
      return <GenericJsonView data={result} />;
  }
}

// ── 취약점 뷰 ──
function WeaknessView({ data }: { data: WeaknessProfile }) {
  return (
    <div className="space-y-4">
      {/* 인지 수준 */}
      {data.cognitive_levels && (
        <div>
          <h4 className="text-sm font-medium mb-2">인지 수준 평가</h4>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(data.cognitive_levels).map(([key, val]) => {
              const level = val as { achieved: number; target: number };
              const labels: Record<string, string> = { knowledge: '지식', comprehension: '이해', application: '적용', analysis: '분석' };
              return (
                <div key={key} className="text-center p-2 bg-slate-50 rounded-sm">
                  <div className="text-xs text-slate-500">{labels[key] || key}</div>
                  <div className="text-lg font-bold text-slate-800">{level.achieved}%</div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${level.achieved}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 토픽 취약점 */}
      {data.topic_weaknesses?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">단원별 취약점</h4>
          <div className="space-y-1">
            {data.topic_weaknesses.map((tw, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-sm text-sm">
                <span className="text-slate-700">{tw.topic}</span>
                <span className={`text-xs font-medium ${
                  tw.severity_score >= 0.8 ? 'text-red-600' :
                  tw.severity_score >= 0.5 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {Math.round(tw.severity_score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실수 패턴 */}
      {data.mistake_patterns?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">실수 패턴</h4>
          {data.mistake_patterns.map((mp, i) => (
            <div key={i} className="px-3 py-2 bg-amber-50 rounded-sm text-sm mb-1">
              <span className="font-medium text-amber-800">{mp.pattern_type}</span>
              <span className="text-amber-600 ml-2">{mp.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 학습 계획 뷰 ──
function LearningView({ data }: { data: LearningPlan }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-slate-600">
        <span>기간: <strong>{data.duration}</strong></span>
        <span>주당: <strong>{data.weekly_hours}시간</strong></span>
      </div>

      {/* 단계별 학습 */}
      {data.phases?.map((phase, i) => (
        <div key={i} className="border rounded-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
              {phase.phase_number}
            </span>
            <span className="font-medium text-sm">{phase.title}</span>
            <span className="text-xs text-slate-400">{phase.duration}</span>
          </div>
          {phase.topics?.map((topic, j) => (
            <div key={j} className="ml-8 text-sm text-slate-600 mb-1">
              · {topic.topic} ({topic.duration_hours}시간)
            </div>
          ))}
        </div>
      ))}

      {/* 점수 향상 예측 */}
      {data.expected_improvement && (
        <div className="bg-blue-50 rounded-sm p-3 text-sm">
          <span className="text-blue-800">
            예상 점수 향상: {data.expected_improvement.current_estimated_score}점 →{' '}
            <strong>{data.expected_improvement.target_score}점</strong>
            {' '}(+{data.expected_improvement.improvement_points}점, 신뢰도 {Math.round(data.expected_improvement.achievement_confidence * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
}

// ── 성적 예측 뷰 ──
function PredictionView({ data }: { data: PerformancePrediction }) {
  return (
    <div className="space-y-4">
      {/* 현재 수준 */}
      {data.current_assessment && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-sm p-3 text-center">
            <div className="text-2xl font-bold text-slate-800">{data.current_assessment.score_estimate}점</div>
            <div className="text-xs text-slate-500">현재 예상 점수</div>
          </div>
          <div className="bg-slate-50 rounded-sm p-3 text-center">
            <div className="text-2xl font-bold text-slate-800">상위 {data.current_assessment.rank_estimate_percentile}%</div>
            <div className="text-xs text-slate-500">예상 백분위</div>
          </div>
        </div>
      )}

      {/* 성적 진도 */}
      {data.trajectory?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">성적 진도 예측</h4>
          <div className="space-y-2">
            {data.trajectory.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-slate-500">{t.timeframe}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4 relative">
                  <div
                    className="bg-primary h-4 rounded-full transition-all"
                    style={{ width: `${t.predicted_score}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {t.predicted_score}점
                  </span>
                </div>
                <span className="text-xs text-slate-400">{t.required_effort}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 위험 요소 */}
      {data.risk_factors?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">주의 사항</h4>
          {data.risk_factors.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm mb-1.5">
              <span className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                r.impact_on_goal === 'critical' ? 'bg-red-500' :
                r.impact_on_goal === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
              }`} />
              <div>
                <span className="font-medium text-slate-700">{r.factor}</span>
                <span className="text-slate-500 ml-1">— {r.mitigation}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 범용 JSON 뷰 (기타 에이전트용) ──
function GenericJsonView({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => {
        if (typeof value === 'string') {
          return (
            <div key={key}>
              <h4 className="text-sm font-medium text-slate-600 mb-1">{key}</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
            </div>
          );
        }
        if (Array.isArray(value)) {
          return (
            <div key={key}>
              <h4 className="text-sm font-medium text-slate-600 mb-1">{key}</h4>
              <ul className="list-disc list-inside text-sm text-slate-700 space-y-0.5">
                {value.map((item, i) => (
                  <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (typeof value === 'object' && value !== null) {
          return (
            <div key={key}>
              <h4 className="text-sm font-medium text-slate-600 mb-1">{key}</h4>
              <pre className="text-xs bg-slate-50 rounded-sm p-2 overflow-x-auto">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
