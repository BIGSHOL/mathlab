'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { DIFFICULTY_COLORS } from '@/lib/exam-analysis/constants';
import type { AnalyzedQuestion, AnalysisSummary, WeaknessProfile, LearningPlan, PerformancePrediction } from '@/lib/exam-analysis/types';
import { ChevronDown, ChevronRight, Loader2, RefreshCw, BookOpen, Target, Clock, AlertTriangle, BarChart3, GraduationCap, Calendar } from 'lucide-react';

interface ExtensionData {
  id: string;
  agentType: string;
  result?: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
}

interface StudyStrategyTabProps {
  questions: AnalyzedQuestion[];
  summary: AnalysisSummary | null;
  analysisId: string;
  extensions: ExtensionData[];
  onRefresh: () => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념', pattern: '유형', reasoning: '추론', creative: '창의',
};

const TYPE_LABELS: Record<string, string> = {
  calculation: '계산', geometry: '도형', application: '응용',
  proof: '증명', graph: '그래프', statistics: '통계',
};

const ALL_AGENTS = ['weakness', 'learning', 'prediction', 'commentary', 'topic-strategy', 'exam-prep', 'score-level-plan'];

export function StudyStrategyTab({ questions, analysisId, extensions, onRefresh }: StudyStrategyTabProps) {
  const [running, setRunning] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['topic-analysis', 'weakness']));

  const extensionMap = useMemo(() => {
    const map = new Map<string, ExtensionData>();
    for (const e of extensions) {
      if (!e.errorMessage) map.set(e.agentType, e);
    }
    return map;
  }, [extensions]);

  const hasExtensions = extensions.filter(e => !e.errorMessage).length > 0;
  const weakness = extensionMap.get('weakness')?.result as unknown as WeaknessProfile | undefined;
  const learning = extensionMap.get('learning')?.result as unknown as LearningPlan | undefined;
  const prediction = extensionMap.get('prediction')?.result as unknown as PerformancePrediction | undefined;

  // 단원별 분석 (기본 분석 데이터에서 추출)
  const topicAnalysis = useMemo(() => {
    const map = new Map<string, { count: number; totalPts: number; difficulties: Record<string, number>; types: Record<string, number> }>();
    for (const q of questions) {
      const topic = q.topic || '미분류';
      const existing = map.get(topic) || { count: 0, totalPts: 0, difficulties: {}, types: {} };
      existing.count++;
      existing.totalPts += q.points || 0;
      existing.difficulties[q.difficulty] = (existing.difficulties[q.difficulty] || 0) + 1;
      existing.types[q.question_type] = (existing.types[q.question_type] || 0) + 1;
      map.set(topic, existing);
    }
    return Array.from(map.entries())
      .map(([topic, data]) => ({ topic, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [questions]);

  // 시간 배분 전략 (배점 기반 추정)
  const timeAllocation = useMemo(() => {
    const totalPts = questions.reduce((s, q) => s + (q.points || 0), 0) || 1;
    return questions.map(q => ({
      number: q.question_number,
      points: q.points || 0,
      difficulty: q.difficulty,
      // 배점 비율 + 난이도 가중치 기반 시간
      estimatedMinutes: Math.max(
        1,
        Math.round(
          ((q.points || 0) / totalPts) * 45 * // 45분 시험 기준
          (q.difficulty === 'creative' ? 1.3 : q.difficulty === 'reasoning' ? 1.2 : 1.0)
        ),
      ),
    }));
  }, [questions]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const runExtendedAnalysis = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/exam-analysis/${analysisId}/analyze-extended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: ALL_AGENTS, forceRegenerate: false }),
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

  // 섹션 정의
  const sections = [
    { id: 'topic-analysis', icon: BookOpen, label: '출제 영역별 상세 분석', always: true },
    { id: 'time-allocation', icon: Clock, label: '시험 시간 배분 전략', always: true },
    { id: 'weakness', icon: AlertTriangle, label: '취약점 분석', always: false },
    { id: 'mistakes', icon: Target, label: '자주하는 실수 유형', always: false },
    { id: 'level-strategy', icon: BarChart3, label: '수준별 학습 전략', always: false },
    { id: 'learning-plan', icon: GraduationCap, label: '학습 계획', always: false },
    { id: 'timeline', icon: Calendar, label: '학습 타임라인', always: false },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="text-xs text-slate-500 hover:text-slate-700">모두 펼치기</button>
          <span className="text-slate-300">|</span>
          <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-slate-700">모두 접기</button>
        </div>
        {hasExtensions ? (
          <Button size="sm" variant="secondary" onClick={runExtendedAnalysis} disabled={running}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${running ? 'animate-spin' : ''}`} />
            재분석
          </Button>
        ) : (
          <Button size="sm" onClick={runExtendedAnalysis} disabled={running}>
            {running ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 분석 중...</>
            ) : 'AI 확장 분석 실행'}
          </Button>
        )}
      </div>

      {/* 확장 분석 미실행 안내 */}
      {!hasExtensions && (
        <div className="border-2 border-dashed border-slate-200 rounded-sm p-8 text-center">
          <p className="text-sm text-slate-500 mb-1">AI 확장 분석이 아직 실행되지 않았습니다</p>
          <p className="text-xs text-slate-400">취약점 분석, 학습 계획, 성적 예측 등 심화 분석을 받아보세요</p>
        </div>
      )}

      {/* 접이식 섹션 */}
      {sections.map(sec => {
        // 확장 분석 필요 섹션은 데이터 없으면 스킵
        if (!sec.always && !hasExtensions) return null;

        const isExpanded = expandedSections.has(sec.id);
        const Icon = sec.icon;

        return (
          <div key={sec.id} className="border rounded-sm overflow-hidden">
            <button
              onClick={() => toggleSection(sec.id)}
              className="w-full px-4 py-3 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
            >
              <Icon className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-800 flex-1 text-left">{sec.label}</span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {isExpanded && (
              <div className="px-4 py-4 border-t bg-white">
                {sec.id === 'topic-analysis' && <TopicAnalysisSection data={topicAnalysis} />}
                {sec.id === 'time-allocation' && <TimeAllocationSection data={timeAllocation} />}
                {sec.id === 'weakness' && <WeaknessSection data={weakness} />}
                {sec.id === 'mistakes' && <MistakeSection data={weakness} />}
                {sec.id === 'level-strategy' && <LevelStrategySection data={prediction} />}
                {sec.id === 'learning-plan' && <LearningPlanSection data={learning} />}
                {sec.id === 'timeline' && <TimelineSection data={learning} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 출제 영역별 분석 ──
function TopicAnalysisSection({ data }: { data: { topic: string; count: number; totalPts: number; difficulties: Record<string, number>; types: Record<string, number> }[] }) {
  if (!data.length) return <EmptyMsg />;
  return (
    <div className="space-y-3">
      {data.map((t, i) => (
        <div key={i} className="bg-slate-50 rounded-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-800">{t.topic}</span>
            <span className="text-xs text-slate-500">{t.count}문항 · {t.totalPts}점</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(t.difficulties).map(([key, count]) => (
              <span
                key={key}
                className="inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-medium text-white"
                style={{ backgroundColor: DIFFICULTY_COLORS[key] || '#94A3B8' }}
              >
                {DIFFICULTY_LABELS[key] || key} {count}
              </span>
            ))}
            {Object.entries(t.types).map(([key, count]) => (
              <span key={key} className="inline-flex px-1.5 py-0.5 rounded-sm text-[10px] text-slate-500 bg-white border">
                {TYPE_LABELS[key] || key} {count}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 시간 배분 전략 ──
function TimeAllocationSection({ data }: { data: { number: number | string; points: number; difficulty: string; estimatedMinutes: number }[] }) {
  const maxMin = Math.max(...data.map(d => d.estimatedMinutes), 1);
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-slate-500 mb-3">배점과 난이도를 기반으로 한 추천 시간 배분입니다 (45분 시험 기준).</p>
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-8 text-xs text-slate-600 text-right shrink-0">{d.number}번</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full flex items-center justify-end pr-1.5 text-white text-[9px] font-medium"
              style={{
                width: `${Math.max((d.estimatedMinutes / maxMin) * 100, 15)}%`,
                backgroundColor: DIFFICULTY_COLORS[d.difficulty] || '#94A3B8',
              }}
            >
              {d.estimatedMinutes}분
            </div>
          </div>
          <span className="w-10 text-[10px] text-slate-400 shrink-0">{d.points}점</span>
        </div>
      ))}
    </div>
  );
}

// ── 취약점 분석 ──
function WeaknessSection({ data }: { data?: WeaknessProfile }) {
  if (!data) return <NeedExtended />;

  return (
    <div className="space-y-4">
      {/* 인지 수준 */}
      {data.cognitive_levels && (
        <div>
          <h4 className="text-xs font-medium text-slate-600 mb-2">인지 수준 평가</h4>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(data.cognitive_levels).map(([key, val]) => {
              const labels: Record<string, string> = { knowledge: '지식', comprehension: '이해', application: '적용', analysis: '분석' };
              return (
                <div key={key} className="text-center p-2.5 bg-slate-50 rounded-sm">
                  <div className="text-[10px] text-slate-500 mb-1">{labels[key] || key}</div>
                  <div className="text-lg font-bold text-slate-800">{val.achieved}%</div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${val.achieved}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 단원 취약점 */}
      {data.topic_weaknesses?.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-600 mb-2">단원별 취약점</h4>
          <div className="space-y-1">
            {data.topic_weaknesses.map((tw, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-sm">
                <span className="text-xs text-slate-700">{tw.topic}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-slate-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.round(tw.severity_score * 100)}%`,
                        backgroundColor: tw.severity_score >= 0.8 ? '#EF4444' : tw.severity_score >= 0.5 ? '#F97316' : '#10B981',
                      }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-8 text-right ${
                    tw.severity_score >= 0.8 ? 'text-red-600' :
                    tw.severity_score >= 0.5 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {Math.round(tw.severity_score * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 실수 패턴 ──
function MistakeSection({ data }: { data?: WeaknessProfile }) {
  if (!data?.mistake_patterns?.length) return <NeedExtended msg="실수 패턴 데이터가 없습니다" />;

  const typeLabels: Record<string, { label: string; color: string }> = {
    calculation_error: { label: '계산 실수', color: '#EF4444' },
    concept_gap: { label: '개념 부족', color: '#F97316' },
    careless: { label: '부주의', color: '#F59E0B' },
    time_pressure: { label: '시간 부족', color: '#6366F1' },
  };

  return (
    <div className="space-y-2">
      {data.mistake_patterns.map((mp, i) => {
        const info = typeLabels[mp.pattern_type] || { label: mp.pattern_type, color: '#94A3B8' };
        return (
          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-sm">
            <span
              className="inline-flex px-2 py-0.5 rounded-sm text-[10px] font-medium text-white shrink-0 mt-0.5"
              style={{ backgroundColor: info.color }}
            >
              {info.label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700">{mp.description}</p>
              {mp.example_questions?.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  관련 문항: {mp.example_questions.join(', ')}번
                </p>
              )}
            </div>
            <span className="text-xs text-slate-500 shrink-0">빈도 {mp.frequency}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── 수준별 학습 전략 ──
function LevelStrategySection({ data }: { data?: PerformancePrediction }) {
  if (!data?.current_assessment) return <NeedExtended />;

  const score = data.current_assessment.score_estimate;
  const levels = [
    { label: '하위권', range: '0~40점', color: '#EF4444', bgColor: '#FEF2F2', strategies: ['기본 개념 재학습', '교과서 예제 반복', '공식 암기 카드 활용'] },
    { label: '중위권', range: '40~70점', color: '#F59E0B', bgColor: '#FFFBEB', strategies: ['유형별 패턴 학습', '오답 노트 정리', '기출 유사문제 풀이'] },
    { label: '상위권', range: '70~100점', color: '#10B981', bgColor: '#ECFDF5', strategies: ['고난도 문항 집중', '시간 단축 훈련', '서술형 논리 강화'] },
  ];

  const currentLevel = score >= 70 ? 2 : score >= 40 ? 1 : 0;

  return (
    <div className="space-y-4">
      <div className="text-center p-3 bg-slate-50 rounded-sm">
        <p className="text-xs text-slate-500">현재 예상 점수</p>
        <p className="text-2xl font-bold text-slate-800">{score}점</p>
        <p className="text-xs text-slate-400">상위 {data.current_assessment.rank_estimate_percentile}%</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {levels.map((lv, i) => (
          <div
            key={i}
            className={`rounded-sm p-4 border-2 ${i === currentLevel ? 'ring-2 ring-offset-1' : ''}`}
            style={{
              backgroundColor: lv.bgColor,
              borderColor: i === currentLevel ? lv.color : 'transparent',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold" style={{ color: lv.color }}>{lv.label}</span>
              <span className="text-[10px] text-slate-400">{lv.range}</span>
              {i === currentLevel && (
                <span className="text-[10px] font-medium text-white px-1.5 py-0.5 rounded-sm ml-auto" style={{ backgroundColor: lv.color }}>
                  현재
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {lv.strategies.map((s, j) => (
                <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: lv.color }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 위험 요소 */}
      {data.risk_factors?.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-600 mb-2">주의 사항</h4>
          {data.risk_factors.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs mb-1.5 p-2 bg-amber-50 rounded-sm">
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

// ── 학습 계획 ──
function LearningPlanSection({ data }: { data?: LearningPlan }) {
  if (!data) return <NeedExtended />;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs text-slate-600 p-3 bg-slate-50 rounded-sm">
        <span>기간: <strong>{data.duration}</strong></span>
        <span>주당: <strong>{data.weekly_hours}시간</strong></span>
      </div>

      {data.phases?.map((phase, i) => (
        <div key={i} className="border rounded-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
              {phase.phase_number}
            </span>
            <span className="font-medium text-sm text-slate-800">{phase.title}</span>
            <span className="text-xs text-slate-400 ml-auto">{phase.duration}</span>
          </div>
          {phase.topics?.map((topic, j) => (
            <div key={j} className="ml-8 text-xs text-slate-600 mb-1 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
              {topic.topic} ({topic.duration_hours}시간)
            </div>
          ))}
        </div>
      ))}

      {data.expected_improvement && (
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 text-xs text-blue-800">
          예상 점수 향상: {data.expected_improvement.current_estimated_score}점 →{' '}
          <strong>{data.expected_improvement.target_score}점</strong>
          {' '}(+{data.expected_improvement.improvement_points}점)
        </div>
      )}
    </div>
  );
}

// ── 학습 타임라인 ──
function TimelineSection({ data }: { data?: LearningPlan }) {
  if (!data?.daily_schedule?.length) return <NeedExtended msg="학습 일정 데이터가 없습니다" />;

  return (
    <div className="space-y-2">
      {data.daily_schedule.map((day, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-sm">
          <div className="w-14 text-center shrink-0">
            <div className="text-xs font-medium text-slate-700">{day.day}</div>
            <div className="text-[10px] text-slate-400">{day.duration_minutes}분</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1 mb-1">
              {day.topics.map((t, j) => (
                <span key={j} className="px-1.5 py-0.5 bg-white border rounded-sm text-[10px] text-slate-600">{t}</span>
              ))}
            </div>
            {day.activities?.length > 0 && (
              <p className="text-[10px] text-slate-400">{day.activities.join(' · ')}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 공통 ──
function EmptyMsg() {
  return <p className="text-xs text-slate-400 text-center py-4">데이터가 없습니다</p>;
}

function NeedExtended({ msg }: { msg?: string }) {
  return (
    <p className="text-xs text-slate-400 text-center py-4">
      {msg || '확장 분석을 실행하면 이 섹션이 채워집니다'}
    </p>
  );
}
