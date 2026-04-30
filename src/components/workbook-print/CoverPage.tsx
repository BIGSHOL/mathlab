import { A4PrintPage } from '@/components/print-preview';

interface Props {
  title: string;
  subtitle?: string | null;
  studentLabel?: string | null;
  semesterLabel?: string | null;
  academyName?: string | null;
  ownerName?: string | null;
  accentColor: string;
}

/**
 * 워크북 표지 페이지 (1페이지).
 * 학원명, 책 제목, 학생 이름, 학기를 큰 활자로 표시.
 */
export function CoverPage({
  title,
  subtitle,
  studentLabel,
  semesterLabel,
  academyName,
  ownerName,
  accentColor,
}: Props) {
  return (
    <A4PrintPage paddingClass="">
      <div className="h-full flex flex-col items-center justify-between py-16 px-12">
        {/* 상단: 학원/원장 */}
        <div className="text-center">
          {academyName && (
            <div className="text-2xl font-bold text-slate-700 mb-1">{academyName}</div>
          )}
          {ownerName && (
            <div className="text-sm text-slate-500">{ownerName}</div>
          )}
        </div>

        {/* 중앙: 제목 */}
        <div className="text-center flex flex-col items-center gap-4">
          <div
            className="w-20 h-1.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xl text-slate-600 mt-2">{subtitle}</p>
          )}
          <div
            className="w-20 h-1.5 rounded-full mt-4"
            style={{ backgroundColor: accentColor }}
          />
        </div>

        {/* 하단: 학생/학기 */}
        <div className="text-center space-y-3">
          {studentLabel && (
            <div className="text-2xl font-bold text-slate-800">{studentLabel}</div>
          )}
          {semesterLabel && (
            <div className="text-base text-slate-500">{semesterLabel}</div>
          )}
        </div>
      </div>
    </A4PrintPage>
  );
}
