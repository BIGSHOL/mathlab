/**
 * V3 인포그래픽 3: 문항별 난이도 지도 (1~N번 격자)
 *
 * 각 셀은 문항 번호 표시. 색상으로 난이도(녹/회/황/빨), 배경으로 서술형 표시.
 *
 * 시안: scripts/generate-v3-preview-html.ts::renderKillerMap 의 JSX 버전
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { questionLevel } from '@/lib/exam-analysis/shared/difficulty';
import { isEssay as isEssayQuestion } from '@/lib/exam-analysis/shared/question-format';

export function KillerMap({ questions }: { questions: AnalyzedQuestion[] }) {
  const list = questions
    .map((q) => ({
      num: q.question_number,
      diff: questionLevel(q.difficulty),
      isEssay: isEssayQuestion(q),
    }))
    .sort((a, b) => {
      const numA = Number(String(a.num).replace(/\D/g, '')) || 0;
      const numB = Number(String(b.num).replace(/\D/g, '')) || 0;
      const aIsLetter = /[가-힣]/.test(String(a.num));
      const bIsLetter = /[가-힣]/.test(String(b.num));
      if (aIsLetter !== bIsLetter) return aIsLetter ? 1 : -1;
      return numA - numB;
    });

  if (list.length === 0) return null;

  /** 셀 라벨 축약 — "서답형1"/"서술형1" → "서1", "단답형1" → "단1" (셀 폭 일관성 유지) */
  const shortLabel = (raw: number | string): string => {
    const s = String(raw);
    return s
      .replace(/^서답형\s*/, '서')
      .replace(/^서술형\s*/, '서')
      .replace(/^단답형\s*/, '단');
  };

  return (
    <figure className="v3-info-fig">
      <figcaption className="v3-info-label">도표 · 문항별 난이도 지도</figcaption>
      <div className="v3-killer-grid">
        {list.map((q, i) => {
          let bg = 'transparent';
          let border = 'var(--v3-ink)';
          let textColor = 'var(--v3-ink)';
          if (q.diff === null) {
            // 난이도 미판독 — 1~2단계(기본·표준)와 같은 모양으로 두면 쉬운 문항으로 읽힌다
            border = 'var(--v3-line)';
            textColor = 'var(--v3-muted)';
          } else if (q.diff === 5) {
            bg = 'var(--v3-accent)';
            border = 'var(--v3-accent)';
            textColor = 'var(--v3-paper)';
          } else if (q.diff === 4) {
            bg = 'var(--v3-conclusion-bg)';
            border = 'var(--v3-gold)';
          } else if (q.diff === 3) {
            border = 'var(--v3-muted)';
          }
          if (q.isEssay) {
            bg = q.diff === 5 ? 'var(--v3-accent)' : 'var(--v3-conclusion-bg)';
          }
          return (
            <div
              key={`${q.num}-${i}`}
              className="v3-killer-cell"
              style={{ background: bg, color: textColor, borderColor: border }}
              title={String(q.num)}
            >
              {shortLabel(q.num)}
              {q.isEssay && <sup style={{ fontSize: '8px', marginLeft: '2px' }}>✎</sup>}
            </div>
          );
        })}
      </div>
      <div className="v3-killer-legend">
        <span>
          <span className="v3-killer-dot" style={{ borderColor: 'var(--v3-ink)' }} />
          기본·표준 (1~2단계)
        </span>
        <span>
          <span className="v3-killer-dot" style={{ borderColor: 'var(--v3-muted)' }} />
          응용 (3단계)
        </span>
        <span>
          <span className="v3-killer-dot" style={{ background: 'var(--v3-conclusion-bg)', borderColor: 'var(--v3-gold)' }} />
          심화 (4단계)
        </span>
        <span>
          <span className="v3-killer-dot" style={{ background: 'var(--v3-accent)', borderColor: 'var(--v3-accent)' }} />
          최고난도 (5단계)
        </span>
        <span>
          <span className="v3-killer-dot" style={{ background: 'var(--v3-conclusion-bg)', borderColor: 'var(--v3-gold)' }} />
          ✎ 서술형
        </span>
      </div>
    </figure>
  );
}
