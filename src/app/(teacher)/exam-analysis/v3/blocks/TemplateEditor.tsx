'use client';

/**
 * 총평 템플릿 편집기 — 테마 + 블록 구성(on/off · 순서 · variant).
 *
 * ⚠️ 저장 위치를 모르는 **controlled 컴포넌트**다.
 * value/onChange 만 다루고 localStorage·DB·API 를 직접 건드리지 않는다.
 * 덕분에 저장소를 바꿔도(로컬 → DB) 이 파일은 그대로 재사용된다.
 */

import { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type {
  BlockAvailabilityInput,
  CommentaryTemplateConfig,
  TemplateBlockConfig,
} from '@/lib/exam-analysis/blocks/types';
import { DEFAULT_TEMPLATE } from '@/lib/exam-analysis/blocks/default-template';
import { COMMENTARY_THEMES } from '@/lib/exam-analysis/commentary-themes';
import { COMMENTARY_LAYOUTS, LAYOUT_GROUPS, VIZ_LABELS } from '@/lib/exam-analysis/commentary-layouts';
import { COMMENTARY_COPIES } from '@/lib/exam-analysis/commentary-copy';
import { COMMENTARY_PRESETS, presetToConfig, AUDIENCE_LABELS } from '@/lib/exam-analysis/commentary-presets';
import { getBlockDef } from './registry';
import { normalizeTemplate } from './resolve';

interface Props {
  value: CommentaryTemplateConfig;
  onChange: (next: CommentaryTemplateConfig) => void;
  /**
   * available() 판정용 — 데이터가 없는 블록은 비활성 표시.
   * 렌더가 받는 것과 **같은 입력**이어야 편집기의 "데이터 없음" 표시가 실제 결과와 일치한다.
   */
  input: BlockAvailabilityInput;
}

export function TemplateEditor({ value, onChange, input }: Props) {
  const config = normalizeTemplate(value);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const patchBlocks = (blocks: TemplateBlockConfig[]) => onChange({ ...config, blocks });

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= config.blocks.length) return;
    const next = [...config.blocks];
    next.splice(to, 0, next.splice(from, 1)[0]);
    patchBlocks(next);
  };

  const toggle = (idx: number) => {
    const next = [...config.blocks];
    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
    patchBlocks(next);
  };

  const setVariant = (idx: number, variant: string) => {
    const next = [...config.blocks];
    next[idx] = { ...next[idx], variant };
    patchBlocks(next);
  };

  const enabledCount = config.blocks.filter((b) => {
    const def = getBlockDef(b.id);
    return b.enabled && def?.available(input);
  }).length;

  // 지금 구성이 어떤 프리셋과 정확히 같은지 — 사용자가 "여기서 뭘 건드렸나"를 알 수 있게.
  // 저장된 id 를 믿지 않고 실제 구성을 비교하므로 항상 화면과 일치한다.
  // ⚠️ 양쪽 모두 normalizeTemplate 을 거쳐야 한다. config 는 정규화 결과(레지스트리 전 블록)인데
  //    presetToConfig 는 기본 템플릿 + 델타만 내므로, 정규화 없이 비교하면 블록 수부터 달라
  //    **어떤 프리셋도 영원히 '선택됨'으로 표시되지 않는다.**
  const configJson = JSON.stringify(config);
  const activePresetId =
    COMMENTARY_PRESETS.find((p) => JSON.stringify(normalizeTemplate(presetToConfig(p))) === configJson)?.id ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── 프리셋 — 레이아웃·테마·문체·블록 구성을 한 묶음으로 적용. 아래 축들의 상위 개념이라 맨 위. ── */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[13px] font-bold text-slate-900">
            프리셋 <span className="text-slate-400 font-medium">({COMMENTARY_PRESETS.length}종)</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            {activePresetId ? '아래 축을 바꾸면 해제됩니다' : '직접 구성 중'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {COMMENTARY_PRESETS.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(presetToConfig(preset))}
                title={preset.hint}
                className={`px-2.5 py-2 rounded-sm border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="flex items-baseline gap-1.5">
                  <span className={`text-[12px] font-bold ${active ? 'text-primary' : 'text-slate-800'}`}>
                    {preset.label}
                  </span>
                  <span className="text-[9px] text-slate-400 shrink-0">{AUDIENCE_LABELS[preset.audience]}</span>
                </span>
                <span className="block text-[9px] text-slate-400 leading-snug mt-0.5 truncate">{preset.hint}</span>
              </button>
            );
          })}
        </div>
      </section>
      {/* ── 레이아웃(골격) — 결과물 인상을 가장 크게 바꾸는 축이라 맨 위.
             25종이라 평면 나열이 불가능 → 그룹으로 묶는다. ── */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[13px] font-bold text-slate-900">
            레이아웃 <span className="text-slate-400 font-medium">({COMMENTARY_LAYOUTS.length}종)</span>
          </h4>
          <span className="text-[11px] text-slate-400">지면 골격·활자가 바뀝니다</span>
        </div>
        <div className="flex flex-col gap-3">
          {LAYOUT_GROUPS.map((group) => (
            <div key={group}>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-1.5">{group}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {COMMENTARY_LAYOUTS.filter((l) => l.group === group).map((layout) => {
                  const active = config.layoutId === layout.id;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => onChange({ ...config, layoutId: layout.id })}
                      title={`${layout.description}
${layout.traits}`}
                      className={`px-2.5 py-2 rounded-sm border text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className={`block text-[12px] font-bold ${active ? 'text-primary' : 'text-slate-800'}`}>
                        {layout.label}
                      </span>
                      <span className="block text-[9px] text-slate-400 leading-snug mt-0.5 truncate">
                        {layout.traits} · {VIZ_LABELS[layout.viz]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 문체 — 지면에 박히는 고정 문구(섹션 제목·안내문·작성자 표기) ── */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[13px] font-bold text-slate-900">문체</h4>
          <span className="text-[11px] text-slate-400">고정 문구가 바뀝니다</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COMMENTARY_COPIES.map((c) => {
            const active = config.copyId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange({ ...config, copyId: c.id })}
                title={c.description}
                className={`px-3 py-2.5 rounded-sm border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className={`block text-[12px] font-bold ${active ? 'text-primary' : 'text-slate-800'}`}>
                  {c.label}
                </span>
                <span className="block text-[10px] text-slate-400 leading-snug mt-0.5">{c.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 테마 ── */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[13px] font-bold text-slate-900">테마</h4>
          <span className="text-[11px] text-slate-400">색 팔레트만 바뀝니다</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COMMENTARY_THEMES.map((theme) => {
            const active = config.themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onChange({ ...config, themeId: theme.id })}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="flex shrink-0 rounded-sm overflow-hidden border border-slate-200">
                  {[theme.colors.surfaceDark, theme.colors.accent, theme.colors.gold].map((c, i) => (
                    <span key={i} style={{ background: c }} className="w-3 h-6 block" />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[12px] font-bold ${active ? 'text-primary' : 'text-slate-800'}`}>
                    {theme.label}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate">{theme.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 블록 ── */}
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[13px] font-bold text-slate-900">
            블록 <span className="text-slate-400 font-medium">({enabledCount}개 표시)</span>
          </h4>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_TEMPLATE)}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            기본값
          </button>
        </div>

        <ul className="flex flex-col gap-1">
          {config.blocks.map((bc, idx) => {
            const def = getBlockDef(bc.id);
            if (!def) return null;
            const hasData = def.available(input);
            const locked = !!def.locked;
            const dimmed = !hasData || !bc.enabled;
            const isDragOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;

            return (
              <li
                key={bc.id}
                draggable={!locked}
                onDragStart={() => !locked && setDragIdx(idx)}
                onDragOver={(e) => {
                  if (dragIdx === null || locked) return;
                  e.preventDefault();
                  setOverIdx(idx);
                }}
                onDragEnd={() => {
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdx !== null && !locked) move(dragIdx, idx);
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border bg-white transition-colors ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-slate-200'
                } ${dragIdx === idx ? 'opacity-40' : ''}`}
              >
                {/* 드래그 핸들 */}
                <span
                  className={`shrink-0 ${locked ? 'text-slate-200' : 'text-slate-300 cursor-grab active:cursor-grabbing'}`}
                  title={locked ? '고정 블록입니다' : '드래그해서 순서 변경'}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>

                {/* on/off */}
                <input
                  type="checkbox"
                  checked={bc.enabled && hasData}
                  disabled={locked || !hasData}
                  onChange={() => toggle(idx)}
                  className="shrink-0 w-3.5 h-3.5 accent-[#135bec] cursor-pointer disabled:cursor-not-allowed"
                  title={locked ? '끌 수 없는 블록입니다' : !hasData ? '이 분석본에 해당 데이터가 없습니다' : undefined}
                />

                {/* 라벨 */}
                <span className="min-w-0 flex-1">
                  <span className={`block text-[12px] font-bold truncate ${dimmed ? 'text-slate-400' : 'text-slate-800'}`}>
                    {def.label}
                    {locked && <span className="ml-1.5 text-[9px] font-medium text-slate-400">고정</span>}
                    {!hasData && <span className="ml-1.5 text-[9px] font-medium text-amber-600">데이터 없음</span>}
                  </span>
                  {def.description && (
                    <span className="block text-[10px] text-slate-400 truncate">{def.description}</span>
                  )}
                </span>

                {/* variant */}
                {def.variants.length > 1 && (
                  <select
                    value={bc.variant}
                    disabled={!hasData || !bc.enabled}
                    onChange={(e) => setVariant(idx, e.target.value)}
                    title={def.variants.find((v) => v.id === bc.variant)?.hint}
                    className="shrink-0 text-[11px] border border-slate-200 rounded-sm px-1.5 py-1 bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed max-w-[110px]"
                  >
                    {def.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* 순서 (드래그가 어려운 환경 대비) */}
                {!locked && (
                  <span className="shrink-0 flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(idx, idx - 1)}
                      disabled={idx === 0}
                      className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer leading-none"
                      title="위로"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, idx + 1)}
                      disabled={idx === config.blocks.length - 1}
                      className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer leading-none"
                      title="아래로"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** 편집기 하단 액션 (저장/취소) — 저장 주체는 부모가 결정 */
export function TemplateEditorActions({
  onSave,
  onCancel,
  saving,
  dirty,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  dirty?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-slate-200">
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
        취소
      </Button>
      <Button size="sm" onClick={onSave} loading={saving} disabled={!dirty}>
        저장
      </Button>
    </div>
  );
}
