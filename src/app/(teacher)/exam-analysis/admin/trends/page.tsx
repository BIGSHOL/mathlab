'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { BarChart3, RefreshCw } from 'lucide-react';
import { DIFFICULTY_COLORS, QUESTION_TYPE_COLORS } from '@/lib/exam-analysis/constants';

interface TrendItem {
  id: string;
  subject: string;
  grade: string;
  period: string;
  schoolName: string | null;
  trendData: {
    difficulty_distribution: Record<string, number>;
    type_distribution: Record<string, number>;
    avg_questions: number;
    avg_points: number;
  };
  sampleSize: number;
  updatedAt: string;
}

const DIFF_LABELS: Record<string, string> = { concept: '개념', pattern: '유형', reasoning: '추론', creative: '창의' };
const TYPE_LABELS: Record<string, string> = { calculation: '계산', geometry: '도형', application: '응용', proof: '증명', graph: '그래프', statistics: '통계' };

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [subject, setSubject] = useState<'MATH' | 'ENGLISH'>('MATH');

  useEffect(() => {
    fetchTrends();
  }, [subject]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exam-analysis/trends?subject=${subject}`);
      const json = await res.json();
      setTrends(json.data || []);
    } catch {
      toast.error('트렌드 데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const generateTrend = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/exam-analysis/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject }),
      });
      if (!res.ok) throw new Error();
      toast.success('트렌드 데이터가 집계되었습니다');
      fetchTrends();
    } catch {
      toast.error('집계에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="출제 경향 분석"
        subtitle="학교별 시험 출제 경향을 분석합니다"
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="flex bg-slate-100 rounded-sm p-0.5">
          {(['MATH', 'ENGLISH'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                subject === s ? 'bg-white shadow-sm font-medium' : 'text-slate-500'
              }`}
            >
              {s === 'MATH' ? '수학' : '영어'}
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={generateTrend} disabled={generating}>
          <RefreshCw className={`w-4 h-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
          {generating ? '집계 중...' : '트렌드 집계'}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">불러오는 중...</div>
      ) : trends.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-2">트렌드 데이터가 없습니다</p>
          <p className="text-xs text-slate-400">시험지를 분석한 후 트렌드를 집계하세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trends.map(trend => (
            <div key={trend.id} className="border rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {trend.grade} · {trend.period}
                    {trend.schoolName && <span className="text-slate-400 ml-2">{trend.schoolName}</span>}
                  </h3>
                  <p className="text-xs text-slate-400">
                    표본 {trend.sampleSize}건 · 평균 {trend.trendData.avg_questions}문항 · 평균 {trend.trendData.avg_points}점
                  </p>
                </div>
              </div>

              {/* 난이도 분포 바 */}
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-1">난이도 분포</p>
                <div className="flex h-6 rounded-sm overflow-hidden">
                  {Object.entries(trend.trendData.difficulty_distribution).map(([key, val]) => {
                    const total = Object.values(trend.trendData.difficulty_distribution).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-center text-white text-[10px] font-medium"
                        style={{ width: `${pct}%`, backgroundColor: DIFFICULTY_COLORS[key] || '#94a3b8' }}
                        title={`${DIFF_LABELS[key]}: ${val}문항 (${Math.round(pct)}%)`}
                      >
                        {pct > 10 && DIFF_LABELS[key]}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 유형 분포 */}
              <div>
                <p className="text-xs text-slate-500 mb-1">유형 분포</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(trend.trendData.type_distribution)
                    .filter(([, v]) => v > 0)
                    .map(([key, val]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 rounded-sm text-xs font-medium"
                        style={{ backgroundColor: `${QUESTION_TYPE_COLORS[key]}15`, color: QUESTION_TYPE_COLORS[key] }}
                      >
                        {TYPE_LABELS[key]} {val}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
