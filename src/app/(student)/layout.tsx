import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ToastContainer } from '@/components/ui/Toast';
import { XpToastContainer } from '@/components/ui/XpToast';
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
      <div className="h-screen flex flex-col bg-background">
        <Header role="student" userName={user.name} />
        <main className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0">{children}</main>
        <BottomNav />
        <ToastContainer />
        <XpToastContainer />
      </div>
    </TenantProvider>
  );
}
