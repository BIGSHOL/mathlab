import { ExamOnlyTopBar } from '@/components/layout/ExamOnlyTopBar';
import { SubscriptionProvider } from '@/components/providers/SubscriptionProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * 기출분석 전용 레이아웃.
 * 사이드바/하단 내비/커맨드 팔레트 없이 우측 상단 미니바(ExamOnlyTopBar)만 노출.
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // 기출분석은 TEACHER 이상 전용. STUDENT 는 로그인으로.
  if (user.role === 'STUDENT') redirect('/login');

  return (
    <SubscriptionProvider>
      <div className="h-screen flex bg-background overflow-hidden print:h-auto print:overflow-visible print:bg-white">
        <ExamOnlyTopBar />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-14 md:pb-0 print:overflow-visible">
          {children}
        </main>
        <ToastContainer />
        <ConfirmDialog />
      </div>
    </SubscriptionProvider>
  );
}
