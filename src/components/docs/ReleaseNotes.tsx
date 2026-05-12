'use client';

import * as React from 'react';

/* ──────────── 데이터 타입 ──────────── */

export type ReleaseChangeType = 'new' | 'imp' | 'fix' | 'brk';

export type ReleaseChangeItem = {
  /** 본문 (**볼드** 처리) */
  text: string;
  /** 우측 pill (예: "#1842", "/student/market") */
  ref?: string;
};

export type ReleaseChangeGroup = {
  type: ReleaseChangeType;
  /** "✨ 새 기능" 같은 라벨 (이모지 포함) */
  label: string;
  items: ReleaseChangeItem[];
};

export type ReleaseVersionLevel = 'major' | 'minor' | 'patch';

export type Release = {
  version: string;
  level: ReleaseVersionLevel;
  title: string;
  date: string;
  groups: ReleaseChangeGroup[];
  /** 스크린샷 placeholder 텍스트 (최대 3개) */
  previews?: string[];
};

export type ReleaseFilterType = 'all' | ReleaseChangeType;

export type ReleaseNotesProps = {
  releases: Release[];
  title?: string;
  subtitle?: string;
  /** 더 불러오기 버튼 노출 */
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
};

const FILTER_LABELS: Record<ReleaseFilterType, string> = {
  all: '전체',
  new: '새 기능',
  imp: '개선',
  fix: '버그 픽스',
  brk: '호환성 변경',
};

const LEVEL_LABEL: Record<ReleaseVersionLevel, string> = {
  major: '메이저',
  minor: '마이너',
  patch: '패치',
};

/* ──────────── 마크다운 인라인 렌더 ──────────── */

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <b key={i}>{part.slice(2, -2)}</b>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="inline">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/* ──────────── 컴포넌트 ──────────── */

/**
 * Pattern G V3 — 릴리즈 노트 (ReleaseNotes).
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V3
 *
 * 구조:
 *   .release-shell
 *     .release-head (h1 + filter-pills)
 *     .release-body (release-card 누적)
 *
 * 필터: 클라이언트 사이드 (state).
 */
export function ReleaseNotes({
  releases,
  title = "What's new",
  subtitle = '매쓰랩 변경 이력 · 메이저 + 마이너 + 패치',
  hasMore = false,
  onLoadMore,
  className,
}: ReleaseNotesProps) {
  const [filter, setFilter] = React.useState<ReleaseFilterType>('all');

  const filtered = React.useMemo(() => {
    if (filter === 'all') return releases;
    return releases
      .map((r) => ({
        ...r,
        groups: r.groups.filter((g) => g.type === filter),
      }))
      .filter((r) => r.groups.length > 0);
  }, [releases, filter]);

  const classes = ['release-shell'];
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      <div className="release-head">
        <div>
          <h1>{title}</h1>
          <div className="meta">{subtitle}</div>
        </div>
        <div className="filter-pills">
          {(['all', 'new', 'imp', 'fix', 'brk'] as ReleaseFilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`pill${filter === f ? ' on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="release-body">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>
            해당 유형의 변경 사항이 없습니다.
          </div>
        ) : (
          filtered.map((r) => <ReleaseCard key={r.version} release={r} />)
        )}
        {hasMore && (
          <div className="release-load-more">
            <button type="button" onClick={onLoadMore}>
              더 많은 변경 이력 보기 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReleaseCard({ release }: { release: Release }) {
  return (
    <article className="release-card">
      <div className="vhead">
        <span className="vnum">{release.version}</span>
        <span className={`vlabel ${release.level}`}>{LEVEL_LABEL[release.level]}</span>
        <span className="vtitle">{release.title}</span>
        <span className="vdate">{release.date}</span>
      </div>

      {release.groups.map((g) => (
        <div key={g.type} className="group">
          <h4>
            {g.label}
            <span className={`tag ${g.type}`}>
              {g.type === 'new' && 'NEW'}
              {g.type === 'imp' && '개선'}
              {g.type === 'fix' && 'FIX'}
              {g.type === 'brk' && 'BREAKING'}
            </span>
          </h4>
          <div className="items">
            {g.items.map((it, i) => (
              <div key={i} className="item">
                <span className="b">●</span>
                <span className="t">
                  {renderInline(it.text)}
                  {it.ref && <span className="pill-sm">{it.ref}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {release.previews && release.previews.length > 0 && (
        <div className="preview-row">
          {release.previews.map((p, i) => (
            <div key={i} className="ss">
              📷 스크린샷 · {p}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
