'use client';

import {
  LayoutDashboard,
  Users,
  BookOpen,
  Database,
  Calculator,
  CalendarCheck,
  ClipboardCheck,
  BarChart3,
  Settings,
  HelpCircle,
  Newspaper,
  LifeBuoy,
  FileSpreadsheet,
  PenLine,
  UserCog,
  Activity,
  FileText,
  Sparkles,
  ScanEye,
  Eye,
  ToggleRight,
  School,
  Building2,
  Home,
  Trophy,
  Zap,
  User,
  Stethoscope,
  ScrollText,
  GraduationCap,
  Shield,
  KeyRound,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

// ── 네비게이션 아이템 타입 ──
interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section: string;
  ownerOnly?: boolean;       // OWNER 이상만
  superAdminOnly?: boolean;  // SUPER_ADMIN만
  note?: string;
}

// ── 학생 네비게이션 ──
const STUDENT_NAV: NavItem[] = [
  // 메인
  { label: '대시보드', href: '/dashboard', icon: Home, section: '메인' },
  { label: '단원 목록', href: '/subjects', icon: BookOpen, section: '학습' },
  { label: '연산 연습', href: '/practice/arithmetic', icon: Calculator, section: '학습' },
  { label: '나의 시험', href: '/my-tests', icon: ClipboardCheck, section: '학습' },
  // 활동
  { label: '랭킹', href: '/ranking', icon: Trophy, section: '활동' },
  { label: '타임어택', href: '/practice/arithmetic/time-attack', icon: Zap, section: '활동' },
  // 시스템
  { label: '업데이트', href: '/updates', icon: Newspaper, section: '시스템' },
  { label: '도움말', href: '/help-public', icon: LifeBuoy, section: '시스템' },
  { label: '프로필', href: '/profile', icon: User, section: '시스템' },
];

// ── 선생님 네비게이션 ──
const TEACHER_NAV: NavItem[] = [
  // 홈
  { label: '대시보드', href: '/overview', icon: LayoutDashboard, section: '홈' },
  // 학습 관리
  { label: '학생 관리', href: '/students', icon: Users, section: '학습 관리' },
  { label: '개념 조회', href: '/concepts', icon: BookOpen, section: '학습 관리' },
  { label: '문제 조회', href: '/questions', icon: Database, section: '학습 관리' },
  { label: '학습 과정', href: '/courses', icon: GraduationCap, section: '학습 관리' },
  // 출제·평가
  { label: '연산 생성기', href: '/questions/arithmetic', icon: Calculator, section: '출제 · 평가' },
  { label: '학습지', href: '/worksheet/create', icon: FileSpreadsheet, section: '출제 · 평가' },
  { label: '숙제 관리', href: '/homework', icon: CalendarCheck, section: '출제 · 평가' },
  { label: '시험 관리', href: '/tests', icon: ClipboardCheck, section: '출제 · 평가' },
  { label: '수기 채점', href: '/manual-grading', icon: PenLine, section: '출제 · 평가' },
  // 분석
  { label: '학습 분석', href: '/analytics', icon: BarChart3, section: '분석' },
  { label: '진단 결과', href: '/diagnostics', icon: Stethoscope, section: '분석' },
  { label: '리포트', href: '/reports', icon: ScrollText, section: '분석' },
  // 시스템
  { label: '업데이트 내역', href: '/updates', icon: Newspaper, section: '시스템' },
  { label: '도움말', href: '/help', icon: LifeBuoy, section: '시스템' },
  { label: '설정', href: '/settings', icon: Settings, section: '시스템' },
  { label: '고객지원', href: '/support', icon: HelpCircle, section: '시스템' },
];

