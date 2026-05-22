import { Sidebar } from '@/components/layout/Sidebar';
import { TeacherBottomNav } from '@/components/layout/TeacherBottomNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ExamOnlyTopBar } from '@/components/layout/ExamOnlyTopBar';
import { ToastContainer } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DemoGuideBar } from '@/components/demo/DemoGuideBar';
import { getCurrentUser } from '@/lib/auth';
import { isDemoUser } from '@/lib/demo';
import { resolveCurrentTenant } from '@/lib/tenant';
import { TenantProvider } from '@/components/providers/TenantProvider';
import { redirect } from 'next/navigation';

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
  // 계정(username)이 csganga* 또는 injaewon일 때만 활성화.
  // ⚠️ exam_analysis_bypass 쿠키 기반 판정은 쓰지 않는다 — 본인이 외부 사용자
  //    테스트로 시크릿 URL을 한 번 방문하면 쿠키가 30일 박혀, 이후 본인 계정으로
  //    로그인해도 사이드바가 사라지는 문제가 있었음. 외부 사용자는 어차피
  //    csganga*/injaewon 계정으로만 로그인하므로 username 판정으로 충분.
  const username = user.username ?? '';
  const examOnlyMode = /^csganga\d+$/i.test(username) || username === 'injaewon';

  return (
    <TenantProvider tenant={tenant}>
      <div className={`h-screen flex bg-background overflow-hidden print:h-auto print:overflow-visible print:bg-white ${isDemo ? 'pt-10' : ''}`}>
        {isDemo && <DemoGuideBar />}
        {!examOnlyMode && <Sidebar />}
        {examOnlyMode && <ExamOnlyTopBar />}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-14 md:pb-0 print:overflow-visible">{children}</main>
        {!examOnlyMode && <TeacherBottomNav />}
        {!examOnlyMode && <CommandPalette />}
        <ToastContainer />
        <ConfirmDialog />
      </div>
    </TenantProvider>
  );
}
