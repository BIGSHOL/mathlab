'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Target,
  AlertTriangle,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface DiagnosticResultData {
  id: string;
  diagnosticType: string;
  recommendLevel: string;
  weakAreas: { chapter: string; accuracy: number; total: number }[];
  strongAreas: { chapter: string; accuracy: number; total: number }[];
  overallAccuracy: number;
  createdAt: string;
}

const LEVEL_COLORS: Record<string, string> = {
  '심화': 'bg-purple-100 text-purple-700 border-purple-200',
  '상': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '중': 'bg-blue-100 text-blue-700 border-blue-200',
  '기초': 'bg-amber-100 text-amber-700 border-amber-200',
  '기초 보충': 'bg-red-100 text-red-700 border-red-200',
};

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary">진단 결과를 찾을 수 없습니다</p>
        <Link href="/my-tests">
          <Button variant="secondary" className="mt-4">돌아가기</Button>
        </Link>
      </div>
    );
  }

  const levelColor = LEVEL_COLORS[result.recommendLevel] ?? 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-tests" className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">진단평가 결과</h1>
      </div>

      {/* Level recommendation */}
      <Card className="p-5 mb-6 text-center bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200">
        <Target className="w-10 h-10 text-violet-600 mx-auto mb-3" />
        <p className="text-sm text-text-secondary mb-2">추천 학습 레벨</p>
        <span className={`inline-block px-6 py-2 rounded-full text-2xl font-black border-2 ${levelColor}`}>
          {result.recommendLevel}
        </span>
        <p className="text-3xl font-black text-text-primary mt-4">
          {result.overallAccuracy}
          <span className="text-lg text-text-secondary font-medium">% 정답률</span>
        </p>
      </Card>

      {/* Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Weak areas */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> 보완 필요 영역
          </h3>
          {result.weakAreas.length === 0 ? (
            <p className="text-xs text-text-secondary">취약 영역이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {result.weakAreas.map((area) => (
                <div key={area.chapter} className="flex items-center justify-between">
                  <span className="text-xs text-text-primary truncate max-w-[140px]" title={area.chapter}>
                    {area.chapter}
                  </span>
                  <span className="text-xs font-bold text-red-600">{area.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Strong areas */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-emerald-500" /> 우수 영역
          </h3>
          {result.strongAreas.length === 0 ? (
            <p className="text-xs text-text-secondary">데이터 부족</p>
          ) : (
            <div className="space-y-2">
              {result.strongAreas.map((area) => (
                <div key={area.chapter} className="flex items-center justify-between">
                  <span className="text-xs text-text-primary truncate max-w-[140px]" title={area.chapter}>
                    {area.chapter}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">{area.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recommendation */}
      <Card className="p-5 bg-blue-50/50 border-blue-200 mb-6">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-1">학습 추천</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {result.weakAreas.length > 0
                ? `${result.weakAreas.map((a) => a.chapter).join(', ')} 영역의 기초 문제부터 다시 풀어보는 것을 추천합니다.`
                : '전체적으로 양호한 성취도를 보이고 있습니다. 심화 문제에 도전해보세요!'}
            </p>
          </div>
        </div>
      </Card>

      <div className="text-center">
        <Link href="/my-tests">
          <Button variant="secondary">시험 목록으로 돌아가기</Button>
        </Link>
      </div>
    </div>
  );
}
