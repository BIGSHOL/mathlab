'use client';

import { useMemo } from 'react';
// constants import removed (unused after refactor)
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { InfoTooltip } from './InfoTooltip';

interface DiscriminationSectionProps {
  questions: AnalyzedQuestion[];
}

// ── 변별력 등급 정의 ──

const DISCRIMINATION_GRADES = {
  excellent: {
    label: '우수',
    color: '#22c55e',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    description: '적절한 난이도와 높은 배점으로 실력 차이가 잘 드러납니다',
  },
  good: {
    label: '양호',
    color: '#3b82f6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    description: '적절한 난이도로 우리 아이 실력을 잘 평가할 수 있습니다',
  },
  fair: {
    label: '보통',
    color: '#f59e0b',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    description: '배점이 낮아 점수 차이에 큰 영향이 없습니다',
  },
  poor: {
    label: '주의',
    color: '#ef4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    description: '쉬운 문항으로 실력 차이가 잘 드러나지 않습니다',
  },
} as const;

type DiscriminationGrade = keyof typeof DISCRIMINATION_GRADES;

const _DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념', pattern: '유형', reasoning: '심화', creative: '최상위',
};

// ── 변별력 점수 계산 ──

function calculateDiscriminationScore(q: AnalyzedQuestion): number {
  const points = q.points || 3;

  // 난이도별 가중치
  const difficultyMultiplier: Record<string, number> = {
    concept: 0.3,
    pattern: 0.6,
    reasoning: 0.8,
    creative: 1.0,
  };
  const mult = difficultyMultiplier[q.difficulty] || 0.5;

  // 기본 점수: 배점 * 난이도 가중치 (정규화를 위해 10으로 나눔)
  let base = (points * mult) / 10 * 100;

  // 서술형 보너스 +20%
  if (q.question_format === 'essay') {
    base *= 1.2;
  }

  // 낮은 난이도 + 높은 배점 = 낮은 변별력 (패널티)
  if ((q.difficulty === 'concept' || q.difficulty === 'pattern') && points >= 5) {
    base *= 0.7;
  }

  // 높은 난이도 + 적절한 배점 = 좋은 변별력 (보너스)
  if ((q.difficulty === 'reasoning' || q.difficulty === 'creative') && points >= 4) {
    base *= 1.15;
  }

  return Math.min(100, Math.max(0, Math.round(base)));
}

