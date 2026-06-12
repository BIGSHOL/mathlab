'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileSearch, BarChart3, FileText, Share2, Upload, Sparkles,
  Check, ArrowRight, MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LogoIcon } from '@/components/ui/LogoIcon';
import { Button } from '@/components/ui/Button';
import { V3ReportPreview } from '@/components/landing/V3ReportPreview';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { DashboardShowcase } from '@/components/landing/DashboardShowcase';
import { InquiryModal } from '@/components/landing/InquiryModal';
import { Reveal, RevealStagger, RevealItem } from '@/components/landing/editorial/motion';
import { FloatingCard } from '@/components/landing/editorial/FloatingCard';
import { StatStrip, type StatItem } from '@/components/landing/editorial/StatStrip';
import { BODONI, GREEN, AMBER, RED } from '@/components/landing/editorial/tokens';

/**
 * 기출분석 제품 공개 랜딩페이지 (루트 /).
 * 디자인 언어: V3 에디토리얼(기출총평 잡지 톤) — 크림 페이퍼 · 잉크 · 레드 · 세리프 헤드라인 · 신문 괘선.
 */

// 다크 KPI 스트립 — 검증 가능한 제품 사실만 (CLAUDE.md 12-5)
const STATS: StatItem[] = [
  { label: '전국 학교 데이터베이스', value: 6004, suffix: '교', color: AMBER },
  { label: '난이도 판정 체계', value: 5, suffix: '단계' },
  { label: '능력 영역 분석', value: 4, suffix: '대 영역' },
  { label: '평균 분석 소요', value: 0, display: '2~3', suffix: '분', color: GREEN },
];

