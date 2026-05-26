/**
 * V3 인포그래픽 3: 문항별 난이도 지도 (1~N번 격자)
 *
 * 각 셀은 문항 번호 표시. 색상으로 난이도(녹/회/황/빨), 배경으로 서술형 표시.
 *
 * 시안: scripts/generate-v3-preview-html.ts::renderKillerMap 의 JSX 버전
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { normDiff } from './helpers';

export function KillerMap({ questions }: { questions: AnalyzedQuestion[] }) {
  const list = questions
    .map((q) => ({
      num: q.question_number,
      diff: normDiff(String(q.difficulty)),
      isEssay: q.question_format === 'essay',
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
      <figcaption className="v3-info-label">FIGURE · 문항별 난이도 지도</figcaption>
      <div className="v3-killer-grid">
        {list.map((q, i) => {
          let bg = 'transparent';
          let border = '#121212';
          let textColor = '#121212';
          if (q.diff === '5') {
            bg = '#BF1722';
            border = '#BF1722';
            textColor = '#fff';
          } else if (q.diff === '4') {
            bg = '#FDE9D7';
            border = '#DA8B2C';
          } else if (q.diff === '3') {
            border = '#888';
          }
          if (q.isEssay) {
            bg = q.diff === '5' ? '#BF1722' : '#FFF8E0';
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
          <span className="v3-killer-dot" style={{ borderColor: '#121212' }} />
          기본·표준 (Lv 1~2)
        </span>
        <span>
          <span className="v3-killer-dot" style={{ borderColor: '#888' }} />
          응용 (Lv 3)
        </span>
        <span>
          <span className="v3-killer-dot" style={{ background: '#FDE9D7', borderColor: '#DA8B2C' }} />
          심화 (Lv 4)
        </span>
        <span>
          <span className="v3-killer-dot" style={{ background: '#BF1722', borderColor: '#BF1722' }} />
          최고난도 (Lv 5)
        </span>
        <span>
          <span className="v3-killer-dot" style={{ background: '#FFF8E0', borderColor: '#DA8B2C' }} />
          ✎ 서술형
        </span>
      </div>
    </figure>
  );
}
