'use client';

interface PrintableHeaderProps {
  /** 문서 제목: "연산 연습 문제", "중3 계통도 레벨테스트" */
  title: string;
  /** 부제목: "덧셈(한 자리)", "25문제 · 40분" */
  subtitle?: string;
  /** 학년 배지: "초3", "중1" */
  gradeBadge?: string;
  /** 첫 페이지 여부 (학생 정보란 표시) */
  isFirstPage: boolean;
  /** 점수 입력란의 "/ N" */
  totalScore?: number;
  /** 문제 수 표시 */
  problemCount?: number;
  /** 페이지 번호 (이후 페이지) */
  pageInfo?: string;
  /** 학원명 */
  academyName?: string;
  /** 악센트 색상 (나중에 테마 확장) */
  accentColor?: string;
}

/** 인쇄용 시험지/학습지 공통 헤더 */
export function PrintableHeader({
  title,
  subtitle,
  gradeBadge,
  isFirstPage,
  totalScore,
  problemCount,
  pageInfo: _pageInfo,
  academyName = '인재원',
  accentColor = '#135bec',
}: PrintableHeaderProps) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="shrink-0 mb-3">
      {/* 상단 악센트 바 */}
      <div
        className="h-1 rounded-full mb-3"
        style={{ backgroundColor: accentColor, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
      />

      {/* 메인 헤더 */}
      <div className="flex items-start justify-between mb-2">
        {/* 좌측: 배지 + 제목 */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {gradeBadge && (
              <span
                className="text-xs font-bold text-white px-1.5 py-0.5 rounded leading-none"
                style={{ backgroundColor: accentColor, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
              >
                {gradeBadge}
              </span>
            )}
            <h2 className="text-base font-black text-slate-800 tracking-tight leading-none">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 leading-none mt-1 ml-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* 우측: 브랜드 + 학원명 */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="shrink-0">
              <path
                d="M16 4l3.09 9.5h9.99l-8.09 5.88 3.09 9.5L16 22.99l-8.09 5.88 3.09-9.5L2.91 13.5h9.99z"
                fill={accentColor}
              />
            </svg>
            <span className="text-xs font-black tracking-tight leading-none" style={{ color: accentColor }}>
              Injaewon MathLAB
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500 leading-none">
            {academyName}
          </span>
        </div>
      </div>

      {/* 구분선 */}
      <div
        className="h-0.5 mb-2"
        style={{ backgroundColor: accentColor, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
      />

      {/* 학생 정보란 (첫 페이지만) */}
      {isFirstPage ? (
        <div className="flex items-center justify-between text-xs text-slate-600 leading-none">
          <div className="flex items-center gap-4">
            <span>{dateStr}</span>
            {problemCount != null && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-medium">{problemCount}문제</span>
              </>
            )}
            {totalScore != null && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-medium">{totalScore}점</span>
              </>
            )}
          </div>
          <span className="flex items-baseline gap-1">
            이름:
            <span
              className="inline-block w-28 border-b"
              style={{ borderColor: accentColor }}
            />
          </span>
        </div>
      ) : (
        <div className="h-[14px]" />
      )}
    </div>
  );
}
