'use client';

import { useState, useEffect } from 'react';

const ANALYSIS_STEPS = [
  { label: '파일 로드', description: '시험지 이미지를 읽고 있습니다' },
  { label: '분류', description: '학년/과목에 맞는 분석 규칙을 준비합니다' },
  { label: 'AI 분석', description: '문항이 많으면 시간이 더 걸릴 수 있습니다' },
  { label: '저장', description: '분석 결과를 저장합니다' },
];

export function AnalyzingProgress({ serverStep }: { serverStep: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSteps = ANALYSIS_STEPS.length;

  return (
    <div className="bg-slate-50 border rounded-sm p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm font-medium text-slate-700">분석 중...</span>
        </div>
        <span className="text-xs text-slate-400">{elapsed}초 경과</span>
      </div>

      {/* 스텝 인디케이터 (수평 라인) */}
      <div className="flex items-center gap-0 mb-3">
        {ANALYSIS_STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isDone = serverStep > stepNum;
          const isActive = serverStep === stepNum;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              {/* 원형 인디케이터 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                isDone ? 'bg-green-500 text-white' :
                isActive ? 'bg-primary text-white' :
                'bg-slate-200 text-slate-400'
              }`}>
                {isDone ? '✓' : stepNum}
              </div>

              {/* 연결선 (마지막 제외) */}
              {i < totalSteps - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-colors ${
                  isDone ? 'bg-green-400' : 'bg-slate-200'
                }`} />
              )}
            </div>
          );
        })}

        {/* 진행률 텍스트 */}
        <span className="ml-3 text-xs text-slate-500 shrink-0">
          {serverStep}/{totalSteps}
        </span>
      </div>

      {/* 현재 단계 설명 */}
      {serverStep > 0 && serverStep <= totalSteps && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-medium ${serverStep <= totalSteps ? 'text-primary' : 'text-green-600'}`}>
            {ANALYSIS_STEPS[serverStep - 1].label}
          </span>
          <span className="text-slate-400 text-xs">
            {ANALYSIS_STEPS[serverStep - 1].description}
          </span>
        </div>
      )}
    </div>
  );
}