// ── 원장(OWNER) 추가 메뉴 ──
const OWNER_EXTRA: NavItem[] = [
  // 운영
  { label: '이용권 관리', href: '/licenses', icon: KeyRound, section: '운영', ownerOnly: true },
  // 어드민
  { label: '선생님 관리', href: '/students?tab=teachers', icon: UserCog, section: '어드민', ownerOnly: true },
  { label: '사용자 관리', href: '/admin/users', icon: Activity, section: '어드민', ownerOnly: true },
  { label: 'PDF 문제 추출', href: '/questions/pdf-import', icon: FileText, section: '어드민', ownerOnly: true },
  { label: 'AI 문제 생성', href: '/questions/generate', icon: Sparkles, section: '어드민', ownerOnly: true, note: '준비 중' },
  { label: '학생 화면 보기', href: '/student-preview', icon: ScanEye, section: '어드민', ownerOnly: true },
  { label: '화면 미리보기', href: '/mockups', icon: Eye, section: '어드민', ownerOnly: true },
  { label: '기능 관리', href: '/admin/features', icon: ToggleRight, section: '어드민', ownerOnly: true },
  { label: '반 관리', href: '/admin/classrooms', icon: School, section: '어드민', ownerOnly: true },
];

// ── SUPER_ADMIN 추가 메뉴 ──
const SUPER_ADMIN_EXTRA: NavItem[] = [
  { label: '지점 관리', href: '/admin/tenants', icon: Building2, section: '슈퍼관리자', superAdminOnly: true },
];

// ── 역할 설정 ──
const ROLES = [
  {
    key: 'STUDENT',
    label: '학생',
    color: 'blue',
    bgClass: 'bg-blue-50 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-700',
    iconBg: 'bg-blue-100 text-blue-600',
    sectionBg: 'bg-blue-50 text-blue-700',
    description: '학습, 시험 응시, 연산 연습, 랭킹 등',
    items: STUDENT_NAV,
  },
  {
    key: 'TEACHER',
    label: '선생님',
    color: 'green',
    bgClass: 'bg-green-50 border-green-200',
    badgeClass: 'bg-green-100 text-green-700',
    iconBg: 'bg-green-100 text-green-600',
    sectionBg: 'bg-green-50 text-green-700',
    description: '학생 관리, 문제 출제, 시험/숙제, 학습 분석',
    items: TEACHER_NAV,
  },
  {
    key: 'OWNER',
    label: '원장',
    color: 'violet',
    bgClass: 'bg-violet-50 border-violet-200',
    badgeClass: 'bg-violet-100 text-violet-700',
    iconBg: 'bg-violet-100 text-violet-600',
    sectionBg: 'bg-violet-50 text-violet-700',
    description: '선생님 전체 메뉴 + 운영/어드민 (자기 지점 스코핑)',
    items: [...TEACHER_NAV, ...OWNER_EXTRA],
  },
  {
    key: 'SUPER_ADMIN',
    label: '슈퍼관리자',
    color: 'red',
    bgClass: 'bg-red-50 border-red-200',
    badgeClass: 'bg-red-100 text-red-700',
    iconBg: 'bg-red-100 text-red-600',
    sectionBg: 'bg-red-50 text-red-700',
    description: '원장 전체 메뉴 + 지점 관리 (전체 지점 접근)',
    items: [...TEACHER_NAV, ...OWNER_EXTRA, ...SUPER_ADMIN_EXTRA],
  },
] as const;

