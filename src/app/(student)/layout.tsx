import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ToastContainer } from '@/components/ui/Toast';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header role="student" userName={user.name} />
      <main className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
