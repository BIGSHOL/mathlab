import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ToastContainer } from '@/components/ui/Toast';
import { getCurrentUser } from '@/lib/auth';
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

  return (
    <TenantProvider tenant={tenant}>
      <div className="h-screen flex bg-background overflow-hidden print:h-auto print:overflow-visible print:bg-white">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden print:overflow-visible">{children}</main>
        <CommandPalette />
        <ToastContainer />
      </div>
    </TenantProvider>
  );
}
