'use client';

import { useState, useMemo } from 'react';
import {
  LayoutDashboard, Users, UserPlus, BookOpen, Database, Sparkles, BarChart3, Settings,
  HelpCircle, GraduationCap, Trophy, User, Monitor, Smartphone, ExternalLink,
  Eye, ScanEye, FileText, Calculator, CalendarCheck, Zap, Swords, FileQuestion,
  Gamepad2, Stethoscope, Printer, CheckSquare, Shield, ToggleLeft, School, ClipboardCheck,
  Radio, FileUp, AlertTriangle, ScrollText, Layers, LifeBuoy, Newspaper, Route, KeyRound,
  Building2, Search, Gem,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

interface PageInfo {
  label: string;
  href: string;
  icon: React.ElementType;
  group: 'teacher' | 'student' | 'admin' | 'dev';
  category: string;
  description: string;
  isNew?: boolean;
}

const ALL_PAGES: PageInfo[] = [
  // ─── Teacher: 홈 ───
  { label: '대시보드', href: '/overview', icon: LayoutDashboard, group: 'teacher', category: '홈', description: '선생님 대시보드 — 통계, 차트, 집중관리 학생' },
  { label: '대시보드 v2', href: '/overview/v2', icon: LayoutDashboard, group: 'teacher', category: '홈', description: '새 대시보드 (실험)' },

  // ─── Teacher: 수업 ───
  { label: '학생 관리', href: '/students', icon: Users, group: 'teacher', category: '수업', description: '학생 목록 조회, 검색, 상세 정보' },
  { label: '학생 등록', href: '/students/enroll', icon: UserPlus, group: 'teacher', category: '수업', description: '신규 학생 등록, 일괄 등록' },
  { label: '개념 관리', href: '/concepts', icon: BookOpen, group: 'teacher', category: '수업', description: '수학 개념 CRUD, 빈칸 자동생성, 5단계 학습' },
  { label: '문제 은행', href: '/questions', icon: Database, group: 'teacher', category: '수업', description: '문제 목록, 검색, 필터, 상세 보기' },
  { label: '학습 과정', href: '/courses', icon: Route, group: 'teacher', category: '수업', description: '학습 과정 관리, 개념 순서 편성' },
  { label: '과정 생성', href: '/courses/create', icon: Route, group: 'teacher', category: '수업', description: '새 학습 과정 만들기' },

  // ─── Teacher: 출제·평가 ───
  { label: '연산 생성기', href: '/questions/arithmetic', icon: Calculator, group: 'teacher', category: '출제·평가', description: '79개 카테고리 연산 문제 생성' },
  { label: 'AI 문제 생성', href: '/questions/generate', icon: Sparkles, group: 'teacher', category: '출제·평가', description: 'AI 기반 문제 자동 생성 (Gemini)' },
  { label: 'PDF 추출', href: '/questions/pdf-import', icon: FileUp, group: 'teacher', category: '출제·평가', description: 'PDF에서 문제 일괄 추출 (Gemini Vision)' },
  { label: '학습지 생성', href: '/worksheet/create', icon: Printer, group: 'teacher', category: '출제·평가', description: '3단계 위자드로 교육과정 기반 문제지 생성' },
  { label: '숙제 관리', href: '/homework', icon: CalendarCheck, group: 'teacher', category: '출제·평가', description: '연산/개념/문제 숙제 플랜 관리' },
  { label: '연산 숙제 생성', href: '/homework/create', icon: Calculator, group: 'teacher', category: '출제·평가', description: '연산 숙제 플랜 생성' },
  { label: '개념 숙제 생성', href: '/homework/concept-create', icon: BookOpen, group: 'teacher', category: '출제·평가', description: '개념 학습 숙제 플랜 생성' },
  { label: '문제 숙제 생성', href: '/homework/question-create', icon: FileQuestion, group: 'teacher', category: '출제·평가', description: '문제 풀이 숙제 플랜 생성' },
  { label: '시험 관리', href: '/tests', icon: ClipboardCheck, group: 'teacher', category: '출제·평가', description: '시험 목록, 배정, 결과 관리' },
  { label: '시험 출제', href: '/tests/create', icon: FileText, group: 'teacher', category: '출제·평가', description: '문제 선택 → 시험 생성' },
  { label: '수기 채점', href: '/manual-grading', icon: CheckSquare, group: 'teacher', category: '출제·평가', description: '서술형 답안 수기 채점' },

  // ─── Teacher: 진단·분석 ───
  { label: '레벨테스트', href: '/level-test', icon: Stethoscope, group: 'teacher', category: '진단·분석', description: '진단 테스트 목록, 생성, 결과' },
  { label: '레벨테스트 생성', href: '/level-test/create', icon: Stethoscope, group: 'teacher', category: '진단·분석', description: '새 레벨테스트 생성' },
  { label: '실시간 퀴즈', href: '/quiz', icon: Radio, group: 'teacher', category: '진단·분석', description: '실시간 퀴즈 세션 관리' },
  { label: '학습 분석', href: '/analytics', icon: BarChart3, group: 'teacher', category: '진단·분석', description: '학생별 성취도 분석, 캘린더, 속도 분석' },
  { label: '진단 결과', href: '/diagnostics', icon: AlertTriangle, group: 'teacher', category: '진단·분석', description: '학생별 진단 결과 조회' },
  { label: '리포트', href: '/reports', icon: ScrollText, group: 'teacher', category: '진단·분석', description: '레벨테스트 보고서 관리 (교사용/학부모용)', isNew: true },

  // ─── Teacher: 시스템 ───
  { label: '이용권 관리', href: '/licenses', icon: KeyRound, group: 'teacher', category: '시스템', description: '학생별 기능 이용권 배정/관리' },
  { label: '설정', href: '/settings', icon: Settings, group: 'teacher', category: '시스템', description: '프로필, 알림, 보안 설정' },
  { label: '도움말', href: '/help', icon: LifeBuoy, group: 'teacher', category: '시스템', description: '기능별 사용 가이드, FAQ 검색' },
  { label: '업데이트 내역', href: '/updates', icon: Newspaper, group: 'teacher', category: '시스템', description: '개발 히스토리, 변경 사항 확인' },
  { label: '고객지원', href: '/support', icon: HelpCircle, group: 'teacher', category: '시스템', description: 'FAQ, 문의하기' },
  { label: '학생 화면 보기', href: '/student-preview', icon: ScanEye, group: 'teacher', category: '시스템', description: '학생 시점으로 페이지 확인' },

  // ─── Admin pages ───
  { label: '선생님 관리', href: '/admin/teachers', icon: UserPlus, group: 'admin', category: '팀 관리', description: '[MANAGER+] 소속 선생님 관리' },
  { label: '반 관리', href: '/admin/classrooms', icon: School, group: 'admin', category: '지점 운영', description: '[OWNER+] 반/학급 관리' },
  { label: '사용자 관리', href: '/admin/users', icon: Shield, group: 'admin', category: '지점 운영', description: '[OWNER+] 전체 사용자 관리' },
  { label: '지점 관리', href: '/admin/tenants', icon: Building2, group: 'admin', category: '플랫폼', description: '[SUPER_ADMIN] 전체 지점 관리' },
  { label: '기능 관리', href: '/admin/features', icon: ToggleLeft, group: 'admin', category: '플랫폼', description: '[SUPER_ADMIN] 기능 플래그 관리' },

  // ─── Student pages ───
  { label: '학생 대시보드', href: '/dashboard', icon: GraduationCap, group: 'student', category: '학습', description: '레벨, XP, 숙제, 일일 미션, 복수전' },
  { label: '단원 목록', href: '/subjects', icon: BookOpen, group: 'student', category: '학습', description: '학년별 과목/개념 목록, 진행도' },
  { label: '내 시험', href: '/my-tests', icon: ClipboardCheck, group: 'student', category: '시험·숙제', description: '배정된 시험 목록, 응시, 결과' },
  { label: '연산 숙제', href: '/practice/arithmetic/homework', icon: CalendarCheck, group: 'student', category: '시험·숙제', description: '오늘의 연산 숙제 풀기' },
  { label: '문제 숙제', href: '/practice/question-homework', icon: FileQuestion, group: 'student', category: '시험·숙제', description: '배정된 문제 숙제 풀기' },
  { label: '연산 연습', href: '/practice/arithmetic', icon: Calculator, group: 'student', category: '연습', description: '카테고리별 연산 문제 풀기' },
  { label: '타임어택', href: '/practice/arithmetic/time-attack', icon: Zap, group: 'student', category: '연습', description: '시간 제한 연산 도전' },
  { label: '복수전', href: '/practice/revenge', icon: Swords, group: 'student', category: '연습', description: '틀린 문제 다시 풀기' },
  { label: '퀴즈 참여', href: '/quiz-join', icon: Gamepad2, group: 'student', category: '참여', description: '실시간 퀴즈 참여 (PIN 입력)' },
  { label: '랭킹', href: '/ranking', icon: Trophy, group: 'student', category: '참여', description: 'XP 기반 학생 랭킹' },
  { label: '프로필', href: '/profile', icon: User, group: 'student', category: '참여', description: '개인 정보, 뱃지, 학습 이력' },

  // ─── Dev pages ───
  { label: '보석 목업', href: '/dev/gems', icon: Gem, group: 'dev', category: '개발', description: '6종 보석 × 5단계 × 4사이즈 SVG 미리보기' },
];

const IFRAME_SIZES: Record<ViewMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: '데스크톱' },
  tablet: { width: '768px', label: '태블릿' },
  mobile: { width: '375px', label: '모바일' },
};

