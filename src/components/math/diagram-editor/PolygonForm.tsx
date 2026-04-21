'use client';

/**
 * 다각형(polygon) 편집 폼 — 계단, L자, T자, ㄷ자, 집 모양 등 임의 N각형
 *
 * 지원 필드:
 * - vertices (꼭짓점 리스트)
 * - rightAngleMarks (꼭짓점별 직각 표시)
 * - fill (단색 채움)
 * - showLengths (변 라벨)
 * - splitLines (분할선/보조선)
 * - regions (영역 분할 + ①② 라벨)
 *
 * + 프리셋 버튼: 2/3/4단 계단, L자, T자, ㄷ자, 집 모양 (클릭 시 vertices 자동 주입)
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps, Point2DInput } from './types';
import { PointListEditor, NumInput, ShapeStyleFields } from './SharedControls';

const POLYGON_PRESETS: { name: string; params: Record<string, unknown> }[] = [
  {
    name: '2단 계단',
    params: {
      vertices: [{ x: 0, y: 120 }, { x: 200, y: 120 }, { x: 200, y: 60 }, { x: 100, y: 60 }, { x: 100, y: 0 }, { x: 0, y: 0 }],
      rightAngleMarks: [0, 1, 2, 3, 4, 5],
      fill: '#A7F3D0',
    },
  },
  {
    name: '3단 계단',
    params: {
      vertices: [{ x: 0, y: 180 }, { x: 240, y: 180 }, { x: 240, y: 120 }, { x: 160, y: 120 }, { x: 160, y: 60 }, { x: 80, y: 60 }, { x: 80, y: 0 }, { x: 0, y: 0 }],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7],
      fill: '#FDE68A',
    },
  },
  {
    name: '4단 계단',
    params: {
      vertices: [{ x: 0, y: 240 }, { x: 240, y: 240 }, { x: 240, y: 180 }, { x: 180, y: 180 }, { x: 180, y: 120 }, { x: 120, y: 120 }, { x: 120, y: 60 }, { x: 60, y: 60 }, { x: 60, y: 0 }, { x: 0, y: 0 }],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      fill: '#BFDBFE',
    },
  },
  {
    name: 'L자',
    params: {
      vertices: [{ x: 0, y: 120 }, { x: 200, y: 120 }, { x: 200, y: 60 }, { x: 80, y: 60 }, { x: 80, y: 0 }, { x: 0, y: 0 }],
      rightAngleMarks: [0, 1, 2, 3, 4, 5],
      fill: '#DBEAFE',
    },
  },
  {
    name: 'T자',
    params: {
      vertices: [{ x: 0, y: 60 }, { x: 200, y: 60 }, { x: 200, y: 120 }, { x: 120, y: 120 }, { x: 120, y: 200 }, { x: 80, y: 200 }, { x: 80, y: 120 }, { x: 0, y: 120 }],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7],
      fill: '#FCE7F3',
    },
  },
  {
    name: 'ㄷ자',
    params: {
      vertices: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 140, y: 200 }, { x: 140, y: 60 }, { x: 60, y: 60 }, { x: 60, y: 200 }, { x: 0, y: 200 }],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7],
      fill: '#FEF3C7',
    },
  },
  {
    name: '집 모양',
    params: {
      // 지붕 꼭짓점(2,3,4)은 90°가 아니므로 직각 표시하지 않음 (바닥 두 모서리만 직각)
      vertices: [{ x: 0, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 80 }, { x: 100, y: 0 }, { x: 0, y: 80 }],
      rightAngleMarks: [0, 1],
      fill: '#E0E0F0',
    },
  },
];

type ShowLength = {
  edge: [number, number];
  value: string;
  curve?: boolean | { inflate?: number; dashArray?: string; color?: string };
};
type SplitLine = { from: number; to: number; style?: string; color?: string };
type Region = { vertexIndices: number[]; fill?: string; label?: string };

/**
 * 쉼표 구분 정수 배열 입력 — trailing comma / 공백을 허용하여 타이핑 도중 쉼표가 삭제되는 현상 방지
 * (기존 `value={arr.join(',')}` 방식은 "0,1,2," 입력 시 마지막 쉼표가 즉시 사라지는 버그가 있음)
 */
