'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  Database,
  Sparkles,
  BarChart3,
  Settings,
  HelpCircle,
  GraduationCap,
  Trophy,
  User,
  PenTool,
  Monitor,
  Smartphone,
  ExternalLink,
  Eye,
  ScanEye,
  FileText,
  Calculator,
  CalendarCheck,
  Zap,
  Swords,
  FileQuestion,
  Gamepad2,
  Stethoscope,
  Printer,
  CheckSquare,
  Shield,
  ToggleLeft,
  School,
  ClipboardCheck,
  Radio,
  FileUp,
  AlertTriangle,
  ScrollText,
  Layers,
  LifeBuoy,
  Newspaper,
  Route,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

interface PageInfo {
  label: string;
  href: string;
  previewHref?: string; // static HTML fallback for pages with auth issues
  icon: React.ElementType;
  group: 'teacher' | 'student';
  description: string;
}

const ALL_PAGES: PageInfo[] = [
  // ─── Teacher pages ───
  { label: '대시보드', href: '/overview', icon: LayoutDashboard, group: 'teacher', description: '선생님 대시보드 — 통계, 차트, 집중관리 학생' },
  { label: '학생 관리', href: '/students', icon: Users, group: 'teacher', description: '학생 목록 조회, 검색, 상세 정보' },
  { label: '학생 등록', href: '/students/enroll', icon: UserPlus, group: 'teacher', description: '신규 학생 등록, 일괄 등록' },
  { label: '개념 관리', href: '/concepts', icon: BookOpen, group: 'teacher', description: '수학 개념 CRUD, 빈칸 자동생성, 4단계 학습' },
  { label: '학습 과정', href: '/courses', icon: Route, group: 'teacher', description: '학습 과정 관리, 개념 순서 편성' },
  { label: '문제 은행', href: '/questions', icon: Database, group: 'teacher', description: '문제 목록, 검색, 필터, 상세 보기' },
  { label: 'AI 문제 생성', href: '/questions/generate', icon: Sparkles, group: 'teacher', description: 'AI 기반 문제 자동 생성 (Gemini)' },
  { label: '연산 문제', href: '/questions/arithmetic', icon: Calculator, group: 'teacher', description: '62개+ 카테고리 연산 문제 생성' },
  { label: 'PDF 가져오기', href: '/questions/pdf-import', icon: FileUp, group: 'teacher', description: 'PDF에서 문제 일괄 가져오기' },
  { label: '시험 관리', href: '/tests', icon: ClipboardCheck, group: 'teacher', description: '시험 목록, 배정, 결과 관리' },
  { label: '시험 출제', href: '/tests/create', icon: FileText, group: 'teacher', description: '문제 선택 → 시험 생성' },
  { label: '숙제 관리', href: '/homework', icon: CalendarCheck, group: 'teacher', description: '연산/개념/문제 숙제 플랜 관리' },
  { label: '연산 숙제 생성', href: '/homework/create', icon: Calculator, group: 'teacher', description: '연산 숙제 플랜 생성' },
  { label: '개념 숙제 생성', href: '/homework/concept-create', icon: BookOpen, group: 'teacher', description: '개념 학습 숙제 플랜 생성' },
  { label: '문제 숙제 생성', href: '/homework/question-create', icon: FileQuestion, group: 'teacher', description: '문제 풀이 숙제 플랜 생성' },
  { label: '레벨테스트', href: '/level-test', icon: Stethoscope, group: 'teacher', description: '진단 테스트 목록, 생성, 결과' },
  { label: '레벨테스트 생성', href: '/level-test/create', icon: Stethoscope, group: 'teacher', description: '새 레벨테스트 생성' },
  { label: '진단 결과', href: '/diagnostics', icon: AlertTriangle, group: 'teacher', description: '학생별 진단 결과 조회' },
  { label: '학습 분석', href: '/analytics', icon: BarChart3, group: 'teacher', description: '학부모용 리포트, 성취도 분석, 캘린더' },
  { label: '수동 채점', href: '/manual-grading', icon: CheckSquare, group: 'teacher', description: '서술형 답안 수동 채점' },
  { label: '실시간 퀴즈', href: '/quiz', icon: Radio, group: 'teacher', description: '실시간 퀴즈 세션 관리' },
  { label: '학습지 생성', href: '/worksheet/create', icon: Printer, group: 'teacher', description: '3단계 위자드로 교육과정 기반 문제지 생성' },
  { label: '리포트', href: '/reports', icon: ScrollText, group: 'teacher', description: '레벨테스트 보고서 관리, 학습 리포트' },
  { label: '설정', href: '/settings', icon: Settings, group: 'teacher', description: '프로필, 알림, 보안 설정' },
  { label: '도움말', href: '/help', icon: LifeBuoy, group: 'teacher', description: '기능별 사용 가이드, FAQ 검색' },
  { label: '업데이트 내역', href: '/updates', icon: Newspaper, group: 'teacher', description: '개발 히스토리, 변경 사항 확인' },
  { label: '고객지원', href: '/support', icon: HelpCircle, group: 'teacher', description: 'FAQ, 문의하기' },
  // ─── Admin pages ───
  { label: '사용자 관리', href: '/admin/users', icon: Shield, group: 'teacher', description: '[관리자] 전체 사용자 관리' },
  { label: '기능 토글', href: '/admin/features', icon: ToggleLeft, group: 'teacher', description: '[관리자] 기능 플래그 관리' },
  { label: '반 관리', href: '/admin/classrooms', icon: School, group: 'teacher', description: '[관리자] 반/학급 관리' },
  { label: '학생 화면 보기', href: '/student-preview', icon: ScanEye, group: 'teacher', description: '[관리자] 학생 시점으로 페이지 확인' },
  { label: '다이어그램 미리보기', href: '/mockups/diagrams', icon: Layers, group: 'teacher', description: '[관리자] 26개 SVG 다이어그램 타입 미리보기' },
  // ─── Student pages ───
  { label: '학생 대시보드', href: '/dashboard', previewHref: '/mockup/student-dashboard.html', icon: GraduationCap, group: 'student', description: '레벨, XP, 숙제 배너, 진행 중인 학습' },
  { label: '단원 목록', href: '/subjects', icon: BookOpen, group: 'student', description: '학년별 과목/개념 목록, 진행도' },
  { label: '개념 학습', href: '/concepts/[id]', previewHref: '/mockup/concept-learning.html', icon: PenTool, group: 'student', description: '4단계 학습 (읽기→빈칸→백지쓰기)' },
  { label: '내 시험', href: '/my-tests', icon: ClipboardCheck, group: 'student', description: '배정된 시험 목록, 응시, 결과' },
  { label: '연산 연습', href: '/practice/arithmetic', icon: Calculator, group: 'student', description: '카테고리별 연산 문제 풀기' },
  { label: '연산 숙제', href: '/practice/arithmetic/homework', icon: CalendarCheck, group: 'student', description: '오늘의 연산 숙제 풀기' },
  { label: '타임어택', href: '/practice/arithmetic/time-attack', icon: Zap, group: 'student', description: '시간 제한 연산 도전' },
  { label: '문제 숙제', href: '/practice/question-homework', icon: FileQuestion, group: 'student', description: '배정된 문제 숙제 풀기' },
  { label: '복수전', href: '/practice/revenge', icon: Swords, group: 'student', description: '틀린 문제 다시 풀기' },
  { label: '퀴즈 참여', href: '/quiz-join', icon: Gamepad2, group: 'student', description: '실시간 퀴즈 참여 (PIN 입력)' },
  { label: '랭킹', href: '/ranking', icon: Trophy, group: 'student', description: 'XP 기반 학생 랭킹' },
  { label: '프로필', href: '/profile', icon: User, group: 'student', description: '개인 정보, 학습 이력' },
];

