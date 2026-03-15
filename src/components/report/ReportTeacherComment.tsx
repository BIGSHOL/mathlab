'use client';

import type { ReportAreaInfo } from '@/types/report';

interface ReportTeacherCommentProps {
  recommendLevel: string;
  overallAccuracy: number;
  weakAreas: ReportAreaInfo[];
  strongAreas: ReportAreaInfo[];
  prerequisiteCount: number;
  academyName: string;
  studentName: string;
  totalReview?: string | null;
  analysisGuide?: string | null;
}

export function ReportTeacherComment({
  recommendLevel,
  overallAccuracy,
  weakAreas,
  strongAreas,
  prerequisiteCount,
  academyName,
  studentName,
  totalReview,
  analysisGuide,
}: ReportTeacherCommentProps) {
  const steps = getNextSteps(recommendLevel, overallAccuracy, weakAreas, strongAreas, prerequisiteCount);

  return (
    <div className="h-full px-10 py-6 flex flex-col">
      {/* 총평 (AI 생성) */}
      {totalReview && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h2 className="text-base font-bold text-slate-900">종합 총평</h2>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#7c3aed', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
            >
              MathLab AI
            </span>
          </div>
          <div
            className="rounded-2xl border p-5"
            style={{
              backgroundColor: '#faf5ff',
              borderColor: 'rgba(124,58,237,0.15)',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            } as React.CSSProperties}
          >
            <p className="text-[11px] text-slate-700 leading-relaxed">{totalReview}</p>
          </div>
        </section>
      )}

      {/* 분석 도움말 (AI 생성) */}
      {analysisGuide && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <h2 className="text-base font-bold text-slate-900">분석 도움말</h2>
          </div>
          <div
            className="rounded-2xl border p-5"
            style={{
              backgroundColor: '#f0f9ff',
              borderColor: 'rgba(14,165,233,0.15)',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            } as React.CSSProperties}
          >
            <p className="text-[11px] text-slate-700 leading-relaxed">{analysisGuide}</p>
          </div>
        </section>
      )}

      {/* 학습 방향 제안 */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#135bec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <h2 className="text-base font-bold text-slate-900">학습 방향 제안</h2>
        </div>

        <div
          className="rounded-2xl border border-slate-100 p-5 mb-4"
          style={{ backgroundColor: 'rgba(248,250,252,0.5)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Personalized Guide</p>
          <p className="text-xs font-bold text-slate-800 mb-1">
            {studentName} 학생을 위한 맞춤 학습 가이드
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {getDirectionText(recommendLevel, overallAccuracy)}
          </p>
        </div>

        {/* 2x2 추천 카드 */}
        <div className="grid grid-cols-2 gap-3">
          {steps.map((step, i) => {
            const icons = [
              { bg: '#eff6ff', stroke: '#2563eb' },
              { bg: '#fef2f2', stroke: '#dc2626' },
              { bg: '#ecfdf5', stroke: '#059669' },
              { bg: '#faf5ff', stroke: '#7c3aed' },
            ];
            const style = icons[i % 4];
            return (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start gap-3">
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: style.bg, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
                  >
                    <span className="text-sm font-black" style={{ color: style.stroke }}>{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 mb-0.5">{step.title}</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 선생님 메모 공간 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <p className="text-xs font-bold text-slate-600">선생님 의견</p>
        </div>
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 border-b border-slate-200" />
          ))}
        </div>
      </div>

      {/* 하단 */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-center">
        <p className="text-[10px] font-bold text-slate-400">{academyName} · 레벨테스트 진단 보고서</p>
        <p className="text-[9px] text-slate-300 mt-0.5">
          본 보고서는 MathLab AI 엔진이 분석한 학습 수준을 바탕으로 맞춤 학습 방향을 제시합니다.
        </p>
      </div>
    </div>
  );
}

function getDirectionText(_level: string, accuracy: number): string {
  if (accuracy >= 90) {
    return '현재 수학 실력이 매우 우수한 상태입니다. 심화 과정과 창의적 문제풀이에 도전하여 수학적 사고력을 더욱 발전시키는 것을 추천드립니다.';
  }
  if (accuracy >= 75) {
    return '전반적으로 안정적인 학습 상태입니다. 취약한 영역을 집중적으로 보완하면 최상위 수준으로 도약할 수 있습니다.';
  }
  if (accuracy >= 60) {
    return '기본 개념은 이해하고 있으나 응용력 강화가 필요합니다. 취약 단원의 개념을 다시 정리하고, 다양한 유형의 문제를 연습하세요.';
  }
  if (accuracy >= 40) {
    return '핵심 개념의 이해를 다지는 것이 가장 중요합니다. 교과서 기본 문제부터 차근차근 풀어보며 자신감을 회복하세요.';
  }
  return '선수학습 개념의 결손을 우선 해결해야 합니다. 이전 학년의 핵심 개념부터 순서대로 복습하면 현재 학습의 이해도가 크게 향상됩니다.';
}

function getNextSteps(
  _level: string,
  accuracy: number,
  weakAreas: ReportAreaInfo[],
  strongAreas: ReportAreaInfo[],
  prerequisiteCount: number,
): { title: string; description: string }[] {
  const steps: { title: string; description: string }[] = [];

  if (prerequisiteCount > 0) {
    steps.push({
      title: '선수학습 복습',
      description: '보고서에 표시된 선수학습 결손 개념을 우선적으로 복습하세요.',
    });
  }

  if (weakAreas.length > 0) {
    const topWeak = weakAreas.slice(0, 2).map((a) => a.chapter).join(', ');
    steps.push({
      title: '취약 단원 집중 학습',
      description: `${topWeak} 단원의 기본 개념을 다시 정리하고 유사 문제를 풀어보세요.`,
    });
  }

  if (accuracy < 60) {
    steps.push({
      title: '기본 문제 반복',
      description: '교과서 예제와 기본 난이도 문제를 먼저 완벽히 소화한 후, 점진적으로 난이도를 높이세요.',
    });
  } else if (accuracy < 80) {
    steps.push({
      title: '오답 노트 작성',
      description: '틀린 문제의 풀이 과정을 정리하고, 동일 유형 문제를 3회 이상 반복 연습하세요.',
    });
  } else {
    steps.push({
      title: '심화 도전',
      description: '상위 난이도 문제와 서술형 문제에 도전하여 수학적 표현력을 키우세요.',
    });
  }

  if (strongAreas.length > 0) {
    steps.push({
      title: '강점 영역 활용',
      description: `${strongAreas[0].chapter} 등 잘하는 단원의 심화 문제로 자신감을 유지하세요.`,
    });
  }

  return steps.slice(0, 4);
}
