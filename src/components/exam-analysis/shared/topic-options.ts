export interface TopicOption {
  /** select value (저장될 값) — "대단원 > 중단원" 또는 "대단원" */
  value: string;
  /** 표시 라벨 — 중단원명 (옵션에 표시되는 텍스트) */
  label: string;
}

export interface TopicOptionGroup {
  /** optgroup label — 예: "1학기 · 1. 유리수와 순환소수" */
  label: string;
  options: TopicOption[];
}

export interface TopicOptionsOptions {
  includeListening?: boolean;
}
