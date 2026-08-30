'use client';

import type { LevelStrategy } from '@/lib/exam-analysis/data/curriculum/types';

/**
 * 영어 수준별 학습 전략 — 하위권·중위권·상위권 3단계.
 *
 * 어느 수준인지는 **고르지 않는다.** 학생 답안지를 받지 않으므로 학생 수준을 알 수 없다.
 * 세 가지를 나란히 놓고 선생님이 고르게 한다(수학 LevelStrategiesSection 과 같은 태도).
 */

const LEVEL_STYLES = [
  { bar: '#3B82F6', chip: 'bg-blue-50 text-blue-700 border-blue-100' },
  { bar: '#F59E0B', chip: 'bg-amber-50 text-amber-700 border-amber-100' },
  { bar: '#EF4444', chip: 'bg-red-50 text-red-700 border-red-100' },
];

export function EnglishLevelStrategies({
  strategies,
  profile,
}: {
  strategies: LevelStrategy[];
  /** 이 시험의 성격 한 줄 — 계산해서 나온 사실만. 없으면 생략. */
  profile?: { hardRatio: number; avgDifficulty: number | null };
}) {
  if (strategies.length === 0) return null;

  return (
    <div className="space-y-3">
      {profile && (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          이 시험은 고난도(4~5단계) 비율이{' '}
          <strong className="font-semibold text-slate-700">{Math.round(profile.hardRatio * 100)}%</strong>
          {profile.avgDifficulty !== null && (
            <>
              , 평균 난이도가{' '}
              <strong className="font-semibold text-slate-700">{profile.avgDifficulty.toFixed(1)}단계</strong>
            </>
          )}
          입니다. 아래 셋 중 학생에게 해당하는 전략을 참고하세요.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {strategies.map((s, i) => {
          const style = LEVEL_STYLES[i] ?? LEVEL_STYLES[0];
          return (
            <div key={s.level} className="rounded-sm border border-slate-100 overflow-hidden bg-white">
              <div className="h-1" style={{ backgroundColor: style.bar }} />
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm font-bold text-slate-800">{s.level}</span>
                  <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium border ${style.chip}`}>
                    {s.targetGrade}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">{s.description}</p>

                <ul className="space-y-1 mb-2.5">
                  {s.coreStrategies.map((c, ci) => (
                    <li key={ci} className="text-[11px] text-slate-700 flex items-start gap-1.5 leading-relaxed">
                      <span
                        className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: style.bar }}
                      />
                      {c}
                    </li>
                  ))}
                </ul>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <p className="text-[10px] text-slate-400">
                    권장 학습량 <span className="text-slate-600 font-medium">{s.studyHours}</span>
                  </p>
                  {s.recommendedBooks.length > 0 && (
                    <p className="text-[10px] text-slate-400">
                      교재 <span className="text-slate-600">{s.recommendedBooks.join(' · ')}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-600 bg-slate-50 rounded-sm px-2 py-1.5 mt-1.5 leading-relaxed">
                    {s.keyPrinciple}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
