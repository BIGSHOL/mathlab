/**
 * 결제 페이지 플랜 카드 표시 데이터 — UI 카피/가격 라벨의 단일 소스.
 * 한도/기능 정책은 src/lib/billing/plans.ts(PLANS)와 일치시켜야 함.
 * 실제 LS 상품 연결 후 priceLabel을 실가격으로 교체.
 */
import type { PlanId } from '@/lib/billing/plans';

export interface PlanCard {
  key: PlanId;
  name: string;
  priceLabel: string; // 실제 가격 연결 전엔 "무료"/"준비 중"/"문의"
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
    key: 'pro',
    name: 'Pro',
    priceLabel: '₩49,000 / 월',
    monthlyLimit: 50,
    features: { commentary: true, nearby: true },
    bullets: ['월 50회 기출 분석', 'AI 시험 총평 제공', '주변 학교·연도 비교 제공'],
    highlight: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    priceLabel: '₩99,000 / 월',
    monthlyLimit: null,
    features: { commentary: true, nearby: true },
    bullets: ['무제한 기출 분석', 'AI 시험 총평 제공', '주변 학교·연도 비교 제공', '우선 지원'],
  },
];