function IndexListInput({
  value,
  onChange,
  placeholder,
  className,
  title,
}: {
  value: number[];
  onChange: (nums: number[]) => void;
  placeholder?: string;
  className?: string;
  title?: string;
}) {
  const [raw, setRaw] = React.useState<string>(() => value.join(','));

  // 외부에서 값이 바뀌면 (프리셋 적용, 삭제 등) raw 동기화.
  // 단, 사용자가 타이핑 중이면 (raw를 파싱한 결과가 value와 같으면) 건드리지 않음.
  React.useEffect(() => {
    const parsed = raw
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
    const same =
      parsed.length === value.length && parsed.every((n, i) => n === value[i]);
    if (!same) setRaw(value.join(','));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      value={raw}
      onChange={(e) => {
        const v = e.target.value;
        setRaw(v);
        const nums = v
          .split(',')
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n));
        onChange(nums);
      }}
      className={className}
      placeholder={placeholder}
      title={title}
    />
  );
}

export function PolygonForm({ params, onChange }: SubFormProps) {
  const vertices = Array.isArray(params.vertices) ? (params.vertices as Point2DInput[]) : [];
  const rightAngleMarks = Array.isArray(params.rightAngleMarks) ? (params.rightAngleMarks as number[]) : [];
  const showLengths = Array.isArray(params.showLengths) ? (params.showLengths as ShowLength[]) : [];
  const splitLines = Array.isArray(params.splitLines) ? (params.splitLines as SplitLine[]) : [];
  const regions = Array.isArray(params.regions) ? (params.regions as Region[]) : [];

  const applyPreset = (p: typeof POLYGON_PRESETS[number]) => {
    // 프리셋 적용 시 vertices + rightAngleMarks + fill만 바꾸고 나머지 필드는 초기화
    onChange({
      vertices: p.params.vertices,
      rightAngleMarks: p.params.rightAngleMarks,
      fill: p.params.fill,
      showLengths: [],
      regions: [],
      splitLines: [],
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-500">프리셋 (클릭 → 좌표 자동 설정)</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {POLYGON_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-2 py-0.5 text-xs border border-slate-200 rounded hover:bg-slate-50 hover:border-primary transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <PointListEditor
        points={vertices}
        onChange={(pts) => onChange({ vertices: pts })}
        label={`꼭짓점 (${vertices.length}개)`}
      />

      <div>
        <label className="text-xs text-slate-500">직각 표시할 꼭짓점 (인덱스, 쉼표 구분)</label>
        <IndexListInput
          value={rightAngleMarks}
          onChange={(nums) => onChange({ rightAngleMarks: nums })}
          className="block w-full text-sm px-2 py-1 border border-slate-300 rounded"
          placeholder="0,1,2,3,4,5"
          title="볼록 꼭짓점만 렌더됩니다 (오목 꼭짓점은 자동 스킵)"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500">채움 색 (비우면 투명)</label>
          <input
            type="text"
            value={String(params.fill ?? '')}
            onChange={(e) => onChange({ fill: e.target.value || undefined })}
            className="block w-full text-sm px-2 py-1 border border-slate-300 rounded"
            placeholder="#A7F3D0"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">선 색상 (비우면 기본)</label>
          <input
            type="text"
            value={String(params.strokeColor ?? '')}
            onChange={(e) => onChange({ strokeColor: e.target.value || undefined })}
            className="block w-full text-sm px-2 py-1 border border-slate-300 rounded"
            placeholder="#3B82F6"
          />
        </div>
      </div>

      <ShapeStyleFields params={params} onChange={onChange} />

      {/* 변 라벨 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">변 라벨 ({showLengths.length}개)</label>
          <button
            type="button"
            className="text-xs text-primary hover:text-primary/70"
            onClick={() => onChange({ showLengths: [...showLengths, { edge: [0, 1], value: '' }] })}
          >
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {showLengths.map((s, i) => {
          const maxIdx = Math.max(0, vertices.length - 1);
          const _clampIdx = (n: number) => Math.max(0, Math.min(maxIdx, Number.isFinite(n) ? n : 0));
          void _clampIdx;
          return (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <NumInput
              min={0}
              max={maxIdx}
              value={s.edge[0]}
              onChange={(v) => {
                const arr = [...showLengths];
                arr[i] = { ...s, edge: [v, s.edge[1]] };
                onChange({ showLengths: arr });
              }}
              className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded"
              title={`from (0~${maxIdx})`}
            />
            <span className="text-xs">→</span>
            <NumInput
              min={0}
              max={maxIdx}
              value={s.edge[1]}
              onChange={(v) => {
                const arr = [...showLengths];
                arr[i] = { ...s, edge: [s.edge[0], v] };
                onChange({ showLengths: arr });
              }}
              className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded"
              title={`to (0~${maxIdx})`}
            />
            <input
              type="text"
              value={s.value}
              onChange={(e) => {
                const arr = [...showLengths];
                arr[i] = { ...s, value: e.target.value };
                onChange({ showLengths: arr });
              }}
              className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded"
              placeholder="a, b, 5, x+1, $\\frac{a}{2}$ 등 (변수는 자동 italic)"
              title="숫자 또는 변수/수식. 변수 입력 시 자동으로 italic 렌더. $...$ 로 명시적 KaTeX도 가능"
            />
            <label
              className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap cursor-pointer"
              title="변을 감싸는 점선 호(측정 표기법) 표시"
            >
              <input
                type="checkbox"
                checked={!!s.curve}
                onChange={(e) => {
                  const arr = [...showLengths];
                  arr[i] = { ...s, curve: e.target.checked || undefined };
                  onChange({ showLengths: arr });
                }}
                className="w-3 h-3"
              />
              호
            </label>
            <button
              type="button"
              onClick={() => onChange({ showLengths: showLengths.filter((_, j) => j !== i) })}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          );
        })}
      </div>

      {/* 분할선 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">분할선 / 보조선 ({splitLines.length}개)</label>
          <button
            type="button"
            className="text-xs text-primary hover:text-primary/70"
            onClick={() => onChange({ splitLines: [...splitLines, { from: 0, to: 2, style: 'dashed' }] })}
          >
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {splitLines.map((sl, i) => {
          const maxIdx = Math.max(0, vertices.length - 1);
          const _clampIdx = (n: number) => Math.max(0, Math.min(maxIdx, Number.isFinite(n) ? n : 0));
          void _clampIdx;
          return (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <NumInput
              min={0}
              max={maxIdx}
              value={sl.from}
              onChange={(v) => {
                const arr = [...splitLines];
                arr[i] = { ...sl, from: v };
                onChange({ splitLines: arr });
              }}
              className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded"
              title={`from (0~${maxIdx})`}
            />
            <span className="text-xs">→</span>
            <NumInput
              min={0}
              max={maxIdx}
              value={sl.to}
              onChange={(v) => {
                const arr = [...splitLines];
                arr[i] = { ...sl, to: v };
                onChange({ splitLines: arr });
              }}
              className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded"
              title={`to (0~${maxIdx})`}
            />
            <select
              value={sl.style || 'solid'}
              onChange={(e) => {
                const arr = [...splitLines];
                arr[i] = { ...sl, style: e.target.value };
                onChange({ splitLines: arr });
              }}
              className="text-xs px-1 py-0.5 border border-slate-300 rounded"
            >
              <option value="solid">실선</option>
              <option value="dashed">점선</option>
            </select>
            <button
              type="button"
              onClick={() => onChange({ splitLines: splitLines.filter((_, j) => j !== i) })}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          );
        })}
      </div>

      {/* 영역 분할 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">영역 분할 ({regions.length}개)</label>
          <button
            type="button"
            className="text-xs text-primary hover:text-primary/70"
            onClick={() => onChange({ regions: [...regions, { vertexIndices: [], fill: '#DBEAFE', label: '' }] })}
          >
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {regions.map((r, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <IndexListInput
              value={r.vertexIndices ?? []}
              onChange={(nums) => {
                const arr = [...regions];
                arr[i] = { ...r, vertexIndices: nums };
                onChange({ regions: arr });
              }}
              className="flex-1 text-xs px-1 py-0.5 border border-slate-300 rounded"
              placeholder="0,1,2,3"
              title="꼭짓점 인덱스 (쉼표 구분)"
            />
            <input
              type="text"
              value={r.fill || ''}
              onChange={(e) => {
                const arr = [...regions];
                arr[i] = { ...r, fill: e.target.value };
                onChange({ regions: arr });
              }}
              className="w-20 text-xs px-1 py-0.5 border border-slate-300 rounded"
              placeholder="#..."
              title="fill"
            />
            <input
              type="text"
              value={r.label || ''}
              onChange={(e) => {
                const arr = [...regions];
                arr[i] = { ...r, label: e.target.value };
                onChange({ regions: arr });
              }}
              className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded"
              placeholder="①"
              title="label"
            />
            <button
              type="button"
              onClick={() => onChange({ regions: regions.filter((_, j) => j !== i) })}
              className="text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