export default function NavRolesMockupPage() {
  // 섹션별 그룹핑
  const groupBySection = (items: readonly NavItem[]) => {
    const groups: { section: string; items: NavItem[] }[] = [];
    for (const item of items) {
      const existing = groups.find((g) => g.section === item.section);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ section: item.section, items: [item] });
      }
    }
    return groups;
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
      <PageHeader
        title="역할별 네비게이션 맵"
        subtitle="각 역할이 접근 가능한 메뉴와 페이지를 한눈에 비교합니다"
        icon={<Shield className="w-6 h-6" />}
      />

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {ROLES.map((role) => (
          <div
            key={role.key}
            className={`rounded-sm border p-4 ${role.bgClass}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${role.badgeClass}`}>
                {role.label}
              </span>
              <span className="text-xs text-slate-500 font-mono">{role.key}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{role.items.length}</p>
            <p className="text-xs text-text-secondary mt-1">{role.description}</p>
          </div>
        ))}
      </div>

      {/* 역할별 상세 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {ROLES.map((role) => {
          const groups = groupBySection(role.items);
          return (
            <div
              key={role.key}
              className="bg-white border border-slate-200 rounded-sm overflow-hidden"
            >
              {/* 역할 헤더 */}
              <div className={`px-5 py-4 border-b ${role.bgClass}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-3 py-1 rounded ${role.badgeClass}`}>
                      {role.label}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{role.key}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {groups.length}개 섹션 · {role.items.length}개 메뉴
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-2">{role.description}</p>
              </div>

              {/* 섹션별 메뉴 리스트 */}
              <div className="divide-y divide-slate-100">
                {groups.map((group) => (
                  <div key={group.section} className="px-5 py-3">
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 px-2 py-0.5 rounded-sm inline-block ${role.sectionBg}`}>
                      {group.section}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {group.items.map((item) => (
                        <div
                          key={item.href + item.label}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-slate-50 transition-colors group"
                        >
                          <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${role.iconBg}`}>
                            <item.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-text-primary truncate">
                                {item.label}
                              </span>
                              {item.ownerOnly && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-100 text-violet-600 shrink-0">
                                  OWNER+
                                </span>
                              )}
                              {item.superAdminOnly && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-600 shrink-0">
                                  SA
                                </span>
                              )}
                              {item.note && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-600 shrink-0">
                                  {item.note}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono truncate block">
                              {item.href}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 권한 비교 매트릭스 */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-500" />
          역할 계층 구조
        </h2>
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-bold text-text-primary">기능</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="text-center px-4 py-3">
                    <span className={`font-bold px-2 py-0.5 rounded ${r.badgeClass}`}>{r.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { feature: '학습 / 시험 응시', student: true, teacher: false, owner: false, superAdmin: false },
                { feature: '학생 관리 / 문제 출제', student: false, teacher: true, owner: true, superAdmin: true },
                { feature: '시험·숙제·학습지 관리', student: false, teacher: true, owner: true, superAdmin: true },
                { feature: '학습 분석 / 진단 / 리포트', student: false, teacher: true, owner: true, superAdmin: true },
                { feature: '반 관리', student: false, teacher: false, owner: true, superAdmin: true },
                { feature: '사용자 관리 / 기능 관리', student: false, teacher: false, owner: true, superAdmin: true },
                { feature: 'PDF 추출 / AI 생성', student: false, teacher: false, owner: true, superAdmin: true },
                { feature: '이용권 관리', student: false, teacher: false, owner: true, superAdmin: true },
                { feature: '지점(테넌트) 관리', student: false, teacher: false, owner: false, superAdmin: true },
                { feature: '다른 지점 데이터 접근', student: false, teacher: false, owner: false, superAdmin: true },
              ].map((row) => (
                <tr key={row.feature} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-text-primary">{row.feature}</td>
                  {[row.student, row.teacher, row.owner, row.superAdmin].map((v, i) => (
                    <td key={i} className="text-center px-4 py-2.5">
                      {v ? (
                        <span className="inline-block w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 leading-5 text-center font-bold">✓</span>
                      ) : (
                        <span className="inline-block w-5 h-5 rounded-full bg-slate-100 text-slate-300 leading-5 text-center">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 테넌트 스코핑 설명 */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-sm p-5">
        <h3 className="text-sm font-bold text-amber-800 mb-2">테넌트(지점) 데이터 격리</h3>
        <div className="text-xs text-amber-700 space-y-1">
          <p>• <strong>TEACHER</strong>: 자기 반(Classroom)에 배정된 학생만 조회</p>
          <p>• <strong>OWNER</strong>: 자기 지점의 학생/교사/반/시험/숙제 전체 관리</p>
          <p>• <strong>SUPER_ADMIN</strong>: 모든 지점 데이터에 제한 없이 접근 + 지점 생성/관리</p>
        </div>
      </div>
    </div>
  );
}
