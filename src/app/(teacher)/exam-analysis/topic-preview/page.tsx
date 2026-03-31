'use client';

import { useState, useMemo } from 'react';
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '@/lib/exam-analysis/data/curriculumStrategies';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChevronDown } from 'lucide-react';

const _DIFFICULTY_COLORS: Record<string, string> = {
  concept: '#22c55e', pattern: '#3b82f6', reasoning: '#f59e0b', creative: '#ef4444',
};

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

export default function TopicPreviewPage() {
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [expandAll, setExpandAll] = useState(false);

  const allCurriculums = useMemo(() =>
    [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM] as GradeCurriculum[],
  []);

  const filtered = filterGrade
    ? allCurriculums.filter(c => c.grade.includes(filterGrade))
    : allCurriculums;

  // 통계
  const stats = useMemo(() => {
    let totalTopics = 0;
    let totalStrategies = 0;
    let minStrategies = 999;
    let maxStrategies = 0;

    for (const c of allCurriculums) {
      for (const u of c.units) {
        for (const t of u.topics) {
          totalTopics++;
          totalStrategies += t.strategies.length;
          minStrategies = Math.min(minStrategies, t.strategies.length);
          maxStrategies = Math.max(maxStrategies, t.strategies.length);
        }
      }
    }

    return {
      totalTopics,
      totalStrategies,
      avgStrategies: (totalStrategies / totalTopics).toFixed(1),
      minStrategies,
      maxStrategies,
    };
  }, [allCurriculums]);

  const gradeColors: Record<string, string> = {
    '중1': '#3b82f6', '중2': '#8b5cf6', '중3': '#f59e0b',
    '고1': '#ef4444', '고2': '#ec4899', '고3': '#06b6d4',
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="토픽별 학습 전략 목업"
        subtitle="134개 토픽의 교육과정 맞춤 전략을 한눈에 확인합니다"
      />

      {/* 통계 */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatCard label="총 토픽" value={`${stats.totalTopics}개`} />
        <StatCard label="총 전략" value={`${stats.totalStrategies}개`} />
        <StatCard label="평균 전략/토픽" value={stats.avgStrategies} />
        <StatCard label="최소 전략" value={`${stats.minStrategies}개`} />
        <StatCard label="최대 전략" value={`${stats.maxStrategies}개`} />
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
              {/* 학년 헤더 */}
              <button
                onClick={() => setExpandedGrade(isGradeOpen && !filterGrade ? null : gradeKey)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50"
              >
                <span className="w-2 h-6 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-bold text-slate-800">{curr.grade} {curr.semester}</span>
                <span className="text-xs text-slate-400">{topicCount}개 토픽 · {curr.units.length}개 단원</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${isGradeOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* 단원별 토픽 */}
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

                        return (
                          <div key={ti} className="border-t border-slate-100">
                            <button
                              onClick={() => setExpandedTopic(isOpen ? null : topicKey)}
                              className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50/30 text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-sm text-slate-800 font-medium flex-1">{primaryName}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{topic.strategies.length}개 전략</span>
                              {topic.tags && (
                                <div className="flex gap-1">
                                  {topic.tags.map((tag, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-slate-100 rounded-sm text-[9px] text-slate-500">{tag}</span>
                                  ))}
                                </div>
                              )}
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isOpen && (
                              <div className="px-4 pb-3 pt-1 bg-blue-50/20">
                                {/* 키워드 */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {topic.keywords.map((kw, ki) => (
                                    <span key={ki} className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                                      ki === 0 ? 'bg-primary/10 text-primary font-medium' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {kw}
                                    </span>
                                  ))}
                                </div>

                                {/* 전략 목록 */}
                                <ul className="space-y-1.5">
                                  {topic.strategies.map((s, si) => (
                                    <li key={si} className="text-xs text-slate-700 flex items-start gap-2">
                                      <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                                        {si + 1}
                                      </span>
                                      <span className="leading-relaxed">{s}</span>
                                    </li>
                                  ))}
                                </ul>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-sm p-3 text-center">
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
