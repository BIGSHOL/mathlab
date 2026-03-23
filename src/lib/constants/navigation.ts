import {
  LayoutDashboard,
  Users,
  BookOpen,
  Database,
  GraduationCap,
  Calculator,
  FileSpreadsheet,
  CalendarCheck,
  ClipboardCheck,
  PenLine,
  FileText,
  BarChart3,
  Stethoscope,
  ScrollText,
  Newspaper,
  LifeBuoy,
  Settings,
  HelpCircle,
  UserCog,
  KeyRound,
  School,
  Activity,
  Building2,
  ToggleRight,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';

// ── 역할 레벨 (hasMinRole 판별용) ──
const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 0, TEACHER: 1, MANAGER: 2, OWNER: 3, SUPER_ADMIN: 4,
};

export function hasMinRole(role: UserRole, minRole: UserRole): boolean {
  return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

// ── 타입 ──

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  minRole: UserRole;
  keywords?: string[];
  disabled?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  minRole: UserRole;
  /** admin 스타일: 보라색 구분선 + Shield 아이콘 */
  style?: 'default' | 'admin';
  items: NavItem[];
}

// ── 네비게이션 그룹 정의 ──

const NAV_GROUPS: NavGroup[] = [
  // ─ 홈 ─
  {
    id: 'home', label: '홈', minRole: 'TEACHER', items: [
      { id: 'overview', label: '대시보드', href: '/overview', icon: LayoutDashboard, minRole: 'TEACHER', keywords: ['dashboard', '홈', '메인'] },
    ],
  },

  // ─ 수업 ─
  {
    id: 'teaching', label: '수업', minRole: 'TEACHER', items: [
      { id: 'students', label: '학생 관리', href: '/students', icon: Users, minRole: 'TEACHER', keywords: ['student', '학생', '관리'] },
      // 개념/문제 라벨은 getNavForRole에서 역할별 동적 교체
      { id: 'concepts', label: '개념 조회', href: '/concepts', icon: BookOpen, minRole: 'TEACHER', keywords: ['concept', '개념', '빈칸'] },
      { id: 'questions', label: '문제 조회', href: '/questions', icon: Database, minRole: 'TEACHER', keywords: ['question', '문제', '은행'] },
      { id: 'courses', label: '학습 과정', href: '/courses', icon: GraduationCap, minRole: 'TEACHER', keywords: ['course', '과정', '커리큘럼'] },
    ],
  },

  // ─ 출제 · 평가 ─
  {
    id: 'assessment', label: '출제 · 평가', minRole: 'TEACHER', items: [
      { id: 'arithmetic', label: '연산 생성기', href: '/questions/arithmetic', icon: Calculator, minRole: 'TEACHER', keywords: ['arithmetic', '연산', '계산'] },
      { id: 'worksheet', label: '학습지', href: '/worksheet/create', icon: FileSpreadsheet, minRole: 'TEACHER', keywords: ['worksheet', '학습지', '프린트'] },
      { id: 'homework', label: '숙제 관리', href: '/homework', icon: CalendarCheck, minRole: 'TEACHER', keywords: ['homework', '숙제', '과제'] },
      { id: 'tests', label: '시험 관리', href: '/tests', icon: ClipboardCheck, minRole: 'TEACHER', keywords: ['test', '시험', '평가'] },
      { id: 'grading', label: '수기 채점', href: '/manual-grading', icon: PenLine, minRole: 'TEACHER', keywords: ['grading', '채점', '수기'] },
      { id: 'pdf-import', label: 'PDF 추출', href: '/questions/pdf-import', icon: FileText, minRole: 'TEACHER', keywords: ['pdf', '추출', 'ocr'] },
    ],
  },

  // ─ 분석 ─
  {
    id: 'analysis', label: '분석', minRole: 'TEACHER', items: [
      { id: 'analytics', label: '학습 분석', href: '/analytics', icon: BarChart3, minRole: 'TEACHER', keywords: ['analytics', '분석', '통계'] },
      { id: 'diagnostics', label: '진단 결과', href: '/diagnostics', icon: Stethoscope, minRole: 'MANAGER', keywords: ['diagnostic', '진단', '레벨테스트', '결과'] },
      { id: 'reports', label: '리포트', href: '/reports', icon: ScrollText, minRole: 'OWNER', keywords: ['report', '리포트', '보고서', '레벨테스트'] },
    ],
  },

  // ─ 시스템 ─
  {
    id: 'system', label: '시스템', minRole: 'TEACHER', items: [
      { id: 'updates', label: '업데이트 내역', href: '/updates', icon: Newspaper, minRole: 'TEACHER', keywords: ['update', '업데이트', '변경'] },
      { id: 'help', label: '도움말', href: '/help', icon: LifeBuoy, minRole: 'TEACHER', keywords: ['help', '도움말', '가이드', '사용법'] },
      { id: 'settings', label: '설정', href: '/settings', icon: Settings, minRole: 'TEACHER', keywords: ['setting', '설정', '환경'] },
      { id: 'support', label: '고객지원', href: '/support', icon: HelpCircle, minRole: 'TEACHER', keywords: ['support', '지원', '문의', '도움'] },
    ],
  },

  // ─ 팀 관리 (MANAGER+) ─
  {
    id: 'team', label: '팀 관리', minRole: 'MANAGER', style: 'admin', items: [
      { id: 'teachers', label: '선생님 관리', href: '/students?tab=teachers', icon: UserCog, minRole: 'MANAGER', keywords: ['teacher', '선생님'] },
    ],
  },

  // ─ 지점 운영 (OWNER+) ─
  {
    id: 'branch', label: '지점 운영', minRole: 'OWNER', style: 'admin', items: [
      { id: 'licenses', label: '이용권 관리', href: '/licenses', icon: KeyRound, minRole: 'OWNER', keywords: ['license', '이용권', '구독'] },
      { id: 'classrooms', label: '반 관리', href: '/admin/classrooms', icon: School, minRole: 'OWNER', keywords: ['class', '반', '교실'] },
      { id: 'users', label: '사용자 관리', href: '/admin/users', icon: Activity, minRole: 'OWNER', keywords: ['user', '사용자', '계정'] },
    ],
  },

  // ─ 플랫폼 (SUPER_ADMIN) ─
  {
    id: 'platform', label: '플랫폼', minRole: 'SUPER_ADMIN', style: 'admin', items: [
      { id: 'tenants', label: '지점 관리', href: '/admin/tenants', icon: Building2, minRole: 'SUPER_ADMIN', keywords: ['tenant', '지점', '지사', '서브도메인'] },
      { id: 'features', label: '기능 관리', href: '/admin/features', icon: ToggleRight, minRole: 'SUPER_ADMIN', keywords: ['feature', '기능', '토글'] },
    ],
  },
];

