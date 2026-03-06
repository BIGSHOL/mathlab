import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header role="teacher" userName={user.name} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
