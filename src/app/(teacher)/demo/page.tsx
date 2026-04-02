'use client';

import Link from 'next/link';
import {
  Sparkles,
  BookOpen,
  Calculator,
  BarChart3,
  CalendarCheck,
  Eye,
  Settings,
  Code2,
  Database,
  Shield,
  Layers,
  Puzzle,
  Brain,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LogoIcon } from '@/components/ui/LogoIcon';

const platformStats = [
  { value: '95,000+', label: '코드 라인 수' },
  { value: '133+', label: 'API 엔드포인트' },
  { value: '57', label: 'DB 모델' },
  { value: '526+', label: '소스 파일' },
];

const techStack = [
  { icon: Code2, label: 'Next.js 15', color: 'text-slate-700' },
  { icon: Database, label: 'PostgreSQL + Prisma', color: 'text-blue-600' },
  { icon: Brain, label: 'Gemini 2.5 Flash', color: 'text-violet-600' },
  { icon: Shield, label: 'NextAuth JWT', color: 'text-emerald-600' },
  { icon: Layers, label: 'TypeScript 5.8', color: 'text-sky-600' },
  { icon: Puzzle, label: 'Zustand + Zod', color: 'text-orange-600' },
];

export default function DemoHubPage() {
  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-50/80 via-blue-50/30 to-transparent">
        <div className="max-w-[1000px] mx-auto px-6 pt-10 pb-10">
          <div className="flex items-center gap-2.5 mb-5">
            <LogoIcon className="w-7 h-7" />
            <span className="text-lg font-black tracking-tight">Injaewon MathLAB</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full ml-2">
              <Sparkles className="w-3 h-3" />
              투자자 데모
            </span>
          </div>

          <h1 className="text-3xl font-black text-text-primary leading-tight mb-2">
            핵심 기능 체험
          </h1>
          <p className="text-base text-text-secondary max-w-xl mb-6">
            개념 5단계 학습, 연산 문제 생성, 기출 분석 — 3가지 핵심 기능을 직접 체험해보세요.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {platformStats.map((stat) => (
              <Card key={stat.label} padding="sm" className="text-center">
                <div className="text-xl font-black text-primary">{stat.value}</div>
                <div className="text-[11px] text-text-secondary font-medium">{stat.label}</div>
              </Card>
            ))}
          </div>

          {/* Tech */}
          <div className="flex flex-wrap gap-1.5">
            {techStack.map((tech) => (
              <span key={tech.label} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-sm text-[11px] font-semibold text-text-secondary">
                <tech.icon className={`w-3 h-3 ${tech.color}`} />
                {tech.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3가지 핵심 기능 */}
      <div className="max-w-[1000px] mx-auto px-6 pb-16 space-y-6">

        {/* Feature 1: 개념 5단계 */}
        <Card padding="lg" className="border-l-4 border-l-blue-500">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-sm flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-text-primary">5단계 개념 학습</h2>
                <Badge variant="info">핵심</Badge>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                읽기 → 빈칸(쉬움) → 빈칸(어려움) → 통문장 암기 → 백지 복원. 단계별로 개념을 완벽 체화하는 학습 시스템입니다.
              </p>

              {/* 5단계 시각화 */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {[
                  { stage: '1단계', name: '읽기', xp: '5XP', color: 'border-blue-300 bg-blue-50/50 text-blue-700' },
                  { stage: '2단계', name: '빈칸(쉬움)', xp: '10XP', color: 'border-emerald-300 bg-emerald-50/50 text-emerald-700' },
                  { stage: '3단계', name: '빈칸(어려움)', xp: '15XP', color: 'border-orange-300 bg-orange-50/50 text-orange-700' },
                  { stage: '4단계', name: '통문장', xp: '20XP', color: 'border-rose-300 bg-rose-50/50 text-rose-700' },
                  { stage: '5단계', name: '백지 복원', xp: '30XP', color: 'border-violet-300 bg-violet-50/50 text-violet-700' },
                ].map((s) => (
                  <div key={s.stage} className={`border-l-2 ${s.color} px-2 py-1.5 rounded-sm text-center`}>
                    <div className="text-[10px] font-bold">{s.stage}</div>
                    <div className="text-xs font-bold">{s.name}</div>
                    <div className="text-[10px] opacity-70">{s.xp}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Link href="/concepts">
                  <Button size="sm" variant="primary">
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    선생님: 개념 관리
                  </Button>
                </Link>
                <Link href="/student-preview">
                  <Button size="sm" variant="ghost">
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    학생: 5단계 체험
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Feature 2: 연산 문제 */}
        <Card padding="lg" className="border-l-4 border-l-indigo-500">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-sm flex items-center justify-center shrink-0">
              <Calculator className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-text-primary">무한 연산 생성기</h2>
                <Badge variant="success">즉시 체험</Badge>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                79개 카테고리, 무한 연산 문제 자동 생성. 초등 사칙연산부터 중등 정수·유리수까지. 별도 데이터 없이 즉시 동작합니다.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {['덧셈', '뺄셈', '곱셈', '나눗셈', '분수', '소수', '정수', '유리수'].map((cat) => (
                  <span key={cat} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm text-xs font-medium">
                    {cat}
                  </span>
                ))}
                <span className="px-2 py-0.5 bg-slate-100 text-text-secondary rounded-sm text-xs">+71개</span>
              </div>

              <div className="flex gap-2">
                <Link href="/questions/arithmetic">
                  <Button size="sm" variant="primary">
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    선생님: 연산 프린트
                  </Button>
                </Link>
                <Link href="/student-preview">
                  <Button size="sm" variant="ghost">
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    학생: 연산 연습
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Feature 3: 기출 분석 */}
        <Card padding="lg" className="border-l-4 border-l-rose-500">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-sm flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-text-primary">기출 분석</h2>
                <Badge variant="info">AI</Badge>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                PDF 시험지 업로드 → Gemini AI가 문항별 난이도·유형·능력·단원 분석 + 학습 전략 생성. 3개 학교 분석 결과가 준비되어 있습니다.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {['대구일중', '경명여중', '침산중'].map((school) => (
                  <span key={school} className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-sm text-xs font-medium border border-rose-200">
                    {school} 중3 중간고사
                  </span>
                ))}
              </div>

              <Link href="/exam-analysis">
                <Button size="sm" variant="primary">
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  분석 결과 확인
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* 숙제 관리 */}
        <Card padding="lg" className="bg-slate-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-sm flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-text-primary">숙제 관리</h2>
              </div>
              <p className="text-sm text-text-secondary mb-3">
                위 3가지 기능과 연계된 숙제를 출제하고 학생별 제출 현황을 추적합니다. 개념 숙제 + 연산 숙제가 준비되어 있습니다.
              </p>
              <Link href="/homework">
                <Button size="sm" variant="ghost">
                  숙제 관리 &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* 역할 체계 간략 */}
        <div className="pt-4">
          <p className="text-xs text-text-secondary mb-2 font-bold uppercase tracking-widest">Role Hierarchy</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { role: '학생', color: 'bg-sky-50 text-sky-700 border-sky-200' },
              { role: '선생님', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { role: '팀장', color: 'bg-violet-50 text-violet-700 border-violet-200' },
              { role: '원장', color: 'bg-amber-50 text-amber-700 border-amber-200', active: true },
              { role: '플랫폼 관리자', color: 'bg-rose-50 text-rose-700 border-rose-200' },
            ].map((r, i) => (
              <span key={r.role} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-300 mr-0.5">&rarr;</span>}
                <span className={`inline-flex items-center px-2 py-1 border rounded-sm text-[11px] font-bold ${r.color} ${r.active ? 'ring-2 ring-primary/30' : ''}`}>
                  {r.role}
                  {r.active && <span className="ml-1 text-[9px] opacity-60">(현재)</span>}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
