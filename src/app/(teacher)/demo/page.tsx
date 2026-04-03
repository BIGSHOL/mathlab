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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LogoIcon } from '@/components/ui/LogoIcon';

export default function DemoHubPage() {
  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-50/80 via-blue-50/30 to-transparent">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-8 sm:pb-10">
          <div className="flex items-center gap-2 sm:gap-2.5 mb-5 flex-wrap">
            <LogoIcon className="w-7 h-7" />
            <span className="text-lg font-black tracking-tight">Injaewon MathLAB</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
              <Sparkles className="w-3 h-3" />
              투자자 데모
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-text-primary leading-tight mb-2">
            핵심 기능 체험
          </h1>
          <p className="text-base text-text-secondary max-w-xl">
            개념 5단계 학습, 연산 문제 생성, 기출 분석 — 3가지 핵심 기능을 직접 체험해보세요.
          </p>
        </div>
      </div>

      {/* 3가지 핵심 기능 */}
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 pb-16 space-y-6">

        {/* Feature 1: 개념 5단계 */}
        <Card padding="lg" className="border-l-4 border-l-blue-500">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-sm flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
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
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                {[
                  { stage: '1단계', name: '읽기', xp: '5XP', color: 'border-blue-300 bg-blue-50/50 text-blue-700' },
                  { stage: '2단계', name: '빈칸(쉬움)', xp: '10XP', color: 'border-emerald-300 bg-emerald-50/50 text-emerald-700' },
                  { stage: '3단계', name: '빈칸(어려움)', xp: '15XP', color: 'border-orange-300 bg-orange-50/50 text-orange-700' },
                  { stage: '4단계', name: '통문장', xp: '20XP', color: 'border-rose-300 bg-rose-50/50 text-rose-700' },
                  { stage: '5단계', name: '백지 복원', xp: '30XP', color: 'border-violet-300 bg-violet-50/50 text-violet-700' },
                ].map((s) => (
                  <div key={s.stage} className={`border-l-2 ${s.color} px-2 py-1.5 rounded-sm text-center`}>
                    <div className="text-[10px] font-bold">{s.stage}</div>
                    <div className="text-xs font-bold truncate">{s.name}</div>
                    <div className="text-[10px] opacity-70">{s.xp}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
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
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-sm flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
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

              <div className="flex flex-wrap gap-2">
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
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 rounded-sm flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
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
        <Card padding="lg" className="border-l-4 border-l-amber-500">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-sm flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-text-primary">숙제 관리</h2>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                위 3가지 기능과 연계된 숙제를 출제하고 학생별 제출 현황을 추적합니다. 개념 숙제 + 연산 숙제가 준비되어 있습니다.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-sm text-xs font-medium border border-amber-200">개념 숙제</span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-sm text-xs font-medium border border-amber-200">연산 숙제</span>
              </div>

              <Link href="/homework">
                <Button size="sm" variant="primary">
                  <CalendarCheck className="w-3.5 h-3.5 mr-1" />
                  숙제 관리
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