function getGrade(score: number): DiscriminationGrade {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

// ── 요약 등급 계산 ──

function getOverallGrade(avgScore: number): { grade: DiscriminationGrade; label: string } {
  if (avgScore >= 80) return { grade: 'excellent', label: '우수' };
  if (avgScore >= 60) return { grade: 'good', label: '양호' };
  if (avgScore >= 40) return { grade: 'fair', label: '보통' };
  return { grade: 'poor', label: '주의' };
}

// ── 메인 컴포넌트 ──

export function DiscriminationSection({ questions }: DiscriminationSectionProps) {
  // 문항별 변별력 점수 계산
  const scoredQuestions = useMemo(() => {
    return questions.map(q => ({
      ...q,
      discriminationScore: calculateDiscriminationScore(q),
      grade: getGrade(calculateDiscriminationScore(q)),
    }));
  }, [questions]);

  // 평균 변별력
  const avgScore = useMemo(() => {
    if (scoredQuestions.length === 0) return 0;
    return Math.round(
      scoredQuestions.reduce((s, q) => s + q.discriminationScore, 0) / scoredQuestions.length,
    );
  }, [scoredQuestions]);

  // 등급별 분포
  const gradeCounts = useMemo(() => {
    const counts: Record<DiscriminationGrade, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };
    for (const q of scoredQuestions) {
      counts[q.grade]++;
    }
    const total = scoredQuestions.length || 1;
    return (['excellent', 'good', 'fair', 'poor'] as DiscriminationGrade[]).map(grade => ({
      grade,
      ...DISCRIMINATION_GRADES[grade],
      count: counts[grade],
      pct: Math.round((counts[grade] / total) * 100),
    }));
  }, [scoredQuestions]);

  // 상위/하위 5개
  const sorted = useMemo(
    () => [...scoredQuestions].sort((a, b) => b.discriminationScore - a.discriminationScore),
    [scoredQuestions],
  );
  const top5 = sorted.slice(0, 5);
  const bottom5 = [...sorted].reverse().slice(0, 5);

  const overall = getOverallGrade(avgScore);
  const overallInfo = DISCRIMINATION_GRADES[overall.grade];

  if (questions.length === 0) return null;

  return (
    <div className="bg-white border rounded-sm p-4 space-y-4">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-slate-900">변별력 분석</h3>
          <InfoTooltip content={
            <>
              <p className="font-semibold mb-1">변별력이란?</p>
              <p>시험이 실력에 따라 점수 차이를 잘 만들어내는 정도입니다. 적절한 난이도의 문항이 많을수록 높습니다.</p>
            </>
          } />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          시험 문항이 아이의 실력을 얼마나 정확하게 반영하는지 평가합니다
        </p>
      </div>

      {/* 요약 배너 */}
      <div
        className="rounded-sm p-4 border"
        style={{ backgroundColor: overallInfo.bgColor, borderColor: overallInfo.borderColor }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-sm text-sm font-bold text-white"
            style={{ backgroundColor: overallInfo.color }}
          >
            {overall.label}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              평균 변별력 지수: <span style={{ color: overallInfo.color }}>{avgScore}점</span>
            </p>
            <p className="text-xs text-slate-600 mt-0.5">{overallInfo.description}</p>
          </div>
        </div>
      </div>

      {/* 4개 등급 카드 (1행) */}
      <div className="flex gap-2">
        {gradeCounts.map(gc => (
          <div
            key={gc.grade}
            className="flex-1 rounded-sm px-3 py-2 shadow-sm flex items-center gap-2"
            style={{ backgroundColor: gc.bgColor }}
          >
            <span
              className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: gc.color }}
            >
              {gc.label}
            </span>
            <span className="text-sm font-bold text-slate-800">{gc.count}<span className="text-xs font-normal text-slate-500">문항</span></span>
            <span className="text-[10px] text-slate-400">{gc.pct}%</span>
          </div>
        ))}
      </div>

      {/* 2컬럼: 상위 5개 / 하위 5개 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 실력을 잘 반영하는 문항 (상위 5개) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-green-500" />
            <h4 className="text-xs font-semibold text-slate-800">실력을 잘 반영하는 문항 (상위 5개)</h4>
          </div>
          <div className="space-y-2">
            {top5.map(q => (
              <QuestionCard key={String(q.question_number)} q={q} />
            ))}
          </div>
        </div>

        {/* 점수 차이가 나기 어려운 문항 (하위 5개) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-red-500" />
            <h4 className="text-xs font-semibold text-slate-800">점수 차이가 나기 어려운 문항 (하위 5개)</h4>
          </div>
          <div className="space-y-2">
            {bottom5.map(q => (
              <QuestionCard key={String(q.question_number)} q={q} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 문항 카드 ──

function QuestionCard({ q }: {
  q: AnalyzedQuestion & { discriminationScore: number; grade: DiscriminationGrade };
}) {
  const gradeInfo = DISCRIMINATION_GRADES[q.grade];

  return (
    <div className="px-3 py-3 bg-slate-50/70 rounded-sm shadow-sm">
      <div className="flex items-center justify-between mb-1">
        {/* 문항 번호 (크게) */}
        <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
          {q.question_number}번
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-500">{q.points || 0}점</span>
          <span
            className="px-2 py-0.5 rounded-sm text-[10px] font-bold text-white"
            style={{ backgroundColor: gradeInfo.color }}
          >
            {gradeInfo.label}
          </span>
        </div>
      </div>
      {/* 설명 멘트 */}
      <p className="text-[11px] text-slate-500">{gradeInfo.description}</p>
    </div>
  );
}
