import { getCurrentUser } from '@/lib/auth';
import { HelpContent } from './HelpContent';

export default async function HelpPage() {
  const user = await getCurrentUser();

  const backHref = user
    ? user.role === 'STUDENT'
      ? '/dashboard'
      : '/overview'
    : '/';
  const backLabel = user ? '대시보드' : '홈으로';

  return <HelpContent backHref={backHref} backLabel={backLabel} isLoggedIn={!!user} />;
}
