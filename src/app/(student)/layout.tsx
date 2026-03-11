import { Header } from '@/components/layout/Header';
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header role="student" userName={user.name} />
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  );
}
