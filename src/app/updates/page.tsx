import { getCurrentUser } from '@/lib/auth';
import { UpdatesContent } from './UpdatesContent';

export default async function UpdatesPage() {
  const user = await getCurrentUser();

  const backHref = user
    ? user.role === 'STUDENT'
      ? '/dashboard'
      : '/overview'
    : '/';
  const backLabel = user
    ? user.role === 'STUDENT'
      ? '대시보드'
      : '대시보드'
    : '홈으로';

  return <UpdatesContent backHref={backHref} backLabel={backLabel} isLoggedIn={!!user} />;
}
