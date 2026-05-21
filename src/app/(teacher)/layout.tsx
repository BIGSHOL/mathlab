import { Sidebar } from '@/components/layout/Sidebar';
import { TeacherBottomNav } from '@/components/layout/TeacherBottomNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ToastContainer } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DemoGuideBar } from '@/components/demo/DemoGuideBar';
import { getCurrentUser } from '@/lib/auth';
import { isDemoUser } from '@/lib/demo';
import { resolveCurrentTenant } from '@/lib/tenant';
import { TenantProvider } from '@/components/providers/TenantProvider';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // TEACHER 이상만 접근 (STUDENT는 학생 대시보드로)
  if (user.role === 'STUDENT') redirect('/dashboard');

  const tenant = await resolveCurrentTenant();
  const isDemo = isDemoUser(user);

  // 기출분석 전용 모드: 사이드바/하단 내비/커맨드 팔레트 숨김
  // 두 가지 조건 중 하나라도 참이면 활성화:
  //   1) 외부 사용자 — exam_analysis_bypass 쿠키 보유
  //   2) 기출분석 전용 계정 — username이 csganga* 패턴 (본인 브라우저 테스트 포함)
  const cookieStore = await cookies();
  const hasBypassCookie = !!cookieStore.get('exam_analysis_bypass')?.value;
  const isExamOnlyAccount = /^csganga\d+$/i.test(user.username ?? '');
  const examOnlyMode = hasBypassCookie || isExamOnlyAccount;

  return (
    <TenantProvider tenant={tenant}>
      <div className={`h-screen flex bg-background overflow-hidden print:h-auto print:overflow-visible print:bg-white ${isDemo ? 'pt-10' : ''}`}>
        {isDemo && <DemoGuideBar />}
        {!examOnlyMode && <Sidebar />}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-14 md:pb-0 print:overflow-visible">{children}</main>
        {!examOnlyMode && <TeacherBottomNav />}
        {!examOnlyMode && <CommandPalette />}
        <ToastContainer />
        <ConfirmDialog />
      </div>
    </TenantProvider>
  );
}
