/**
 * 결제 페이지 플랜 카드 표시 데이터 — UI 카피/가격 라벨의 단일 소스.
 * 한도/기능 정책은 src/lib/billing/plans.ts(PLANS)와,
 * 가격·월 충전 수량은 para-x 상품 카탈로그(D:\para-x\lib\products.js)와 일치시켜야 함.
 */
import type { PlanId } from '@/lib/billing/plans';

export interface PlanCard {
  key: PlanId;
  name: string;
  priceLabel: string;
  monthlyLimit: number | null; // null = 무제한
  features: { commentary: boolean; nearby: boolean };
  bullets: string[];
  highlight?: boolean;
}

export const PLAN_CARDS: PlanCard[] = [
  {
    key: 'free',
    name: 'Free',
    priceLabel: '무료',
    monthlyLimit: 3,
    features: { commentary: false, nearby: false },
    bullets: ['월 3회 기출 분석', 'AI 총평 미포함', '주변 학교 비교 미포함'],
  },
  {
    key: 'basic',
    name: 'Basic',
    priceLabel: '₩80,000 / 월',
    monthlyLimit: 20,
    features: { commentary: true, nearby: true },
    bullets: ['기출분석 이용권 월 20회 자동 충전', 'AI 시험 총평 제공', '주변 학교·연도 비교 제공'],
  },
  {
    key: 'pro',
    name: 'Pro',
    priceLabel: '₩133,000 / 월',
    monthlyLimit: 35,
    features: { commentary: true, nearby: true },
    bullets: ['기출분석 이용권 월 35회 자동 충전', 'AI 시험 총평 제공', '주변 학교·연도 비교 제공'],
    highlight: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    priceLabel: '₩280,000 / 월',
    monthlyLimit: 80,
    features: { commentary: true, nearby: true },
    bullets: ['기출분석 이용권 월 80회 자동 충전', 'AI 시험 총평 제공', '주변 학교·연도 비교 제공', '우선 지원'],
  },
];
