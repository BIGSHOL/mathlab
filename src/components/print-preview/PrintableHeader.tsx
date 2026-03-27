'use client';

/** 헤더 높이 상수 — 페이지네이션 알고리즘에서도 사용 */
export const HEADER_HEIGHT_FIRST = 150; // px — 첫 페이지 (모든 템플릿 동일)
export const HEADER_HEIGHT_OTHER = 28;  // px — 2페이지 이후 (모든 템플릿 동일)

interface PrintableHeaderProps {
  title: string;
  subtitle?: string;
  gradeBadge?: string;
  isFirstPage: boolean;
  totalScore?: number;
  problemCount?: number;
  pageInfo?: string;
  academyName?: string;
  accentColor?: string;
  variant?: 'default' | 'exam' | 'large' | 'minimal' | 'csat' | 'classic' | 'notebook' | 'formal' | 'bubble';
  showDate?: boolean;
}

export function PrintableHeader({
  title,
  subtitle,
  gradeBadge,
  isFirstPage,
  pageInfo,
  academyName = '인재원',
  accentColor = '#135bec',
  variant = 'exam',
  showDate = true,
}: PrintableHeaderProps) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  // ===== 2페이지 이후: 모든 템플릿 동일한 간소 헤더 =====
  if (!isFirstPage) {
    return (
      <div className="shrink-0 mb-1" style={{ height: `${HEADER_HEIGHT_OTHER}px` }}>
        <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: `${accentColor}30` }}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black tracking-tighter text-white px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: accentColor }}>MathLAB</span>
            <span className="text-[10px] font-bold text-slate-500 truncate">{title}</span>
          </div>
          {pageInfo && <span className="text-[10px] font-bold text-slate-400 shrink-0">{pageInfo}</span>}
        </div>
      </div>
    );
  }

  // ===== 첫 페이지: 디자인은 다르지만 높이는 통일 =====
  return (
    <div className="shrink-0 overflow-hidden" style={{ height: `${HEADER_HEIGHT_FIRST}px` }}>
      {variant === 'exam' ? (
        <ExamHeader title={title} subtitle={subtitle} gradeBadge={gradeBadge} dateStr={dateStr} showDate={showDate} accentColor={accentColor} academyName={academyName} pageInfo={pageInfo} />
      ) : variant === 'minimal' ? (
        <MinimalHeader title={title} subtitle={subtitle} gradeBadge={gradeBadge} dateStr={dateStr} showDate={showDate} accentColor={accentColor} />
      ) : variant === 'csat' ? (
        <CsatHeader title={title} subtitle={subtitle} gradeBadge={gradeBadge} dateStr={dateStr} showDate={showDate} accentColor={accentColor} academyName={academyName} />
      ) : variant === 'classic' ? (
        <ClassicHeader title={title} subtitle={subtitle} gradeBadge={gradeBadge} dateStr={dateStr} showDate={showDate} accentColor={accentColor} academyName={academyName} />
      ) : variant === 'notebook' ? (
        <NotebookHeader title={title} subtitle={subtitle} gradeBadge={gradeBadge} dateStr={dateStr} showDate={showDate} accentColor={accentColor} />
      ) : variant === 'formal' ? (
        <FormalHeader title={title} subtitle={subtitle} gradeBadge={gradeBadge} dateStr={dateStr} showDate={showDate} accentColor={accentColor} academyName={academyName} />
      ) : variant === 'bubble' ? (
        <BubbleHeader title={title} subtitle={subtitle} gradeBadge={gradeBadge} dateStr={dateStr} showDate={showDate} accentColor={accentColor} academyName={academyName} />
      ) : (
        <DefaultHeader title={title} subtitle={subtitle} gradeBadge={gradeBadge} dateStr={dateStr} showDate={showDate} accentColor={accentColor} academyName={academyName} />
      )}
    </div>
  );
}

