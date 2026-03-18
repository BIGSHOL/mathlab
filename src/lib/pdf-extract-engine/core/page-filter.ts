/**
 * 페이지 필터 — 텍스트 레이어 기반 추출 대상 판별
 *
 * 플러그인에서 isTargetPage를 직접 구현할 수도 있고,
 * 이 유틸로 키워드/패턴 기반 필터를 간편하게 생성할 수도 있습니다.
 */

export interface PageFilterConfig {
  /** 이 키워드가 포함된 페이지는 스킵 (정규식) */
  skipPatterns?: RegExp[];
  /** 이 패턴이 하나라도 있으면 추출 대상 (정규식) */
  targetPatterns?: RegExp[];
  /** 최소 텍스트 길이 (기본: 10) */
  minTextLength?: number;
  /**
   * skipPatterns 매칭 시에도 targetPatterns가 있으면 추출할지 여부
   * true면 targetPatterns 우선 (기본: true)
   */
  targetOverridesSkip?: boolean;
}

/**
 * 설정 기반 페이지 필터 생성
 *
 * @example
 * ```ts
 * const filter = createPageFilter({
 *   skipPatterns: [/목차/, /정답과\s*풀이/],
 *   targetPatterns: [/\d+\.\s/, /①|②|③/],
 * });
 * const isTarget = filter('이 페이지 텍스트...');
 * ```
 */
export function createPageFilter(config: PageFilterConfig): (textLayer: string) => boolean {
  const {
    skipPatterns = [],
    targetPatterns = [],
    minTextLength = 10,
    targetOverridesSkip = true,
  } = config;

  return (textLayer: string): boolean => {
    if (!textLayer || textLayer.length < minTextLength) return false;

    const hasTarget = targetPatterns.length > 0
      ? targetPatterns.some((p) => p.test(textLayer))
      : true; // targetPatterns 없으면 기본 true

    const shouldSkip = skipPatterns.some((p) => p.test(textLayer));

    if (shouldSkip) {
      return targetOverridesSkip ? hasTarget : false;
    }

    return hasTarget;
  };
}
