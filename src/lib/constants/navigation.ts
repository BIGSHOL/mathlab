import {
  LayoutDashboard,
  Users,
  BookOpen,
  Database,
  Calculator,
  FileSpreadsheet,
  CalendarCheck,
  ClipboardCheck,
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
  Building2,
  ToggleRight,
  FileUp,
  Radio,
  Target,
  Volume2,
  FileSearch,
  CheckSquare,
  BookText,
  ListTodo,
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
  /** 이 메뉴가 활성화되려면 지점에 해당 이용권이 필요 (OWNER 사이드바 필터용) */
  licenseFeature?: string;
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
      { id: 'queue', label: '작업 큐', href: '/queue', icon: ListTodo, minRole: 'TEACHER', keywords: ['queue', '큐', '작업', '할일', 'todo', '칸반', 'kanban', '액티비티', '피드'] },
    ],
  },

  // ─ 우리 반 ─
  {
    id: 'students', label: '우리 반', minRole: 'TEACHER', items: [
      { id: 'students', label: '학생 목록', href: '/students', icon: Users, minRole: 'TEACHER', keywords: ['student', '학생', '관리', '목록'] },
      { id: 'courses', label: '반 목록', href: '/courses', icon: School, minRole: 'TEACHER', keywords: ['class', '반', '교실', 'course', '과정', '코스'], licenseFeature: 'CONCEPT' },
    ],
  },

  // ─ 출제·준비 ─
  {
    id: 'content', label: '출제·준비', minRole: 'TEACHER', items: [
      { id: 'concepts', label: '개념 관리', href: '/concepts', icon: BookOpen, minRole: 'SUPER_ADMIN', keywords: ['concept', '개념', '빈칸', '등록', '출제', '조회'], licenseFeature: 'CONCEPT' },
      { id: 'questions', label: '문제 관리', href: '/questions', icon: Database, minRole: 'SUPER_ADMIN', keywords: ['question', '문제', '은행', '출제', '조회'], licenseFeature: 'TEST' },
      { id: 'arithmetic', label: '연산 프린트', href: '/questions/arithmetic', icon: Calculator, minRole: 'TEACHER', keywords: ['arithmetic', '연산', '계산', '출제', '생성'] },
      { id: 'ox-quiz', label: 'OX 출제', href: '/questions/ox', icon: CheckSquare, minRole: 'TEACHER', keywords: ['ox', '퀴즈', '참거짓', '진술', '오엑스'], licenseFeature: 'OX_QUIZ' },
      { id: 'worksheet', label: '문제 프린트', href: '/worksheet/create', icon: FileSpreadsheet, minRole: 'TEACHER', keywords: ['worksheet', '학습지', '프린트', '만들기', '문제'] },
      { id: 'workbooks', label: '워크북 생성', href: '/workbooks', icon: BookText, minRole: 'TEACHER', keywords: ['workbook', '워크북', '책', '묶음', '인쇄', '풀이공간'], licenseFeature: 'WORKBOOK' },
      { id: 'pdf-import', label: 'PDF 추출', href: '/questions/pdf-import', icon: FileText, minRole: 'SUPER_ADMIN', keywords: ['pdf', '추출', 'ocr', '가져오기'] },
    ],
  },

  // ─ 배정·평가 ─
  {
    id: 'assessment', label: '배정·평가', minRole: 'TEACHER', items: [
      { id: 'tests', label: '시험 출제', href: '/tests', icon: ClipboardCheck, minRole: 'TEACHER', keywords: ['test', '시험', '평가', '출제', '배정'], licenseFeature: 'TEST' },
      { id: 'homework', label: '숙제 출제', href: '/homework', icon: CalendarCheck, minRole: 'TEACHER', keywords: ['homework', '숙제', '과제', '배정'] },
      { id: 'exam-campaigns', label: '내신대비 캠페인', href: '/exam-campaigns', icon: Target, minRole: 'TEACHER', keywords: ['exam', '내신', '대비', '캠페인', '시험준비'], licenseFeature: 'EXAM_PREP' },
      { id: 'quiz', label: '퀴즈 배틀', href: '/quiz', icon: Radio, minRole: 'TEACHER', keywords: ['quiz', '퀴즈', '실시간', '대결'] },
    ],
  },

  // ─ 성적·분석 ─
  {
    id: 'analysis', label: '성적·분석', minRole: 'TEACHER', items: [
      { id: 'analytics', label: '학습 현황', href: '/analytics', icon: BarChart3, minRole: 'TEACHER', keywords: ['analytics', '분석', '통계', '현황'] },
      { id: 'exam-analysis', label: '기출 분석', href: '/exam-analysis', icon: FileSearch, minRole: 'TEACHER', keywords: ['exam', '기출', '분석', '시험지', '내신'], licenseFeature: 'EXAM_ANALYSIS' },
      { id: 'diagnostics', label: '진단 결과', href: '/diagnostics', icon: Stethoscope, minRole: 'TEACHER', keywords: ['diagnostic', '진단', '레벨테스트', '결과'], licenseFeature: 'DIAGNOSTIC' },
      { id: 'reports', label: '리포트', href: '/reports', icon: ScrollText, minRole: 'OWNER', keywords: ['report', '리포트', '보고서', '레벨테스트'], licenseFeature: 'DIAGNOSTIC' },
    ],
  },

  // ─ 기타 ─
  {
    id: 'system', label: '기타', minRole: 'TEACHER', items: [
      // /updates는 root 라우트 (src/app/updates/page.tsx) — 학생/선생/비로그인 모두 접근. StudentSidebar에도 동일 링크.
      { id: 'updates', label: '공지사항', href: '/updates', icon: Newspaper, minRole: 'TEACHER', keywords: ['update', '업데이트', '변경', '공지'] },
      { id: 'help', label: '도움말', href: '/help', icon: LifeBuoy, minRole: 'TEACHER', keywords: ['help', '도움말', '가이드', '사용법'] },
      { id: 'settings', label: '설정', href: '/settings', icon: Settings, minRole: 'TEACHER', keywords: ['setting', '설정', '환경'] },
      { id: 'support', label: '문의하기', href: '/support', icon: HelpCircle, minRole: 'TEACHER', keywords: ['support', '지원', '문의', '도움'] },
    ],
  },

  // ─ 관리 메뉴 (MANAGER+) ─
  {
    id: 'team', label: '관리 메뉴', minRole: 'MANAGER', style: 'admin', items: [
      { id: 'teachers', label: '선생님 관리', href: '/admin/teachers', icon: UserCog, minRole: 'MANAGER', keywords: ['teacher', '선생님'] },
    ],
  },

  // ─ 지점 관리 (OWNER+) ─
  {
    id: 'branch', label: '지점 관리', minRole: 'OWNER', style: 'admin', items: [
      { id: 'licenses', label: '이용권 관리', href: '/licenses', icon: KeyRound, minRole: 'OWNER', keywords: ['license', '이용권', '구독'] },
    ],
  },

  // ─ 플랫폼 (SUPER_ADMIN) ─
  {
    id: 'platform', label: '플랫폼', minRole: 'SUPER_ADMIN', style: 'admin', items: [
      { id: 'tenants', label: '지점 관리', href: '/admin/tenants', icon: Building2, minRole: 'SUPER_ADMIN', keywords: ['tenant', '지점', '지사', '서브도메인'] },
      { id: 'features', label: '기능 관리', href: '/admin/features', icon: ToggleRight, minRole: 'SUPER_ADMIN', keywords: ['feature', '기능', '토글'] },
      { id: 'exam-uploads', label: '기출 업로드', href: '/admin/exam-uploads', icon: FileUp, minRole: 'SUPER_ADMIN', keywords: ['exam', '기출', '업로드', '시험지', 'storage'] },
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
      { id: 'schools', label: '학교 관리', href: '/admin/schools', icon: School, minRole: 'SUPER_ADMIN', keywords: ['school', '학교', '학교명'] },
      { id: 'features', label: '기능 관리', href: '/admin/features', icon: ToggleRight, minRole: 'SUPER_ADMIN', keywords: ['feature', '기능', '토글'] },
      { id: 'exam-uploads', label: '기출 업로드', href: '/admin/exam-uploads', icon: FileUp, minRole: 'SUPER_ADMIN', keywords: ['exam', '기출', '업로드', '시험지'] },
      { id: 'extract-queue', label: '기출 추출 대기열', href: '/admin/extract-queue', icon: FileText, minRole: 'SUPER_ADMIN', keywords: ['extract', '추출', '대기열', '배치', '승인', '기출'] },
    ],
  },
  {
    id: 'content', label: '컨텐츠', minRole: 'SUPER_ADMIN', items: [
      { id: 'concepts', label: '개념 관리', href: '/concepts', icon: BookOpen, minRole: 'SUPER_ADMIN', keywords: ['concept', '개념', '빈칸'] },
      { id: 'questions', label: '문제 관리', href: '/questions', icon: Database, minRole: 'SUPER_ADMIN', keywords: ['question', '문제', '은행'] },
      { id: 'pdf-import', label: 'PDF 추출', href: '/questions/pdf-import', icon: FileText, minRole: 'SUPER_ADMIN', keywords: ['pdf', '추출', 'ocr', '가져오기'] },
    ],
  },
  {
    id: 'system', label: '시스템', minRole: 'SUPER_ADMIN', items: [
      { id: 'mockups', label: '페이지 목업', href: '/mockups', icon: Target, minRole: 'SUPER_ADMIN', keywords: ['mockup', '목업', '미리보기', '페이지'] },
      { id: 'sounds', label: '사운드', href: '/admin/sounds', icon: Volume2, minRole: 'SUPER_ADMIN', keywords: ['sound', '사운드', '효과음', '소리'] },
      { id: 'support', label: '고객지원', href: '/support', icon: HelpCircle, minRole: 'SUPER_ADMIN', keywords: ['support', '지원', '문의'] },
      { id: 'settings', label: '설정', href: '/settings', icon: Settings, minRole: 'SUPER_ADMIN', keywords: ['setting', '설정', '환경'] },
    ],
  },
];

// ── 역할별 네비 필터링 ──

/** 역할에 맞는 그룹/항목만 반환 (라벨 동적 교체 포함) */
export function getNavForRole(role: UserRole): NavGroup[] {
  if (role === 'SUPER_ADMIN') return SUPER_ADMIN_NAV_GROUPS;

  // OWNER: 관리 라벨
  const LABEL_OVERRIDES: Record<string, string> = hasMinRole(role, 'OWNER')
    ? { students: '학생 관리', courses: '반 관리' }
    : {};

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
  /** 이 항목이 활성화되려면 지점에 해당 이용권이 필요 (CommandPalette 필터용) */
  licenseFeature?: string;
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
        licenseFeature: item.licenseFeature,
      })),
  );
}

/** 모든 가능한 항목 (active-route 충돌 감지용) */
export function getAllNavItems(): NavItem[] {
  return [...NAV_GROUPS, ...SUPER_ADMIN_NAV_GROUPS].flatMap((g) => g.items);
}
