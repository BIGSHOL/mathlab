import { redirect } from 'next/navigation';

// 반 관리가 /courses?tab=classrooms 로 통합됨
export default function AdminClassroomsRedirect() {
  redirect('/courses?tab=classrooms');
}
