'use client';

import { useState, useMemo } from 'react';
import {
  MIDDLE_SCHOOL_CURRICULUM,
  HIGH_SCHOOL_CURRICULUM,
  findCommonMistakes,
  findKillerPatterns,
  findGradeConnections,
} from '@/lib/exam-analysis/data/curriculum';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChevronDown, AlertTriangle, Zap, ArrowRightLeft, BookOpen } from 'lucide-react';

interface TopicStrategy {
  keywords: string[];
  strategies: string[];
  tags?: string[];
}

interface CurriculumUnit {
  name: string;
  topics: TopicStrategy[];
}

interface GradeCurriculum {
  grade: string;
  semester: string;
  units: CurriculumUnit[];
}

type DataTab = 'strategy' | 'mistakes' | 'killer' | 'connections';

const DATA_TABS: { key: DataTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'strategy', label: '학습 전략', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
  { key: 'mistakes', label: '흔한 실수', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  { key: 'killer', label: '킬러 패턴', icon: Zap, color: 'text-red-600 bg-red-50' },
  { key: 'connections', label: '학년 연계', icon: ArrowRightLeft, color: 'text-violet-600 bg-violet-50' },
];

export default function TopicPreviewPage() {
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [expandAll, setExpandAll] = useState(false);
  const [activeTab, setActiveTab] = useState<DataTab>('strategy');

  const allCurriculums = useMemo(() =>
    [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM] as GradeCurriculum[],
  []);

  const filtered = filterGrade
    ? allCurriculums.filter(c => c.grade.includes(filterGrade))
    : allCurriculums;

  // 통계: 각 카테고리 커버리지
  const stats = useMemo(() => {
    let totalTopics = 0;
    let totalStrategies = 0;
    let mistakesCovered = 0;
    let killerCovered = 0;
    let connectionsCovered = 0;

    for (const c of allCurriculums) {
      for (const u of c.units) {
        for (const t of u.topics) {
          totalTopics++;
          totalStrategies += t.strategies.length;
          const name = t.keywords[0];
          if (findCommonMistakes(name)) mistakesCovered++;
          if (findKillerPatterns(name)) killerCovered++;
          if (findGradeConnections(name).length > 0) connectionsCovered++;
        }
      }
    }

    return { totalTopics, totalStrategies, mistakesCovered, killerCovered, connectionsCovered };
  }, [allCurriculums]);

  const gradeColors: Record<string, string> = {
    '중1': '#3b82f6', '중2': '#8b5cf6', '중3': '#f59e0b',
    '고1': '#ef4444', '고2': '#ec4899', '고3': '#06b6d4',
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="토픽별 데이터 커버리지"
        subtitle="134개 토픽의 학습 전략 · 흔한 실수 · 킬러 패턴 · 학년 연계 데이터를 확인합니다"
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatCard label="총 토픽" value={`${stats.totalTopics}개`} />
        <StatCard label="학습 전략" value={`${stats.totalStrategies}개`} sub="전략 항목 합계" />
        <StatCard
          label="흔한 실수"
          value={`${stats.mistakesCovered}/${stats.totalTopics}`}
          pct={stats.totalTopics > 0 ? Math.round(stats.mistakesCovered / stats.totalTopics * 100) : 0}
        />
        <StatCard
          label="킬러 패턴"
          value={`${stats.killerCovered}/${stats.totalTopics}`}
          pct={stats.totalTopics > 0 ? Math.round(stats.killerCovered / stats.totalTopics * 100) : 0}
        />
        <StatCard
          label="학년 연계"
          value={`${stats.connectionsCovered}/${stats.totalTopics}`}
          pct={stats.totalTopics > 0 ? Math.round(stats.connectionsCovered / stats.totalTopics * 100) : 0}
        />
      </div>

      {/* 데이터 탭 */}
      <div className="flex gap-1.5 mb-4">
        {DATA_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${
              activeTab === tab.key ? tab.color + ' font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 학년 필터 + 모두 펼침 */}
      <div className="flex gap-2 mb-4 items-center">
        <button
          onClick={() => setFilterGrade('')}
          className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${!filterGrade ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          전체
        </button>
        {['중1', '중2', '중3', '고1', '고2', '고3'].map(g => (
          <button
            key={g}
            onClick={() => setFilterGrade(g)}
            className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${filterGrade === g ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {g}
          </button>
        ))}
        <button
          onClick={() => setExpandAll(prev => !prev)}
          className="ml-auto px-3 py-1.5 text-xs rounded-sm bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          {expandAll ? '모두 접기' : '모두 펼치기'}
        </button>
      </div>

      {/* 학년별 그룹 */}
      <div className="space-y-3">
        {filtered.map((curr, ci) => {
          const gradeKey = `${curr.grade}-${curr.semester}-${ci}`;
          const isGradeOpen = expandAll || expandedGrade === gradeKey || !!filterGrade;
          const topicCount = curr.units.reduce((s, u) => s + u.topics.length, 0);
          const color = gradeColors[curr.grade] || '#94a3b8';

          return (
            <div key={gradeKey} className="border rounded-sm bg-white overflow-hidden">
              <button
                onClick={() => setExpandedGrade(isGradeOpen && !filterGrade ? null : gradeKey)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50"
              >
                <span className="w-2 h-6 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-bold text-slate-800">{curr.grade} {curr.semester}</span>
                <span className="text-xs text-slate-400">{topicCount}개 토픽 · {curr.units.length}개 단원</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${isGradeOpen ? 'rotate-180' : ''}`} />
              </button>

              {isGradeOpen && (
                <div className="border-t">
                  {curr.units.map((unit, ui) => (
                    <div key={ui} className="border-b last:border-b-0">
                      <div className="px-4 py-2 bg-slate-50/50">
                        <span className="text-xs font-semibold text-slate-600">{unit.name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{unit.topics.length}개</span>
                      </div>

                      {unit.topics.map((topic, ti) => {
                        const topicKey = `${gradeKey}-${ui}-${ti}`;
                        const isOpen = expandAll || expandedTopic === topicKey;
                        const primaryName = topic.keywords[0];
                        const mistakes = findCommonMistakes(primaryName);
                        const killer = findKillerPatterns(primaryName);
                        const connections = findGradeConnections(primaryName);

                        // 현재 탭에 데이터 있는지 뱃지 표시
                        const hasMistakes = !!mistakes;
                        const hasKiller = !!killer;
                        const hasConnections = connections.length > 0;

                        return (
                          <div key={ti} className="border-t border-slate-100">
                            <button
                              onClick={() => setExpandedTopic(isOpen ? null : topicKey)}
                              className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50/30 text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-sm text-slate-800 font-medium flex-1">{primaryName}</span>
                              {/* 커버리지 뱃지 */}
                              <span className="flex gap-1">
                                <CoverageDot label="전략" has={topic.strategies.length > 0} />
                                <CoverageDot label="실수" has={hasMistakes} />
                                <CoverageDot label="킬러" has={hasKiller} />
                                <CoverageDot label="연계" has={hasConnections} />
                              </span>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isOpen && (
                              <div className="px-4 pb-3 pt-1 bg-blue-50/20">
                                {/* 키워드 */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {topic.keywords.map((kw, ki) => (
                                    <span key={ki} className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                                      ki === 0 ? 'bg-primary/10 text-primary font-medium' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {kw}
                                    </span>
                                  ))}
                                </div>

                                {/* 탭별 콘텐츠 */}
                                {activeTab === 'strategy' && (
                                  <TopicStrategies strategies={topic.strategies} />
                                )}
                                {activeTab === 'mistakes' && (
                                  <TopicMistakes mistakes={mistakes} />
                                )}
                                {activeTab === 'killer' && (
                                  <TopicKiller killer={killer} />
                                )}
                                {activeTab === 'connections' && (
                                  <TopicConnections connections={connections} />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}

// ── 서브 컴포넌트 ──

function CoverageDot({ label, has }: { label: string; has: boolean }) {
  return (
    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] ${
      has ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-400'
    }`}>
      {label}
    </span>
  );
}

function TopicStrategies({ strategies }: { strategies: string[] }) {
  if (!strategies.length) return <EmptyMsg text="학습 전략 데이터 없음" />;
  return (
    <ul className="space-y-1.5">
      {strategies.map((s, si) => (
        <li key={si} className="text-xs text-slate-700 flex items-start gap-2">
          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
            {si + 1}
          </span>
          <span className="leading-relaxed">{s}</span>
        </li>
      ))}
    </ul>
  );
}

function TopicMistakes({ mistakes }: { mistakes: ReturnType<typeof findCommonMistakes> }) {
  if (!mistakes) return <EmptyMsg text="흔한 실수 데이터 없음" />;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <h4 className="text-[10px] font-bold text-amber-700 mb-1.5 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> 자주 하는 실수
        </h4>
        <ul className="space-y-1">
          {mistakes.mistakes.map((m, i) => (
            <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
              <span className="text-amber-500 mt-0.5 shrink-0">•</span>
              <span className="leading-relaxed">{m}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-[10px] font-bold text-emerald-700 mb-1.5">예방법</h4>
        <ul className="space-y-1">
          {mistakes.prevention.map((p, i) => (
            <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TopicKiller({ killer }: { killer: ReturnType<typeof findKillerPatterns> }) {
  if (!killer) return <EmptyMsg text="킬러 패턴 데이터 없음" />;
  return (
    <div className="space-y-2.5">
      {killer.killerPatterns.map((kp, i) => (
        <div key={i} className="bg-white border border-red-100 rounded-sm p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-bold text-slate-800">{kp.pattern}</span>
            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
              kp.difficulty === '최상' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {kp.difficulty}
            </span>
            <span className="text-[9px] text-slate-400">{kp.frequency}</span>
          </div>
          <p className="text-xs text-slate-600 mb-1.5">{kp.trapDescription}</p>
          <div className="flex flex-wrap gap-1">
            {kp.solutionKey.map((sk, j) => (
              <span key={j} className="px-1.5 py-0.5 bg-slate-100 rounded-sm text-[10px] text-slate-600">{sk}</span>
            ))}
          </div>
          {kp.exampleSetup && (
            <p className="text-[10px] text-slate-400 mt-1.5 italic">예) {kp.exampleSetup}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function TopicConnections({ connections }: { connections: ReturnType<typeof findGradeConnections> }) {
  if (!connections.length) return <EmptyMsg text="학년 연계 데이터 없음" />;
  return (
    <div className="space-y-2">
      {connections.map((conn, i) => (
        <div key={i} className="bg-white border border-violet-100 rounded-sm p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-bold text-slate-800">
              {conn.fromGrade} → {conn.toGrade}
            </span>
            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
              conn.importance === 'critical' ? 'bg-red-100 text-red-700' :
              conn.importance === 'high' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {conn.importance}
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-1.5">{conn.warning}</p>
          <div className="flex flex-wrap gap-1">
            {conn.toTopics?.map((t: string, j: number) => (
              <span key={j} className="px-1.5 py-0.5 bg-violet-50 rounded-sm text-[10px] text-violet-600">{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <p className="text-xs text-slate-400 py-2">{text}</p>;
}

function StatCard({ label, value, sub, pct }: { label: string; value: string; sub?: string; pct?: number }) {
  return (
    <div className="bg-white border rounded-sm p-3 text-center">
      <div className="text-lg font-bold text-slate-800">{value}</div>
      {pct !== undefined && (
        <div className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
          {pct}%
        </div>
      )}
      <div className="text-[10px] text-slate-500">{sub || label}</div>
    </div>
  );
}
