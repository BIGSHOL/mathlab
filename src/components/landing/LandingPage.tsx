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

/** 기출분석 제품 공개 랜딩페이지 (루트 /). design.md 명세 기반. */
export function LandingPage() {
  const { user } = useAuth();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const cta = user
    ? { href: '/exam-analysis', label: '기출분석 바로가기' }
    : { href: '/login', label: '로그인' };

  return (
    <>
    {inquiryOpen && <InquiryModal onClose={() => setInquiryOpen(false)} />}
    <div className="h-dvh overflow-y-auto scroll-smooth bg-white text-text-primary">
      {/* 루트 layout의 html/body가 overflow:hidden(LMS 앱 셸 규약)이라
          공개 랜딩은 자체 스크롤 컨테이너(h-dvh + overflow-y-auto)가 필요. */}
      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-7 h-7" />
            <span className="text-lg font-black tracking-tight">MathLAB 기출분석</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors">기능</a>
            <a href="#how" className="hover:text-text-primary transition-colors">작동 방식</a>
          </nav>
          <Link href={cta.href}>
            <Button size="sm">{cta.label}</Button>
          </Link>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className="relative overflow-hidden" style={{ background: 'radial-gradient(900px circle at 70% -10%, var(--primary-50), #fff 60%)' }}>
        <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20 lg:py-28 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-indigo-50 px-3 py-1 rounded-[4px] mb-5">
              <Sparkles className="w-3.5 h-3.5" /> AI 기반 · 한국 수학 교육과정 특화
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.15] tracking-tight">
              시험지 한 장이면,<br />
              <span className="text-primary">분석부터 블로그 글까지</span> 자동으로
            </h1>
            <p className="mt-5 text-lg text-text-secondary leading-relaxed max-w-xl">
              PDF만 올리면 AI가 난이도·단원·문항 해설·총평을 만들고,
              네이버 블로그용 자료까지 생성합니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {user ? (
                <Link href="/exam-analysis">
                  <Button size="lg">기출분석 바로가기</Button>
                </Link>
              ) : (
                <Button size="lg" onClick={() => setInquiryOpen(true)}>
                  <MessageSquare className="w-4 h-4 mr-2" />도입 문의
                </Button>
              )}
              <a href="#features">
                <Button size="lg" variant="ghost">기능 보기</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              {user ? '' : '이미 계정이 있으신가요? '}
              {!user && <Link href="/login" className="underline underline-offset-2 hover:text-slate-600 transition-colors">로그인</Link>}
            </p>
          </div>

          {/* 실제 V3 분석 리포트 프리뷰 (더미데이터) */}
          <V3ReportPreview />
        </div>
      </section>

      {/* ── 신뢰 스트립 ── */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          {['AI 기반 자동 분석', '한국 중·고 수학 교육과정 매핑', '내신 · 모의고사 기출 대응', '네이버 블로그 콘텐츠 자동화'].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-primary" /> {t}
            </span>
          ))}
        </div>
      </section>

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
            <a href="mailto:chrismathone@gmail.com"
              className="inline-flex items-center h-[52px] px-7 rounded-sm border border-white/40 text-white font-bold hover:bg-white/10 transition-colors">
              도입 문의
            </a>
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <LogoIcon className="w-5 h-5" />
            <span className="font-bold text-text-primary">MathLAB 기출분석</span>
            <span className="text-slate-400">— 한국 수학 학원을 위한 AI 기출 분석</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:chrismathone@gmail.com" className="hover:text-text-primary transition-colors">문의</a>
            <span className="text-slate-300">© {'2026'} Injaewon MathLAB</span>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
