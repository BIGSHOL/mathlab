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
import { InquiryModal } from '@/components/landing/InquiryModal';
import { Reveal, RevealStagger, RevealItem } from '@/components/landing/editorial/motion';
import { FloatingCard } from '@/components/landing/editorial/FloatingCard';
import { StatStrip, type StatItem } from '@/components/landing/editorial/StatStrip';
import { SectionHeading } from '@/components/landing/editorial/SectionHeading';
import { LiveAnalysisCard } from '@/components/landing/editorial/LiveAnalysisCard';
import { GRAD_DARK_CARD } from '@/components/landing/editorial/brand';

/**
 * 기출분석 제품 공개 랜딩페이지 (루트 /).
 * 디자인 언어: para-x 브랜드 시스템 통일 (크림 · 잉크 네이비 · 인디고 그라데이션 · 노란 마커).
 * 잡지(V3) 톤은 제품 산출물 프리뷰(V3ReportPreview, FeatureShowcase 내부)에서만 유지.
 */

// 다크 스탯 카드 — 검증 가능한 제품 사실만 (CLAUDE.md 12-5)
const STATS: StatItem[] = [
  { label: '전국 학교 데이터베이스', value: 6004, suffix: '개교', highlight: true },
  { label: '난이도 판정 체계', value: 5, suffix: '단계' },
  { label: '능력 영역 분석', value: 4, suffix: '대 영역' },
  { label: '평균 분석 소요', value: 0, display: '2~3', suffix: '분', highlight: true },
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
    <div className="h-dvh overflow-y-auto scroll-smooth bg-brand-cream text-brand-ink">
      {/* 루트 layout의 html/body가 overflow:hidden(LMS 앱 셸 규약)이라
          공개 랜딩은 자체 스크롤 컨테이너(h-dvh + overflow-y-auto)가 필요. */}
      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-40 bg-brand-cream/85 backdrop-blur-md border-b border-brand-line">
        <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon className="w-8 h-8" />
            <span className="text-lg font-extrabold tracking-[-0.02em]">MathLAB 기출분석</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[15px] font-semibold text-brand-ink-soft">
            <a href="#features" className="hover:text-brand-ink transition-colors">기능</a>
            <a href="#how" className="hover:text-brand-ink transition-colors">작동 방식</a>
            <Link href="/demo" className="hover:text-brand-ink transition-colors">데모</Link>
          </nav>
          <Link href={cta.href}>
            <Button size="sm" variant="brand">{cta.label}</Button>
          </Link>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className="relative overflow-hidden">
        {/* 그리드 배경 + 블러 블롭 (para-x .hero-bg 모티프) */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-0 math-grid-bg brand-grid-fade" />
          <div className="absolute w-[480px] h-[480px] rounded-full blur-[90px] opacity-50 -top-40 -right-20 bg-[#6366F1]/30 animate-brand-drift" />
          <div className="absolute w-[420px] h-[420px] rounded-full blur-[90px] opacity-50 -bottom-52 -left-32 bg-[#0EA5E9]/20 animate-brand-drift [animation-delay:-6s]" />
          <div className="absolute w-[260px] h-[260px] rounded-full blur-[90px] opacity-50 top-[32%] left-[38%] bg-[#FFC905]/25 animate-brand-drift [animation-delay:-3s]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-14 sm:py-20 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-14 items-center">
          <RevealStagger>
            <RevealItem>
              <span className="inline-flex items-center gap-2 text-[13.5px] font-bold text-brand-indigo bg-brand-indigo/8 border border-brand-indigo/18 px-4 py-2 rounded-full">
                <span className="w-[7px] h-[7px] rounded-full bg-[#22C55E] animate-pulse shrink-0" />
                AI 기반 · 한국 수학 교육과정 특화
              </span>
            </RevealItem>
            <RevealItem>
              <h1 className="mt-6 text-[38px] sm:text-5xl lg:text-[62px] font-extrabold tracking-[-0.04em] leading-[1.16] [word-break:keep-all]">
                시험지 한 장이면,<br />
                <span className="brand-marker whitespace-nowrap">분석부터 블로그 글까지</span> 자동으로
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 text-[18px] text-brand-ink-soft leading-[1.75] max-w-[500px]">
                PDF만 올리면 AI가 <b className="text-brand-ink font-bold">난이도·단원·문항 코멘트·총평</b>을 만들고,
                네이버 블로그용 자료까지 생성합니다.
              </p>
            </RevealItem>
            <RevealItem>
              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                {user ? (
                  <Link href="/exam-analysis">
                    <Button size="lg" variant="brand">기출분석 바로가기</Button>
                  </Link>
                ) : (
                  <Button size="lg" variant="brand" onClick={() => setInquiryOpen(true)}>
                    <MessageSquare className="w-4 h-4 mr-2" />도입 문의
                  </Button>
                )}
                {!user && (
                  <Link href="/demo">
                    <Button size="lg" variant="brandOutline">데모 체험하기</Button>
                  </Link>
                )}
                <a href="#features">
                  <Button size="lg" variant="ghost">기능 보기</Button>
                </a>
              </div>
              <p className="mt-5 text-[13px] font-semibold text-brand-ink-soft">
                {!user && (
                  <>이미 계정이 있으신가요?{' '}
                  <Link href="/login" className="underline underline-offset-2 hover:text-brand-ink transition-colors">로그인</Link></>
                )}
              </p>
            </RevealItem>
          </RevealStagger>

          {/* 제품 산출물 프리뷰 — 잡지(V3) 톤은 이 안에서만 (브랜드 크롬 속 "산출물 사진" 구도) */}
          <Reveal delay={0.15} className="relative">
            <V3ReportPreview />
            <FloatingCard className="hidden lg:block -left-9 bottom-14" delay={0.8}>
              <p className="text-[12.5px] font-semibold text-brand-ink-soft m-0">평균 분석 소요</p>
              <p className="m-0 mt-0.5 text-[21px] font-extrabold tracking-[-0.02em] leading-none text-brand-ink">
                2~3<span className="text-[13px] text-brand-ink-soft ml-0.5 font-bold">분</span>
              </p>
            </FloatingCard>
            <FloatingCard className="hidden lg:flex items-center gap-2 -right-7 top-9" delay={0}>
              <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 bg-[#DCFCE7]">
                <Check className="w-3 h-3 text-[#16A34A]" />
              </span>
              <span className="text-[13px] font-bold">블로그 이미지 자동 생성</span>
            </FloatingCard>
          </Reveal>
        </div>
      </section>

      {/* ── 신뢰 스트립 ── */}
      <section className="border-y border-brand-line bg-brand-cream-2">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {['AI 기반 자동 분석', '한국 중·고 수학 교육과정 매핑', '내신 · 모의고사 기출 대응', '네이버 블로그 콘텐츠 자동화'].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink-soft">
              <Check className="w-4 h-4 text-[#16A34A] shrink-0" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── 다크 스탯 카드 (para-x .stats-card 모티프) ── */}
      <section className="max-w-6xl mx-auto px-6 pt-14 md:pt-20">
        <Reveal>
          <StatStrip items={STATS} />
        </Reveal>
      </section>

      {/* ── 핵심 가치 ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <SectionHeading
          kicker="핵심 가치"
          title="선생님의 시간을 돌려드립니다"
          lede="며칠 걸리던 기출 분석을 수 분 안에."
        />
        <RevealStagger className="mt-13 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: FileSearch, title: '자동 기출 분석', desc: '시험지 PDF 업로드 한 번. OCR·문항 추출·난이도 판정까지 AI가.' },
            { icon: BarChart3, title: '난이도·단원 인사이트', desc: '단원별 출제 비중, 난이도 분포, 킬러문항 패턴을 차트로.' },
            { icon: FileText, title: '코멘트·총평 자동 생성', desc: '문항별 AI 코멘트와 시험 총평을 즉시. 검토만 하면 끝.' },
            { icon: Share2, title: '블로그 콘텐츠 자동화', desc: '분석 결과를 네이버 블로그용 이미지로 한 번에. 학원 홍보까지.' },
          ].map((c) => (
            <RevealItem
              key={c.title}
              className="bg-white border border-brand-line rounded-[20px] p-7 shadow-brand-sm hover:shadow-brand-md hover:-translate-y-1.5 hover:border-brand-indigo/25 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-[14px] bg-brand-indigo/8 flex items-center justify-center mb-5">
                <c.icon className="w-5 h-5 text-brand-indigo" />
              </div>
              <h3 className="font-extrabold text-[19px] tracking-[-0.02em] mb-2">{c.title}</h3>
              <p className="text-[14.5px] text-brand-ink-soft leading-[1.7]">{c.desc}</p>
            </RevealItem>
          ))}
        </RevealStagger>
      </section>

      {/* ── 작동 방식 ── */}
      <section id="how" className="bg-brand-cream-2 border-y border-brand-line">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <SectionHeading kicker="작동 방식" title="3단계면 충분합니다" />
          <RevealStagger className="mt-13 grid md:grid-cols-3 gap-5">
            {[
              { n: '01', icon: Upload, title: '업로드', desc: '시험지 PDF를 끌어다 놓습니다.' },
              { n: '02', icon: Sparkles, title: 'AI 분석', desc: '수 분 내 난이도·단원·코멘트·총평을 자동 생성합니다.' },
              { n: '03', icon: Share2, title: '리포트 & 공유', desc: '차트 리포트 확인 후 네이버 블로그 이미지로 공유.' },
            ].map((s) => (
              <RevealItem
                key={s.n}
                className="relative bg-white border border-brand-line rounded-[20px] p-7 shadow-brand-sm"
              >
                <span aria-hidden className="absolute top-5 right-6 text-[44px] font-extrabold tracking-[-0.04em] leading-none select-none brand-grad-text opacity-55">
                  {s.n}
                </span>
                <div className="w-12 h-12 rounded-[14px] bg-brand-indigo/8 flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5 text-brand-indigo" />
                </div>
                <h3 className="font-extrabold text-lg tracking-[-0.02em] mb-1.5">{s.title}</h3>
                <p className="text-[14.5px] text-brand-ink-soft leading-[1.7]">{s.desc}</p>
              </RevealItem>
            ))}
          </RevealStagger>

          {/* 분석 과정 라이브 연출 (para-x 라이브 콘솔 모티프) — "데모 체험하기" 서사와 연결 */}
          <Reveal className="mt-10">
            <LiveAnalysisCard />
          </Reveal>
        </div>
      </section>

      {/* ── 기능 상세 ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <SectionHeading
          kicker="기능"
          title="기출 분석에 필요한 모든 것"
          lede="실제 분석 결과 화면을 그대로 보여드립니다."
        />
        <Reveal>
          <FeatureShowcase />
        </Reveal>
      </section>

      {/* ── 마무리 CTA — 다크 그라데이션 카드 (para-x contact 모티프) ── */}
      <section className="bg-brand-cream-2 border-t border-brand-line">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[24px] px-7 sm:px-12 py-12 sm:py-16 text-white shadow-brand-lg"
            style={{ background: GRAD_DARK_CARD }}
          >
            {/* 래디얼 오버레이 */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 20% 0%, rgba(139,92,246,0.25), transparent 50%), radial-gradient(circle at 80% 100%, rgba(14,165,233,0.2), transparent 50%)',
              }}
            />
            <div className="relative grid lg:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <h2 className="text-[28px] md:text-[38px] font-extrabold tracking-[-0.03em] leading-[1.3] [word-break:keep-all]">
                  기출 분석, 이제 <span className="brand-grad-text-light">AI에게 맡기세요</span>
                </h2>
                <p className="mt-4 text-[15.5px] text-white/80 leading-relaxed">
                  시험지를 올리면 분석·총평·블로그 콘텐츠가 자동으로 준비됩니다.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <Link href={cta.href}>
                    <Button size="lg" variant="brand" className="bg-none! bg-white! text-brand-indigo! shadow-[0_8px_24px_rgba(0,0,0,0.2)]! hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]!">
                      {cta.label} <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                  {!user && (
                    <Link href="/demo">
                      <Button size="lg" variant="brandOutline" className="border-white/45! text-white! bg-white/10! hover:border-white! hover:bg-white/20!">
                        데모 체험하기
                      </Button>
                    </Link>
                  )}
                  <a href="mailto:chrismathone@gmail.com">
                    <Button size="lg" variant="brandOutline" className="border-white/45! text-white! bg-white/10! hover:border-white! hover:bg-white/20!">
                      도입 문의
                    </Button>
                  </a>
                </div>
              </div>
              {/* 우측 거대 숫자 2컬럼 */}
              <div className="hidden lg:flex items-stretch">
                {[
                  { n: '3', unit: '단계', sub: '로 끝', grad: false },
                  { n: '2~3', unit: '분', sub: '이면 분석 완료', grad: true },
                ].map((it, i) => (
                  <div key={it.unit} className={`text-center px-10 ${i > 0 ? 'border-l border-white/10' : ''}`}>
                    <p className="leading-none m-0 flex items-baseline justify-center gap-1">
                      <span className={`text-[64px] font-extrabold tracking-[-0.04em] ${it.grad ? 'brand-grad-text-light' : 'text-white'}`}>
                        {it.n}
                      </span>
                      <span className="text-[22px] font-extrabold" style={{ color: '#FFA940' }}>{it.unit}</span>
                    </p>
                    <p className="mt-3 text-[12.5px] text-white/70 font-semibold m-0">{it.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        </div>
      </section>

      {/* ── 푸터 (para-x.co.kr 동일 구조) ── */}
      <footer className="border-t border-brand-line bg-brand-cream">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
          <div className="flex items-start justify-between gap-10 flex-wrap">
            {/* 브랜드 + 사업자 법적 정보 */}
            <div>
              <div className="flex items-center gap-2">
                <LogoIcon className="w-6 h-6" />
                <span className="text-lg font-extrabold tracking-[-0.02em] text-brand-ink">MathLAB 기출분석</span>
              </div>
              <p className="mt-3 text-sm text-brand-ink-faint max-w-[340px] leading-relaxed">
                시험지 한 장으로 난이도·유형·단원·변별력 분석부터 학부모용 블로그 리포트까지. 한국 수학 학원을 위한 AI 기출 분석 서비스입니다.
              </p>
              <div className="mt-5 grid gap-1.5 text-[12.5px] text-brand-ink-faint leading-relaxed">
                <span>상호: 파라엑스 · 대표자: 원일</span>
                {/* 통신판매업 신고번호는 신고 완료 후 이 줄에 추가한다.
                    자리표시자(제0000-대구수성-0000호)를 두면 안 된다 — 카드사 심사가 사업자등록증과
                    대조하므로 가짜 번호는 미기재보다 위험하다(반려 사유). 번호가 없어도 PG 계약과
                    카드사 심사는 진행되며, 국민카드 심사만 제외된다. */}
                <span>사업자등록번호: 496-25-02217</span>
                <span>주소: 대구광역시 수성구 동대구로 95, 102동 1202호 (두산동, SK 리더스뷰)</span>
                <span>고객센터: 053-353-7099 · 운영시간: 월~금 13:00~22:00 · 이메일: onlywon@naver.com</span>
                <span>개인정보보호책임자: 원일 (onlywon@naver.com)</span>
              </div>
            </div>
            {/* 링크 3열 */}
            <div className="flex gap-14 flex-wrap">
              <div>
                <b className="block text-[13px] font-extrabold tracking-[0.08em] text-brand-ink-faint uppercase mb-3.5">Menu</b>
                <a href="#features" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">기능</a>
                <a href="#how" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">작동 방식</a>
                <a href="mailto:onlywon@naver.com" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">문의</a>
              </div>
              <div>
                <b className="block text-[13px] font-extrabold tracking-[0.08em] text-brand-ink-faint uppercase mb-3.5">Product</b>
                <a href="https://para-x.co.kr" target="_blank" rel="noopener noreferrer" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">Para-X 허브 ↗</a>
                <a href="https://para-x.co.kr/#products" target="_blank" rel="noopener noreferrer" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">ShortGEN (준비 중)</a>
                <a href="https://para-x.co.kr/#products" target="_blank" rel="noopener noreferrer" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">MathGEN (준비 중)</a>
              </div>
              <div>
                <b className="block text-[13px] font-extrabold tracking-[0.08em] text-brand-ink-faint uppercase mb-3.5">Legal</b>
                <a href="https://para-x.co.kr/terms.html" target="_blank" rel="noopener noreferrer" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">이용약관</a>
                <a href="https://para-x.co.kr/privacy.html" target="_blank" rel="noopener noreferrer" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">개인정보처리방침</a>
                <a href="https://para-x.co.kr/refund.html" target="_blank" rel="noopener noreferrer" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">취소·환불 정책</a>
                <a href="tel:053-353-7099" className="block text-[14.5px] text-brand-ink-soft py-1 font-medium hover:text-brand-ink transition-colors">고객센터</a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-brand-line flex justify-between flex-wrap gap-3 text-[13px] text-brand-ink-faint">
            <span>© {'2026'} Para-X. All rights reserved.</span>
            <span>Made for educators, powered by automation</span>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
