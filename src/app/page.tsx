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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LogoIcon } from '@/components/ui/LogoIcon';

const features = [
  {
    icon: BookOpen,
    title: '4단계 개념 학습',
    description:
      '읽기 → 빈칸(쉬움) → 빈칸(어려움) → 통문장 암기까지, 단계별로 개념을 완벽하게 체화합니다.',
    color: 'text-stage-reading',
    bg: 'bg-blue-50',
  },
  {
    icon: Calculator,
    title: '무한 연산 생성기',
    description:
      '78개 이상의 연산 카테고리에서 난이도별 문제를 무한 생성. 사칙연산부터 분수·소수까지.',
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
];

const stages = [
  {
    number: '01',
    title: '개념 읽기',
    description: '수학 개념을 KaTeX 수식과 함께 체계적으로 학습합니다.',
    color: 'border-stage-reading',
    textColor: 'text-stage-reading',
    bgColor: 'bg-blue-50/50',
  },
  {
    number: '02',
    title: '빈칸 채우기 (쉬움)',
    description: '핵심 키워드를 빈칸에 채워보며 기억합니다.',
    color: 'border-stage-blank-easy',
    textColor: 'text-stage-blank-easy',
    bgColor: 'bg-emerald-50/50',
  },
  {
    number: '03',
    title: '빈칸 채우기 (어려움)',
    description: '대부분의 내용을 스스로 채워보며 심화합니다.',
    color: 'border-stage-blank-hard',
    textColor: 'text-stage-blank-hard',
    bgColor: 'bg-orange-50/50',
  },
  {
    number: '04',
    title: '통문장 암기',
    description: '아무 도움 없이 개념을 완벽히 작성합니다.',
    color: 'border-stage-blank-page',
    textColor: 'text-stage-blank-page',
    bgColor: 'bg-violet-50/50',
  },
];

const teacherTools = [
  { icon: Users, label: '학생 관리' },
  { icon: BookOpen, label: '개념 관리' },
  { icon: Database, label: '문제 은행' },
  { icon: Calculator, label: '연산 생성기' },
  { icon: CalendarCheck, label: '숙제 관리' },
  { icon: ClipboardCheck, label: '시험 관리' },
  { icon: FileSpreadsheet, label: '학습지' },
  { icon: PenLine, label: '수기 채점' },
  { icon: FileText, label: 'PDF 추출' },
  { icon: BarChart3, label: '학습 분석' },
];

const stats = [
  { value: '초3 ~ 고3', label: '지원 학년' },
  { value: '78+', label: '연산 카테고리' },
  { value: '4단계', label: '개념 학습법' },
  { value: 'AI', label: '자동 문제 생성' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-y-auto h-screen">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 md:px-10 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-6 h-6" />
          <h2 className="text-lg font-bold tracking-tight text-text-primary">MathLab</h2>
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
          <div className="max-w-[1200px] mx-auto px-4 py-20 md:py-28 relative">
            <div className="flex flex-col items-center text-center gap-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-primary text-sm font-bold border border-blue-100">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                초등 · 중등 · 고등 수학 학습 관리 플랫폼
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-text-primary">
                개념부터 시험까지
                <br />
                <span className="text-primary">올인원 수학 학습, MathLab</span>
              </h1>
              <p className="text-text-secondary text-lg md:text-xl max-w-2xl leading-relaxed">
                4단계 개념 학습, 무한 연산 연습, AI 문제 생성, 시험·숙제 관리까지.
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
          <div className="max-w-[1200px] mx-auto px-4 py-12">
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
          <div className="max-w-[1200px] mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-primary font-bold text-sm tracking-widest uppercase">
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-black mt-4 text-text-primary">핵심 기능</h2>
              <p className="text-text-secondary text-lg mt-4 max-w-xl mx-auto">
                수학 학습의 모든 단계를 하나의 플랫폼에서 관리하세요.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="p-8 hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div
                    className={`${feature.bg} w-14 h-14 rounded-2xl flex items-center justify-center ${feature.color} mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-text-primary">{feature.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 4-Stage Learning Section */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-primary font-bold text-sm tracking-widest uppercase">
                Learning Method
              </span>
              <h2 className="text-3xl md:text-4xl font-black mt-4 text-text-primary">
                4단계 학습법
              </h2>
              <p className="text-text-secondary text-lg mt-4 max-w-xl mx-auto">
                단계별 반복 학습으로 수학 개념을 장기 기억으로 전환합니다.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stages.map((stage) => (
                <div
                  key={stage.number}
                  className={`flex flex-col gap-4 p-6 rounded-2xl border-2 ${stage.color} ${stage.bgColor} hover:shadow-lg transition-all group`}
                >
                  <span className={`text-3xl font-black ${stage.textColor}`}>{stage.number}</span>
                  <h3 className="text-lg font-bold text-text-primary">{stage.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
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
          <div className="max-w-[1200px] mx-auto px-4">
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
                  학생 관리, 개념·문제 관리, 숙제 출제, 시험·레벨테스트, 학습지 생성, 수기 채점, PDF
                  문제 추출까지 — 수학 학원의 모든 업무를 디지털로 전환합니다.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {teacherTools.map((tool) => (
                    <div
                      key={tool.label}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <tool.icon className="w-5 h-5 text-primary" />
                      <span className="text-xs font-medium text-text-secondary">{tool.label}</span>
                    </div>
                  ))}
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
                <div className="space-y-3">
                  {[
                    { icon: Brain, text: '4단계 개념 학습으로 체계적 암기' },
                    { icon: Zap, text: '연산 연습으로 계산력 강화' },
                    { icon: Target, text: '레벨테스트로 취약 영역 진단' },
                    { icon: Trophy, text: 'XP · 레벨 · 랭킹으로 동기 부여' },
                    { icon: CheckCircle2, text: '숙제 제출 · 시험 응시 · 오답 복습' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                        <item.icon className="w-4.5 h-4.5 text-secondary" />
                      </div>
                      <span className="text-sm font-medium text-text-primary">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-4">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-text-primary">
                AI가 함께하는 학습
              </h2>
              <p className="text-text-secondary text-lg max-w-2xl leading-relaxed">
                AI를 활용하여 개념에서 자동으로 빈칸 문제를 생성하고, PDF에서 문제를 추출하며,
                학습 데이터를 분석합니다. 선생님의 시간을 절약하고 학생에게 맞춤형 학습을
                제공합니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 w-full max-w-3xl">
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
                    title: '도형·이미지 분석',
                    desc: '수학 도형과 그래프를 자동으로 크롭하고 문제에 매칭',
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
          <div className="max-w-[1200px] mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-text-primary mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-text-secondary text-lg max-w-xl mx-auto mb-8">
              MathLab과 함께 더 효율적인 수학 학습을 경험해보세요.
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
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <LogoIcon className="w-4 h-4" />
            <span>&copy; 2026 MathLab. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm text-text-secondary">
            <Link href="/updates" className="hover:text-primary transition-colors">
              업데이트
            </Link>
            <a href="#" className="hover:text-primary transition-colors">
              이용약관
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              개인정보처리방침
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
