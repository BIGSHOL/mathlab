/**
 * Pattern B V1 — "다음 할 일" 액션 리스트 (사이드 패널용).
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1 `.actions`
 *
 * 각 항목: 라벨 + 우측 화살표. primary 변형 1개 권장.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface NextAction {
  label: ReactNode;
  /** Link 라우트. 외부 클릭 핸들러를 쓰려면 onClick 사용. */
  href?: string;
  /** 클릭 핸들러 (href 없을 때) */
  onClick?: () => void;
  /** 강조 변형 — 1개만 primary 권장 */
  primary?: boolean;
  /** 비활성화 — 클릭 무시 + 시각 흐리게 */
  disabled?: boolean;
}

export interface NextActionsProps {
  /** 섹션 헤더 라벨. default: "다음 할 일" */
  title?: string;
  items: NextAction[];
}

export function NextActions({ title = '다음 할 일', items }: NextActionsProps) {
  if (items.length === 0) return null;
  return (
    <>
      <h4>{title}</h4>
      <div className="rr-actions">
        {items.map((a, i) => {
          const klass = `act${a.primary ? ' primary' : ''}`;
          const body = (
            <>
              <span>{a.label}</span>
              <span>→</span>
            </>
          );
          if (a.disabled) {
            return (
              <button key={i} className={klass} aria-disabled="true" disabled>
                {body}
              </button>
            );
          }
          if (a.href) {
            return (
              <Link key={i} href={a.href} className={klass}>
                {body}
              </Link>
            );
          }
          return (
            <button key={i} className={klass} onClick={a.onClick} type="button">
              {body}
            </button>
          );
        })}
      </div>
    </>
  );
}
