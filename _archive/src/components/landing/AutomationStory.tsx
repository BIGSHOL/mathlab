'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Reveal, RevealStagger, RevealItem } from '@/components/landing/editorial/motion';
import { SectionHeading } from '@/components/landing/editorial/SectionHeading';

function PhotoCard({
  src,
  alt,
  eyebrow,
  title,
  position = 'center',
}: {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  position?: string;
}) {
  return (
    <div className="group relative min-h-[360px] overflow-hidden rounded-[24px] border border-brand-line bg-brand-cream-2 shadow-brand-md lg:min-h-[520px]">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 30vw, 100vw"
        className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
        style={{ objectPosition: position }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(13,18,38,0.88)_100%)]"
      />
      <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
        <p className="text-[11px] font-extrabold tracking-[0.16em] text-white/65">{eyebrow}</p>
        <p className="mt-2 max-w-[260px] text-[21px] font-extrabold leading-[1.35] tracking-[-0.025em] [word-break:keep-all]">
          {title}
        </p>
      </div>
    </div>
  );
}

export function AutomationStory() {
  return (
    <section id="automation" className="scroll-mt-20 border-y border-brand-line bg-brand-cream-2">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <SectionHeading
          kicker="기출분석 자동화"
          title="시험지 한 장이 분석 리포트가 되기까지"
          lede="PDF를 올리면 문항 분리부터 난이도·단원 분석, 총평과 블로그 자료 생성까지 한 흐름으로 이어집니다."
        />

        <RevealStagger className="mt-12 grid gap-5 lg:grid-cols-[0.92fr_1.16fr_0.92fr]">
          <RevealItem>
            <PhotoCard
              src="/images/landing/exam-input.webp"
              alt="분석할 시험지 묶음과 노트북이 놓인 한국 수학학원 교사 책상"
              eyebrow="INPUT · PDF"
              title="기출 시험지 PDF 한 장에서 시작"
              position="48% center"
            />
          </RevealItem>

          <RevealItem>
            <PhotoCard
              src="/images/landing/analysis-automation.webp"
              alt="한 장의 시험지가 스캔되어 난이도 차트와 분석 리포트 여러 장으로 자동 생성되는 과정"
              eyebrow="AUTO · 2~3분"
              title="난이도·단원·총평·블로그 자료를 자동 생성"
              position="center center"
            />
          </RevealItem>

          <RevealItem>
            <PhotoCard
              src="/images/landing/analysis-in-use.webp"
              alt="한국 수학학원에서 교사와 한국 고등학생들이 노트북의 분석 결과를 함께 검토하는 모습"
              eyebrow="OUTPUT · 활용"
              title="완성된 분석은 수업과 상담에 바로 활용"
              position="52% center"
            />
          </RevealItem>
        </RevealStagger>

        <Reveal className="mt-6">
          <div className="flex flex-col items-start justify-between gap-4 rounded-[18px] border border-brand-line bg-white px-6 py-5 shadow-brand-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-[12px] font-extrabold tracking-[0.12em] text-brand-indigo">ROLE SPLIT</p>
              <p className="mt-1.5 text-[15px] font-bold text-brand-ink">
                MathLAB은 반복 분석과 정리를, 선생님은 최종 판단과 학생 지도를 맡습니다.
              </p>
            </div>
            <a href="#how" className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-extrabold text-brand-indigo hover:underline">
              작동 방식 보기 <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