// --- EXAM (모의고사) ---
function ExamHeader({ title, subtitle, gradeBadge, dateStr, showDate, accentColor, academyName, pageInfo }: {
  title: string; subtitle?: string; gradeBadge?: string; dateStr: string; showDate: boolean; accentColor: string; academyName: string; pageInfo?: string;
}) {
  return (
    <div className="font-sans h-full flex flex-col">
      {/* 최상단 라인 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[9px] font-black tracking-tighter text-white px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: accentColor }}>MathLAB EXAM</span>
          <span className="text-[9px] font-bold text-slate-400 tracking-tight uppercase">{academyName} Education System</span>
        </div>
        {pageInfo && <span className="text-[9px] font-bold text-slate-400">{pageInfo}</span>}
      </div>

      {/* 메인 헤더 박스 */}
      <div className="border-[1.5px] border-slate-800 overflow-hidden rounded-sm flex-1 flex flex-col">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 px-3 py-1.5 border-r-[1.5px] border-slate-800 flex flex-col justify-center bg-slate-50/50">
            <div className="flex items-center gap-2 mb-1">
              {gradeBadge && (
                <span className="bg-white border rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ color: accentColor, borderColor: accentColor }}>{gradeBadge}</span>
              )}
              {showDate && <span className="text-[10px] font-bold text-slate-500">{dateStr} 평가</span>}
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{title}</h1>
            {subtitle && <p className="text-[11px] text-slate-600 font-semibold mt-1">{subtitle}</p>}
          </div>
          <div className="w-24 flex flex-col items-center justify-center p-2 bg-white">
            <span className="text-[9px] font-bold text-slate-400 italic">SCORE</span>
          </div>
        </div>

        {/* 학생 정보 */}
        <div className="flex shrink-0 border-t-[1.5px] border-slate-800 bg-white">
          <div className="flex-1 flex border-r-[1.5px] border-slate-800">
            <div className="w-14 bg-slate-50 border-r border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">반/번호</div>
            <div className="flex-1 px-2 py-1.5 text-xs text-slate-300 font-light">Class / No.</div>
          </div>
          <div className="flex-[1.2] flex">
            <div className="w-14 bg-slate-50 border-r border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">성 명</div>
            <div className="flex-1 px-2 py-1.5 text-xs text-slate-300 font-light italic">Student Name</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- DEFAULT (기본형) / LARGE (초등확대) ---
function DefaultHeader({ title, subtitle, gradeBadge, dateStr, showDate, accentColor, academyName }: {
  title: string; subtitle?: string; gradeBadge?: string; dateStr: string; showDate: boolean; accentColor: string; academyName: string;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* 타이틀 바 */}
      <div className="flex justify-between items-start border-b-2 pb-2" style={{ borderColor: accentColor }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {gradeBadge && (
              <span className="text-white text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: accentColor }}>{gradeBadge}</span>
            )}
            <h1 className="text-lg font-black text-slate-800 tracking-tight">{title}</h1>
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] font-bold tracking-widest text-slate-400 mb-0.5">INJAEWON MathLAB</div>
          <div className="text-xs font-bold text-slate-800">{academyName}</div>
        </div>
      </div>

      {/* 학생 정보 + 날짜 */}
      <div className="flex items-center gap-4 mt-2 pt-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">반/번호</span>
          <div className="w-24 border-b border-slate-300" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">이름</span>
          <div className="w-28 border-b border-slate-300" />
        </div>
        {showDate && (
          <div className="ml-auto text-[11px] text-slate-400 font-medium">{dateStr}</div>
        )}
      </div>
    </div>
  );
}

// --- MINIMAL (미니멀) ---
function MinimalHeader({ title, subtitle, gradeBadge, dateStr, showDate, accentColor }: {
  title: string; subtitle?: string; gradeBadge?: string; dateStr: string; showDate: boolean; accentColor: string;
}) {
  return (
    <div className="h-full flex flex-col justify-end pb-2">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extralight text-slate-900 tracking-tight leading-none">{title}</h1>
          <div className="flex items-center gap-3 mt-2">
            {gradeBadge && <span className="text-[10px] font-medium text-slate-400">{gradeBadge}</span>}
            {subtitle && <span className="text-[10px] text-slate-400">{subtitle}</span>}
            {showDate && <span className="text-[10px] text-slate-300">{dateStr}</span>}
          </div>
        </div>
        <div className="flex items-center gap-6 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">이름</span>
            <div className="w-32 border-b border-slate-200" />
          </div>
        </div>
      </div>
      <div className="mt-3 h-px" style={{ backgroundColor: `${accentColor}25` }} />
    </div>
  );
}

// --- CSAT (수능형) ---
function CsatHeader({ title, subtitle, gradeBadge, dateStr, showDate, accentColor, academyName }: {
  title: string; subtitle?: string; gradeBadge?: string; dateStr: string; showDate: boolean; accentColor: string; academyName: string;
}) {
  return (
    <div className="h-full flex flex-col font-sans">
      {/* 수능 스타일 상단 바 */}
      <div className="h-1.5 rounded-full mb-3" style={{ backgroundColor: accentColor }} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {showDate && <span className="text-[10px] font-bold text-slate-400">{dateStr}</span>}
            <span className="text-[10px] font-bold text-slate-400">{academyName}</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {gradeBadge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm border" style={{ color: accentColor, borderColor: `${accentColor}40` }}>{gradeBadge}</span>}
            {subtitle && <span className="text-[11px] text-slate-500 font-medium">{subtitle}</span>}
          </div>
        </div>

        {/* 수능 스타일 답안 마킹 안내 */}
        <div className="shrink-0 border border-slate-300 rounded-sm p-2 text-center bg-slate-50/50">
          <div className="text-[8px] font-bold text-slate-400 tracking-wider mb-1">성명 / 수험번호</div>
          <div className="flex gap-2">
            <div className="w-20 h-5 border-b border-slate-300" />
            <div className="w-16 h-5 border-b border-slate-300" />
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-2 border-t border-slate-200 text-[8px] text-slate-400">
        <span className="font-bold">유의사항</span>
        <span>문항에 따라 배점이 다르니, 각 물음의 끝에 표시된 배점을 참고하시오.</span>
      </div>
    </div>
  );
}

// --- CLASSIC (클래식) ---
function ClassicHeader({ title, subtitle, gradeBadge, dateStr, showDate, accentColor, academyName }: {
  title: string; subtitle?: string; gradeBadge?: string; dateStr: string; showDate: boolean; accentColor: string; academyName: string;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* 이중 테두리 헤더 */}
      <div className="border-2 p-0.5 flex-1 flex flex-col" style={{ borderColor: accentColor }}>
        <div className="border p-3 flex-1 flex flex-col" style={{ borderColor: `${accentColor}60` }}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-500">{academyName}</div>
            {showDate && <div className="text-[10px] text-slate-400">{dateStr}</div>}
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-tight" style={{ color: accentColor }}>{title}</h1>
              <div className="flex items-center justify-center gap-3 mt-1">
                {gradeBadge && <span className="text-[11px] font-bold text-slate-500">{gradeBadge}</span>}
                {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 학생 정보 기입란 */}
      <div className="flex items-center gap-6 mt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-600 border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `${accentColor}40` }}>반</span>
          <div className="w-16 border-b border-slate-300" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-600 border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `${accentColor}40` }}>번호</span>
          <div className="w-16 border-b border-slate-300" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-600 border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `${accentColor}40` }}>이름</span>
          <div className="w-24 border-b border-slate-300" />
        </div>
        <div className="ml-auto text-[10px] font-bold text-slate-400 italic">/ 100</div>
      </div>
    </div>
  );
}

