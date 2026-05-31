import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';

/**
 * 루트 — 기출분석 제품 공개 랜딩페이지.
 * (로그인 상태면 히어로/헤더 CTA 가 /exam-analysis 바로가기로 전환 — auth-aware)
 */
export const metadata: Metadata = {
  title: 'MathLAB 기출분석 — 시험지 한 장이면 분석부터 블로그 글까지 자동으로',
  description:
    'PDF만 올리면 AI가 난이도·단원·문항 해설·총평을 만들고, 네이버 블로그용 자료까지 생성합니다. 한국 수학 학원을 위한 AI 기출 분석 도구.',
};

export default function Page() {
  return <LandingPage />;
}
