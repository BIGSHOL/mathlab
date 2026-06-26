// 🚧 Lab 도형 색 — 교재 표준 검정 선.
//   공유 svg-diagrams는 브랜드 블루(#3B82F6/#60A5FA/#EFF6FF)로 그린다(기출분석과 공용 → 수정 금지).
//   Lab 표시용으로 출력 SVG 문자열의 '블루 계열만' 검정/중립으로 치환한다.
//   ⚠️ 빨강 강조 호(COLORS.red, 묻는 각 표시)·회색 보조선(#999)은 보존 — 블루만 대상.
export const LAB_INK = '#111827'; // 도형 주선(near-black)
export const LAB_AUX = '#9ca3af'; // 보조선/약한 선(중립 회색)
export const LAB_FILL = '#f8fafc'; // 면 채움(파란 틴트 제거, 거의 흰색 중립)

/** 공유 렌더러 출력의 블루 계열 → 검정/중립. (빨강·회색은 불변) */
export function recolorToInk(svg: string): string {
  return svg
    .replace(/#3B82F6/gi, LAB_INK) // MAIN_STROKE / COLORS.primary
    .replace(/#60A5FA/gi, LAB_AUX) // AUX_STROKE
    .replace(/#1E40AF/gi, LAB_INK) // LABEL_COLOR / POINT_COLOR (치수·각 라벨·점)
    .replace(/#135bec/gi, LAB_INK) // 브랜드 primary(혹시 누수)
    .replace(/#EFF6FF/gi, LAB_FILL); // FILL_TINT
}
