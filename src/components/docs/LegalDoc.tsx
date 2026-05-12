'use client';

import * as React from 'react';

/* ──────────── 데이터 타입 ──────────── */

export type LegalOrderedItem =
  | string
  | {
      text: string;
      /** 하위 ordered list */
      children?: string[];
      /** 하위 unordered list */
      unordered?: string[];
    };

export type LegalSection = {
  /** "제1조" */
  num: string;
  /** 조 제목 */
  title: string;
  /** 일반 단락 */
  paragraphs?: string[];
  /** 번호 리스트 (1, 2, 3) — 항목 안에 하위 리스트도 가능 */
  ordered?: LegalOrderedItem[];
};

export type LegalVersion = {
  name: string;
  /** 시행일 또는 게시일 */
  date?: string;
  current?: boolean;
};

export type LegalDocData = {
  title: string;
  subtitle: string;
  /** 현재 버전 (예: "v3.2") */
  version: string;
  /** 시행일 (예: "2026.05.01") */
  effectiveDate: string;
  /** 이전 버전 (예: "v3.1 (2026.01.15)") */
  previousVersion?: string;
  /** 버전 선택 버튼에 표시할 버전 목록 */
  versionList?: LegalVersion[];
  articles: LegalSection[];
  /** 부칙 등 보조 */
  appendix?: React.ReactNode;
};

export type LegalDocProps = {
  data: LegalDocData;
  /** 동의 액션 바 표시 여부 (회원가입 동의 모달용). 기본 false */
  showAccept?: boolean;
  acceptLabel?: string;
  onAccept?: () => void;
  className?: string;
};

/* ──────────── 마크다운 인라인 렌더 ──────────── */

function renderInline(text: string): React.ReactNode {
  // **볼드** + <highlight>강조</highlight> 처리
  const parts = text.split(/(\*\*[^*]+\*\*|<highlight>[^<]+<\/highlight>)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <b key={i}>{part.slice(2, -2)}</b>;
    }
    if (part.startsWith('<highlight>') && part.endsWith('</highlight>')) {
      return (
        <span key={i} className="highlight">
          {part.slice(11, -12)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderOrderedItem(item: LegalOrderedItem, i: number): React.ReactNode {
  if (typeof item === 'string') {
    return <li key={i}>{renderInline(item)}</li>;
  }
  return (
    <li key={i}>
      {renderInline(item.text)}
      {item.children && item.children.length > 0 && (
        <ol>
          {item.children.map((c, j) => (
            <li key={j}>{renderInline(c)}</li>
          ))}
        </ol>
      )}
      {item.unordered && item.unordered.length > 0 && (
        <ul>
          {item.unordered.map((c, j) => (
            <li key={j}>{renderInline(c)}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/* ──────────── 컴포넌트 ──────────── */

/**
 * Pattern G V2 — 약관·정책 (LegalDoc).
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V2
 *
 * 구조:
 *   .legal-shell
 *     .legal-head (다크 그라데이션 — 제목, sub, vers info)
 *     .legal-actions (버전 선택, PDF, 인쇄, 검색)
 *     .legal-toc (3 columns 조 목차)
 *     .legal-body (article 단위)
 *     .legal-accept (선택 — 회원가입 동의 모달용)
 */
export function LegalDoc({
  data,
  showAccept = false,
  acceptLabel = '동의하고 계속',
  onAccept,
  className,
}: LegalDocProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const classes = ['legal-shell'];
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      <div className="legal-head">
        <h1>{data.title}</h1>
        <div className="sub">{data.subtitle}</div>
        <div className="vers">
          <div>
            <span>버전</span>
            {data.version}
          </div>
          <div>
            <span>시행일</span>
            {data.effectiveDate}
          </div>
          {data.previousVersion && (
            <div>
              <span>이전 버전</span>
              {data.previousVersion}
            </div>
          )}
        </div>
      </div>

      <div className="legal-actions">
        <span className="lb">버전 선택</span>
        {(data.versionList ?? [{ name: data.version, current: true }]).map((v) => (
          <button
            key={v.name}
            type="button"
            className={`btn-sm${v.current ? ' on' : ''}`}
          >
            {v.name}
            {v.current && ' (현재)'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn-sm" onClick={handlePrint}>
          🖨️ 인쇄
        </button>
        <button type="button" className="btn-sm" onClick={handlePrint}>
          📥 PDF 다운로드
        </button>
      </div>

      <div className="legal-toc">
        <h6>목차</h6>
        <div className="links">
          {data.articles.map((a) => (
            <a key={a.num} href={`#${slugify(a.num)}`}>
              <span className="num">{a.num.replace(/제|조/g, '')}조</span>
              {a.title}
            </a>
          ))}
        </div>
      </div>

      <div className="legal-body">
        {data.articles.map((article) => (
          <div key={article.num} id={slugify(article.num)} className="article">
            <h2>
              <span className="num">{article.num}</span>
              {article.title}
            </h2>
            {article.paragraphs?.map((p, i) => (
              <p key={i}>{renderInline(p)}</p>
            ))}
            {article.ordered && article.ordered.length > 0 && (
              <ol>{article.ordered.map(renderOrderedItem)}</ol>
            )}
          </div>
        ))}
        {data.appendix && (
          <div className="article" style={{ marginTop: 32, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            {data.appendix}
          </div>
        )}
      </div>

      {showAccept && (
        <div className="legal-accept">
          <div className="text">
            <b>이 약관에 동의합니다</b>
            <span>회원가입을 진행하려면 위 약관을 끝까지 읽고 동의해 주세요.</span>
          </div>
          <button type="button" onClick={onAccept}>
            {acceptLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function slugify(num: string): string {
  // "제1조" → "art-1"
  const n = num.match(/\d+/)?.[0] ?? num;
  return `art-${n}`;
}