// --- NOTEBOOK (노트형) ---
function NotebookHeader({ title, subtitle, gradeBadge, dateStr, showDate, accentColor }: {
  title: string; subtitle?: string; gradeBadge?: string; dateStr: string; showDate: boolean; accentColor: string;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* 노트 상단: 펀치홀 장식 + 줄 */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
        <div className="flex-1 border-b border-slate-200" />
      </div>

      <div className="flex items-start justify-between flex-1">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            {gradeBadge && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{gradeBadge}</span>}
            {subtitle && <span className="text-[10px] text-slate-400">{subtitle}</span>}
          </div>
        </div>
        {showDate && <span className="text-[10px] text-slate-400 mt-1">{dateStr}</span>}
      </div>

      {/* 학생 정보 - 노트 줄 스타일 */}
      <div className="flex items-center gap-4 mt-auto pt-1">
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="font-bold text-slate-500">이름</span>
          <div className="w-28 border-b-2 border-dashed" style={{ borderColor: `${accentColor}40` }} />
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="font-bold text-slate-500">반</span>
          <div className="w-16 border-b-2 border-dashed" style={{ borderColor: `${accentColor}40` }} />
        </div>
      </div>
      <div className="mt-2 h-px bg-slate-200" />
    </div>
  );
}

// --- FORMAL (공문서형) ---
function FormalHeader({ title, subtitle, gradeBadge, dateStr, showDate, accentColor: _accentColor, academyName }: {
  title: string; subtitle?: string; gradeBadge?: string; dateStr: string; showDate: boolean; accentColor: string; academyName: string;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* 상단 가로선 */}
      <div className="h-[3px] bg-slate-800 mb-1" />
      <div className="h-[1px] bg-slate-400 mb-3" />

      <div className="flex items-start justify-between flex-1">
        <div>
          <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">{academyName}</div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {gradeBadge && <span className="text-[10px] font-bold text-slate-600">[{gradeBadge}]</span>}
            {subtitle && <span className="text-[10px] text-slate-500">{subtitle}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          {showDate && <div className="text-[10px] text-slate-500">{dateStr}</div>}
          <div className="text-[9px] text-slate-400 mt-0.5">문서번호: ML-{dateStr.replace(/\./g, '')}</div>
        </div>
      </div>

      {/* 학생 정보 - 격식체 */}
      <div className="mt-auto pt-2 border-t border-slate-300">
        <div className="flex items-center gap-6 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-700">소속</span>
            <div className="w-20 border-b border-slate-300" />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-700">성명</span>
            <div className="w-24 border-b border-slate-300" />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-700">번호</span>
            <div className="w-12 border-b border-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- BUBBLE (버블형) ---
function BubbleHeader({ title, subtitle, gradeBadge, dateStr, showDate, accentColor, academyName }: {
  title: string; subtitle?: string; gradeBadge?: string; dateStr: string; showDate: boolean; accentColor: string; academyName: string;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* 상단 컬러 버블 장식 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor, opacity: 0.3 }} />
        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: accentColor, opacity: 0.15 }} />
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor, opacity: 0.4 }} />
        <div className="flex-1" />
        <span className="text-[9px] font-bold text-slate-400">{academyName}</span>
      </div>

      {/* 메인 타이틀 */}
      <div className="flex items-start justify-between flex-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-1.5" style={{ backgroundColor: `${accentColor}10` }}>
            {gradeBadge && <span className="text-[10px] font-bold" style={{ color: accentColor }}>{gradeBadge}</span>}
            {showDate && <span className="text-[10px] text-slate-400">{dateStr}</span>}
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* 학생 정보 - 버블 스타일 */}
      <div className="mt-auto flex items-center gap-3 pt-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px]" style={{ borderColor: `${accentColor}30` }}>
          <span className="font-bold text-slate-500">이름</span>
          <div className="w-24 border-b border-slate-200" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px]" style={{ borderColor: `${accentColor}30` }}>
          <span className="font-bold text-slate-500">반/번호</span>
          <div className="w-16 border-b border-slate-200" />
        </div>
      </div>
    </div>
  );
}
