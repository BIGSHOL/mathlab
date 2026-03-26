import Link from 'next/link';
import {
  BookOpen,
  BarChart3,
  Trophy,
  ArrowRight,
  Newspaper,
  Calculator,
  ClipboardCheck,
  CalendarCheck,
  FileSpreadsheet,
  PenLine,
  FileText,
  Users,
  Database,
  Zap,
  Brain,
  Target,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  Radio,
  School,
  Timer,
  Flame,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LogoIcon } from '@/components/ui/LogoIcon';

const features = [
  {
    icon: BookOpen,
    title: '5단계 개념 학습',
    description:
      '읽기 → 빈칸(쉬움) → 빈칸(어려움) → 통문장 암기 → 백지 복원까지, 단계별로 개념을 완벽하게 체화합니다.',
    color: 'text-stage-reading',
    bg: 'bg-blue-50',
  },
  {
    icon: Calculator,
    title: '무한 연산 생성기',
    description:
      '79개 이상의 연산 카테고리에서 난이도별 문제를 무한 생성. 사칙연산부터 분수·소수까지.',
    color: 'text-primary',
    bg: 'bg-indigo-50',
  },
  {
    icon: Database,
    title: '문제 은행',
    description:
      '교육과정 체계에 맞춘 문제 관리. AI 자동 생성, PDF 추출, 직접 입력을 모두 지원합니다.',
    color: 'text-stage-blank-hard',
    bg: 'bg-orange-50',
  },
  {
    icon: ClipboardCheck,
    title: '시험 · 레벨테스트',
    description:
      '맞춤형 시험 출제와 진단 레벨테스트로 학생의 현재 수준과 취약 영역을 정확히 파악합니다.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
  {
    icon: CalendarCheck,
    title: '숙제 관리',
    description:
      '개념 숙제와 문제 숙제를 출제하고, 학생별 제출 현황과 완료율을 실시간으로 추적합니다.',
    color: 'text-stage-blank-easy',
    bg: 'bg-emerald-50',
  },
  {
    icon: BarChart3,
    title: '학습 분석',
    description:
      '학생별 진도율, 정답률, 취약 단원을 시각적으로 분석하여 데이터 기반 지도를 가능하게 합니다.',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    icon: Brain,
    title: '간격 반복 복습',
    description:
      '에빙하우스 망각곡선 기반으로 오답을 3일→7일→14일→30일→60일 간격으로 자동 복습. 숙제와 학습에 슬쩍 끼워넣어 자연스럽게 기억을 강화합니다.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
];

const stages = [
  {
    number: '01',
    title: '개념 읽기',
    description: '수학 개념을 수식과 함께 체계적으로 학습합니다.',
    color: 'border-stage-reading',
    textColor: 'text-stage-reading',
    bgColor: 'bg-blue-50/50',
    xp: '5 XP',
  },
  {
    number: '02',
    title: '빈칸 채우기 (쉬움)',
    description: '핵심 키워드를 빈칸에 채워보며 기억합니다.',
    color: 'border-stage-blank-easy',
    textColor: 'text-stage-blank-easy',
    bgColor: 'bg-emerald-50/50',
    xp: '10 XP',
  },
  {
    number: '03',
    title: '빈칸 채우기 (어려움)',
    description: '대부분의 내용을 스스로 채워보며 심화합니다.',
    color: 'border-stage-blank-hard',
    textColor: 'text-stage-blank-hard',
    bgColor: 'bg-orange-50/50',
    xp: '15 XP',
  },
  {
    number: '04',
    title: '통문장 암기',
    description: '전체 빈칸을 채우며 개념을 완벽히 복원합니다.',
    color: 'border-violet-400',
    textColor: 'text-violet-500',
    bgColor: 'bg-violet-50/50',
    xp: '20 XP',
  },
  {
    number: '05',
    title: '백지 복원',
    description: '아무 도움 없이 백지에서 개념 전체를 작성합니다.',
    color: 'border-stage-blank-page',
    textColor: 'text-stage-blank-page',
    bgColor: 'bg-purple-50/50',
    xp: '30 XP',
  },
];

const teacherTools = [
  { icon: Users, label: '학생 관리', desc: '학생 정보 조회 · 검색 · 상세 관리' },
  { icon: School, label: '반 관리', desc: '반/학급 편성 및 학생 배정' },
  { icon: BookOpen, label: '개념 관리', desc: '수학 개념 CRUD · 빈칸 자동생성' },
  { icon: Database, label: '문제 은행', desc: '교육과정 기반 문제 검색 · 필터' },
  { icon: Calculator, label: '연산 생성기', desc: '79개 카테고리 무한 문제 생성' },
  { icon: CalendarCheck, label: '숙제 관리', desc: '연산 · 개념 · 문제 숙제 출제' },
  { icon: ClipboardCheck, label: '시험 관리', desc: '시험 출제 · 배정 · 결과 분석' },
  { icon: Target, label: '레벨테스트', desc: '진단 테스트로 취약 영역 파악' },
  { icon: Radio, label: '실시간 퀴즈', desc: 'PIN 입력 실시간 퀴즈 세션' },
  { icon: FileSpreadsheet, label: '학습지', desc: '교육과정 기반 문제지 위자드' },
  { icon: PenLine, label: '수기 채점', desc: '서술형 답안 수기 채점 인터페이스' },
  { icon: FileText, label: 'PDF 추출', desc: 'PDF 문제집 → AI 구조화 추출' },
  { icon: BarChart3, label: '학습 분석', desc: '진도율 · 정답률 · 취약 단원 분석' },
  { icon: ScrollText, label: '리포트', desc: 'AI 레벨테스트 보고서 생성' },
];

const stats = [
  { value: '초3 ~ 고3', label: '지원 학년' },
  { value: '79+', label: '연산 카테고리' },
  { value: '5단계', label: '개념 학습법' },
  { value: 'AI', label: '자동 문제 생성' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-y-auto h-screen">
      {/* 고정 워터마크 */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
        <LogoIcon className="w-[400px] h-[400px] text-slate-300 opacity-[0.04]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 md:px-10 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-6 h-6" />
          <h2 className="text-lg font-bold tracking-tight text-text-primary">Injaewon MathLAB</h2>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/updates"
            className="text-sm text-text-secondary hover:text-primary transition-colors font-medium flex items-center gap-1.5"
          >
            <Newspaper className="w-4 h-4" />
            업데이트
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              로그인
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm">시작하기</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 to-white pointer-events-none" />
          <div className="max-w-[1400px] mx-auto px-4 py-20 md:py-28 relative">
            <div className="flex flex-col items-center text-center gap-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-primary text-sm font-bold border border-blue-100">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                초등 · 중등 · 고등 수학 학습 관리 플랫폼
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-text-primary">
                개념부터 시험까지
                <br />
                올인원 수학 학습
                <br />
                <span className="text-primary">Injaewon MathLAB</span>
              </h1>
              <p className="text-text-secondary text-lg md:text-xl max-w-2xl leading-relaxed">
                5단계 개념 학습, 무한 연산 연습, AI 문제 생성, 시험·숙제 관리까지.
                <br className="hidden md:block" />
                선생님과 학생 모두를 위한 스마트 수학 플랫폼입니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link href="/login">
                  <Button size="lg">
                    학습 시작하기
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="ghost">
                    기능 둘러보기
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-slate-100 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-black text-primary">{stat.value}</div>
                  <div className="text-sm text-text-secondary mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-slate-50/50 border-b border-slate-100 py-20 md:py-28">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-primary font-bold text-sm tracking-widest uppercase">
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-black mt-4 text-text-primary">핵심 기능</h2>
              <p className="text-text-secondary text-lg mt-4 max-w-xl mx-auto">
                수학 학습의 모든 단계를 하나의 플랫폼에서 관리하세요.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              {features.map((feature, idx) => (
                <Card
                  key={feature.title}
                  className={`p-8 hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group w-full md:w-[calc(50%-16px)] ${idx < 4 ? 'lg:w-[calc(25%-24px)]' : 'lg:w-[calc(33.333%-22px)]'}`}
                >
                  <div
                    className={`${feature.bg} w-14 h-14 rounded-sm flex items-center justify-center ${feature.color} mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-text-primary">{feature.title}</h3>
                  <p className="text-text-secondary leading-relaxed ">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 5-Stage Learning Section */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-primary font-bold text-sm tracking-widest uppercase">
                Learning Method
              </span>
              <h2 className="text-3xl md:text-4xl font-black mt-4 text-text-primary">
                5단계 학습법
              </h2>
              <p className="text-text-secondary text-lg mt-4 max-w-xl mx-auto">
                단계별 반복 학습으로 수학 개념을 장기 기억으로 전환합니다.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {stages.map((stage) => (
                <div
                  key={stage.number}
                  className={`flex flex-col gap-3 p-5 rounded-sm border-2 ${stage.color} ${stage.bgColor} hover:shadow-lg transition-all group`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-black ${stage.textColor}`}>{stage.number}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.bgColor} ${stage.textColor}`}>
                      {stage.xp}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-text-primary">{stage.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed ">
                    {stage.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <p className="text-text-secondary">
                각 단계를 완료할 때마다 <span className="font-bold text-secondary">XP 포인트</span>를
                획득하고, 레벨업과 랭킹 경쟁으로 학습 동기를 유지합니다.
              </p>
            </div>
          </div>
        </section>

        {/* Teacher & Student Section */}
        <section className="bg-slate-50/50 border-y border-slate-100 py-20 md:py-28">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* 선생님 */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
                  <GraduationCap className="w-4 h-4" />
                  선생님
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-text-primary mb-4">
                  학원 운영에 필요한
                  <br />
                  모든 도구를 한 곳에
                </h3>
                <p className="text-text-secondary leading-relaxed mb-8">
                  학생·반 관리, 개념·문제 관리, 숙제 출제, 시험·레벨테스트, 실시간 퀴즈, 학습지 생성,
                  수기 채점, PDF 문제 추출, AI 리포트까지 — 수학 학원의 모든 업무를 디지털로 전환합니다.
                </p>
                <div className="overflow-x-clip overflow-y-visible [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                  <div className="flex gap-2 w-max animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused] py-10 -my-10">
                    {[...teacherTools, ...teacherTools].map((tool, i) => (
                      <div
                        key={`${tool.label}-${i}`}
                        className="group/chip relative flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white border border-slate-200 shrink-0 hover:border-primary hover:shadow-md hover:scale-105 transition-all cursor-default"
                      >
                        <tool.icon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-medium text-text-secondary group-hover/chip:text-primary whitespace-nowrap transition-colors">{tool.label}</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded-sm whitespace-nowrap opacity-0 group-hover/chip:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                          {tool.desc}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 학생 */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-bold mb-6">
                  <Trophy className="w-4 h-4" />
                  학생
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-text-primary mb-4">
                  게임처럼 재미있는
                  <br />
                  수학 학습 경험
                </h3>
                <p className="text-text-secondary leading-relaxed mb-8">
                  개념 학습, 빈칸 암기, 연산 연습, 시험 응시까지 모든 학습을 온라인으로. XP 포인트와
                  랭킹 시스템으로 자기주도 학습 습관을 만들어갑니다.
                </p>
                <div className="overflow-x-clip overflow-y-visible [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                  <div className="flex gap-2 w-max animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused] py-10 -my-10">
                    {[...Array(2)].flatMap((_, setIdx) =>
                      [
                        { icon: Brain, text: '5단계 개념 학습', desc: '읽기 → 빈칸 → 통문장 → 백지 복원' },
                        { icon: Zap, text: '연산 연습', desc: '79개 카테고리 무한 문제 풀기' },
                        { icon: Timer, text: '타임어택', desc: '시간 제한 연산 속도 챌린지' },
                        { icon: Flame, text: '일일 미션', desc: '매일 자동 생성되는 학습 미션' },
                        { icon: Target, text: '레벨테스트', desc: '취약 영역 진단 · AI 보고서' },
                        { icon: Trophy, text: 'XP · 랭킹', desc: '포인트 · 레벨업 · 뱃지 시스템' },
                        { icon: CheckCircle2, text: '숙제 · 시험', desc: '숙제 제출 · 시험 응시 · 오답 복수전' },
                      ].map((item, i) => (
                        <div
                          key={`${item.text}-${setIdx}-${i}`}
                          className="group/chip relative flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white border border-slate-200 shrink-0 hover:border-secondary hover:shadow-md hover:scale-105 transition-all cursor-default"
                        >
                          <item.icon className="w-4 h-4 text-secondary shrink-0" />
                          <span className="text-xs font-medium text-text-secondary group-hover/chip:text-secondary whitespace-nowrap transition-colors">{item.text}</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded-sm whitespace-nowrap opacity-0 group-hover/chip:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                            {item.desc}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-sm bg-violet-50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-text-primary">
                AI가 함께하는 학습
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl leading-relaxed">
                AI를 활용하여 개념에서 자동으로 빈칸 문제를 생성하고, PDF에서 문제를 추출하며,
                레벨테스트 결과를 AI가 분석하여 맞춤형 보고서를 제공합니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6 w-full max-w-4xl">
                {[
                  {
                    title: '빈칸 자동 생성',
                    desc: '개념 내용을 분석하여 난이도별 빈칸 문제를 자동 생성',
                  },
                  {
                    title: 'PDF 문제 추출',
                    desc: 'PDF 파일에서 문제·보기·정답을 자동으로 인식하여 추출',
                  },
                  {
                    title: '도형·그래프 분석',
                    desc: '수학 도형과 그래프를 자동 인식하여 구조화된 SVG로 변환',
                  },
                  {
                    title: 'AI 학습 보고서',
                    desc: '레벨테스트 결과를 AI가 분석하여 취약 영역 맞춤 보고서 생성',
                  },
                ].map((item) => (
                  <Card key={item.title} padding="lg" className="text-left">
                    <h4 className="font-bold text-text-primary mb-2">{item.title}</h4>
                    <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-slate-100 bg-gradient-to-b from-blue-50/60 to-white py-20 md:py-28">
          <div className="max-w-[1400px] mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-text-primary mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-text-secondary text-lg max-w-xl mx-auto mb-8">
              Injaewon MathLAB과 함께 더 효율적인 수학 학습을 경험해보세요.
            </p>
            <Link href="/login">
              <Button size="lg">
                무료로 시작하기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 md:px-10 bg-white">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <LogoIcon className="w-4 h-4" />
            <span>&copy; 2026 Injaewon MathLAB. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm text-text-secondary">
            <Link href="/updates" className="hover:text-primary transition-colors">
              업데이트
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
