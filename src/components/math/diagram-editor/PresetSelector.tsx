'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, List } from 'lucide-react';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import type { PresetSchoolLevel, DiagramPreset } from '@/lib/diagram-presets/types';
import {
  groupPresetsByGrade,
  getGradeKeysForLevel,
  gradeKeyToShortLabel,
  searchPresets,
} from '@/lib/diagram-presets';
import { TYPE_GROUPS, getDefaultParams } from './types';

// ── 다이어그램 타입 → 아이콘 매핑 ──
const TYPE_ICON: Partial<Record<DiagramType, string>> = {
  triangle: '△', quadrilateral: '▱', circle: '○', regular_polygon: '⬡',
  coordinate_plane: '⊞', function_graph: '📈', number_line: '↔',
  fraction_rect: '▦', fraction_circle: '◔', dot_array: '⠿',
  bar_chart: '▊', line_graph: '📉', pie_chart: '◕', band_chart: '▬',
  picture_graph: '★', angle_figure: '∠', clock_face: '🕐',
  histogram: '▊', stem_leaf: '🌿', scatter_plot: '⁘',
  solid_figure: '⬡', net_diagram: '✂', tree_diagram: '🌳',
  venn_diagram: '⊕', place_value: '🔢', flow_chart: '→',
};

interface PresetSelectorProps {
  currentType: DiagramType;
  onSelect: (type: DiagramType, params: Record<string, unknown>, label?: string) => void;
}

const SCHOOL_LEVELS: { key: PresetSchoolLevel; label: string }[] = [
  { key: 'elementary', label: '초등' },
  { key: 'middle', label: '중등' },
  { key: 'high', label: '고등' },
];

export function PresetSelector({ currentType, onSelect }: PresetSelectorProps) {
  const [schoolLevel, setSchoolLevel] = useState<PresetSchoolLevel>('elementary');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [expandedChapter, setExpandedChapter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // 학년 키 목록
  const gradeKeys = useMemo(() => getGradeKeysForLevel(schoolLevel), [schoolLevel]);

  // 현재 학교급의 프리셋 그룹
  const gradeGroups = useMemo(() => groupPresetsByGrade(schoolLevel), [schoolLevel]);

  // 선택된 학년의 단원 목록
  const currentGradeGroup = useMemo(
    () => gradeGroups.find(g => g.gradeKey === selectedGrade),
    [gradeGroups, selectedGrade]
  );

  // 검색 결과
  const searchResults = useMemo(() => searchPresets(searchQuery), [searchQuery]);

  // 학교급 변경 시 첫 번째 학년 선택
  useEffect(() => {
    const keys = getGradeKeysForLevel(schoolLevel);
    if (keys.length > 0) {
      setSelectedGrade(keys[0]);
      setExpandedChapter('');
    }
  }, [schoolLevel]);

  // 학년 변경 시 첫 번째 단원 자동 펼침
  useEffect(() => {
    if (currentGradeGroup && currentGradeGroup.chapters.length > 0) {
      setExpandedChapter(currentGradeGroup.chapters[0].chapter);
    }
  }, [currentGradeGroup]);

  // 프리셋 선택
  const handlePresetSelect = useCallback((preset: DiagramPreset) => {
    setSelectedPresetId(preset.id);
    onSelect(preset.diagramType, preset.defaultParams, preset.name);
  }, [onSelect]);

  // 폴백: 타입 직접 선택
  const handleFallbackSelect = useCallback((type: DiagramType) => {
    setSelectedPresetId('');
    onSelect(type, getDefaultParams(type));
  }, [onSelect]);

  // 아코디언 토글
  const toggleChapter = useCallback((chapter: string) => {
    setExpandedChapter(prev => prev === chapter ? '' : chapter);
  }, []);

  const isSearchMode = searchQuery.trim().length > 0;

  return (
    <div className="mb-3 space-y-2">
      {/* 학제 탭 */}
      <div className="flex gap-1">
        {SCHOOL_LEVELS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setSchoolLevel(key); setSearchQuery(''); setShowFallback(false); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-colors ${
              schoolLevel === key && !isSearchMode && !showFallback
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {/* 전체 타입 토글 */}
        <button
          type="button"
          onClick={() => { setShowFallback(!showFallback); setSearchQuery(''); }}
          className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border transition-colors ${
            showFallback
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
          }`}
        >
          <List className="w-3 h-3" />
          전체 타입
        </button>
      </div>

      {/* 폴백: 전체 다이어그램 타입 */}
      {showFallback && (
        <div className="border border-slate-200 rounded-sm p-2 bg-slate-50">
          {TYPE_GROUPS.map((group) => (
            <div key={group.label} className="mb-1.5 last:mb-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.label}</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {group.types.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleFallbackSelect(t.value)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-sm border transition-colors ${
                      currentType === t.value && !selectedPresetId
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 검색 */}
      {!showFallback && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="프리셋 검색 (예: 삼각형, 원, 그래프...)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-sm focus:outline-none focus:border-primary"
          />
        </div>
      )}

      {/* 검색 모드: 검색 결과 */}
      {!showFallback && isSearchMode && (
        <div className="border border-slate-200 rounded-sm max-h-48 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              검색 결과가 없습니다
            </div>
          ) : (
            searchResults.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors ${
                  selectedPresetId === preset.id ? 'bg-primary/5 text-primary' : 'text-slate-700'
                }`}
              >
                <span className="text-sm w-5 text-center shrink-0 opacity-60">
                  {TYPE_ICON[preset.diagramType] ?? '◆'}
                </span>
                <span className="font-medium truncate">{preset.name}</span>
                <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                  {preset.schoolLevel === 'elementary' ? '초' : preset.schoolLevel === 'middle' ? '중' : '고'}
                  {' · '}
                  {gradeKeyToShortLabel(preset.gradeKey)}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* 학년/학기 pill + 단원 아코디언 */}
      {!showFallback && !isSearchMode && (
        <>
          {/* 학년 pill */}
          <div className="flex flex-wrap gap-1">
            {gradeKeys.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedGrade(key)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-sm border transition-colors ${
                  selectedGrade === key
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {gradeKeyToShortLabel(key)}
              </button>
            ))}
          </div>

          {/* 단원 아코디언 */}
          {currentGradeGroup && (
            <div className="border border-slate-200 rounded-sm max-h-48 overflow-y-auto">
              {currentGradeGroup.chapters.map(({ chapter, presets }) => (
                <div key={chapter}>
                  {/* 단원 헤더 */}
                  <button
                    type="button"
                    onClick={() => toggleChapter(chapter)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"
                  >
                    {expandedChapter === chapter ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{chapter}</span>
                    <span className="ml-auto text-[10px] font-normal text-slate-400">{presets.length}</span>
                  </button>

                  {/* 프리셋 아이템 */}
                  {expandedChapter === chapter && (
                    <div className="bg-slate-50/50">
                      {presets.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetSelect(preset)}
                          className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left text-xs border-b border-slate-100 last:border-0 transition-colors ${
                            selectedPresetId === preset.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-sm w-4 text-center shrink-0 opacity-50">
                            {TYPE_ICON[preset.diagramType] ?? '◆'}
                          </span>
                          <span className="truncate">{preset.name}</span>
                          <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                            {preset.diagramType.replace(/_/g, ' ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
