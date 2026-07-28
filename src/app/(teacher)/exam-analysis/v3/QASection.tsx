/**
 * V3 Q&A 단일 섹션
 *
 * 빨강 outlined 큰 번호(num) + 키커(Q1 · 학부모 인터뷰) + 질문(28px Noto Serif) +
 * 답변 문단들(17px + 형광펜) + DataBox.
 *
 * 시안: scripts/generate-v3-preview-html.ts::buildCommentaryHtml 의 qaSections JSX 버전
 */

import { markdownToHighlighted } from './helpers';
// 질문(h3)도 AI 생성 텍스트 — raw $ 노출 방어로 KaTeX 렌더 경유 (답변은 markdownToHighlighted가 처리)
import { renderInlineMath } from '@/lib/exam-analysis/rendering';
import { DataBox, type DataBoxStyle } from './DataBox';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';

interface QASectionProps {
  qa: NonNullable<CommentaryResult['blog_qa']>[number];
  sectionNum: string;    // "02" 등 zero-pad
  qaIndex: number;       // Q1, Q2... 라벨용 (0-based)
  /** 섹션 소제목 — 문체 팩이 공급 (미전달 시 기본 문구) */
  subLabel?: string;
  /** 데이터 박스 표현 — 템플릿(qa 블록 variant)이 결정 */
  dataBoxStyle?: DataBoxStyle;
}

export function QASection({ qa, sectionNum, qaIndex, subLabel, dataBoxStyle = 'bar' }: QASectionProps) {
  const answer = Array.isArray(qa.answer) ? qa.answer : qa.answer ? [qa.answer] : [];
  return (
    <section className="v3-section">
      <span className="v3-section-num">{sectionNum}</span>
      <div className="v3-section-sub">{subLabel ?? `질문 ${qaIndex + 1} · 학부모 인터뷰`}</div>
      <h3>{renderInlineMath(qa.question, `qa-q-${qaIndex}`, { disableHighlight: true })}</h3>
      {answer.map((p, i) => (
        <p key={`qa-${qaIndex}-${i}`}>{markdownToHighlighted(p, `qa-${qaIndex}-${i}`)}</p>
      ))}
      {qa.data_box && <DataBox box={qa.data_box} keyPrefix={`qa-${qaIndex}`} style={dataBoxStyle} />}
    </section>
  );
}