// ── 역할별 네비 필터링 ──

/** 역할에 맞는 그룹/항목만 반환 (라벨 동적 교체 포함) */
export function getNavForRole(role: UserRole): NavGroup[] {
  const isManager = hasMinRole(role, 'MANAGER');

  return NAV_GROUPS
    .filter((g) => hasMinRole(role, g.minRole))
    .map((g) => ({
      ...g,
      items: g.items
        .filter((item) => hasMinRole(role, item.minRole))
        .map((item) => {
          // MANAGER+ 는 "관리", TEACHER는 "조회"
          if (item.id === 'concepts') {
            return { ...item, label: isManager ? '개념 관리' : '개념 조회' };
          }
          if (item.id === 'questions') {
            return { ...item, label: isManager ? '문제 관리' : '문제 조회' };
          }
          return item;
        }),
    }))
    .filter((g) => g.items.length > 0);
}

// ── CommandPalette 용 ──

export interface CommandItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
  group: string;
}

/** 역할에 맞는 CommandPalette 항목 반환 */
export function getCommandsForRole(role: UserRole): CommandItem[] {
  const groups = getNavForRole(role);
  return groups.flatMap((g) =>
    g.items
      .filter((item) => !item.disabled)
      .map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        keywords: item.keywords ?? [],
        group: g.label,
      })),
  );
}

/** 모든 가능한 항목 (active-route 충돌 감지용) */
export function getAllNavItems(): NavItem[] {
  return NAV_GROUPS.flatMap((g) => g.items);
}
