/**
 * para-x 결제 허브 상품 목록 — 구매 진입점(UI)의 단일 소스.
 * id 는 para-x 카탈로그(D:\para-x\lib\products.js)와 반드시 일치해야 한다.
 *
 * ## 금액을 왜 여기 두는가 (2026-08-31 정책 변경)
 * 이전에는 "가격의 단일 진실은 para-x 서버 카탈로그"라며 금액을 두지 않고
 * 화면에 "가격은 결제 화면에서 확인하세요"라고 안내했다. 그런데 그건
 * **카드사 심사 반려 사유**다 — 토스페이먼츠 「계약과정 FAQ」 §2:
 *   "가격 명시 없이 문의나 상담 창구만 확인되는 경우 (입점 불가)"
 *   "상품 금액과 결제 금액이 같아야 해요"
 * 구매자가 결제창에 들어가기 전에 가격을 알 수 있어야 한다.
 *
 * 드리프트 위험(양쪽에 금액이 존재)은 검사로 막는다 — `npm run verify:prices`
 * 가 para-x 카탈로그의 `amount` 와 여기 `priceKrw` 를 대조해 어긋나면 실패한다.
 * 금액을 바꿀 때는 **양쪽을 같이** 고치고 그 검사를 돌릴 것.
 */

export interface ParaxProduct {
  id: string;
  label: string;
  /** 원화 정가(원). para-x 카탈로그의 amount 와 일치해야 한다. */
  priceKrw: number;
}

/** `30000` → `"₩30,000"` — 화면 표기를 한 곳에서 만든다 */
export function formatKrw(won: number): string {
  return `₩${won.toLocaleString('ko-KR')}`;
}

/** 일회성 이용권(크레딧) — 충전일로부터 1년 유효 */
export const CREDIT_PRODUCTS: ParaxProduct[] = [
  { id: 'credit-exam-3', label: '기출분석 3회', priceKrw: 30000 },
  { id: 'credit-exam-10', label: '기출분석 10회', priceKrw: 80000 },
  { id: 'credit-exam-30', label: '기출분석 30회', priceKrw: 210000 },
];

/** 월 구독(정기결제) — 결제창은 빌링(자동결제) 인증으로 열린다 */
export const SUB_PRODUCTS: ParaxProduct[] = [
  { id: 'sub-basic', label: 'Basic · 월 20회', priceKrw: 80000 },
  { id: 'sub-pro', label: 'Pro · 월 35회', priceKrw: 133000 },
  { id: 'sub-enterprise', label: 'Enterprise · 월 80회', priceKrw: 280000 },
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
