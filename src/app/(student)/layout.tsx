import { StudentSidebar } from '@/components/layout/StudentSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ToastContainer } from '@/components/ui/Toast';
import { XpToastContainer } from '@/components/ui/XpToast';
import { UpdateBanner } from '@/components/ui/UpdateBanner';
import { getCurrentUser } from '@/lib/auth';
import { resolveCurrentTenant } from '@/lib/tenant';
import { TenantProvider } from '@/components/providers/TenantProvider';
import { redirect } from 'next/navigation';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tenant = await resolveCurrentTenant();

  return (
    <TenantProvider tenant={tenant}>
      <div className="h-screen flex bg-background overflow-hidden print:h-auto print:overflow-visible print:bg-white">
        <StudentSidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 print:overflow-visible">
          {children}
        </main>
        <BottomNav />
        <ToastContainer />
        <XpToastContainer />
        <UpdateBanner />
      </div>
    </TenantProvider>
  );
}
