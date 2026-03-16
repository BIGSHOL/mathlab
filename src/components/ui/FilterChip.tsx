'use client';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/** 필터 칩 버튼 — 활성/비활성 토글 스타일 */
export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

interface ToggleGroupOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ToggleGroupOption<T>[];
}

/** 토글 그룹 — 여러 FilterChip 중 하나 선택 */
export function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: ToggleGroupProps<T>) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}
