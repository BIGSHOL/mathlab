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
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
    </div>
  );
}