const GROUP_CONFIG = {
  teacher: { label: '선생님', icon: LayoutDashboard, color: 'primary' },
  admin: { label: '관리자', icon: Shield, color: 'violet-600' },
  student: { label: '학생', icon: GraduationCap, color: 'secondary' },
  dev: { label: '개발', icon: Layers, color: 'slate-500' },
} as const;

export default function MockupsPage() {
  const [activeGroup, setActiveGroup] = useState<'all' | 'teacher' | 'admin' | 'student' | 'dev'>('all');
  const [previewPage, setPreviewPage] = useState<PageInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => ({
    all: ALL_PAGES.length,
    teacher: ALL_PAGES.filter(p => p.group === 'teacher').length,
    admin: ALL_PAGES.filter(p => p.group === 'admin').length,
    student: ALL_PAGES.filter(p => p.group === 'student').length,
    dev: ALL_PAGES.filter(p => p.group === 'dev').length,
  }), []);

  const filteredPages = useMemo(() => {
    let pages = activeGroup === 'all' ? ALL_PAGES : ALL_PAGES.filter(p => p.group === activeGroup);
    if (search.trim()) {
      const q = search.toLowerCase();
      pages = pages.filter(p =>
        p.label.toLowerCase().includes(q) ||
        p.href.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return pages;
  }, [activeGroup, search]);

  // group → category → pages
  const groupedPages = useMemo(() => {
    const result: Record<string, Record<string, PageInfo[]>> = {};
    for (const p of filteredPages) {
      if (!result[p.group]) result[p.group] = {};
      if (!result[p.group][p.category]) result[p.group][p.category] = [];
      result[p.group][p.category].push(p);
    }
    return result;
  }, [filteredPages]);

  return (
    <div className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            페이지 목업
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            전체 {ALL_PAGES.length}개 페이지를 한 곳에서 미리보기
          </p>
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="페이지 검색..."
            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary w-48"
          />
        </div>
      </div>

      {/* Group Filter */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {(['all', 'teacher', 'admin', 'student', 'dev'] as const).map(key => (
          <button
            key={key}
            onClick={() => setActiveGroup(key)}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors ${
              activeGroup === key
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            {key === 'all' ? '전체' : GROUP_CONFIG[key].label} ({counts[key]})
          </button>
        ))}
      </div>

      {/* Preview Modal */}
      {previewPage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <previewPage.icon className="w-5 h-5 text-primary" />
              <span className="font-bold text-text-primary">{previewPage.label}</span>
              <span className="text-xs text-text-secondary bg-slate-100 px-2 py-0.5 rounded font-mono">
                {previewPage.href}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-1 bg-slate-100 rounded p-0.5">
                {([
                  { key: 'desktop' as ViewMode, icon: Monitor, size: 'w-5 h-5' },
                  { key: 'tablet' as ViewMode, icon: Monitor, size: 'w-4 h-4' },
                  { key: 'mobile' as ViewMode, icon: Smartphone, size: 'w-4 h-4' },
                ]).map(v => (
                  <button
                    key={v.key}
                    onClick={() => setViewMode(v.key)}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === v.key ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={IFRAME_SIZES[v.key].label}
                  >
                    <v.icon className={v.size} />
                  </button>
                ))}
              </div>
              <a href={previewPage.href} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                새 탭 <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => setPreviewPage(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sm font-bold transition-colors">
                닫기
              </button>
            </div>
          </div>
          <div className="flex-1 flex justify-center items-start p-4 overflow-auto">
            <div className="bg-white rounded-sm shadow-2xl overflow-hidden border border-slate-300 transition-all duration-300"
              style={{ width: IFRAME_SIZES[viewMode].width, maxWidth: '100%', height: 'calc(100vh - 80px)' }}>
              <iframe src={previewPage.href} className="w-full h-full border-none" title={previewPage.label} />
            </div>
          </div>
        </div>
      )}

      {/* Page Cards by Group → Category */}
      {Object.entries(groupedPages).map(([group, categories]) => {
        const cfg = GROUP_CONFIG[group as keyof typeof GROUP_CONFIG];
        if (!cfg) return null;
        const totalCount = Object.values(categories).reduce((sum, pages) => sum + pages.length, 0);
        return (
          <div key={group} className="mb-10">
            <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
              <cfg.icon className="w-5 h-5 text-primary" />
              {cfg.label} 페이지
              <span className="text-xs text-text-secondary font-normal ml-1">({totalCount}개)</span>
            </h2>
            {Object.entries(categories).map(([category, pages]) => (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-bold text-text-secondary mb-2 flex items-center gap-2 pl-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {category}
                  <span className="text-xs font-normal text-slate-400">({pages.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {pages.map(page => (
                    <Card key={page.href}
                      className="p-4 flex flex-col gap-2 hover:shadow-hover transition-all cursor-pointer group"
                      onClick={() => setPreviewPage(page)}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                          <page.icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-text-primary truncate">{page.label}</h3>
                            {page.isNew && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">NEW</span>
                            )}
                          </div>
                          <span className="text-[11px] text-text-secondary font-mono">{page.href}</span>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{page.description}</p>
                      <div className="flex items-center gap-2 mt-auto pt-1">
                        <span className="flex items-center gap-1 text-xs text-primary font-bold">
                          <Eye className="w-3.5 h-3.5" /> 미리보기
                        </span>
                        <a href={page.href} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary font-medium ml-auto">
                          새 탭 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {filteredPages.length === 0 && (
        <div className="text-center py-16 text-text-secondary">
          <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}
