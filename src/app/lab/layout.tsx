// 🚧 수학 랩실(Lab) 레이아웃 — 은닉 서브시스템 진입 게이트
//
// ⚠️ CLAUDE.md "최우선 하드 경계" 참조.
//   - (teacher) 레이아웃을 상속하지 않는 독립 세그먼트(/lab).
//   - 미인가 시 assertLabAccess()가 notFound()로 중단 → 일반 사용자에겐 404.
import { assertLabAccess } from '@/lib/lab/gate';

export const metadata = {
  title: 'Lab',
  robots: { index: false, follow: false },
};

export default async function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 게이트: 킬스위치 off · 비로그인 · SUPER_ADMIN 아님 → notFound()
  await assertLabAccess();

  // ⚠️ 루트 body가 overflow-hidden(LMS 셸 규약) → 자체 스크롤 컨테이너 필요(h-dvh + overflow-y-auto).
  return (
    <div className="h-dvh overflow-y-auto bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur px-6 py-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-0.5">
          내부
        </span>
        <span className="text-sm font-medium text-slate-700">수학 랩실 자동화</span>
        <span className="text-xs text-slate-400">— 은닉 개발 콘솔</span>
      </header>
      <main className="px-6 py-8 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
