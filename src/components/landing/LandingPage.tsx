'use client';

import Link from 'next/link';
import {
  FileSearch, BarChart3, FileText, Share2, Upload, Sparkles,
  MapPin, Database, ListChecks, Check, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LogoIcon } from '@/components/ui/LogoIcon';
import { Button } from '@/components/ui/Button';

/** 기출분석 제품 공개 랜딩페이지 (루트 /). design.md 명세 기반. */
export function LandingPage() {
  const { user } = useAuth();
  const cta = user
    ? { href: '/exam-analysis', label: '기출분석 바로가기' }
    : { href: '/login', label: '로그인' };

  return (
    <div className="scroll-smooth bg-white text-text-primary">
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
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-indigo-50 px-3 py-1 rounded-full mb-5">
              <Sparkles className="w-3.5 h-3.5" /> AI 기반 · 한국 수학 교육과정 특화
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-[1.15] tracking-tight">
              시험지 한 장이면,<br />
              <span className="text-primary">분석부터 블로그 글까지</span> 자동으로
            </h1>
            <p className="mt-5 text-lg text-text-secondary leading-relaxed max-w-xl">
              PDF만 올리면 AI가 난이도·단원·문항 해설·총평을 만들고,
              네이버 블로그용 자료까지 생성합니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={cta.href}>
                <Button size="lg">{user ? '기출분석 바로가기' : '시작하기'}</Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="ghost">기능 보기</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-400">학원에서 받은 계정으로 로그인하세요</p>
          </div>

          {/* 더미 분석 결과 mockup */}
          <div className="relative">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-sm font-bold">경신고 1학년 공통수학1</div>
                  <div className="text-xs text-slate-400">2026 · 1학기 중간 · 20문항</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">분석완료</span>
              </div>
              <div className="flex items-center gap-6">
                {/* 난이도 도넛 */}
                <div className="relative w-28 h-28 shrink-0 rounded-full"
                  style={{ background: 'conic-gradient(#3B5BDB 0 50%, #6366f1 50% 78%, #c7d2fe 78% 100%)' }}>
                  <div className="absolute inset-[14px] bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-primary">20</span>
                    <span className="text-[10px] text-slate-400">문항</span>
                  </div>
                </div>
                {/* 단원 막대 */}
                <div className="flex-1 space-y-2.5">
                  {[['다항식', 82], ['방정식과 부등식', 64], ['도형의 방정식', 45]].map(([label, w]) => (
                    <div key={label as string}>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{label}</span><span>{w as number}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500 mb-1">총평</div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  중상 난이도로 다항식 단원 비중이 높습니다. 도형의 방정식에서 킬러문항 2개…
                </p>
              </div>
            </div>
            {/* 부유 배지 */}
            <div className="absolute -top-3 -left-3 bg-white rounded-full shadow-md border border-slate-100 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AI 분석 완료
            </div>
          </div>
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
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-black text-center">선생님의 시간을 돌려드립니다</h2>
        <p className="text-center text-text-secondary mt-3">며칠 걸리던 기출 분석을 수 분 안에.</p>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: FileSearch, title: '자동 기출 분석', desc: '시험지 PDF 업로드 한 번. OCR·문항 추출·난이도 판정까지 AI가.' },
            { icon: BarChart3, title: '난이도·단원 인사이트', desc: '단원별 출제 비중, 난이도 분포, 킬러문항 패턴을 차트로.' },
            { icon: FileText, title: '해설·총평 자동 생성', desc: '문항별 풀이 해설과 시험 총평을 즉시. 검토만 하면 끝.' },
            { icon: Share2, title: '블로그 콘텐츠 자동화', desc: '분석 결과를 네이버 블로그용 이미지로 한 번에. 학원 홍보까지.' },
          ].map((c) => (
            <div key={c.title} className="p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
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
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-black text-center">3단계면 충분합니다</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { n: '01', icon: Upload, title: '업로드', desc: '시험지 PDF를 끌어다 놓습니다.' },
              { n: '02', icon: Sparkles, title: 'AI 분석', desc: '수 분 내 난이도·단원·해설·총평을 자동 생성합니다.' },
              { n: '03', icon: Share2, title: '리포트 & 공유', desc: '차트 리포트 확인 후 인쇄·PDF·네이버 블로그 이미지로 공유.' },
            ].map((s) => (
              <div key={s.n} className="relative p-7 rounded-2xl bg-white border border-slate-200">
                <span className="absolute top-5 right-6 text-3xl font-black text-slate-100">{s.n}</span>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
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
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-black text-center">기출 분석에 필요한 모든 것</h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: BarChart3, title: '난이도·점수 차트', desc: '난이도 분포 도넛, 배점 막대, 유형 레이더 차트를 자동 렌더.' },
            { icon: ListChecks, title: '단원·유형·킬러문항', desc: '단원별 출제 비중과 자주 나오는 유형, 킬러문항을 식별.' },
            { icon: FileText, title: '문항 해설 & 총평', desc: 'KaTeX 수식이 포함된 문항별 해설과 시험 총평을 생성.' },
            { icon: MapPin, title: '주변 학교 비교', desc: '우리 지역 학교 기출과 난이도·단원을 비교해 내신을 대비.' },
            { icon: Share2, title: '네이버 블로그 이미지', desc: '클릭 한 번으로 블로그 게시용 분석 이미지 세트를 생성.' },
            { icon: Database, title: '문제은행 추출', desc: '분석한 문항을 문제은행으로 추출해 재활용(선택).' },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2.5 mb-2">
                <f.icon className="w-5 h-5 text-primary" />
                <h3 className="font-bold">{f.title}</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 마무리 CTA ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-3xl px-8 py-14 text-center text-white"
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
  );
}
