import { HelpContent } from '@/app/help/HelpContent';

export default function TeacherHelpPage() {
  return <HelpContent backHref="/overview" backLabel="대시보드" isLoggedIn embedded />;
}
