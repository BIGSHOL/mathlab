import * as React from 'react';
import { MathRenderer } from '@/components/math/MathRenderer';

export type QuestionCardVariant = 'default' | 'compact' | 'aurora';

export type QuestionCardProps = {
  /** 문제 번호 (예: 3 → "Q 3") */
  qnum: number;
  /** 본문 텍스트 (KaTeX `$...$` 인라인 포함 가능) */
  body: string;
  /** 별도 식 (블록 수식). 예: "$3x + 7 = 22$" */
  equation?: string;
  /** 보조 이미지 URL */
  imageUrl?: string;
  /** 작은 힌트 1줄 */
  hint?: string;
  variant?: QuestionCardVariant;
  className?: string;
};

/**
 * v2 디자인 시스템 QuestionCard.
 * practice-suite.css 의 .v2-qcard / .v2-qnum / .v2-qbody / .v2-qeq 매핑.
 *
 * 표시 트리:
 *   Q<qnum>
 *   <body>
 *   <equation>
 *   <imageUrl>
 *   💡 <hint>
 */
export function QuestionCard({
  qnum,
  body,
  equation,
  imageUrl,
  hint,
  variant = 'default',
  className,
}: QuestionCardProps) {
  const classes = ['v2-qcard'];
  if (variant !== 'default') classes.push(variant);
  if (className) classes.push(className);

  return (
    <article className={classes.join(' ')}>
      <div className="v2-qnum">Q {qnum}</div>
      <MathRenderer className="v2-qbody" content={body} />
      {equation && (
        <div className="v2-qeq">
          <MathRenderer content={equation} />
        </div>
      )}
      {imageUrl && <img src={imageUrl} alt="" className="v2-qimg" />}
      {hint && <div className="v2-qhint">💡 {hint}</div>}
    </article>
  );
}
