/**
 * para-x 결제 허브 상품 목록 — 구매 진입점(UI)의 단일 소스.
 * id 는 para-x 카탈로그(D:\para-x\lib\products.js)와 반드시 일치해야 한다.
 * 금액은 여기 두지 않는다 — 가격의 단일 진실은 para-x 서버 카탈로그이고,
 * 결제 화면이 서버가 확정한 금액을 표시한다(양쪽에 두면 드리프트가 생긴다).
 */

export interface ParaxProduct {
  id: string;
  label: string;
}

/** 일회성 이용권(크레딧) — 충전일로부터 1년 유효 */
export const CREDIT_PRODUCTS: ParaxProduct[] = [
  { id: 'credit-exam-3', label: '기출분석 3회' },
  { id: 'credit-exam-10', label: '기출분석 10회' },
  { id: 'credit-exam-30', label: '기출분석 30회' },
];

/** 월 구독(정기결제) — 결제창은 빌링(자동결제) 인증으로 열린다 */
export const SUB_PRODUCTS: ParaxProduct[] = [
  { id: 'sub-basic', label: 'Basic · 월 20회' },
  { id: 'sub-pro', label: 'Pro · 월 35회' },
  { id: 'sub-enterprise', label: 'Enterprise · 월 80회' },
];

/**
 * 결제 진입이 허용된 상품 id.
 * 랜딩(para-x.co.kr)에서 `?product=` 로 넘어온 값을 검증할 때 사용 —
 * 화이트리스트에 없는 임의 문자열이 결제 진입점으로 새지 않도록 막는다.
 */
export const PURCHASABLE_PRODUCT_IDS = new Set(
  [...CREDIT_PRODUCTS, ...SUB_PRODUCTS].map((p) => p.id),
);

/** 로그인 원장을 para-x 결제로 인계하는 링크 (서버가 서명 토큰을 붙여 302) */
export const paraxCheckoutHref = (productId: string) =>
  `/api/parax/checkout?product=${encodeURIComponent(productId)}`;
