'use client';

import GemStone from '@/components/gamification/GemStone';
import { GEM_VARIANT_LABELS, GEM_STAGE_LABELS, type GemVariant } from '@/lib/utils/gem';

const VARIANTS: GemVariant[] = ['ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'quartz'];
const STAGES = [0, 1, 2, 3, 4];
const SIZES = ['xs', 'sm', 'md', 'lg'] as const;

export default function GemMockupPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-black mb-2">보석 목업 페이지</h1>
      <p className="text-slate-400 mb-8">6종 보석 × 5단계 × 4사이즈 — SVG + Framer Motion</p>

      {/* 전체 매트릭스: 종류 × 단계 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-slate-300">종류 × 단계 (md 사이즈)</h2>
        <div className="bg-slate-900/50 rounded-lg p-6 overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left text-slate-500 text-sm">보석</th>
                {STAGES.map(s => (
                  <th key={s} className="p-3 text-center text-slate-500 text-sm">
                    {GEM_STAGE_LABELS[s]}
                    <span className="block text-xs text-slate-600">stage {s}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VARIANTS.map(v => (
                <tr key={v} className="border-t border-slate-800">
                  <td className="p-3 font-medium text-slate-300">
                    {GEM_VARIANT_LABELS[v]}
                    <span className="block text-xs text-slate-500">{v}</span>
                  </td>
                  {STAGES.map(s => (
                    <td key={s} className="p-3 text-center">
                      <div className="flex justify-center">
                        <GemStone variant={v} stage={s} size="md" showLabel />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 사이즈 비교 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-slate-300">사이즈 비교 (stage 4 완성)</h2>
        <div className="bg-slate-900/50 rounded-lg p-6">
          <div className="flex flex-wrap gap-8 items-end">
            {SIZES.map(sz => (
              <div key={sz} className="flex flex-col items-center gap-2">
                <span className="text-xs text-slate-500 font-mono">{sz}</span>
                <GemStone variant="ruby" stage={4} size={sz} showLabel />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 대형 쇼케이스 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-slate-300">완성 보석 쇼케이스 (lg)</h2>
        <div className="bg-slate-900/50 rounded-lg p-8">
          <div className="flex flex-wrap gap-10 justify-center">
            {VARIANTS.map(v => (
              <div key={v} className="flex flex-col items-center gap-3">
                <GemStone variant={v} stage={4} size="lg" showLabel />
                <span className="text-sm text-slate-400">{GEM_VARIANT_LABELS[v]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 진화 과정 시뮬레이션 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-slate-300">보석 진화 과정</h2>
        <div className="bg-slate-900/50 rounded-lg p-6">
          {VARIANTS.map(v => (
            <div key={v} className="flex items-center gap-6 mb-6 last:mb-0">
              <span className="text-sm text-slate-400 w-20">{GEM_VARIANT_LABELS[v]}</span>
              <div className="flex items-center gap-3">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    <GemStone variant={v} stage={s} size="sm" />
                    {i < STAGES.length - 1 && (
                      <span className="text-slate-600 text-lg">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 애니메이션 비활성화 비교 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-slate-300">애니메이션 ON vs OFF (stage 4)</h2>
        <div className="bg-slate-900/50 rounded-lg p-6">
          <div className="flex gap-16 items-center">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-slate-500">애니메이션 ON</span>
              <GemStone variant="sapphire" stage={4} size="lg" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-slate-500">애니메이션 OFF</span>
              <GemStone variant="sapphire" stage={4} size="lg" disableAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* 밝은 배경 테스트 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-slate-300">밝은 배경 테스트</h2>
        <div className="bg-white rounded-lg p-8">
          <div className="flex flex-wrap gap-6 justify-center">
            {VARIANTS.map(v => (
              <GemStone key={v} variant={v} stage={4} size="lg" showLabel />
            ))}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-8 mt-4">
          <div className="flex flex-wrap gap-6 justify-center">
            {VARIANTS.map(v => (
              <GemStone key={v} variant={v} stage={2} size="md" showLabel />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
