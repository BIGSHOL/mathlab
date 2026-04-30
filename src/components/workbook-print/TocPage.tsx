import { A4PrintPage } from '@/components/print-preview';

interface TocEntry {
  sectionId: string;
  title: string;
  pageNumber: number;
}

interface Props {
  entries: TocEntry[];
  accentColor: string;
}

/**
 * 목차 본문 — A4 래퍼 없이 내용만 (미리보기/인쇄 공유).
 */
export function TocPageContent({ entries, accentColor }: Props) {
  return (
    <div className="h-full">
      <div className="flex items-center gap-4 mb-8 pb-4 border-b-2" style={{ borderColor: accentColor }}>
        <div
          className="w-1.5 h-8 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <h2 className="text-3xl font-extrabold text-slate-900">목차</h2>
      </div>

      <ol className="space-y-3">
        {entries.map((entry, idx) => (
          <li key={entry.sectionId} className="flex items-baseline gap-3">
            <span
              className="font-bold text-base shrink-0 w-8 text-center"
              style={{ color: accentColor }}
            >
              {idx + 1}.
            </span>
            <span className="font-medium text-slate-800 flex-1 truncate">
              {entry.title}
            </span>
            <span className="border-b border-dotted border-slate-300 flex-1 mb-1" aria-hidden />
            <span className="text-slate-600 shrink-0 tabular-nums">
              {entry.pageNumber}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * 목차 페이지 (인쇄용 wrapper).
 */
export function TocPage(props: Props) {
  return (
    <A4PrintPage>
      <TocPageContent {...props} />
    </A4PrintPage>
  );
}
