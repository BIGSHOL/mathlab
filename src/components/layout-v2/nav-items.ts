/**
 * v2 사이드바 메뉴 정의 (학생/선생님/관리자).
 *
 * 모든 href 는 /v2/* 경로. 기존 라우트(/dashboard, /overview 등)와 분리되어
 * v2 페이지 트리에서만 사용된다.
 */
import type { SidebarNavGroup } from './Sidebar';

export const STUDENT_NAV: SidebarNavGroup[] = [
  {
    title: '학습',
    items: [
      { icon: '🏠', label: '대시보드', href: '/v2/dashboard' },
      { icon: '📚', label: '단원학습', href: '/v2/curriculum' },
      { icon: '📝', label: '숙제', href: '/v2/homework', badge: 3 },
      { icon: '🧪', label: '시험', href: '/v2/exam' },
    ],
  },
  {
    title: '즐기기',
    items: [
      { icon: '⚡', label: '연산연습', href: '/v2/practice' },
      { icon: '🏆', label: '랭킹', href: '/v2/ranking' },
      { icon: '🛍', label: '마켓', href: '/v2/shop' },
      { icon: '👤', label: '내 프로필', href: '/v2/profile' },
    ],
  },
  {
    title: '내 활동',
    items: [{ icon: '📊', label: '결과 분석', href: '/v2/results' }],
  },
];

export const TEACHER_NAV: SidebarNavGroup[] = [
  {
    title: '운영',
    items: [
      { icon: '🏠', label: '대시보드', href: '/v2/teacher/dashboard' },
      { icon: '👥', label: '학생 관리', href: '/v2/teacher/students' },
    ],
  },
  {
    title: '컨텐츠',
    items: [
      { icon: '📝', label: '숙제 출제', href: '/v2/teacher/homework' },
      { icon: '🧪', label: '시험 관리', href: '/v2/teacher/exam' },
      { icon: '📄', label: '학습지', href: '/v2/teacher/worksheet' },
    ],
  },
  {
    title: '분석',
    items: [
      { icon: '📊', label: '학습 분석', href: '/v2/teacher/analytics' },
      { icon: '📑', label: '기출 분석', href: '/v2/teacher/exam-analysis' },
    ],
  },
];

export const ADMIN_NAV: SidebarNavGroup[] = [
  {
    title: '관리',
    items: [
      { icon: '🏢', label: '지점', href: '/v2/admin/tenants' },
      { icon: '🏫', label: '학교', href: '/v2/admin/schools' },
    ],
  },
  {
    title: '시스템',
    items: [
      { icon: '🎛', label: '기능 플래그', href: '/v2/admin/features' },
      { icon: '📤', label: '시험지 업로드', href: '/v2/admin/exam-uploads' },
    ],
  },
];
