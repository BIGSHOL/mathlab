import { A4PrintPage } from '@/components/print-preview';

interface Props {
  index: number;
  title: string;
  description?: string | null;
  accentColor: string;
}

/**
 * 챕터 구분 페이지 (한 챕터 시작 시 1페이지).
 * 큰 단원 번호 + 단원명만 적힌 분리 페이지로 책 느낌 강화.
 */
export function SectionDivider({ index, title, description, accentColor }: Props) {
  return (
    <A4PrintPage>
      <div className="h-full flex flex-col items-center justify-center px-12 text-center">
        <div className="text-sm font-medium text-slate-500 tracking-widest mb-3">
          CHAPTER
        </div>
        <div
          className="text-8xl font-extrabold mb-6 tabular-nums"
          style={{ color: accentColor }}
        >
          {String(index).padStart(2, '0')}
        </div>
        <div
          className="w-16 h-1 rounded-full mb-6"
          style={{ backgroundColor: accentColor }}
        />
        <h2 className="text-3xl font-bold text-slate-900 mb-4 leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-base text-slate-600 max-w-md leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </A4PrintPage>
  );
}
