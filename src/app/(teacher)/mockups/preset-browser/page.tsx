/**
 * 전체 프리셋 브라우저
 *
 * 두 시스템의 프리셋을 한 페이지에서 검색/브라우징:
 * 1. 기존 DiagramParam 프리셋 (209개, 초/중/고 × 학년 × 단원) — PresetSelector와 동일 데이터
 * 2. 신규 DiagramSpec 프리셋 (계단형, 보조선 분할, 복합 다각형 등) — shape-presets.ts
 */

'use client';

import { useMemo, useState } from 'react';
import { ALL_PRESETS, gradeKeyToShortLabel } from '@/lib/diagram-presets';
import { SHAPE_PRESETS } from '@/lib/diagram-presets/shape-presets';
import { renderDiagram as renderSpec } from '@/lib/diagram/renderer';
import { renderDiagram as renderParam } from '@/lib/utils/svg-diagrams';
import type { DiagramParam } from '@/types/pdf-extract';

type Tab = 'legacy' | 'new' | 'all';

export default function PresetBrowserPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'elementary' | 'middle' | 'high'>('all');

  const legacyFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_PRESETS.filter((p) => {
      if (levelFilter !== 'all' && p.schoolLevel !== levelFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.chapter.toLowerCase().includes(q)
      );
    });
  }, [query, levelFilter]);

  const newFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHAPE_PRESETS.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q) ||
        (p.gradeHint ?? '').toLowerCase().includes(q)
      );
    });
  }, [query]);

  const showLegacy = tab === 'legacy' || tab === 'all';
  const showNew = tab === 'new' || tab === 'all';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">프리셋 브라우저</h1>
        <p className="text-sm text-slate-600 mb-4">
          현재 프로젝트가 가진 전체 도형 프리셋을 한 화면에서 확인합니다.
        </p>

        {/* 탭 */}
        <div className="flex gap-2 mb-3">
          {[
            { key: 'all' as Tab, label: `전체 (${ALL_PRESETS.length + SHAPE_PRESETS.length})` },
            { key: 'legacy' as Tab, label: `기존 DiagramParam (${ALL_PRESETS.length})` },
            { key: 'new' as Tab, label: `신규 DiagramSpec (${SHAPE_PRESETS.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm font-bold rounded-sm border transition-colors ${
                tab === t.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 검색 + 학교급 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색 (이름/설명/단원/그룹)"
            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-primary"
          />
          {showLegacy && (
            <div className="flex gap-1">
              {[
                { key: 'all', label: '전체' },
                { key: 'elementary', label: '초' },
                { key: 'middle', label: '중' },
                { key: 'high', label: '고' },
              ].map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLevelFilter(l.key as typeof levelFilter)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-sm border ${
                    levelFilter === l.key
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 신규 DiagramSpec 프리셋 */}
        {showNew && newFiltered.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              신규 DiagramSpec 프리셋
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({newFiltered.length}개)
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {newFiltered.map((preset) => (
                <div key={preset.id} className="bg-white rounded-sm p-3 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-700">
                      {preset.group}
                    </span>
                    {preset.gradeHint && (
                      <span className="text-[10px] text-slate-400">{preset.gradeHint}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 truncate">{preset.name}</h3>
                  {preset.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{preset.description}</p>
                  )}
                  <div
                    className="mt-2 p-2 bg-slate-50 rounded flex justify-center items-center"
                    style={{ minHeight: 140 }}
                    dangerouslySetInnerHTML={{ __html: renderSpec(preset.spec) }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 기존 DiagramParam 프리셋 */}
        {showLegacy && legacyFiltered.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              기존 DiagramParam 프리셋
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({legacyFiltered.length}개 / 전체 {ALL_PRESETS.length}개)
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {legacyFiltered.map((preset) => {
                let svg = '';
                try {
                  svg = renderParam({
                    type: preset.diagramType as Parameters<typeof renderParam>[0]['type'],
                    params: preset.defaultParams as Record<string, unknown>,
                  } as unknown as Parameters<typeof renderParam>[0]) ?? '';
                } catch {
                  svg = '';
                }
                return (
                  <div key={preset.id} className="bg-white rounded-sm p-3 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                        {preset.schoolLevel === 'elementary' ? '초' : preset.schoolLevel === 'middle' ? '중' : '고'}
                        {' · '}
                        {gradeKeyToShortLabel(preset.gradeKey)}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{preset.chapter}</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 truncate">{preset.name}</h3>
                    {preset.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{preset.description}</p>
                    )}
                    <div
                      className="mt-2 p-2 bg-slate-50 rounded flex justify-center items-center"
                      style={{ minHeight: 140 }}
                      dangerouslySetInnerHTML={{ __html: svg || '<span style="font-size:11px;color:#999">렌더 불가</span>' }}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{preset.diagramType}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {legacyFiltered.length === 0 && newFiltered.length === 0 && (
          <div className="text-center py-20 text-slate-400">검색 결과가 없습니다</div>
        )}
      </div>
    </div>
  );
}
