'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { BarChart3, RefreshCw, Sparkles, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, QUESTION_TYPE_COLORS } from '@/lib/exam-analysis/constants';
import { useAuth } from '@/hooks/useAuth';

// ── 타입 ──

interface DiffStat { difficulty: string; count: number; pct: number; avgPoints: number }
interface TypeStat { questionType: string; count: number; pct: number; avgDifficulty: string }
interface FormatStat { format: string; count: number; pct: number; avgPoints: number }
interface TopicStat { topic: string; count: number; pct: number; avgDifficulty: string; totalPoints: number }
interface TextbookStat { textbook: string; count: number; pct: number; chapters: string[] }
interface FeatureCard { key: string; label: string; value: string; description: string }

interface DashboardData {
  stats: { totalExams: number; totalQuestions: number; avgQuestionsPerExam: number; avgConfidence: number };
  distributions: { difficulty: DiffStat[]; questionType: TypeStat[]; questionFormat: FormatStat[] };
  topicFrequency: TopicStat[];
  textbookTrends: TextbookStat[];
  featureCards: FeatureCard[];
}

interface TrendInsight {
  overallTrend: string;
  keyPatterns: string[];
  difficultyAnalysis: string;
  topicFocus: string;
  preparationTips: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SchoolTrend { id: string; schoolName: string | null; grade: string; period: string; sampleSize: number; trendData: any; trendSummary: any }

const DIFF_LABELS: Record<string, string> = { '1': '기본', '2': '표준', '3': '응용', '4': '심화', '5': '최고난도' };
const TYPE_LABELS: Record<string, string> = {
  number: '수와 연산', algebra: '문자와 식', function: '함수',
  geometry: '기하', statistics: '확률과 통계',
};
const FORMAT_LABELS: Record<string, string> = { objective: '객관식', short_answer: '단답형', essay: '서술형' };

const SUBJECT_TABS = [
  { key: 'MATH', label: '수학' },
  { key: 'ENGLISH', label: '영어' },
] as const;

export default function TrendsDashboardPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState<'MATH' | 'ENGLISH'>('MATH');
  const [grade, setGrade] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<TrendInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [schoolTrends, setSchoolTrends] = useState<SchoolTrend[]>([]);
  const [schoolExpanded, setSchoolExpanded] = useState(false);
  const [schoolAggregating, setSchoolAggregating] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: 'dashboard', subject });
      if (grade) params.set('grade', grade);
      if (schoolSearch) params.set('schoolName', schoolSearch);
      const res = await fetch(`/api/exam-analysis/trends?${params}`);
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch {
      toast.error('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [subject, grade, schoolSearch]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // 학교별 경향 로드
  const fetchSchoolTrends = useCallback(async () => {
    const params = new URLSearchParams({ subject });
    if (schoolSearch) params.set('schoolName', schoolSearch);
    const res = await fetch(`/api/exam-analysis/trends?${params}`);
    const json = await res.json();
    if (json.data) setSchoolTrends(json.data);
  }, [subject, schoolSearch]);

  useEffect(() => { if (schoolExpanded) fetchSchoolTrends(); }, [schoolExpanded, fetchSchoolTrends]);

  // AI 인사이트 생성
  const generateInsight = async () => {
    if (!data) return;
    setInsightLoading(true);
    try {
      const res = await fetch('/api/exam-analysis/trends/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalExams: data.stats.totalExams,
          totalQuestions: data.stats.totalQuestions,
          avgConfidence: data.stats.avgConfidence,
          difficulty: data.distributions.difficulty,
          questionType: data.distributions.questionType,
          questionFormat: data.distributions.questionFormat,
          topicFrequency: data.topicFrequency,
          textbookTrends: data.textbookTrends,
        }),
      });
      const json = await res.json();
      if (json.data) setInsight(json.data);
    } catch {
      toast.error('인사이트 생성 실패');
    } finally {
      setInsightLoading(false);
    }
  };

  // 학교별 집계
  const aggregateSchools = async () => {
    setSchoolAggregating(true);
    try {
      const res = await fetch('/api/exam-analysis/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, groupBy: 'school' }),
      });
      const json = await res.json();
      if (json.data) {
        toast.success(`학교 ${json.data.totalSchools}개 집계 완료 (생성: ${json.data.created}, 업데이트: ${json.data.updated})`);
        fetchSchoolTrends();
      }
    } catch {
      toast.error('집계 실패');
    } finally {
      setSchoolAggregating(false);
    }
  };

  const stats = data?.stats;

  // UI 가드 — 관리 메뉴(SUPER_ADMIN) 진입 전용 대시보드, 형제 admin 페이지와 통일
  if (user && user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-slate-500">SUPER_ADMIN 전용 페이지입니다.</div>;
  }

  return (
    <PageContainer maxWidth="xl">
      {/* backHref — 이 경로는 ExamOnlyTopBar가 숨겨져 복귀 동선이 없어 뒤로가기 제공 */}
      <PageHeader title="출제 경향 분석" backHref="/exam-analysis" />

      {/* ── 필터 바 ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* 과목 탭 */}
        <div className="flex bg-slate-100 rounded-sm p-0.5">
          {SUBJECT_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setSubject(t.key); setInsight(null); }}
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                subject === t.key ? 'bg-white shadow-sm font-semibold text-slate-800' : 'text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={grade}
          onChange={e => setGrade(e.target.value)}
          className="text-xs border rounded-sm px-2 py-1.5"
        >
          <option value="">전체 학년</option>
          {['중1', '중2', '중3', '고1', '고2', '고3'].map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="학교명 검색..."
            value={schoolSearch}
            onChange={e => setSchoolSearch(e.target.value)}
            className="text-xs border rounded-sm pl-7 pr-2 py-1.5 w-40"
          />
        </div>

        <Button size="sm" variant="secondary" onClick={fetchDashboard} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* ── 통계 카드 4개 ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="분석된 시험지" value={`${stats.totalExams}개`} />
          <StatCard label="전체 문항 수" value={`${stats.totalQuestions}문항`} />
          <StatCard label="시험지당 평균" value={`${stats.avgQuestionsPerExam}문항`} />
          <StatCard label="평균 신뢰도" value={`${stats.avgConfidence}%`} accent />
        </div>
      )}

      {data && stats && stats.totalExams > 0 && (
        <>
          {/* ── 난이도 분포 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border rounded-sm p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">난이도 분포</h3>
              <div className="space-y-2">
                {data.distributions.difficulty.map(d => (
                  <div key={d.difficulty} className="flex items-center gap-2">
                    <span className="w-12 text-xs font-medium text-slate-600">{DIFF_LABELS[d.difficulty] || d.difficulty}</span>
                    <div className="flex-1 bg-slate-100 rounded-sm h-6 overflow-hidden">
                      <div
                        className="h-full rounded-sm flex items-center justify-end pr-2 text-white text-[10px] font-medium"
                        style={{ width: `${Math.max(d.pct, 5)}%`, backgroundColor: DIFFICULTY_COLORS[d.difficulty] || '#94A3B8' }}
                      >
                        {d.count}문항
                      </div>
                    </div>
                    <span className="w-12 text-right text-xs text-slate-400">{d.pct}%</span>
                    <span className="w-16 text-right text-xs text-slate-400">평균 {d.avgPoints}점</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 유형 분포 */}
            <div className="bg-white border rounded-sm p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">문항 유형 분포</h3>
              <div className="grid grid-cols-2 gap-2">
                {data.distributions.questionType.map(t => (
                  <div key={t.questionType} className="border rounded-sm p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{TYPE_LABELS[t.questionType] || t.questionType}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-sm text-white font-medium"
                        style={{ backgroundColor: QUESTION_TYPE_COLORS[t.questionType] || '#94A3B8' }}
                      >
                        {DIFF_LABELS[t.avgDifficulty] || t.avgDifficulty}
                      </span>
                    </div>
                    <div className="text-lg font-bold" style={{ color: QUESTION_TYPE_COLORS[t.questionType] || '#334155' }}>
                      {t.count}문항
                    </div>
                    <div className="text-[10px] text-slate-400">{t.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 형식 분포 + 특징 카드 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border rounded-sm p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">문항 형식 분포</h3>
              <div className="grid grid-cols-3 gap-2">
                {data.distributions.questionFormat.map(f => (
                  <div key={f.format} className="border rounded-sm p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">{FORMAT_LABELS[f.format] || f.format}</div>
                    <div className="text-xl font-bold text-primary">{f.count}문항</div>
                    <div className="text-[10px] text-slate-400">{f.pct}% (평균 {f.avgPoints}점)</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 교과서별 출제 경향 */}
            {data.textbookTrends.length > 0 && (
              <div className="bg-white border rounded-sm p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">교과서별 출제 경향</h3>
                <div className="space-y-2">
                  {data.textbookTrends.map(t => (
                    <div key={t.textbook} className="border rounded-sm p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-800">{t.textbook}</span>
                        <span className="text-primary text-xs font-bold">{t.count}문항 ({t.pct}%)</span>
                      </div>
                      {t.chapters.length > 0 && (
                        <div className="text-[10px] text-slate-400">
                          포함 단원: {t.chapters.slice(0, 4).map(c => `· ${c}`).join(' ')}
                          {t.chapters.length > 4 && ` 외 ${t.chapters.length - 4}개`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 출제 특징 통계 4카드 ── */}
          {data.featureCards.length > 0 && (
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-sm p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">출제 특징 통계</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {data.featureCards.map(c => (
                  <div key={c.key} className="bg-white/15 backdrop-blur-sm rounded-sm p-3">
                    <div className="text-[10px] text-white/70">{c.label}</div>
                    <div className="text-xl font-bold text-white mt-0.5">{c.value}</div>
                    <div className="text-[10px] text-white/60 mt-0.5">{c.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 단원별 출제 빈도 TOP 10 ── */}
          {data.topicFrequency.length > 0 && (
            <div className="bg-white border rounded-sm p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">단원별 출제 빈도 TOP 10</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-slate-500">
                      <th className="py-2 px-2 text-left w-10">순위</th>
                      <th className="py-2 px-2 text-left">단원</th>
                      <th className="py-2 px-2 text-center w-20">문항 수</th>
                      <th className="py-2 px-2 text-center w-16">비율</th>
                      <th className="py-2 px-2 text-center w-20">평균 난이도</th>
                      <th className="py-2 px-2 text-right w-20">배점 합계</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topicFrequency.map((t, i) => (
                      <tr key={t.topic} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-semibold text-slate-700">{i + 1}</td>
                        <td className="py-2 px-2 text-xs text-slate-700">{t.topic}</td>
                        <td className="py-2 px-2 text-center text-xs">{t.count}문항</td>
                        <td className="py-2 px-2 text-center text-xs text-slate-500">{t.pct}%</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-sm text-white font-medium"
                            style={{ backgroundColor: DIFFICULTY_COLORS[t.avgDifficulty] || '#94A3B8' }}
                          >
                            {DIFFICULTY_LABELS[t.avgDifficulty] || DIFF_LABELS[t.avgDifficulty] || t.avgDifficulty}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-medium">{t.totalPoints}점</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── AI 트렌드 인사이트 ── */}
          <div className="bg-white border rounded-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-slate-900">AI 트렌드 인사이트</h3>
              </div>
              <Button size="sm" variant="secondary" onClick={generateInsight} disabled={insightLoading}>
                {insightLoading ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {insight ? '재생성' : '인사이트 생성'}
              </Button>
            </div>

            {insight ? (
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-sm p-3">
                  <p className="text-xs text-slate-700">{insight.overallTrend}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-1.5">핵심 출제 패턴</h4>
                    <ul className="space-y-1">
                      {insight.keyPatterns.map((p, i) => (
                        <li key={i} className="text-xs text-slate-600">• {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-1.5">시험 대비 팁</h4>
                    <ul className="space-y-1">
                      {insight.preparationTips.map((p, i) => (
                        <li key={i} className="text-xs text-slate-600">• {p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="text-xs text-slate-500">{insight.difficultyAnalysis}</div>
                <div className="text-xs text-slate-500">{insight.topicFocus}</div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                &quot;인사이트 생성&quot; 버튼을 눌러 AI 분석을 시작하세요
              </p>
            )}
          </div>

          {/* ── 학교별 출제 경향 (접이식) ── */}
          <div className="bg-white border rounded-sm">
            <button
              onClick={() => setSchoolExpanded(!schoolExpanded)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">학교별 출제 경향</h3>
              </div>
              {schoolExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {schoolExpanded && (
              <div className="border-t px-4 pb-4">
                <div className="flex items-center gap-2 py-3">
                  <Button size="sm" onClick={aggregateSchools} disabled={schoolAggregating}>
                    {schoolAggregating ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5 mr-1" />}
                    데이터 집계
                  </Button>
                  <span className="text-xs text-slate-400">{schoolTrends.length}개 학교 데이터</span>
                </div>

                {schoolTrends.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {schoolTrends.map(t => (
                      <SchoolTrendCard key={t.id} trend={t} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">
                    집계된 데이터가 없습니다. &quot;데이터 집계&quot; 버튼을 눌러 시험 데이터를 집계하세요.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && stats?.totalExams === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">분석된 시험지가 없습니다</p>
          <p className="text-xs mt-1">시험지를 업로드하고 분석을 실행하세요</p>
        </div>
      )}
    </PageContainer>
  );
}

// ── 서브 컴포넌트 ──

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white border rounded-sm p-3">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${accent ? 'text-primary' : 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

function SchoolTrendCard({ trend }: { trend: SchoolTrend }) {
  const td = trend.trendData as Record<string, unknown> | null;
  const ts = trend.trendSummary as { difficultyLevel?: string; focusAreas?: string[] } | null;
  const diffDist = td?.difficulty_distribution as Record<string, number> | undefined;

  return (
    <div className="border rounded-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-slate-800">{trend.schoolName || '전체'}</span>
          <span className="text-[10px] text-slate-400 ml-2">{trend.grade} · {trend.period}</span>
        </div>
        {ts?.difficultyLevel && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
            ts.difficultyLevel === '상' ? 'bg-red-100 text-red-700' :
            ts.difficultyLevel === '중상' ? 'bg-orange-100 text-orange-700' :
            ts.difficultyLevel === '중' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            난이도 {ts.difficultyLevel}
          </span>
        )}
      </div>

      <div className="text-[10px] text-slate-400 mb-2">표본 {trend.sampleSize}건</div>

      {/* 난이도 분포 미니 바 */}
      {diffDist && (
        <div className="flex h-3 rounded-sm overflow-hidden gap-px">
          {Object.entries(diffDist).filter(([, v]) => v > 0).map(([k, v]) => {
            const total = Object.values(diffDist).reduce((s, n) => s + n, 0);
            return (
              <div
                key={k}
                className="h-full"
                style={{ width: `${(v / Math.max(total, 1)) * 100}%`, backgroundColor: DIFFICULTY_COLORS[k] || '#94A3B8' }}
                title={`${DIFF_LABELS[k] || k}: ${v}문항`}
              />
            );
          })}
        </div>
      )}

      {/* 집중 단원 */}
      {ts?.focusAreas && ts.focusAreas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ts.focusAreas.slice(0, 3).map(a => (
            <span key={a} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-sm">{a}</span>
          ))}
        </div>
      )}
    </div>
  );
}