export function LandingPage() {
  const { user } = useAuth();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const cta = user
    ? { href: '/exam-analysis', label: '기출분석 바로가기' }
    : { href: '/login', label: '로그인' };

  return (
    <>
    {inquiryOpen && <InquiryModal onClose={() => setInquiryOpen(false)} />}
    <div className="h-dvh overflow-y-auto scroll-smooth bg-ed-paper text-ed-ink">
      {/* 루트 layout의 html/body가 overflow:hidden(LMS 앱 셸 규약)이라
          공개 랜딩은 자체 스크롤 컨테이너(h-dvh + overflow-y-auto)가 필요. */}
      {/* ── 헤더 (마스트헤드) ── */}
      <header className="sticky top-0 z-40 bg-ed-paper/90 backdrop-blur border-b border-ed-ink">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-7 h-7" />
            <span className="ed-serif text-lg font-bold tracking-tight">MathLAB 기출분석</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#555]">
            <a href="#features" className="hover:text-ed-ink transition-colors">기능</a>
            <a href="#how" className="hover:text-ed-ink transition-colors">작동 방식</a>
            <Link href="/demo" className="hover:text-ed-ink transition-colors">데모</Link>
          </nav>
          <Link href={cta.href}>
            <Button size="sm" variant="editorial">{cta.label}</Button>
          </Link>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 math-grid-bg ed-grid-fade pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-14 sm:py-20 lg:py-24 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <RevealStagger>
            <RevealItem>
              <span className="ed-kicker">
                <Sparkles className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                AI 기반 · 한국 수학 교육과정 특화
              </span>
            </RevealItem>
            <RevealItem>
              <h1 className="ed-serif mt-7 text-4xl sm:text-5xl lg:text-[64px] font-bold leading-[1.12] tracking-[-0.01em]">
                시험지 한 장이면,<br />
                <span className="ed-marker">분석부터 블로그 글까지</span> 자동으로
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 text-lg text-[#555] leading-relaxed max-w-xl">
                PDF만 올리면 AI가 난이도·단원·문항 해설·총평을 만들고,
                네이버 블로그용 자료까지 생성합니다.
              </p>
            </RevealItem>
            <RevealItem>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                {user ? (
                  <Link href="/exam-analysis">
                    <Button size="lg" variant="editorial">기출분석 바로가기</Button>
                  </Link>
                ) : (
                  <Button size="lg" variant="editorial" onClick={() => setInquiryOpen(true)}>
                    <MessageSquare className="w-4 h-4 mr-2" />도입 문의
                  </Button>
                )}
                {!user && (
                  <Link href="/demo">
                    <Button size="lg" variant="editorialOutline">데모 체험하기</Button>
                  </Link>
                )}
                <a href="#features">
                  <Button size="lg" variant="ghost">기능 보기</Button>
                </a>
              </div>
              <p className="mt-4 text-xs text-[#999]">
                {!user && (
                  <>이미 계정이 있으신가요?{' '}
                  <Link href="/login" className="underline underline-offset-2 hover:text-ed-ink transition-colors">로그인</Link></>
                )}
              </p>
            </RevealItem>
          </RevealStagger>

          {/* 실제 V3 분석 리포트 프리뷰 (더미데이터) + 부유 카드 */}
          <Reveal delay={0.15} className="relative">
            <V3ReportPreview />
            <FloatingCard className="hidden lg:block -left-9 bottom-14" delay={0.8}>
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-ed-gray m-0">평균 분석 소요</p>
              <p className="m-0 mt-1 leading-none" style={{ fontFamily: BODONI, fontSize: 24, fontWeight: 900, color: RED }}>
                2~3<span className="text-[13px] text-ed-gray ml-0.5">분</span>
              </p>
            </FloatingCard>
            <FloatingCard className="hidden lg:flex items-center gap-2 -right-7 top-9" delay={0}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: RED }}>
                <Check className="w-3 h-3 text-white" />
              </span>
              <span className="text-xs font-semibold">블로그 이미지 자동 생성</span>
            </FloatingCard>
          </Reveal>
        </div>
      </section>

      {/* ── 신뢰 스트립 ── */}
      <section className="border-y border-ed-ink bg-ed-paper-2">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-y-3">
          {['AI 기반 자동 분석', '한국 중·고 수학 교육과정 매핑', '내신 · 모의고사 기출 대응', '네이버 블로그 콘텐츠 자동화'].map((t, i) => (
            <span
              key={t}
              className={`inline-flex items-center gap-2 px-5 sm:px-7 text-xs font-semibold tracking-[0.1em] text-[#444] ${i > 0 ? 'sm:border-l sm:border-ed-rule' : ''}`}
            >
              <span className="w-2 h-2 bg-ed-red inline-block shrink-0" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── 다크 KPI 스트립 (V3 .v3-kpi-row 모티프) ── */}
      <StatStrip items={STATS} />

      {/* ── 핵심 가치 ── */}
      <section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-center">선생님의 시간을 돌려드립니다</h2>
        <p className="text-center text-text-secondary mt-3">며칠 걸리던 기출 분석을 수 분 안에.</p>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: FileSearch, title: '자동 기출 분석', desc: '시험지 PDF 업로드 한 번. OCR·문항 추출·난이도 판정까지 AI가.' },
            { icon: BarChart3, title: '난이도·단원 인사이트', desc: '단원별 출제 비중, 난이도 분포, 킬러문항 패턴을 차트로.' },
            { icon: FileText, title: '해설·총평 자동 생성', desc: '문항별 풀이 해설과 시험 총평을 즉시. 검토만 하면 끝.' },
            { icon: Share2, title: '블로그 콘텐츠 자동화', desc: '분석 결과를 네이버 블로그용 이미지로 한 번에. 학원 홍보까지.' },
          ].map((c) => (
            <div key={c.title} className="p-6 rounded-[6px] border border-slate-200 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 rounded-[6px] bg-indigo-50 flex items-center justify-center mb-4">
                <c.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold mb-1.5">{c.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 작동 방식 ── */}
      <section id="how" className="bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <h2 className="text-2xl md:text-3xl font-black text-center">3단계면 충분합니다</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { n: '01', icon: Upload, title: '업로드', desc: '시험지 PDF를 끌어다 놓습니다.' },
              { n: '02', icon: Sparkles, title: 'AI 분석', desc: '수 분 내 난이도·단원·해설·총평을 자동 생성합니다.' },
              { n: '03', icon: Share2, title: '리포트 & 공유', desc: '차트 리포트 확인 후 인쇄·PDF·네이버 블로그 이미지로 공유.' },
            ].map((s) => (
              <div key={s.n} className="relative p-7 rounded-[6px] bg-white border border-slate-200">
                <span className="absolute top-5 right-6 text-3xl font-black text-slate-100">{s.n}</span>
                <div className="w-12 h-12 rounded-[6px] bg-primary/10 flex items-center justify-center mb-4">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-1.5">{s.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 기능 상세 ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-center">기출 분석에 필요한 모든 것</h2>
        <p className="text-center text-text-secondary mt-3">실제 분석 결과 화면을 그대로 — 아래는 더미데이터 예시입니다.</p>
        <FeatureShowcase />
      </section>

      {/* ── 실제 분석 대시보드 ── */}
      <section className="bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <h2 className="text-2xl md:text-3xl font-black text-center">교사용 분석 대시보드, 그대로</h2>
          <p className="text-center text-text-secondary mt-3">난이도 도넛·유형 레이더·변별력·시간 배분까지 — 실제 화면 예시입니다 (더미데이터).</p>
          <DashboardShowcase />
        </div>
      </section>

      {/* ── 마무리 CTA ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[8px] px-6 sm:px-8 py-12 sm:py-14 text-center text-white"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #4338CA 100%)' }}>
          <h2 className="text-2xl md:text-3xl font-black">기출 분석, 이제 AI에게 맡기세요</h2>
          <p className="mt-3 text-white/85">시험지를 올리면 분석·해설·블로그 콘텐츠가 자동으로 준비됩니다.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href={cta.href}>
              <button className="inline-flex items-center gap-1.5 h-[52px] px-7 rounded-sm bg-white text-primary font-bold hover:bg-slate-50 transition-colors">
                {cta.label} <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            {!user && (
              <Link href="/demo"
                className="inline-flex items-center h-[52px] px-7 rounded-sm border border-white/40 text-white font-bold hover:bg-white/10 transition-colors">
                데모 체험하기
              </Link>
            )}
            <a href="mailto:chrismathone@gmail.com"
              className="inline-flex items-center h-[52px] px-7 rounded-sm border border-white/40 text-white font-bold hover:bg-white/10 transition-colors">
              도입 문의
            </a>
          </div>
        </div>
      </section>

      {/* ── 푸터 (콜로폰) ── */}
      <footer className="ed-rule-double">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#777]">
          <div className="flex items-center gap-2">
            <LogoIcon className="w-5 h-5" />
            <span className="ed-serif font-bold text-ed-ink">MathLAB 기출분석</span>
            <span className="text-[#999]">— 한국 수학 학원을 위한 AI 기출 분석</span>
          </div>
          <div className="flex items-center gap-5 text-xs tracking-[0.1em]">
            <a href="mailto:chrismathone@gmail.com" className="hover:text-ed-ink transition-colors">문의</a>
            <span className="text-[#aaa]">© {'2026'} INJAEWON MATHLAB</span>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
