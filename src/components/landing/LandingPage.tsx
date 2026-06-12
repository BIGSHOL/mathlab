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
import { SectionHeading } from '@/components/landing/editorial/SectionHeading';
import { ABRIL, BODONI, GREEN, AMBER, RED, INK } from '@/components/landing/editorial/tokens';

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

      {/* ── 핵심 가치 — 신문 괘선 그리드 ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <SectionHeading
          kicker="핵심 가치"
          title="선생님의 시간을 돌려드립니다"
          lede="며칠 걸리던 기출 분석을 수 분 안에."
        />
        <RevealStagger className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px border border-ed-rule bg-ed-rule">
          {[
            { icon: FileSearch, title: '자동 기출 분석', desc: '시험지 PDF 업로드 한 번. OCR·문항 추출·난이도 판정까지 AI가.' },
            { icon: BarChart3, title: '난이도·단원 인사이트', desc: '단원별 출제 비중, 난이도 분포, 킬러문항 패턴을 차트로.' },
            { icon: FileText, title: '해설·총평 자동 생성', desc: '문항별 풀이 해설과 시험 총평을 즉시. 검토만 하면 끝.' },
            { icon: Share2, title: '블로그 콘텐츠 자동화', desc: '분석 결과를 네이버 블로그용 이미지로 한 번에. 학원 홍보까지.' },
          ].map((c, i) => (
            <RevealItem key={c.title} className="relative bg-ed-paper p-7">
              <span
                aria-hidden
                className="absolute top-4 right-5 leading-none select-none"
                style={{ fontFamily: ABRIL, fontSize: 64, fontWeight: 900, color: RED, opacity: 0.18 }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <c.icon className="w-5 h-5 text-ed-red mb-5" />
              <h3 className="ed-serif font-bold text-[19px] mb-2">{c.title}</h3>
              <p className="text-sm text-[#555] leading-relaxed">{c.desc}</p>
            </RevealItem>
          ))}
        </RevealStagger>
      </section>

      {/* ── 작동 방식 — 상단 잉크 괘선 카드 ── */}
      <section id="how" className="bg-ed-paper-2 border-y border-ed-rule">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <SectionHeading kicker="작동 방식" title="3단계면 충분합니다" />
          <RevealStagger className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              { n: '01', icon: Upload, title: '업로드', desc: '시험지 PDF를 끌어다 놓습니다.' },
              { n: '02', icon: Sparkles, title: 'AI 분석', desc: '수 분 내 난이도·단원·해설·총평을 자동 생성합니다.' },
              { n: '03', icon: Share2, title: '리포트 & 공유', desc: '차트 리포트 확인 후 네이버 블로그 이미지로 공유.' },
            ].map((s) => (
              <RevealItem key={s.n} className="relative bg-white border border-ed-rule border-t-[3px] border-t-ed-ink p-7 shadow-ed-paper">
                <span
                  aria-hidden
                  className="absolute top-4 right-6 leading-none select-none"
                  style={{ fontFamily: ABRIL, fontSize: 56, fontWeight: 900, color: INK, opacity: 0.12 }}
                >
                  {s.n}
                </span>
                <s.icon className="w-6 h-6 text-ed-red mb-4" />
                <h3 className="ed-serif font-bold text-lg mb-1.5">{s.title}</h3>
                <p className="text-sm text-[#555] leading-relaxed">{s.desc}</p>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ── 기능 상세 ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <SectionHeading
          kicker="기능"
          title="기출 분석에 필요한 모든 것"
          lede="실제 분석 결과 화면을 그대로 — 아래는 더미데이터 예시입니다."
        />
        <Reveal>
          <FeatureShowcase />
        </Reveal>
      </section>

      {/* ── 실제 분석 대시보드 — "잡지에 실린 제품 스크린샷" 프레임 ── */}
      <section className="bg-ed-paper-2 border-y border-ed-rule">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <SectionHeading
            kicker="대시보드"
            title="교사용 분석 대시보드, 그대로"
            lede="난이도 도넛·유형 레이더·변별력·시간 배분까지 — 실제 화면 예시입니다 (더미데이터)."
          />
          <Reveal className="mt-12">
            <div className="border border-ed-ink/80 rounded-[6px] overflow-hidden bg-white shadow-ed-float">
              {/* 브라우저 크롬 캡션 — 앱 화면은 리스킨하지 않고 액자로 의도화 */}
              <div className="flex items-center gap-1.5 px-4 h-9 border-b border-ed-rule bg-ed-paper">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="w-2.5 h-2.5 rounded-full bg-[#d9d4c8]" />
                ))}
                <span className="ml-2.5 text-[11px] text-ed-gray tracking-[0.08em] font-semibold truncate">
                  exam-analysis — 실제 분석 화면 (더미데이터)
                </span>
              </div>
              <div className="px-5 pb-5 bg-slate-50/60">
                <DashboardShowcase />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 마무리 CTA — 풀블리드 잉크 밴드 (V3 .v3-feature 모티프) ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20 pt-2">
        <Reveal>
          <div className="px-7 sm:px-12 py-12 sm:py-16 text-white" style={{ background: INK }}>
            <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <h2 className="ed-serif text-[26px] md:text-[34px] font-bold leading-snug text-white">
                  기출 분석, 이제 <em className="ed-serif italic" style={{ color: AMBER }}>AI에게 맡기세요</em>
                </h2>
                <p className="mt-4 text-[15px] text-[#ccc] leading-relaxed">
                  시험지를 올리면 분석·해설·블로그 콘텐츠가 자동으로 준비됩니다.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href={cta.href}>
                    <Button size="lg" variant="editorial" className="bg-white! text-[#121212]! hover:bg-[#BF1722]! hover:text-white!">
                      {cta.label} <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                  {!user && (
                    <Link href="/demo">
                      <Button size="lg" variant="editorialOutline" className="border-white/40! text-white! hover:border-white! hover:bg-white/10!">
                        데모 체험하기
                      </Button>
                    </Link>
                  )}
                  <a href="mailto:chrismathone@gmail.com">
                    <Button size="lg" variant="editorialOutline" className="border-white/40! text-white! hover:border-white! hover:bg-white/10!">
                      도입 문의
                    </Button>
                  </a>
                </div>
              </div>
              {/* 우측 거대 숫자 2컬럼 (V3 KPI 색 분리) */}
              <div className="hidden lg:flex items-stretch">
                {[
                  { n: '3', l: '단계로 끝', c: '#fff' },
                  { n: '2~3', l: '분이면 분석 완료', c: AMBER },
                ].map((it, i) => (
                  <div key={it.l} className={`text-center px-10 ${i > 0 ? 'border-l border-[#333]' : ''}`}>
                    <p className="leading-none m-0" style={{ fontFamily: ABRIL, fontSize: 76, fontWeight: 900, color: it.c }}>
                      {it.n}
                    </p>
                    <p className="mt-3 text-[11px] tracking-[0.14em] text-[#888] font-bold m-0">{it.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
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
