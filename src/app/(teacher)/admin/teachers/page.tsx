import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AdminTeachersClient from './AdminTeachersClient';

const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 0, TEACHER: 1, MANAGER: 2, OWNER: 3, SUPER_ADMIN: 4,
};

export default async function AdminTeachersPage() {
  const user = await getCurrentUser();
  if (!user || (ROLE_LEVEL[user.role] ?? 0) < ROLE_LEVEL.MANAGER) {
    redirect('/overview');
  }

  return <AdminTeachersClient />;
}
