import Link from 'next/link';
import { BookOpen, BarChart3, Trophy, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const features = [
  {
    icon: BookOpen,
    title: '단계적 개념 학습',
    description:
      '읽기 → 빈칸 채우기 → 백지 쓰기까지, 4단계 학습법으로 수학 개념을 완벽하게 이해합니다.',
    color: 'text-stage-reading',
    bg: 'bg-blue-50',
  },
  {
    icon: BarChart3,
    title: '실시간 학습 분석',
    description:
      '학습 진행도, 성취율, 취약 부분을 한눈에 확인하고 맞춤형 학습 경로를 제안합니다.',
    color: 'text-stage-blank-easy',
    bg: 'bg-emerald-50',
  },
  {
    icon: Trophy,
    title: '게이미피케이션',
    description:
      'XP 포인트, 레벨업, 랭킹 시스템으로 학습 동기를 유지하고 친구와 선의의 경쟁을 합니다.',
    color: 'text-secondary',
    bg: 'bg-orange-50',
  },
];

const stages = [
  {
    number: '01',
    title: '개념 읽기',
    description: '수학 개념을 시각 자료와 함께 이해합니다.',
    color: 'border-stage-reading',
    textColor: 'text-stage-reading',
  },
  {
    number: '02',
    title: '빈칸 채우기 (쉬움)',
    description: '핵심 키워드를 빈칸에 채워보며 기억합니다.',
    color: 'border-stage-blank-easy',
    textColor: 'text-stage-blank-easy',
  },
  {
    number: '03',
    title: '빈칸 채우기 (어려움)',
    description: '대부분의 내용을 스스로 채워보며 심화합니다.',
    color: 'border-stage-blank-hard',
    textColor: 'text-stage-blank-hard',
  },
  {
    number: '04',
    title: '백지 쓰기',
    description: '아무 도움 없이 개념을 완벽히 작성합니다.',
    color: 'border-stage-blank-page',
    textColor: 'text-stage-blank-page',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 md:px-10 py-3 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-text-primary">MathLab</h2>
        </div>
        <div className="flex items-center gap-3">
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
        <section className="max-w-[1200px] mx-auto px-4 py-20 md:py-28">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-primary text-sm font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              초중등 학생을 위한 수학 학습 플랫폼
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-text-primary">
              게임처럼 재미있는
              <br />
              <span className="text-primary">수학 학습, MathLab</span>
            </h1>
            <p className="text-text-secondary text-lg md:text-xl max-w-2xl leading-relaxed">
              읽기 → 빈칸 채우기 → 백지 쓰기의 4단계 학습법과 포인트, 레벨, 랭킹 시스템으로 수학
              개념을 완벽하게 마스터하세요.
            </p>
            <div className="flex gap-4 mt-4">
              <Link href="/login">
                <Button size="lg">
                  학습 시작하기
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-slate-50/50 border-t border-slate-100 py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-primary font-bold text-sm tracking-widest uppercase">
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-black mt-4 text-text-primary">
                핵심 기능
              </h2>
              <p className="text-text-secondary text-lg mt-4 max-w-xl mx-auto">
                MathLab만의 특별한 학습 시스템을 경험해보세요.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                단계별로 깊이 있는 학습으로 개념을 완벽하게 이해합니다.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stages.map((stage) => (
                <div
                  key={stage.number}
                  className={`flex flex-col gap-4 p-6 rounded-2xl border-2 ${stage.color} bg-white hover:shadow-lg transition-all group`}
                >
                  <span className={`text-3xl font-black ${stage.textColor}`}>{stage.number}</span>
                  <h3 className="text-lg font-bold text-text-primary">{stage.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 md:px-10 bg-white">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>&copy; 2024 MathLab. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm text-text-secondary">
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
