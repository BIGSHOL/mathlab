import {
  LayoutDashboard,
  Users,
  BookOpen,
  Database,
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
  UsersRound,
  Building2,
  ToggleRight,
  Radio,
  Target,
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

  // ─ 우리 반 ─
  {
    id: 'students', label: '우리 반', minRole: 'TEACHER', items: [
      { id: 'students', label: '학생 목록', href: '/students', icon: Users, minRole: 'TEACHER', keywords: ['student', '학생', '관리', '목록'] },
      { id: 'courses', label: '반 목록', href: '/courses', icon: School, minRole: 'TEACHER', keywords: ['class', '반', '교실', 'course', '과정', '코스'] },
    ],
  },

  // ─ 출제·준비 ─
  {
    id: 'content', label: '출제·준비', minRole: 'TEACHER', items: [
      { id: 'concepts', label: '개념 등록', href: '/concepts', icon: BookOpen, minRole: 'TEACHER', keywords: ['concept', '개념', '빈칸', '등록', '출제'] },
      { id: 'questions', label: '문제 출제', href: '/questions', icon: Database, minRole: 'TEACHER', keywords: ['question', '문제', '은행', '출제', '조회'] },
      { id: 'arithmetic', label: '연산 출제', href: '/questions/arithmetic', icon: Calculator, minRole: 'TEACHER', keywords: ['arithmetic', '연산', '계산', '출제', '생성'] },
      { id: 'pdf-import', label: 'PDF 추출', href: '/questions/pdf-import', icon: FileText, minRole: 'SUPER_ADMIN', keywords: ['pdf', '추출', 'ocr', '가져오기'] },
    ],
  },

  // ─ 배정·평가 ─
  {
    id: 'assessment', label: '배정·평가', minRole: 'TEACHER', items: [
      { id: 'tests', label: '시험 배정', href: '/tests', icon: ClipboardCheck, minRole: 'TEACHER', keywords: ['test', '시험', '평가', '출제', '배정'] },
      { id: 'homework', label: '숙제 배정', href: '/homework', icon: CalendarCheck, minRole: 'TEACHER', keywords: ['homework', '숙제', '과제', '배정'] },
      { id: 'worksheet', label: '학습지 만들기', href: '/worksheet/create', icon: FileSpreadsheet, minRole: 'TEACHER', keywords: ['worksheet', '학습지', '프린트', '만들기'] },
      { id: 'quiz', label: '실시간 퀴즈', href: '/quiz', icon: Radio, minRole: 'TEACHER', keywords: ['quiz', '퀴즈', '실시간', '대결'] },
      { id: 'level-test', label: '레벨테스트', href: '/level-test', icon: Target, minRole: 'TEACHER', keywords: ['level', '레벨', '진단', '테스트'] },
      { id: 'grading', label: '수기 채점', href: '/manual-grading', icon: PenLine, minRole: 'TEACHER', keywords: ['grading', '채점', '수기'] },
    ],
  },

  // ─ 성적·분석 ─
  {
    id: 'analysis', label: '성적·분석', minRole: 'TEACHER', items: [
      { id: 'analytics', label: '학습 현황', href: '/analytics', icon: BarChart3, minRole: 'TEACHER', keywords: ['analytics', '분석', '통계', '현황'] },
      { id: 'diagnostics', label: '진단 결과', href: '/diagnostics', icon: Stethoscope, minRole: 'TEACHER', keywords: ['diagnostic', '진단', '레벨테스트', '결과'] },
      { id: 'reports', label: '리포트', href: '/reports', icon: ScrollText, minRole: 'OWNER', keywords: ['report', '리포트', '보고서', '레벨테스트'] },
    ],
  },

  // ─ 기타 ─
  {
    id: 'system', label: '기타', minRole: 'TEACHER', items: [
      { id: 'updates', label: '공지사항', href: '/updates', icon: Newspaper, minRole: 'TEACHER', keywords: ['update', '업데이트', '변경', '공지'] },
      { id: 'help', label: '도움말', href: '/help', icon: LifeBuoy, minRole: 'TEACHER', keywords: ['help', '도움말', '가이드', '사용법'] },
      { id: 'settings', label: '설정', href: '/settings', icon: Settings, minRole: 'TEACHER', keywords: ['setting', '설정', '환경'] },
      { id: 'support', label: '문의하기', href: '/support', icon: HelpCircle, minRole: 'TEACHER', keywords: ['support', '지원', '문의', '도움'] },
    ],
  },

  // ─ 팀 관리 (MANAGER+) ─
  {
    id: 'team', label: '팀 관리', minRole: 'MANAGER', style: 'admin', items: [
      { id: 'teachers', label: '선생님 관리', href: '/admin/teachers', icon: UserCog, minRole: 'MANAGER', keywords: ['teacher', '선생님'] },
    ],
  },

  // ─ 지점 운영 (OWNER+) ─
  {
    id: 'branch', label: '지점 운영', minRole: 'OWNER', style: 'admin', items: [
      { id: 'licenses', label: '이용권 관리', href: '/licenses', icon: KeyRound, minRole: 'OWNER', keywords: ['license', '이용권', '구독'] },
      { id: 'users', label: '사용자 관리', href: '/admin/users', icon: UsersRound, minRole: 'OWNER', keywords: ['user', '사용자', '계정'] },
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

// ── OWNER 전용 네비 ──

const OWNER_NAV_GROUPS: NavGroup[] = [
  // ─ 홈 ─
  {
    id: 'home', label: '홈', minRole: 'OWNER', items: [
      { id: 'overview', label: '대시보드', href: '/overview', icon: LayoutDashboard, minRole: 'OWNER', keywords: ['dashboard', '홈', '메인'] },
    ],
  },

  // ─ 지점 운영 (핵심) ─
  {
    id: 'branch', label: '지점 운영', minRole: 'OWNER', style: 'admin', items: [
      { id: 'students', label: '학생 관리', href: '/students', icon: Users, minRole: 'OWNER', keywords: ['student', '학생', '관리'] },
      { id: 'teachers', label: '선생님 관리', href: '/admin/teachers', icon: UserCog, minRole: 'OWNER', keywords: ['teacher', '선생님'] },
      { id: 'users', label: '사용자 관리', href: '/admin/users', icon: UsersRound, minRole: 'OWNER', keywords: ['user', '사용자', '계정'] },
      { id: 'licenses', label: '이용권 관리', href: '/licenses', icon: KeyRound, minRole: 'OWNER', keywords: ['license', '이용권', '구독'] },
    ],
  },

  // ─ 성적·분석 ─
  {
    id: 'analysis', label: '성적·분석', minRole: 'OWNER', items: [
      { id: 'analytics', label: '학습 현황', href: '/analytics', icon: BarChart3, minRole: 'OWNER', keywords: ['analytics', '분석', '통계', '현황'] },
      { id: 'diagnostics', label: '진단 결과', href: '/diagnostics', icon: Stethoscope, minRole: 'OWNER', keywords: ['diagnostic', '진단', '레벨테스트', '결과'] },
      { id: 'reports', label: '리포트', href: '/reports', icon: ScrollText, minRole: 'OWNER', keywords: ['report', '리포트', '보고서', '레벨테스트'] },
    ],
  },

  // ─ 출제·준비 ─
  {
    id: 'content', label: '출제·준비', minRole: 'OWNER', items: [
      { id: 'concepts', label: '개념 등록', href: '/concepts', icon: BookOpen, minRole: 'OWNER', keywords: ['concept', '개념', '빈칸', '등록'] },
      { id: 'questions', label: '문제 출제', href: '/questions', icon: Database, minRole: 'OWNER', keywords: ['question', '문제', '은행', '출제'] },
      { id: 'courses', label: '반 관리', href: '/courses', icon: School, minRole: 'OWNER', keywords: ['class', '반', '교실', 'course', '과정', '코스'] },
    ],
  },

  // ─ 배정·평가 ─
  {
    id: 'assessment', label: '배정·평가', minRole: 'OWNER', items: [
      { id: 'tests', label: '시험 배정', href: '/tests', icon: ClipboardCheck, minRole: 'OWNER', keywords: ['test', '시험', '평가', '출제', '배정'] },
      { id: 'homework', label: '숙제 배정', href: '/homework', icon: CalendarCheck, minRole: 'OWNER', keywords: ['homework', '숙제', '과제', '배정'] },
      { id: 'level-test', label: '레벨테스트', href: '/level-test', icon: Target, minRole: 'OWNER', keywords: ['level', '레벨', '진단', '테스트'] },
    ],
  },

  // ─ 기타 ─
  {
    id: 'system', label: '기타', minRole: 'OWNER', items: [
      { id: 'updates', label: '공지사항', href: '/updates', icon: Newspaper, minRole: 'OWNER', keywords: ['update', '업데이트', '변경', '공지'] },
      { id: 'help', label: '도움말', href: '/help', icon: LifeBuoy, minRole: 'OWNER', keywords: ['help', '도움말', '가이드', '사용법'] },
      { id: 'settings', label: '설정', href: '/settings', icon: Settings, minRole: 'OWNER', keywords: ['setting', '설정', '환경'] },
      { id: 'support', label: '문의하기', href: '/support', icon: HelpCircle, minRole: 'OWNER', keywords: ['support', '지원', '문의', '도움'] },
    ],
  },
];

// ── SUPER_ADMIN 전용 네비 ──

const SUPER_ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: 'home', label: '홈', minRole: 'SUPER_ADMIN', items: [
      { id: 'overview', label: '대시보드', href: '/overview', icon: LayoutDashboard, minRole: 'SUPER_ADMIN', keywords: ['dashboard', '홈', '메인'] },
    ],
  },
  {
    id: 'platform', label: '플랫폼 관리', minRole: 'SUPER_ADMIN', style: 'admin', items: [
      { id: 'tenants', label: '지점 관리', href: '/admin/tenants', icon: Building2, minRole: 'SUPER_ADMIN', keywords: ['tenant', '지점', '지사'] },
      { id: 'features', label: '기능 관리', href: '/admin/features', icon: ToggleRight, minRole: 'SUPER_ADMIN', keywords: ['feature', '기능', '토글'] },
    ],
  },
  {
    id: 'content', label: '컨텐츠', minRole: 'SUPER_ADMIN', items: [
      { id: 'concepts', label: '개념 관리', href: '/concepts', icon: BookOpen, minRole: 'SUPER_ADMIN', keywords: ['concept', '개념', '빈칸'] },
      { id: 'questions', label: '문제 관리', href: '/questions', icon: Database, minRole: 'SUPER_ADMIN', keywords: ['question', '문제', '은행'] },
    ],
  },
  {
    id: 'system', label: '시스템', minRole: 'SUPER_ADMIN', items: [
      { id: 'support', label: '고객지원', href: '/support', icon: HelpCircle, minRole: 'SUPER_ADMIN', keywords: ['support', '지원', '문의'] },
      { id: 'settings', label: '설정', href: '/settings', icon: Settings, minRole: 'SUPER_ADMIN', keywords: ['setting', '설정', '환경'] },
    ],
  },
];

// ── 역할별 네비 필터링 ──

/** 역할에 맞는 그룹/항목만 반환 (라벨 동적 교체 포함) */
export function getNavForRole(role: UserRole): NavGroup[] {
  if (role === 'SUPER_ADMIN') return SUPER_ADMIN_NAV_GROUPS;
  if (role === 'OWNER') return OWNER_NAV_GROUPS;

  // TEACHER/MANAGER 모두 개념/문제는 "조회" (CRUD는 SUPER_ADMIN 전용)
  const LABEL_OVERRIDES: Record<string, string> = {
    concepts: '개념 조회',
    questions: '문제 조회',
  };

  return NAV_GROUPS
    .filter((g) => hasMinRole(role, g.minRole))
    .map((g) => ({
      ...g,
      items: g.items
        .filter((item) => hasMinRole(role, item.minRole))
        .map((item) => ({
          ...item,
          label: LABEL_OVERRIDES[item.id] ?? item.label,
        })),
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
  return [...NAV_GROUPS, ...OWNER_NAV_GROUPS, ...SUPER_ADMIN_NAV_GROUPS].flatMap((g) => g.items);
}
