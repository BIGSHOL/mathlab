'use client';

import * as React from 'react';
import Link from 'next/link';

export type HintLevel = 1 | 2 | 'solution';

export type Hint = {
  level: HintLevel;
  content: string;
  penalty: number; // 0, 3, 5
};

export type PreviousAttempt = {
  date: string;
  myAnswer: string;
  mistakePattern?: string;
  classAvgRate: number; // 0~1
};

export type RelatedConcept = {
  id: string;
  title: string;
};

export type HintPanelProps = {
  previousAttempt?: PreviousAttempt;
  hints: Hint[];
  usedHints: HintLevel[];
  onUseHint: (level: HintLevel) => void;
  relatedConcepts?: RelatedConcept[];
  /** 관련 개념 링크 베이스 경로 (기본 /v2/concepts) */
  conceptHref?: (id: string) => string;
  className?: string;
};

/**
 * v2 디자인 시스템 HintPanel.
 * practice-suite.css 의 .v2-hint-panel / .v2-hint-btn / .v2-hint-related 매핑.
 *
 * 섹션:
 *   1) 이전 풀이 비교 (previousAttempt 있을 때)
 *   2) 단계별 힌트 (hints)
 *   3) 관련 개념 (relatedConcepts 있을 때)
 */
export function HintPanel({
  previousAttempt,
  hints,
  usedHints,
  onUseHint,
  relatedConcepts,
  conceptHref = (id) => `/v2/concepts/${id}`,
  className,
}: HintPanelProps) {
  const classes = ['v2-hint-panel'];
  if (className) classes.push(className);

  function isUsed(level: HintLevel) {
    return usedHints.some((u) => u === level);
  }

  function levelLabel(level: HintLevel) {
    if (level === 'solution') return '풀이 보기';
    return `힌트 ${level}`;
  }

  return (
    <aside className={classes.join(' ')}>
      {previousAttempt && (
        <section className="v2-hint-section">
          <h3>이전 풀이 비교</h3>
          <dl className="v2-hint-dl">
            <dt>{previousAttempt.date} 내 답</dt>
            <dd>{previousAttempt.myAnswer}</dd>
            {previousAttempt.mistakePattern && (
              <>
                <dt>자주 한 실수</dt>
                <dd>{previousAttempt.mistakePattern}</dd>
              </>
            )}
            <dt>반평균 정답률</dt>
            <dd>{Math.round(previousAttempt.classAvgRate * 100)}%</dd>
          </dl>
        </section>
      )}

      <section className="v2-hint-section">
        <h3>단계별 힌트</h3>
        {hints.map((h) => {
          const opened = isUsed(h.level);
          const btnClasses = ['v2-hint-btn'];
          if (opened) btnClasses.push('opened');
          return (
            <button
              type="button"
              key={`${h.level}`}
              className={btnClasses.join(' ')}
              onClick={() => !opened && onUseHint(h.level)}
              disabled={opened}
            >
              <div className="v2-hint-row">
                <span className="v2-hint-lvl">{levelLabel(h.level)}</span>
                <span className={`v2-hint-penalty${h.penalty > 0 ? ' cost' : ''}`}>
                  {h.penalty === 0 ? '무료' : `-${h.penalty}점`}
                </span>
              </div>
              {opened && <p className="v2-hint-content">{h.content}</p>}
            </button>
          );
        })}
      </section>

      {relatedConcepts && relatedConcepts.length > 0 && (
        <section className="v2-hint-section">
          <h3>관련 개념</h3>
          <ul className="v2-hint-related">
            {relatedConcepts.map((c) => (
              <li key={c.id}>
                <Link href={conceptHref(c.id)}>{c.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
