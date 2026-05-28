/**
 * V4 섹션 헤딩 — ✏ 펜 아이콘 + 굵은 갈색 헤딩
 *
 * 갈수학학원 스타일 핵심 요소. 각 섹션을 명확히 구분하여
 * 학부모/학생이 정보를 빠르게 스캔할 수 있도록.
 */

interface SectionHeadingProps {
  title: string;
  /** 선택적 부제 (작은 회색 글씨) */
  subtitle?: string;
}

export function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div className="v4-heading">
      <span className="v4-heading-icon" aria-hidden="true">▶</span>
      <span className="v4-heading-text">{title}</span>
      {subtitle && <span className="v4-heading-sub">{subtitle}</span>}
    </div>
  );
}