const IFRAME_SIZES: Record<ViewMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: '데스크톱' },
  tablet: { width: '768px', label: '태블릿' },
  mobile: { width: '375px', label: '모바일' },
};

export default function MockupsPage() {
  const [activeGroup, setActiveGroup] = useState<'all' | 'teacher' | 'student'>('all');
  const [previewPage, setPreviewPage] = useState<PageInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

  const teacherPages = ALL_PAGES.filter((p) => p.group === 'teacher');
  const studentPages = ALL_PAGES.filter((p) => p.group === 'student');
  const filteredPages = activeGroup === 'all' ? ALL_PAGES : activeGroup === 'teacher' ? teacherPages : studentPages;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight text-text-primary flex items-center gap-3">
            <Eye className="w-8 h-8 text-primary" />
            목업 미리보기
          </h1>
          <p className="text-text-secondary text-sm">
            모든 페이지를 한 곳에서 확인하세요. 총 {ALL_PAGES.length}개 페이지
          </p>
        </div>

        {/* Group Filter */}
        <div className="flex gap-2">
          {[
            { key: 'all' as const, label: '전체' },
            { key: 'teacher' as const, label: '선생님' },
            { key: 'student' as const, label: '학생' },
          ].map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              className={`px-4 py-2 rounded-sm text-sm font-bold transition-colors ${
                activeGroup === g.key
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewPage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
          {/* Preview Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <previewPage.icon className="w-5 h-5 text-primary" />
              <span className="font-bold text-text-primary">{previewPage.label}</span>
              <span className="text-xs text-text-secondary bg-slate-100 px-2 py-0.5 rounded">
                {previewPage.href}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Viewport Toggle */}
              <div className="flex gap-1 bg-slate-100 rounded-sm p-1">
                {([
                  { key: 'desktop' as ViewMode, icon: Monitor },
                  { key: 'tablet' as ViewMode, icon: Monitor },
                  { key: 'mobile' as ViewMode, icon: Smartphone },
                ]).map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setViewMode(v.key)}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === v.key
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={IFRAME_SIZES[v.key].label}
                  >
                    <v.icon className={`${v.key === 'mobile' ? 'w-4 h-4' : v.key === 'tablet' ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  </button>
                ))}
              </div>
              <a
                href={previewPage.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
              >
                새 탭 <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewPage(null)}
                className="bg-slate-100 hover:bg-slate-200"
              >
                닫기
              </Button>
            </div>
          </div>
          {/* iframe */}
          <div className="flex-1 flex justify-center items-start p-4 overflow-auto">
            <div
              className="bg-white rounded-sm shadow-2xl overflow-hidden border border-slate-300 transition-all duration-300"
              style={{
                width: IFRAME_SIZES[viewMode].width,
                maxWidth: '100%',
                height: 'calc(100vh - 80px)',
              }}
            >
              <iframe
                src={previewPage.previewHref ?? previewPage.href}
                className="w-full h-full border-none"
                title={previewPage.label}
              />
            </div>
          </div>
        </div>
      )}

      {/* Page Cards Grid */}
      {(activeGroup === 'all' || activeGroup === 'teacher') && (
        <div className="mb-10">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            선생님 페이지
            <span className="text-xs text-text-secondary font-normal ml-1">({teacherPages.length}개)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(activeGroup === 'all' ? teacherPages : filteredPages.filter((p) => p.group === 'teacher')).map((page) => (
              <Card
                key={page.href}
                className="p-5 flex flex-col gap-3 hover:shadow-hover transition-all cursor-pointer group"
                onClick={() => setPreviewPage(page)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <page.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-text-primary truncate">{page.label}</h3>
                    <span className="text-xs text-text-secondary font-mono">{page.href}</span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{page.description}</p>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewPage(page); }}
                    className="flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" /> 미리보기
                  </button>
                  <a
                    href={page.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary font-medium ml-auto"
                  >
                    새 탭 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(activeGroup === 'all' || activeGroup === 'student') && (
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-secondary" />
            학생 페이지
            <span className="text-xs text-text-secondary font-normal ml-1">({studentPages.length}개)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(activeGroup === 'all' ? studentPages : filteredPages.filter((p) => p.group === 'student')).map((page) => (
              <Card
                key={page.href}
                className="p-5 flex flex-col gap-3 hover:shadow-hover transition-all cursor-pointer group"
                onClick={() => setPreviewPage(page)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                    <page.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-text-primary truncate">{page.label}</h3>
                      {page.previewHref && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">HTML</span>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary font-mono">{page.href}</span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{page.description}</p>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewPage(page); }}
                    className="flex items-center gap-1 text-xs text-secondary font-bold hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" /> 미리보기
                  </button>
                  <a
                    href={page.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-secondary font-medium ml-auto"
                  >
                    새 탭 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Static Mockup Section */}
      <div className="mt-10 pt-8 border-t border-slate-200">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-slate-500" />
          정적 HTML 목업
          <span className="text-xs text-text-secondary font-normal ml-1">(로그인 없이 바로 확인)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: '문제 풀이', href: '/mockup/solve.html', description: '시험형 문제 풀이, 수학 키보드, 수식 렌더링' },
            { label: '학생 대시보드', href: '/mockup/student-dashboard.html', description: '레벨, XP, 진행 중인 학습, 주간 활동' },
            { label: '개념 학습', href: '/mockup/concept-learning.html', description: '4단계 학습 빈칸 채우기, 수식 표시' },
          ].map((mockup) => (
            <Card key={mockup.href} className="p-5 flex flex-col gap-3 hover:shadow-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-slate-100 text-slate-500 flex items-center justify-center">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">{mockup.label}</h3>
                  <span className="text-xs text-text-secondary font-mono">{mockup.href}</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary">{mockup.description}</p>
              <a
                href={mockup.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-primary font-bold hover:underline mt-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" /> 새 탭에서 열기
              </a>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
