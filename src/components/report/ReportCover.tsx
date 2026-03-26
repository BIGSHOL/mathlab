'use client';

interface ReportCoverProps {
  testTitle: string;
  studentName: string;
  studentGrade: number | null;
  testDate: string;
  questionCount: number;
  academyName: string;
}

function getGradeLabel(grade: number | null): string {
  if (!grade) return '';
  if (grade <= 6) return `초등 ${grade}학년`;
  if (grade <= 9) return `중${grade - 6}`;
  return `고${grade - 9}`;
}

export function ReportCover({
  testTitle,
  studentName,
  studentGrade,
  testDate,
  questionCount,
  academyName,
}: ReportCoverProps) {
  const gradeLabel = getGradeLabel(studentGrade);

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {/* Dot pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(19,91,236,0.03) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top decorative blur */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: 'rgba(19,91,236,0.05)',
          filter: 'blur(60px)',
          transform: 'translate(30%, -30%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'rgba(19,91,236,0.04)',
          filter: 'blur(80px)',
          transform: 'translate(-30%, 30%)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-12 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10" style={{ color: '#135bec' }}>
            <svg viewBox="0 0 48 48" fill="currentColor">
              <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 italic">Injaewon MathLAB</h2>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">AI Diagnostic Report</p>
          <p className="text-xs font-semibold text-slate-500">{testDate}</p>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 mx-12 mb-8">
        <div
          className="w-full rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #135bec 0%, #0e4bcc 100%)',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          } as React.CSSProperties}
        >
          <div className="flex flex-col items-center justify-center text-white text-center py-16 px-12">
            <div
              className="mb-4 inline-flex items-center px-5 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em]"
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
              } as React.CSSProperties}
            >
              Academic Analysis Report
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight leading-tight">
              레벨테스트 진단 보고서
            </h1>
            <div
              className="h-1 w-20 rounded-full mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.4)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
            />
            <p className="text-lg font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{testTitle}</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="relative z-10 flex-1 px-12 grid grid-cols-12 gap-6">
        {/* Left: Student Profile */}
        <div className="col-span-7">
          <div className="bg-white rounded-2xl p-8 border border-slate-100 h-full flex flex-col justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.15em] mb-3">Student Profile</p>
              <div className="flex items-baseline gap-3 mb-6">
                <h2 className="text-4xl font-black text-slate-900">{studentName}</h2>
                {gradeLabel && <span className="font-bold text-lg" style={{ color: '#135bec' }}>{gradeLabel}</span>}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold">평가 문항 수</p>
                  <p className="text-xl font-bold text-slate-800">{questionCount} 문항</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold">테스트 일자</p>
                  <p className="text-xl font-bold text-slate-800">{testDate}</p>
                </div>
              </div>
            </div>
            <div className="pt-5 border-t border-slate-100 flex items-center justify-between mt-6">
              <p className="text-xs text-slate-400 leading-tight font-medium">
                AI 기반 진단 분석 보고서
              </p>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">Injaewon MathLAB AI 분석 엔진</p>
                <p className="text-xs text-slate-400">Applied</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Badge Card */}
        <div className="col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 flex-1 flex flex-col items-center justify-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.15em] mb-4">Diagnostic Test</p>
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center mb-3"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(19,91,236,0.1) 0%, transparent 70%)',
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
              } as React.CSSProperties}
            >
              <div
                className="w-20 h-20 rounded-full border-4 flex items-center justify-center"
                style={{ borderColor: 'rgba(19,91,236,0.2)' }}
              >
                <span className="text-3xl font-black" style={{ color: '#135bec' }}>{questionCount}</span>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Questions</p>
          </div>

          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{
              backgroundColor: '#135bec',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            } as React.CSSProperties}
          >
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                학습 분석
              </p>
              <p className="font-bold text-lg mb-2 leading-tight">맞춤 진단 리포트</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {studentName} 학생 전용
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Note */}
      <div className="relative z-10 mx-12 mt-6 mb-8">
        <div
          className="rounded-sm p-5 border border-slate-100"
          style={{ backgroundColor: '#f8fafc', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
        >
          <p className="text-xs font-bold text-slate-800 mb-1">평가 안내</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            본 리포트는 Injaewon MathLAB AI 엔진이 분석한 &apos;{studentName}&apos; 학생의 수학 학습 수준을 바탕으로 작성되었습니다.
            영역별 역량 분석, 난이도별 성취도, 단원별 이해도를 종합적으로 진단하여 맞춤 학습 방향을 제시합니다.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-100 px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5" style={{ color: '#135bec' }}>
            <svg viewBox="0 0 48 48" fill="currentColor">
              <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" />
            </svg>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">{academyName}</span>
        </div>
        <p className="text-xs font-bold text-slate-300">© 2026 {academyName}. All rights reserved.</p>
      </footer>
    </div>
  );
}
