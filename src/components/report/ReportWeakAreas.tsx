'use client';

import type { ReportAreaInfo, ReportPrereqChain, ReportPrerequisiteWeakness } from '@/types/report';
import { getPrerequisiteFeedback } from '@/lib/utils/level-test-feedback';

interface ReportWeakAreasProps {
  weakAreas: ReportAreaInfo[];
  strongAreas: ReportAreaInfo[];
  prerequisiteChains: ReportPrereqChain[];
  prerequisiteWeaknesses: ReportPrerequisiteWeakness[];
  aiPrerequisiteFeedback?: string | null;
}

export function ReportWeakAreas({
  weakAreas,
  strongAreas,
  prerequisiteChains,
  prerequisiteWeaknesses: _prerequisiteWeaknesses,
  aiPrerequisiteFeedback,
}: ReportWeakAreasProps) {
  const prereqFeedback = aiPrerequisiteFeedback || getPrerequisiteFeedback(prerequisiteChains.length);

  return (
    <div className="h-full px-10 py-6 flex flex-col">
      {/* Title */}
      <div className="flex items-center gap-2 mb-5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#135bec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h2 className="text-base font-bold text-slate-900">취약 영역 · 선수학습 결손 분석</h2>
      </div>

      {/* 강점 / 취약 비교 */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* 강점 */}
        <div className="rounded-2xl border border-emerald-200 overflow-hidden">
          <div
            className="px-5 py-2.5 flex items-center gap-2"
            style={{ backgroundColor: '#ecfdf5', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-xs font-bold text-emerald-700">강점 영역 ({strongAreas.length}개)</span>
          </div>
          <div className="p-3 space-y-1">
            {strongAreas.length === 0 ? (
              <p className="text-[10px] text-slate-400 py-3 text-center">강점 영역이 없습니다</p>
            ) : (
              strongAreas.slice(0, 5).map((area) => (
                <div key={area.chapter} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  <span className="text-xs text-slate-700 font-medium truncate flex-1">{area.chapter}</span>
                  <span className="text-xs font-black text-emerald-600 ml-2">{area.accuracy}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 취약 */}
        <div className="rounded-2xl border border-red-200 overflow-hidden">
          <div
            className="px-5 py-2.5 flex items-center gap-2"
            style={{ backgroundColor: '#fef2f2', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span className="text-xs font-bold text-red-700">취약 영역 ({weakAreas.length}개)</span>
          </div>
          <div className="p-3 space-y-1">
            {weakAreas.length === 0 ? (
              <p className="text-[10px] text-slate-400 py-3 text-center">취약 영역이 없습니다</p>
            ) : (
              weakAreas.slice(0, 5).map((area) => (
                <div key={area.chapter} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  <span className="text-xs text-slate-700 font-medium truncate flex-1">{area.chapter}</span>
                  <span className="text-xs font-black text-red-500 ml-2">{area.accuracy}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 선수학습 결손 분석 */}
      {prerequisiteChains.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            <h3 className="text-sm font-bold text-slate-900">선수학습 결손 분석</h3>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#7c3aed', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
            >
              MathLab AI
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{prereqFeedback}</p>

          <div className="flex-1 overflow-hidden space-y-2.5">
            {prerequisiteChains.slice(0, 4).map((chain, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 p-3.5"
                style={{ backgroundColor: '#fafafa', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="shrink-0 rounded-lg px-2.5 py-1.5"
                    style={{ backgroundColor: '#fef2f2', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
                  >
                    <p className="text-[9px] font-bold text-red-600">틀린 문제</p>
                    <p className="text-[10px] text-slate-700 font-medium">{chain.wrongConcept.title || chain.wrongConcept.chapter}</p>
                    {chain.wrongConcept.chapter && chain.wrongConcept.title && (
                      <p className="text-[8px] text-slate-400">{chain.wrongConcept.chapter}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center self-center">
                    <svg width="24" height="12" viewBox="0 0 24 12">
                      <path d="M0 6 L18 6 M14 2 L18 6 L14 10" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                    </svg>
                  </div>

                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {chain.prerequisites.map((prereq, pi) => (
                      <div
                        key={pi}
                        className="rounded-lg px-2.5 py-1.5"
                        style={{
                          backgroundColor: prereq.depth === 1 ? '#eff6ff' : '#faf5ff',
                          printColorAdjust: 'exact',
                          WebkitPrintColorAdjust: 'exact',
                        } as React.CSSProperties}
                      >
                        <p className="text-[8px] font-bold" style={{ color: prereq.depth === 1 ? '#2563eb' : '#7c3aed' }}>
                          {prereq.depth === 1 ? '직접 선수개념' : '기초 선수개념'}
                        </p>
                        <p className="text-[10px] text-slate-700">{prereq.title || prereq.code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {prerequisiteChains.length > 4 && (
            <p className="text-[9px] text-slate-400 mt-2 text-center">
              외 {prerequisiteChains.length - 4}개 결손 체인
            </p>
          )}
        </div>
      )}

      {prerequisiteChains.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#ecfdf5', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-sm font-bold text-emerald-600 mb-1">선수학습 결손이 발견되지 않았습니다</p>
            <p className="text-[10px] text-slate-400">현재 학년의 기초가 잘 잡혀 있습니다</p>
          </div>
        </div>
      )}
    </div>
  );
}
