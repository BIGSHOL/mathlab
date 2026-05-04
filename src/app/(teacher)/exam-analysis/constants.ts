export const DIFF_LEVEL_LABELS: Record<number, string> = {
  1: '기본', 2: '표준', 3: '응용', 4: '심화', 5: '최고난도',
};

export const FORMAT_BADGE: Record<string, { label: string; cls: string }> = {
  objective: { label: '객관식', cls: 'bg-sky-100 text-sky-700' },
  short_answer: { label: '단답형', cls: 'bg-teal-100 text-teal-700' },
  essay: { label: '서술형', cls: 'bg-amber-100 text-amber-700' },
};
