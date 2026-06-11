import type { Metadata } from 'next';
import { DemoClient } from './DemoClient';

export const metadata: Metadata = {
  title: '데모 체험 — MathLAB 기출 분석',
  description: '회원가입 없이 기출 분석 전 과정(업로드 → AI 분석 → 결과 → 총평 → 블로그)을 샘플 시험지로 체험해 보세요.',
};

/** 공개 데모 — 비로그인 사용자가 기출분석 1~100 전 과정을 샘플 데이터로 체험 (AI 비용 0) */
export default function DemoPage() {
  return <DemoClient />;
}
